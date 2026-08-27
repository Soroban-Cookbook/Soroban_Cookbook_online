/**
 * Tests for CodeSnippet utility functions
 */

import { stripComments, hasCommentLines, getDisplayCode, formatFilename } from './utils';

describe('CodeSnippet utilities', () => {
  describe('stripComments', () => {
    it('should remove lines starting with //', () => {
      const code = `let x = 1;
// This is a comment
let y = 2;`;
      const result = stripComments(code);
      expect(result).not.toContain('This is a comment');
      expect(result).toContain('let x = 1;');
      expect(result).toContain('let y = 2;');
    });

    it('should preserve inline comments', () => {
      const code = 'let x = 1; // inline comment';
      const result = stripComments(code);
      expect(result).toContain('// inline comment');
    });

    it('should preserve empty lines', () => {
      const code = `let x = 1;

let y = 2;`;
      const result = stripComments(code);
      expect(result.split('\n').length).toBe(code.split('\n').length);
    });

    it('should handle comments with leading whitespace', () => {
      const code = `let x = 1;
  // Indented comment
let y = 2;`;
      const result = stripComments(code);
      expect(result).not.toContain('Indented comment');
    });
  });

  describe('hasCommentLines', () => {
    it('should detect comment-only lines', () => {
      const code = `let x = 1;
// This is a comment
let y = 2;`;
      expect(hasCommentLines(code)).toBe(true);
    });

    it('should not detect inline comments as comment lines', () => {
      const code = 'let x = 1; // inline comment';
      expect(hasCommentLines(code)).toBe(false);
    });

    it('should return false for code without comments', () => {
      const code = `let x = 1;
let y = 2;`;
      expect(hasCommentLines(code)).toBe(false);
    });

    it('should detect indented comment lines', () => {
      const code = `let x = 1;
  // Indented comment
let y = 2;`;
      expect(hasCommentLines(code)).toBe(true);
    });
  });

  describe('getDisplayCode', () => {
    const code = `let x = 1;
// Comment line
let y = 2;
let z = 3; // inline`;

    it('should return full code when showComments is true', () => {
      const result = getDisplayCode(code, true);
      expect(result).toBe(code);
    });

    it('should return code without comment lines when showComments is false', () => {
      const result = getDisplayCode(code, false);
      expect(result).not.toContain('// Comment line');
      expect(result).toContain('// inline');
    });
  });

  describe('formatFilename', () => {
    it('should convert camelCase to kebab-case', () => {
      expect(formatFilename('HelloWorld', 'rust')).toBe('hello-world.rs');
    });

    it('should handle already kebab-case names', () => {
      expect(formatFilename('hello-world', 'rust')).toBe('hello-world.rs');
    });

    it('should add correct file extension for rust', () => {
      expect(formatFilename('contract', 'rust')).toBe('contract.rs');
      expect(formatFilename('contract', 'rs')).toBe('contract.rs');
    });

    it('should add correct file extension for other languages', () => {
      expect(formatFilename('config', 'toml')).toBe('config.toml');
      expect(formatFilename('data', 'json')).toBe('data.json');
      expect(formatFilename('script', 'bash')).toBe('script.sh');
    });

    it('should handle mixed case and separators', () => {
      expect(formatFilename('HelloWorld_Test', 'rust')).toBe('hello-world-test.rs');
    });

    it('should remove invalid characters', () => {
      expect(formatFilename('Hello@World#Test', 'rust')).toBe('hello-world-test.rs');
    });

    it('should collapse multiple hyphens', () => {
      expect(formatFilename('hello---world', 'rust')).toBe('hello-world.rs');
    });

    it('should default to rust extension if no language specified', () => {
      expect(formatFilename('contract')).toBe('contract.rs');
    });
  });
});
