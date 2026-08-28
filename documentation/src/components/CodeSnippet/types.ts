/**
 * CodeSnippet component types
 * Defines props and utility types for the comment-togglable code snippet component
 */

export interface CodeSnippetProps {
  /** The code content to display */
  code?: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Whether to show comments by default */
  defaultShowComments?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Callback when comments visibility changes */
  onCommentToggle?: (showComments: boolean) => void;
  /** Custom filename for download (without extension) */
  filename?: string;
  /** Show/hide download button */
  showDownload?: boolean;
}
