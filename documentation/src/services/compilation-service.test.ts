/* cspell:disable */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { compileContractRemote, isValidBase64, CompilationRequest } from './compilation-service';

describe('isValidBase64', () => {
  it('returns true for valid base64 encoded strings', () => {
    // Standard 4-character block
    expect(isValidBase64('AAAA')).toBe(true);
    // Single padding '='
    expect(isValidBase64('AAA=')).toBe(true);
    // Double padding '=='
    expect(isValidBase64('AA==')).toBe(true);
    // WASM magic header (\0asm\1\0\0\0) in base64
    expect(isValidBase64('AGFzbQEAAAA=')).toBe(true);
    // Longer valid base64 string
    expect(isValidBase64('SGVsbG8gV29ybGQh')).toBe(true);
  });

  it('returns false for non-string values', () => {
    expect(isValidBase64(undefined)).toBe(false);
    expect(isValidBase64(null)).toBe(false);
    expect(isValidBase64(12345)).toBe(false);
    expect(isValidBase64({})).toBe(false);
    expect(isValidBase64([])).toBe(false);
  });

  it('returns false for empty or whitespace-only strings', () => {
    expect(isValidBase64('')).toBe(false);
    expect(isValidBase64('   ')).toBe(false);
    expect(isValidBase64('\n\t')).toBe(false);
  });

  it('returns false for strings with invalid length (not a multiple of 4)', () => {
    expect(isValidBase64('A')).toBe(false);
    expect(isValidBase64('AB')).toBe(false);
    expect(isValidBase64('ABC')).toBe(false);
    expect(isValidBase64('ABCDE')).toBe(false);
  });

  it('returns false for strings with invalid base64 characters', () => {
    expect(isValidBase64('not_base64!')).toBe(false);
    expect(isValidBase64('ABCD@#$%')).toBe(false);
    expect(isValidBase64('AAAA-BBBB')).toBe(false);
  });

  it('returns false for strings with invalid padding', () => {
    // 3 padding equals is invalid
    expect(isValidBase64('A===')).toBe(false);
    // All padding equals is invalid
    expect(isValidBase64('====')).toBe(false);
    // Padding in the middle is invalid
    expect(isValidBase64('AA=A')).toBe(false);
  });

  it('returns false when atob throws during decode', () => {
    const originalAtob = globalThis.atob;
    try {
      globalThis.atob = () => {
        throw new Error('Decoding error');
      };
      expect(isValidBase64('AAAA')).toBe(false);
    } finally {
      globalThis.atob = originalAtob;
    }
  });

  it('validates using regex when atob is not available in environment', () => {
    const originalAtob = globalThis.atob;
    try {
      // @ts-expect-error simulating environment without global atob
      delete globalThis.atob;
      expect(isValidBase64('AAAA')).toBe(true);
      expect(isValidBase64('invalid!')).toBe(false);
    } finally {
      globalThis.atob = originalAtob;
    }
  });
});

describe('compileContractRemote', () => {
  const dummyRequest: CompilationRequest = {
    contractName: 'test_contract',
    sourceCode: '#![no_std]\nuse soroban_sdk::contract;',
  };

  const validWasmBase64 = 'AGFzbQEAAAA=';

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('returns successful response when server provides valid wasmBase64', async () => {
    const mockResponseData = {
      success: true,
      wasmBase64: validWasmBase64,
      hash: '0x1234567890abcdef',
      buildLogs: 'Compiling test_contract...',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponseData),
      }),
    );

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(true);
    expect(result.wasmBase64).toBe(validWasmBase64);
    expect(result.hash).toBe('0x1234567890abcdef');
    expect(result.buildLogs).toBe('Compiling test_contract...');
    expect(result.error).toBeUndefined();
  });

  it('rejects when success is true but wasmBase64 is missing (undefined)', async () => {
    const mockResponseData = {
      success: true,
      hash: '0x1234567890abcdef',
      buildLogs: 'Build succeeded',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponseData),
      }),
    );

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/missing wasmBase64 payload/i);
    // Preserves other returned properties
    expect(result.hash).toBe('0x1234567890abcdef');
    expect(result.buildLogs).toBe('Build succeeded');
  });

  it('rejects when success is true but wasmBase64 is empty or whitespace', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          wasmBase64: '',
        }),
      }),
    );

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/missing wasmBase64 payload/i);
  });

  it('rejects when success is true but wasmBase64 is not a valid base64 string (bad payload)', async () => {
    const mockResponseData = {
      success: true,
      wasmBase64: 'this-is-not-base64!',
      hash: '0x1234567890abcdef',
      buildLogs: 'Build succeeded',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponseData),
      }),
    );

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not a valid base64 string/i);
    expect(result.hash).toBe('0x1234567890abcdef');
    expect(result.buildLogs).toBe('Build succeeded');
  });

  it('rejects when success is true but wasmBase64 has invalid base64 padding', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue({
          success: true,
          wasmBase64: 'A===',
        }),
      }),
    );

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not a valid base64 string/i);
  });

  it('does not reject when success is false even if wasmBase64 is absent', async () => {
    const mockResponseData = {
      success: false,
      error: 'Syntax error on line 42',
      buildLogs: 'Compiling failed',
    };

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: vi.fn().mockResolvedValue(mockResponseData),
      }),
    );

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Syntax error on line 42');
    expect(result.buildLogs).toBe('Compiling failed');
  });

  it('handles server HTTP error response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: vi.fn().mockResolvedValue('Internal server error'),
      }),
    );

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Server compilation failed [HTTP 500]');
    expect(result.error).toContain('Internal server error');
  });

  it('handles network failure with Error object', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('Connection refused')));

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network request failed: Connection refused');
  });

  it('handles network failure with non-Error rejection', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue('Network timeout occurred'));

    const result = await compileContractRemote(dummyRequest);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Network request failed: Network timeout occurred');
  });

  it('passes custom apiEndpoint when specified by callers', async () => {
    const customEndpoint = 'https://custom-compiler.example.com/compile';
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({
        success: true,
        wasmBase64: validWasmBase64,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await compileContractRemote(dummyRequest, customEndpoint);

    expect(fetchMock).toHaveBeenCalledWith(
      customEndpoint,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dummyRequest),
      }),
    );
  });
});
