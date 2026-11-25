import { describe, it, expect, afterEach, vi } from 'vitest';
import { safeLocalStorage } from './safeLocalStorage';

describe('safeLocalStorage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it('returns the stored value on a successful getItem', () => {
    localStorage.setItem('safe-key', 'value');

    expect(safeLocalStorage.getItem('safe-key')).toBe('value');
  });

  it('returns null for a missing key', () => {
    expect(safeLocalStorage.getItem('safe-key')).toBeNull();
  });

  it('returns null when the underlying read throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(safeLocalStorage.getItem('safe-key')).toBeNull();
  });

  it('returns true and persists the value on a successful setItem', () => {
    expect(safeLocalStorage.setItem('safe-key', 'value')).toBe(true);
    expect(localStorage.getItem('safe-key')).toBe('value');
  });

  it('returns false when the underlying write throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
    });

    expect(safeLocalStorage.setItem('safe-key', 'value')).toBe(false);
  });

  it('removes the value on a successful removeItem', () => {
    localStorage.setItem('safe-key', 'value');

    safeLocalStorage.removeItem('safe-key');

    expect(localStorage.getItem('safe-key')).toBeNull();
  });

  it('does not throw when the underlying removeItem throws', () => {
    localStorage.setItem('safe-key', 'value');
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
      throw new DOMException('The operation is insecure.', 'SecurityError');
    });

    expect(() => safeLocalStorage.removeItem('safe-key')).not.toThrow();
  });

  it('handles an environment where the storage API does not exist', () => {
    vi.stubGlobal('localStorage', undefined);

    expect(safeLocalStorage.getItem('safe-key')).toBeNull();
    expect(safeLocalStorage.setItem('safe-key', 'value')).toBe(false);
    expect(() => safeLocalStorage.removeItem('safe-key')).not.toThrow();
  });

  it('handles an environment where accessing storage itself throws', () => {
    vi.stubGlobal(
      'localStorage',
      Object.defineProperty({}, 'getItem', {
        configurable: true,
        get() {
          throw new DOMException('Access is denied for this document.', 'SecurityError');
        },
      }),
    );

    expect(safeLocalStorage.getItem('safe-key')).toBeNull();
    expect(safeLocalStorage.setItem('safe-key', 'value')).toBe(false);
    expect(() => safeLocalStorage.removeItem('safe-key')).not.toThrow();
  });
});
