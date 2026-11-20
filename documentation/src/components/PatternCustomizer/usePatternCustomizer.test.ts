/**
 * Hook tests for usePatternCustomizer (issue #620 - Phase 8).
 *
 * Verifies state transitions: initial values, code generation, field updates,
 * per-field reset, full reset, and validation of missing values.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePatternCustomizer } from './usePatternCustomizer';
import { CustomizerField } from './types';

const fields: CustomizerField[] = [
  {
    name: 'greeting',
    label: 'Greeting Message',
    type: 'text',
    value: 'Hello',
    defaultValue: 'Hello',
  },
  {
    name: 'count',
    label: 'Count',
    type: 'number',
    value: 3,
    defaultValue: 3,
  },
];

const template = 'Hello {{greeting}}, count={{count}}';

describe('usePatternCustomizer', () => {
  it('initializes values from field values/defaults', () => {
    const { result } = renderHook(() => usePatternCustomizer(fields, template));
    expect(result.current.values).toEqual({ greeting: 'Hello', count: 3 });
  });

  it('generates code from the template and initial values', () => {
    const { result } = renderHook(() => usePatternCustomizer(fields, template));
    expect(result.current.generatedCode).toBe('Hello Hello, count=3');
  });

  it('updates a field value and regenerates the code', () => {
    const { result } = renderHook(() => usePatternCustomizer(fields, template));
    act(() => {
      result.current.updateField('greeting', 'Bonjour');
    });
    expect(result.current.values.greeting).toBe('Bonjour');
    expect(result.current.generatedCode).toBe('Hello Bonjour, count=3');
  });

  it('reset restores all default values', () => {
    const { result } = renderHook(() => usePatternCustomizer(fields, template));
    act(() => {
      result.current.updateField('greeting', 'Bonjour');
      result.current.updateField('count', 9);
    });
    act(() => {
      result.current.reset();
    });
    expect(result.current.values).toEqual({ greeting: 'Hello', count: 3 });
    expect(result.current.generatedCode).toBe('Hello Hello, count=3');
  });

  it('resetField resets only the requested field', () => {
    const { result } = renderHook(() => usePatternCustomizer(fields, template));
    act(() => {
      result.current.updateField('greeting', 'Bonjour');
      result.current.updateField('count', 9);
    });
    act(() => {
      result.current.resetField('greeting');
    });
    expect(result.current.values.greeting).toBe('Hello');
    expect(result.current.values.count).toBe(9);
  });

  it('reports missing values when a required field is cleared', () => {
    const { result } = renderHook(() => usePatternCustomizer(fields, template));
    expect(result.current.validation).toEqual({ valid: true, missing: [] });
    act(() => {
      result.current.updateField('greeting', '');
    });
    expect(result.current.validation).toEqual({
      valid: false,
      missing: ['greeting'],
    });
  });

  it('treats fields with no template variable as always valid', () => {
    const { result } = renderHook(() => usePatternCustomizer(fields, 'No variables'));
    expect(result.current.validation).toEqual({ valid: true, missing: [] });
  });
});
