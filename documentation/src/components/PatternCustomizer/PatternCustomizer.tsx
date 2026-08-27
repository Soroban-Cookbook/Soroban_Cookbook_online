import React, { useEffect } from 'react';
import clsx from 'clsx';
import styles from './PatternCustomizer.module.css';
import { PatternCustomizerProps } from './types';
import { usePatternCustomizer } from './usePatternCustomizer';

/**
 * PatternCustomizer Component
 *
 * Interactive form to customize pattern parameters with live code preview.
 * Supports template variables using {{variableName}} syntax.
 *
 * @example
 * ```tsx
 * <PatternCustomizer
 *   title="Customize Greeting"
 *   fields={[
 *     {
 *       name: 'greeting',
 *       label: 'Greeting Message',
 *       type: 'text',
 *       value: 'Hello',
 *       defaultValue: 'Hello',
 *       placeholder: 'Enter greeting text',
 *     }
 *   ]}
 *   codeTemplate={`String::from_str(&env, "{{greeting}}, Soroban!")`}
 *   language="rust"
 * />
 * ```
 */
export default function PatternCustomizer({
  title = 'Customize Pattern',
  description,
  fields,
  codeTemplate,
  language: _language = 'rust',
  onCodeChange,
  className,
}: PatternCustomizerProps) {
  const { values, generatedCode, validation, updateField, reset } = usePatternCustomizer(
    fields,
    codeTemplate,
  );

  // Notify parent when code changes
  useEffect(() => {
    onCodeChange?.(generatedCode);
  }, [generatedCode, onCodeChange]);

  return (
    <div className={clsx(styles.container, className)}>
      {/* Header */}
      <div className={styles.header}>
        <h3 className={styles.title}>{title}</h3>
        {description && <p className={styles.description}>{description}</p>}
      </div>

      {/* Content: Form + Preview */}
      <div className={styles.content}>
        {/* Form Section */}
        <div className={styles.formSection}>
          <form onSubmit={(e) => e.preventDefault()}>
            {fields.map((field) => (
              <div key={field.name} className={styles.fieldGroup}>
                <label htmlFor={`field-${field.name}`} className={styles.label}>
                  {field.label}
                </label>

                {field.type === 'text' && (
                  <input
                    id={`field-${field.name}`}
                    type="text"
                    className={styles.input}
                    value={values[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                    pattern={field.pattern}
                  />
                )}

                {field.type === 'number' && (
                  <input
                    id={`field-${field.name}`}
                    type="number"
                    className={styles.input}
                    value={values[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}

                {field.type === 'select' && (
                  <select
                    id={`field-${field.name}`}
                    className={styles.select}
                    value={values[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}>
                    <option value="">Select {field.label}</option>
                    {field.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === 'textarea' && (
                  <textarea
                    id={`field-${field.name}`}
                    className={styles.textarea}
                    value={values[field.name] || ''}
                    onChange={(e) => updateField(field.name, e.target.value)}
                    placeholder={field.placeholder}
                  />
                )}

                {field.description && (
                  <span className={styles.fieldDescription}>{field.description}</span>
                )}
              </div>
            ))}

            {/* Controls */}
            <div className={styles.controls}>
              <button
                type="button"
                className={clsx(styles.button, styles.reset)}
                onClick={reset}
                aria-label="Reset all fields to defaults">
                ↻ Reset
              </button>
            </div>

            {/* Validation feedback */}
            {!validation.valid && (
              <div className={styles.validationError}>
                Missing values: {validation.missing.join(', ')}
              </div>
            )}
            {validation.valid && <div className={styles.validationSuccess}>✓ Ready to use</div>}
          </form>
        </div>

        {/* Preview Section */}
        <div className={styles.previewSection}>
          <div className={styles.previewTitle}>Preview</div>
          <pre className={styles.codePreview}>
            <code>{generatedCode}</code>
          </pre>
        </div>
      </div>
    </div>
  );
}
