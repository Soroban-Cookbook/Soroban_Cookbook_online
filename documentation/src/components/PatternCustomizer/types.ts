/**
 * PatternCustomizer component types
 * Defines types for customizable pattern parameters and template variables
 */

export interface CustomizerField {
  /** Unique identifier for the field */
  name: string;
  /** Display label for the field */
  label: string;
  /** Field type */
  type: 'text' | 'number' | 'select' | 'textarea';
  /** Current value */
  value: string | number;
  /** Default value */
  defaultValue: string | number;
  /** Optional description or hint */
  description?: string;
  /** Options for select fields */
  options?: Array<{ label: string; value: string | number }>;
  /** Placeholder text for input fields */
  placeholder?: string;
  /** Validation pattern (regex string) */
  pattern?: string;
}

export interface PatternCustomizerProps {
  /** Title of the customizer section */
  title?: string;
  /** Description/help text */
  description?: string;
  /** Array of customizable fields */
  fields: CustomizerField[];
  /** Initial code template with {{variable}} placeholders */
  codeTemplate: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Callback when code updates */
  onCodeChange?: (code: string) => void;
  /** CSS class name */
  className?: string;
}

export interface CustomizerState {
  /** Current field values */
  values: Record<string, string | number>;
  /** Generated code from template */
  generatedCode: string;
}
