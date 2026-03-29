# Alert & Callout - Quick Reference

## Import (TSX/React files only)

```tsx
import { Alert, Callout } from '@site/src/components/Alert';
```

**Note:** No import needed in MDX files - components are globally available.

## Alert - Quick Examples

```mdx
<!-- Basic -->
<Alert variant="info">Message</Alert>
<Alert variant="warning">Message</Alert>
<Alert variant="error">Message</Alert>
<Alert variant="success">Message</Alert>

<!-- With title -->
<Alert variant="warning" title="Important">Message</Alert>

<!-- Without icon -->
<Alert variant="info" icon={false}>Message</Alert>

<!-- Inline -->
<Alert variant="info" display="inline">Message</Alert>

<!-- Dismissible (TSX only) -->
<Alert variant="warning" onClose={() => handleClose()}>Message</Alert>
```

## Callout - Quick Examples

```mdx
<!-- Basic -->
<Callout variant="info">Content</Callout>
<Callout variant="warning">Content</Callout>
<Callout variant="error">Content</Callout>
<Callout variant="success">Content</Callout>
<Callout variant="tip">Content</Callout>

<!-- With title -->
<Callout variant="tip" title="Pro Tip">Content</Callout>

<!-- Without icon -->
<Callout variant="info" icon={false}>Content</Callout>

<!-- Inline -->
<Callout variant="tip" display="inline">Content</Callout>

<!-- Rich content -->
<Callout variant="warning" title="Important">
  Multiple paragraphs and **markdown** supported.
  
  - List item 1
  - List item 2
  
  ```js
  const code = true;
  ```
</Callout>
```

## Variants Guide

| Variant | Color | Use For |
|---------|-------|---------|
| `info` | Blue | General information, notices |
| `warning` | Amber | Cautions, deprecations |
| `error` | Red | Errors, critical issues |
| `success` | Green | Confirmations, best practices |
| `tip` | Purple | Pro tips (Callout only) |

## Common Patterns

### Prerequisites

```mdx
<Callout variant="info" title="Prerequisites">
  - Node.js 20+
  - Rust 1.70+
</Callout>
```

### Breaking Changes

```mdx
<Callout variant="warning" title="Breaking Change">
  API changed in v2.0. See migration guide.
</Callout>
```

### Error Documentation

```mdx
<Callout variant="error" title="Common Error">
  If you see this error, check your configuration.
</Callout>
```

### Best Practices

```mdx
<Callout variant="success" title="Best Practice">
  Always validate input before processing.
</Callout>
```

### Tips

```mdx
<Callout variant="tip" title="Pro Tip">
  Use `--release` flag for production builds.
</Callout>
```

## Props Reference

### Alert

- `variant`: `'info' | 'warning' | 'error' | 'success'` (default: `'info'`)
- `display`: `'block' | 'inline'` (default: `'block'`)
- `title`: `string` (optional)
- `icon`: `ReactNode | boolean` (default: `true`)
- `onClose`: `() => void` (optional)
- `className`: `string` (optional)

### Callout

- `variant`: `'info' | 'warning' | 'error' | 'success' | 'tip'` (default: `'info'`)
- `display`: `'block' | 'inline'` (default: `'block'`)
- `title`: `string` (optional)
- `icon`: `ReactNode | boolean` (default: `true`)
- `className`: `string` (optional)

## Demo Pages

- `/alerts-demo` - Dedicated Alert & Callout demo
- `/components-demo` - All components including Alert & Callout
- `/docs/components/alerts-callouts` - Documentation guide
- `/docs/design-system/alerts-callouts` - Design system reference
