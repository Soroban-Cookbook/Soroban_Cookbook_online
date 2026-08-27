import { describe, it, expect } from 'vitest';
import { sanitizeUrl, isHttpsUrl } from '../sanitizeUrl';

describe('sanitizeUrl', () => {
  describe('blocks dangerous schemes', () => {
    const dangerous = [
      'javascript:alert(1)',
      'JAVASCRIPT:alert(1)',
      '  javascript:alert(1)',
      '\tjavascript:alert(1)',
      'data:text/html,<script>',
      'DATA:text/html,<script>',
      'vbscript:msgbox(1)',
      'livescript:alert(1)',
    ];

    dangerous.forEach((url) => {
      it(`blocks "${url}"`, () => {
        expect(sanitizeUrl(url)).toBe('#');
      });
    });
  });

  describe('allows safe absolute URLs', () => {
    const safe = [
      'https://example.com',
      'https://soroban-cookbook.dev/docs/patterns',
      'http://localhost:3000',
      'mailto:hello@example.com',
      'tel:+1234567890',
    ];

    safe.forEach((url) => {
      it(`allows "${url}"`, () => {
        expect(sanitizeUrl(url)).toBe(url);
      });
    });
  });

  describe('allows relative paths', () => {
    const relative = [
      '/docs/patterns/hello-world',
      './relative',
      '../parent',
      '?query=1',
      '#anchor',
    ];

    relative.forEach((url) => {
      it(`allows "${url}"`, () => {
        expect(sanitizeUrl(url)).toBe(url);
      });
    });
  });

  describe('edge cases', () => {
    it('returns # for null', () => expect(sanitizeUrl(null)).toBe('#'));
    it('returns # for undefined', () => expect(sanitizeUrl(undefined)).toBe('#'));
    it('returns # for empty string', () => expect(sanitizeUrl('')).toBe('#'));
    it('returns # for whitespace-only', () => expect(sanitizeUrl('   ')).toBe('#'));
    it('returns # for blob:', () => expect(sanitizeUrl('blob:https://example.com/uuid')).toBe('#'));
  });
});

describe('isHttpsUrl', () => {
  it('returns true for https', () => expect(isHttpsUrl('https://api.example.com')).toBe(true));
  it('returns false for http', () => expect(isHttpsUrl('http://example.com')).toBe(false));
  it('returns false for javascript:', () => expect(isHttpsUrl('javascript:alert(1)')).toBe(false));
  it('returns false for empty', () => expect(isHttpsUrl('')).toBe(false));
  it('returns false for null', () => expect(isHttpsUrl(null)).toBe(false));
  it('returns false for relative path', () => expect(isHttpsUrl('/docs')).toBe(false));
});
