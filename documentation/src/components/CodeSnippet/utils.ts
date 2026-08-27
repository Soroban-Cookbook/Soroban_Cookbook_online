/**
 * Utility functions for CodeSnippet component
 * Handles comment filtering and code manipulation
 */

/**
 * Remove comment-only lines from code
 * Preserves inline comments that appear after code
 * Only removes lines where // is the first non-whitespace character
 */
export function stripComments(code: string): string {
  return code
    .split('\n')
    .filter((line) => {
      const trimmed = line.trim();
      // Keep line if it's not empty and doesn't start with //
      return trimmed.length === 0 || !trimmed.startsWith('//');
    })
    .join('\n');
}

/**
 * Check if code has any comment-only lines
 * Used to determine if toggle button should be visible
 */
export function hasCommentLines(code: string | undefined | null): boolean {
  if (!code) return false;
  return code.split('\n').some((line) => {
    const trimmed = line.trim();
    return trimmed.startsWith('//') && trimmed.length > 2;
  });
}

/**
 * Get the display code based on showComments flag
 */
export function getDisplayCode(code: string | undefined | null, showComments: boolean): string {
  const safeCode = code ?? '';
  return showComments ? safeCode : stripComments(safeCode);
}

/**
 * Format a filename by converting to kebab-case and adding appropriate extension
 *
 * @example
 * formatFilename('HelloWorld', 'rust') // returns 'hello-world.rs'
 * formatFilename('hello-world', 'rs') // returns 'hello-world.rs'
 */
export function formatFilename(name: string, language: string = 'rust'): string {
  // Convert to kebab-case: remove non-alphanumeric, convert camelCase to kebab-case
  const kebabName = name
    .replace(/([a-z])([A-Z])/g, '$1-$2') // Insert hyphen before uppercase letters
    .replace(/[^a-z0-9-]/gi, '') // Remove non-alphanumeric except hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .toLowerCase();

  // Get file extension based on language
  const getExtension = (lang: string): string => {
    const langMap: Record<string, string> = {
      rust: 'rs',
      rs: 'rs',
      typescript: 'ts',
      ts: 'ts',
      javascript: 'js',
      js: 'js',
      python: 'py',
      py: 'py',
      bash: 'sh',
      sh: 'sh',
      toml: 'toml',
      yaml: 'yaml',
      json: 'json',
    };
    return langMap[lang.toLowerCase()] || lang;
  };

  const extension = getExtension(language);
  return `${kebabName}.${extension}`;
}

/**
 * Download content as a file using Blob and anchor element
 *
 * @example
 * downloadFile('fn main() { println!("Hello"); }', 'hello.rs');
 */
export function downloadFile(content: string, filename: string): void {
  try {
    // Create a Blob from the content
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });

    // Create a temporary URL for the blob
    const url = URL.createObjectURL(blob);

    // Create a temporary anchor element and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    // Append to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the object URL
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download file:', error);
    throw new Error(`Failed to download file: ${filename}`, { cause: error });
  }
}

/**
 * Copy text to clipboard
 * Useful for fallback when download is not available
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers or non-secure contexts
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const success = document.execCommand('copy');
      document.body.removeChild(textarea);
      return success;
    }
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}
