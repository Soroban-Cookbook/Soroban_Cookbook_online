/**
 * Centralised `localStorage` access with uniform error handling (issue #1566).
 *
 * Browser storage can be unavailable (server-side rendering, private
 * browsing, disabled cookies) or can throw on read/write (quota exceeded,
 * security errors). Every call here swallows those failures so components
 * never crash because of storage:
 *
 * - `getItem` → `null` when the read fails or storage does not exist
 * - `setItem` → `false` when the write fails, `true` only on success
 * - `removeItem` → no-op on failure
 *
 * Key names and serialisation stay the caller's responsibility — this helper
 * only guarantees that storage exceptions never escape to callers. It must
 * not touch `localStorage` outside the try blocks so importing it during
 * server-side rendering is safe.
 */
export const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem: (key: string, value: string): boolean => {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch {
      return false;
    }
  },

  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch {
      // Storage may be unavailable.
    }
  },
};
