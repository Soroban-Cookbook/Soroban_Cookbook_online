/**
 * Custom hook for managing pattern customizer state
 * Handles field values and code generation
 */

import { useState, useCallback, useMemo } from 'react';
import { replaceTemplateVariables, validateTemplateValues } from './utils';
import { CustomizerField } from './types';

/**
 * Hook to manage pattern customizer state and code generation
 *
 * @example
 * const { values, generatedCode, updateField } = usePatternCustomizer({
 *   fields: [{
 *     name: 'greeting',
 *     label: 'Greeting Message',
 *     type: 'text',
 *     value: 'Hello',
 *     defaultValue: 'Hello',
 *   }],
 *   codeTemplate: 'String::from_str(&env, "{{greeting}}")',
 * });
 */
export function usePatternCustomizer(fields: CustomizerField[], codeTemplate: string) {
  // Initialize state with default values
  const initialValues = fields.reduce(
    (acc, field) => {
      acc[field.name] = field.value ?? field.defaultValue;
      return acc;
    },
    {} as Record<string, string | number>,
  );

  const [values, setValues] = useState<Record<string, string | number>>(initialValues);

  // Generate code from template and current values
  const generatedCode = useMemo(() => {
    return replaceTemplateVariables(codeTemplate, values);
  }, [codeTemplate, values]);

  // Validate current state
  const validation = useMemo(() => {
    return validateTemplateValues(codeTemplate, values);
  }, [codeTemplate, values]);

  // Update a single field value
  const updateField = useCallback((fieldName: string, newValue: string | number) => {
    setValues((prev) => ({
      ...prev,
      [fieldName]: newValue,
    }));
  }, []);

  // Reset to default values
  const reset = useCallback(() => {
    setValues(initialValues);
  }, [initialValues]);

  // Reset a specific field to its default
  const resetField = useCallback(
    (fieldName: string) => {
      const field = fields.find((f) => f.name === fieldName);
      if (field) {
        updateField(fieldName, field.defaultValue);
      }
    },
    [fields, updateField],
  );

  return {
    values,
    generatedCode,
    validation,
    updateField,
    reset,
    resetField,
  };
}
