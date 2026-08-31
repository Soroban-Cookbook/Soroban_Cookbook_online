/**
 * CodePreview component types
 * Read-only code preview with syntax highlighting and copy-to-clipboard
 */

export interface CodePreviewProps {
  /** The code content to display */
  code: string;
  /** Programming language for syntax highlighting (default: 'rust') */
  language?: string;
  /** Optional filename displayed in the header */
  fileName?: string;
  /** Optional title displayed in the header */
  title?: string;
  /** Custom CSS class name */
  className?: string;
  /** Whether to show line numbers (default: true) */
  showLineNumbers?: boolean;
  /** Maximum number of lines before collapsing (0 = no collapse) */
  collapseAt?: number;
}
