/**
 * CSRF Token Management Utilities
 *
 * This module provides CSRF (Cross-Site Request Forgery) protection
 * for API endpoints, specifically for the newsletter subscription form.
 */

const CSRF_TOKEN_KEY = 'soroban-csrf-token';
const CSRF_TOKEN_HEADER = 'X-CSRF-Token';
const CSRF_TOKEN_LENGTH = 32;

/**
 * Generate a random CSRF token
 * Uses crypto.getRandomValues for secure randomization
 */
export function generateCSRFToken(): string {
  const array = new Uint8Array(CSRF_TOKEN_LENGTH);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create CSRF token from session storage
 * Session storage is preferred over localStorage for token security
 */
export function getOrCreateCSRFToken(): string {
  try {
    // Check sessionStorage first (preferred for short-lived tokens)
    let token = sessionStorage.getItem(CSRF_TOKEN_KEY);
    if (token) {
      return token;
    }

    // Generate new token if not found
    token = generateCSRFToken();
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    return token;
  } catch {
    // Fallback if sessionStorage is not available
    // Generate a new token but don't persist it
    return generateCSRFToken();
  }
}

/**
 * Get the stored CSRF token without creating one
 */
export function getCSRFToken(): string | null {
  try {
    return sessionStorage.getItem(CSRF_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Clear the CSRF token from storage
 * Call after successful request or on logout
 */
export function clearCSRFToken(): void {
  try {
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
  } catch {
    // Silently fail if sessionStorage is not available
  }
}

/**
 * Prepare fetch options with CSRF token header
 * Use this when making POST requests to protected endpoints
 */
export function getCSRFProtectedRequestInit(
  init?: Record<string, unknown> & { headers?: Record<string, string> | Headers },
): Record<string, unknown> {
  const token = getOrCreateCSRFToken();
  const existingHeaders = init?.headers || {};

  // Convert Headers object to Record if needed
  const headersRecord: Record<string, string> =
    existingHeaders instanceof Headers
      ? (() => {
          const record: Record<string, string> = {};
          existingHeaders.forEach((value, key) => {
            record[key] = value;
          });
          return record;
        })()
      : (existingHeaders as Record<string, string>);

  return {
    ...init,
    headers: {
      ...headersRecord,
      [CSRF_TOKEN_HEADER]: token,
    },
  };
}

/**
 * Extract CSRF token from response headers
 * Backend can optionally return a new token to rotate it
 */
export function extractCSRFTokenFromResponse(response: Response): string | null {
  return response.headers.get(CSRF_TOKEN_HEADER);
}

/**
 * Update CSRF token from response if provided
 * Enables token rotation on the backend
 */
export function updateCSRFTokenFromResponse(response: Response): void {
  try {
    const newToken = extractCSRFTokenFromResponse(response);
    if (newToken) {
      sessionStorage.setItem(CSRF_TOKEN_KEY, newToken);
    }
  } catch {
    // Silently fail if sessionStorage is not available
  }
}
