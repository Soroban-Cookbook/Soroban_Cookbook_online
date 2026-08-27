/**
 * Utility functions for PatternCustomizer
 * Handles template variable substitution and validation
 */

/**
 * Replace template variables in code string
 * Supports {{variableName}} syntax
 *
 * @example
 * const template = 'String::from_str(&env, "{{greeting}}")';
 * const values = { greeting: 'Hello World' };
 * replaceTemplateVariables(template, values);
 * // Returns: String::from_str(&env, "Hello World")
 */
export function replaceTemplateVariables(
  template: string,
  values: Record<string, string | number>,
): string {
  let result = template;

  // Replace all {{variable}} patterns with corresponding values
  Object.entries(values).forEach(([key, value]) => {
    const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
    result = result.replace(pattern, String(value));
  });

  return result;
}

/**
 * Extract all template variable names from template string
 * Finds all {{variableName}} patterns
 *
 * @example
 * extractTemplateVariables('Hello {{name}}, you are {{age}} years old');
 * // Returns: ['name', 'age']
 */
export function extractTemplateVariables(template: string): string[] {
  const pattern = /\{\{(\w+)\}\}/g;
  const variables: string[] = [];
  let match;

  while ((match = pattern.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1]);
    }
  }

  return variables;
}

/**
 * Validate that all required template variables have values
 *
 * @example
 * validateTemplateValues('Hello {{name}}, {{age}} years', { name: 'Alice', age: '25' });
 * // Returns: { valid: true, missing: [] }
 */
export function validateTemplateValues(
  template: string,
  values: Record<string, string | number>,
): { valid: boolean; missing: string[] } {
  const required = extractTemplateVariables(template);
  const missing = required.filter((v) => !(v in values) || values[v] === '');

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Sanitize user input to prevent code injection
 * Escapes special characters that could break the template
 */
export function sanitizeInput(value: string): string {
  return value
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/"/g, '\\"') // Escape quotes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\t/g, '\\t'); // Escape tabs
}

/**
 * Check if a string is a valid Rust identifier
 */
export function isValidRustIdentifier(str: string): boolean {
  const pattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return pattern.test(str);
}

/**
 * Check if a string is a valid Rust string content
 * Allows alphanumeric, spaces, and common punctuation
 */
export function isValidRustString(str: string): boolean {
  const pattern = /^[a-zA-Z0-9\s.,!?-]*$/;

  return pattern.test(str);
}
