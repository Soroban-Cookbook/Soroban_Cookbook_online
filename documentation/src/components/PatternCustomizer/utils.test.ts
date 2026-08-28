/**
 * Tests for PatternCustomizer utility functions
 */

import {
  replaceTemplateVariables,
  extractTemplateVariables,
  validateTemplateValues,
  sanitizeInput,
  isValidRustIdentifier,
  isValidRustString,
} from './utils';

describe('PatternCustomizer utilities', () => {
  describe('replaceTemplateVariables', () => {
    it('should replace single template variable', () => {
      const template = 'Hello {{name}}!';
      const values = { name: 'World' };
      expect(replaceTemplateVariables(template, values)).toBe('Hello World!');
    });

    it('should replace multiple template variables', () => {
      const template = '{{greeting}}, {{name}}! You are {{age}} years old.';
      const values = { greeting: 'Hello', name: 'Alice', age: 25 };
      expect(replaceTemplateVariables(template, values)).toBe(
        'Hello, Alice! You are 25 years old.',
      );
    });

    it('should handle repeated variables', () => {
      const template = '{{x}} + {{x}} = {{result}}';
      const values = { x: 5, result: 10 };
      expect(replaceTemplateVariables(template, values)).toBe('5 + 5 = 10');
    });

    it('should handle numeric values', () => {
      const template = 'Amount: {{amount}}';
      const values = { amount: 1000 };
      expect(replaceTemplateVariables(template, values)).toBe('Amount: 1000');
    });

    it('should ignore undefined variables', () => {
      const template = 'Hello {{name}}, {{unknown}}';
      const values = { name: 'Alice' };
      expect(replaceTemplateVariables(template, values)).toBe('Hello Alice, {{unknown}}');
    });
  });

  describe('extractTemplateVariables', () => {
    it('should extract single variable', () => {
      const template = 'Hello {{name}}';
      expect(extractTemplateVariables(template)).toEqual(['name']);
    });

    it('should extract multiple variables', () => {
      const template = '{{greeting}}, {{name}}! You are {{age}} years.';
      expect(extractTemplateVariables(template)).toEqual(['greeting', 'name', 'age']);
    });

    it('should not include duplicates', () => {
      const template = '{{x}} + {{x}} = {{result}}';
      expect(extractTemplateVariables(template)).toEqual(['x', 'result']);
    });

    it('should return empty array if no variables', () => {
      const template = 'No variables here';
      expect(extractTemplateVariables(template)).toEqual([]);
    });
  });

  describe('validateTemplateValues', () => {
    it('should validate all required values present', () => {
      const template = 'Hello {{name}}';
      const values = { name: 'Alice' };
      const result = validateTemplateValues(template, values);
      expect(result.valid).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('should detect missing values', () => {
      const template = 'Hello {{name}}, you are {{age}} years';
      const values = { name: 'Alice' };
      const result = validateTemplateValues(template, values);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['age']);
    });

    it('should detect empty string values', () => {
      const template = 'Hello {{name}}';
      const values = { name: '' };
      const result = validateTemplateValues(template, values);
      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['name']);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape backslashes', () => {
      expect(sanitizeInput('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape quotes', () => {
      expect(sanitizeInput('He said "hello"')).toBe('He said \\"hello\\"');
    });

    it('should escape single quotes', () => {
      expect(sanitizeInput("It's working")).toBe("It\\'s working");
    });

    it('should escape newlines', () => {
      expect(sanitizeInput('Line 1\nLine 2')).toBe('Line 1\\nLine 2');
    });

    it('should escape tabs', () => {
      expect(sanitizeInput('A\tB')).toBe('A\\tB');
    });
  });

  describe('isValidRustIdentifier', () => {
    it('should accept valid identifiers', () => {
      expect(isValidRustIdentifier('my_var')).toBe(true);
      expect(isValidRustIdentifier('_private')).toBe(true);
      expect(isValidRustIdentifier('CamelCase')).toBe(true);
      expect(isValidRustIdentifier('var123')).toBe(true);
    });

    it('should reject invalid identifiers', () => {
      expect(isValidRustIdentifier('123var')).toBe(false);
      expect(isValidRustIdentifier('my-var')).toBe(false);
      expect(isValidRustIdentifier('my var')).toBe(false);
      expect(isValidRustIdentifier('')).toBe(false);
    });
  });

  describe('isValidRustString', () => {
    it('should accept valid Rust strings', () => {
      expect(isValidRustString('Hello World')).toBe(true);
      expect(isValidRustString('Hello, World!')).toBe(true);
      expect(isValidRustString('123')).toBe(true);
      expect(isValidRustString('test-value')).toBe(true);
    });

    it('should reject strings with special characters', () => {
      expect(isValidRustString('Hello\nWorld')).toBe(false);
      expect(isValidRustString('test@value')).toBe(false);
      expect(isValidRustString('test#value')).toBe(false);
    });
  });
});
