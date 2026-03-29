# Alert & Callout Components

Standardized alert and callout components for displaying important information with visual emphasis across documentation pages.

## Components

### Alert
Interactive notification component for displaying important messages that may require user attention or action.

### Callout
Static emphasis component for highlighting important documentation content, tips, and warnings.

## Features

- ✅ Four core semantic variants: `info`, `warning`, `error`, `success`
- ✅ Additional `tip` variant for Callout
- ✅ Block and inline display modes
- ✅ Optional icon support (auto, custom, or disabled)
- ✅ Optional title support
- ✅ Accessible with proper ARIA attributes
- ✅ Dark mode support with proper contrast
- ✅ Respects `prefers-reduced-motion`
- ✅ Reusable across all docs pages

## Usage

### Alert Component

```tsx
import { Alert } from '@site/src/components/Alert';

// Basic usage
<Alert variant="info">
  This is an informational message.
</Alert>

// With title
<Alert variant="warning" title="Important Notice">
  Please review this warning before proceeding.
</Alert>

// Without icon
<Alert variant="error" icon={false}>
  An error occurred without an icon.
</Alert>

// Custom icon
<Alert variant="success" icon={<CustomIcon />}>
  Success with custom icon!
</Alert>

// Inline display
<Alert variant="info" display="inline">
  Inline alert message
</Alert>

// With close button
<Alert variant="warning" onClose={() => console.log('closed')}>
  Dismissible alert
</Alert>
```

### Callout Component

```tsx
import { Callout } from '@site/src/components/Alert';

// Basic usage
<Callout variant="info">
  This is important information to note.
</Callout>

// Tip variant
<Callout variant="tip" title="Pro Tip">
  Use this pattern for better performance.
</Callout>

// Warning with title
<Callout variant="warning" title="Breaking Change">
  This API will be deprecated in v2.0.
</Callout>

// Error callout
<Callout variant="error">
  This operation is not supported.
</Callout>

// Success callout
<Callout variant="success" title="Migration Complete">
  Your data has been successfully migrated.
</Callout>

// Without icon
<Callout variant="info" icon={false}>
  Information without an icon.
</Callout>

// Inline display
<Callout variant="tip" display="inline">
  Quick tip
</Callout>
```

### In MDX Files

```mdx
import { Alert, Callout } from '@site/src/components/Alert';

# My Documentation Page

<Callout variant="info" title="Before You Start">
  Make sure you have Node.js 20+ installed.
</Callout>

Some documentation content here...

<Alert variant="warning">
  This feature is experimental and may change in future releases.
</Alert>

<Callout variant="tip">
  **Pro tip:** You can use markdown inside callouts!
  
  - Item 1
  - Item 2
</Callout>
```

## API Reference

### Alert Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'info' \| 'warning' \| 'error' \| 'success'` | `'info'` | Visual style variant |
| `display` | `'block' \| 'inline'` | `'block'` | Display mode |
| `children` | `ReactNode` | required | Alert content |
| `title` | `string` | - | Optional title text |
| `icon` | `ReactNode \| boolean` | `true` | Icon to display (true=auto, false=none, ReactNode=custom) |
| `className` | `string` | - | Additional CSS classes |
| `onClose` | `() => void` | - | Close button handler |

### Callout Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `variant` | `'info' \| 'warning' \| 'error' \| 'success' \| 'tip'` | `'info'` | Visual style variant |
| `display` | `'block' \| 'inline'` | `'block'` | Display mode |
| `children` | `ReactNode` | required | Callout content |
| `title` | `string` | - | Optional title text |
| `icon` | `ReactNode \| boolean` | `true` | Icon to display (true=auto, false=none, ReactNode=custom) |
| `className` | `string` | - | Additional CSS classes |

## Variants

### Info (Blue)
Use for general information, tips, or neutral notices.

### Warning (Amber)
Use for cautions, deprecation notices, or actions that require attention.

### Error (Red)
Use for errors, critical issues, or blocking problems.

### Success (Green)
Use for successful operations, confirmations, or positive outcomes.

### Tip (Purple - Callout only)
Use for helpful suggestions, best practices, or pro tips.

## Accessibility

Both components follow accessibility best practices:

- Proper ARIA roles (`role="alert"` for Alert, `role="note"` for Callout)
- `aria-live` regions for dynamic alerts
- `aria-label` for screen readers
- Keyboard accessible close button
- Sufficient color contrast (WCAG AA compliant)
- Respects `prefers-reduced-motion`
- Focus visible indicators

## Design Tokens

Components use design tokens from `design-tokens.css`:

- Colors: `--color-{variant}-{shade}`
- Spacing: `--space-{size}`
- Border radius: `--radius-{size}`
- Shadows: `--shadow-{size}`
- Typography: `--font-{property}-{value}`

## Dark Mode

Both components automatically adapt to dark mode via `[data-theme='dark']` selectors with:
- Adjusted background opacity for better readability
- Lighter text colors for contrast
- Appropriate border and icon colors
- Maintained semantic meaning across themes

## When to Use

### Use Alert when:
- Displaying system notifications
- Showing validation feedback
- Communicating state changes
- User action is required or recommended
- Content may be dismissed

### Use Callout when:
- Emphasizing documentation content
- Highlighting important notes
- Showing tips and best practices
- Warning about breaking changes
- Content is static and informational

## Examples in Context

### Documentation Page Example

```mdx
---
title: Getting Started
---

<Callout variant="info" title="Prerequisites">
  Before you begin, ensure you have the following installed:
  - Node.js 20 or higher
  - npm or yarn package manager
</Callout>

## Installation

Install the package using npm:

\`\`\`bash
npm install soroban-sdk
\`\`\`

<Callout variant="warning">
  The Soroban SDK requires Rust 1.70 or higher.
</Callout>

## Quick Start

<Callout variant="tip" title="Pro Tip">
  Use the `--release` flag for production builds to optimize performance.
</Callout>

<Alert variant="success">
  Setup complete! You're ready to start building.
</Alert>
```

### Error Handling Example

```tsx
function MyComponent() {
  const [error, setError] = useState(null);

  return (
    <>
      {error && (
        <Alert variant="error" onClose={() => setError(null)}>
          {error.message}
        </Alert>
      )}
      {/* Component content */}
    </>
  );
}
```

## Testing

Components can be tested for:
- Variant rendering
- Icon display logic
- Title rendering
- Close button functionality
- Accessibility attributes
- Dark mode styles
- Responsive behavior

## Browser Support

Follows Docusaurus browser support:
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Mobile browsers (iOS Safari, Chrome Mobile)
- No IE11 support required
