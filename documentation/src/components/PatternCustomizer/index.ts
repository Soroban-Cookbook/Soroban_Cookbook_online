/**
 * PatternCustomizer Component Export
 * Main export for the interactive pattern customization component
 */

export { default as PatternCustomizer } from './PatternCustomizer';
export { usePatternCustomizer } from './usePatternCustomizer';
export type { PatternCustomizerProps, CustomizerField, CustomizerState } from './types';
export {
  replaceTemplateVariables,
  extractTemplateVariables,
  validateTemplateValues,
  sanitizeInput,
  isValidRustIdentifier,
  isValidRustString,
} from './utils';
