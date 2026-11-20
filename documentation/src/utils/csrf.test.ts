import { beforeEach, describe, expect, it } from 'vitest';
import { getCSRFProtectedRequestInit } from './csrf';

describe('getCSRFProtectedRequestInit', () => {
  beforeEach(() => {
    sessionStorage.setItem('soroban-csrf-token', 'test-csrf-token');
  });

  it.each([
    ['Headers', new Headers({ 'Content-Type': 'application/json' })],
    ['plain object', { 'Content-Type': 'application/json' }],
  ])('preserves caller headers from a %s input', (_label, inputHeaders) => {
    const requestInit = getCSRFProtectedRequestInit({
      method: 'POST',
      headers: inputHeaders,
    });
    const headers = new Headers(requestInit.headers as HeadersInit);

    expect(headers.get('Content-Type')).toBe('application/json');
    expect(headers.get('X-CSRF-Token')).toBe('test-csrf-token');
    expect(requestInit.method).toBe('POST');
  });
});
