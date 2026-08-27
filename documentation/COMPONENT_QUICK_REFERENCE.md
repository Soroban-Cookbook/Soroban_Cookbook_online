# Alert & Callout Components - Quick Reference

## Import

```tsx
import { Alert } from '@site/src/components/Alert';
import { Callout } from '@site/src/components/Callout';
```

## Alert Component

### Basic Usage

```tsx
<Alert variant="info">Your message</Alert>
<Alert variant="warning">Your message</Alert>
<Alert variant="error">Your message</Alert>
<Alert variant="success">Your message</Alert>
```

### With Title

```tsx
<Alert variant="info" title="Important">
  Your message here
</Alert>
```

### Inline Display

```tsx
Text with <Alert variant="info" display="inline">inline alert</Alert> inside.
```

### Without Icon

```tsx
<Alert variant="warning" icon={false}>
  Message without icon
</Alert>
```

### With Close Button

```tsx
<Alert variant="info" onClose={() => console.log('Closed')}>
  Dismissible alert
</Alert>
```

### Props

| Prop        | Type                                          | Default   | Description                                |
| ----------- | --------------------------------------------- | --------- | ------------------------------------------ |
| `variant`   | `'info' \| 'warning' \| 'error' \| 'success'` | `'info'`  | Visual style                               |
| `display`   | `'block' \| 'inline'`                         | `'block'` | Display mode                               |
| `title`     | `string`                                      | -         | Optional title                             |
| `icon`      | `ReactNode \| boolean`                        | `true`    | Icon (true=default, false=none, or custom) |
| `onClose`   | `() => void`                                  | -         | Close callback                             |
| `className` | `string`                                      | -         | Additional CSS classes                     |

## Callout Component

### Basic Usage

```tsx
<Callout variant="info">Your message</Callout>
<Callout variant="warning">Your message</Callout>
<Callout variant="error">Your message</Callout>
<Callout variant="success">Your message</Callout>
<Callout variant="tip">Your message</Callout>
```

### With Custom Title

```tsx
<Callout variant="tip" title="Pro Tip">
  Your helpful tip here
</Callout>
```

### Without Icon

```tsx
<Callout variant="info" icon={false}>
  Message without icon
</Callout>
```

### Props

| Prop        | Type                                                   | Default        | Description                                |
| ----------- | ------------------------------------------------------ | -------------- | ------------------------------------------ |
| `variant`   | `'info' \| 'warning' \| 'error' \| 'success' \| 'tip'` | `'info'`       | Visual style                               |
| `title`     | `string`                                               | Auto-generated | Title text                                 |
| `icon`      | `ReactNode \| boolean`                                 | `true`         | Icon (true=default, false=none, or custom) |
| `className` | `string`                                               | -              | Additional CSS classes                     |

## When to Use What

### Use Alert When:

- Inline feedback for user actions
- Form validation messages
- System status notifications
- Temporary messages that may be dismissed
- Inline contextual information

### Use Callout When:

- Documentation emphasis
- Important guidance in tutorials
- Highlighting best practices or anti-patterns
- Permanent informational content in docs
- Section-level warnings or tips

## Variant Selection Guide

| Variant                | Use For                                 | Examples                                      |
| ---------------------- | --------------------------------------- | --------------------------------------------- |
| **info**               | General information, neutral messages   | Prerequisites, context, explanations          |
| **warning**            | Cautions, deprecations, important notes | Breaking changes, potential issues            |
| **error**              | Critical issues, mistakes to avoid      | Common errors, anti-patterns, security issues |
| **success**            | Confirmations, best practices           | Successful operations, recommended patterns   |
| **tip** (Callout only) | Helpful hints, optimizations            | Performance tips, shortcuts, pro tips         |

## Examples in Context

### Tutorial Page

```tsx
<Alert variant="info">
  This tutorial requires Rust 1.70+ and Soroban CLI installed.
</Alert>

<Callout variant="tip" title="Quick Start">
  New to Soroban? Check out our beginner's guide first.
</Callout>

// Tutorial content...

<Callout variant="warning" title="Common Pitfall">
  Don't forget to call require_auth() before state changes.
</Callout>
```

### API Documentation

```tsx
<Callout variant="info" title="About This Function">
  The `transfer` function moves tokens between accounts with authorization.
</Callout>

<Alert variant="warning" title="Deprecated">
  This function is deprecated. Use `transfer_with_memo` instead.
</Alert>

<Callout variant="success" title="Best Practice">
  Always validate the amount parameter before processing transfers.
</Callout>
```

### Error Documentation

```tsx
<Callout variant="error" title="Common Error">
  **Error:** "Insufficient balance"

  This occurs when trying to transfer more tokens than available.

  **Solution:** Check the balance before calling transfer.
</Callout>

<Alert variant="error">
  Never store private keys in contract storage!
</Alert>
```

## Styling Notes

- Both components use design tokens for consistency
- Full dark mode support (automatic)
- WCAG AA compliant color contrast
- Responsive and mobile-friendly
- Supports rich content (lists, code, links)

## Accessibility

- Semantic HTML with ARIA roles
- Keyboard navigable
- Screen reader friendly
- Respects reduced motion preferences
- High contrast mode support

## Testing Checklist

- [ ] Component renders in light mode
- [ ] Component renders in dark mode
- [ ] All variants display correctly
- [ ] Icons appear (or hidden when icon={false})
- [ ] Title displays when provided
- [ ] Content renders properly (text, lists, code, links)
- [ ] Keyboard navigation works
- [ ] Screen reader announces content
- [ ] Responsive on mobile/tablet/desktop
- [ ] No console errors or warnings
