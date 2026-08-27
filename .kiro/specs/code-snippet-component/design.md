# Code Snippet Component - Design

## Component Architecture

### High-Level Structure
```
CodeSnippet
├── Header (optional)
│   ├── Language Badge
│   └── Filename
├── CodeBlock
│   ├── LineNumbers (optional)
│   └── CodeContent
└── Footer (optional)
    └── CopyButton
```

### Props Interface
```typescript
interface CodeSnippetProps {
  /** The code content to display */
  code: string;
  /** Programming language for syntax highlighting */
  language?: string;
  /** Optional filename to display */
  filename?: string;
  /** Show line numbers */
  showLineNumbers?: boolean;
  /** Lines to highlight (1-indexed) */
  highlightLines?: number[];
  /** Theme preference: light, dark, or auto */
  theme?: 'light' | 'dark' | 'auto';
  /** Custom CSS className */
  className?: string;
}
```

### Data Models

#### CodeBlock
```typescript
interface CodeBlock {
  content: string;
  language: string;
  lines: string[];
  highlightedLines: number[];
}
```

#### CopyState
```typescript
type CopyState = 'idle' | 'copied' | 'error';
```

## Implementation Patterns

### 1. Syntax Highlighting
- Use Prism.js or highlight.js for syntax highlighting
- Support languages: JavaScript, TypeScript, Python, Rust, Go, Solidity, JSON, YAML, Bash
- Theme integration: use CSS custom properties for colors

### 2. Copy Functionality
- Use Clipboard API (`navigator.clipboard.writeText`)
- Fallback: document.execCommand for older browsers
- Show "Copied!" feedback for 2 seconds
- Announce success/failure to screen readers

### 3. Theme Support
- Use CSS custom properties for theming
- Detect system preference with `prefers-color-scheme`
- Allow override via props

### 4. Accessibility
- `role="region"` for code container
- `aria-label` on copy button
- `aria-live="polite"` for copy feedback
- Focus management for keyboard users

## Correctness Properties

1. Code content renders correctly with syntax highlighting
2. Copy button copies exact code content to clipboard
3. Copy feedback displays for 2 seconds
4. Language badge displays correctly when provided
5. Filename displays correctly when provided
6. Line numbers align with code lines
7. Horizontal scroll works for long lines
8. Theme matches docs theme automatically
9. Keyboard can activate copy button
10. Screen reader announces copy success
11. Component works without optional props
12. Responsive on mobile viewports
13. No console errors during operation

## CI/CD Integration
- Component tested with Jest + React Testing Library
- Visual regression tests with Chromatic
- Accessibility tests with axe-core

## File Structure
```
src/components/CodeSnippet/
├── CodeSnippet.tsx       # Main component
├── CodeSnippet.module.css # Styles
├── CopyButton.tsx        # Copy functionality
├── LineNumbers.tsx       # Line number display
└── index.ts              # Exports
```