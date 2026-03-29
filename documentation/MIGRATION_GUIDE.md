# Migration Guide - Using Alert & Callout Components

## Overview

This guide helps you migrate existing documentation to use the new Alert and Callout components for consistent visual emphasis.

## Quick Start

Alert and Callout components are now available globally in all MDX files. No import needed!

## Common Migration Patterns

### Replace Blockquotes with Callouts

**Before:**
```mdx
> **Note:** This is important information.
```

**After:**
```mdx
<Callout variant="info" title="Note">
  This is important information.
</Callout>
```

### Replace Bold Text Warnings with Alerts

**Before:**
```mdx
**⚠️ Warning:** Be careful with this operation.
```

**After:**
```mdx
<Alert variant="warning">
  Be careful with this operation.
</Alert>
```

### Replace Manual Emphasis with Callouts

**Before:**
```mdx
---
**Prerequisites:**
- Node.js 20+
- Rust 1.70+
---
```

**After:**
```mdx
<Callout variant="info" title="Prerequisites">
  - Node.js 20+
  - Rust 1.70+
</Callout>
```

### Replace Error Documentation

**Before:**
```mdx
**Common Error:** If you see `MODULE_NOT_FOUND`, run `npm install`.
```

**After:**
```mdx
<Callout variant="error" title="Common Error">
  If you see `MODULE_NOT_FOUND`, run `npm install`.
</Callout>
```

### Replace Tips and Best Practices

**Before:**
```mdx
💡 **Tip:** Use environment variables for configuration.
```

**After:**
```mdx
<Callout variant="tip" title="Pro Tip">
  Use environment variables for configuration.
</Callout>
```

## Variant Selection Guide

### Use `info` for:
- General information
- Context and background
- Prerequisites
- Additional details
- References

### Use `warning` for:
- Cautions and gotchas
- Deprecation notices
- Breaking changes
- Important considerations
- Actions requiring attention

### Use `error` for:
- Common errors
- Troubleshooting
- What to avoid
- Critical issues
- Failure scenarios

### Use `success` for:
- Best practices
- Recommended patterns
- Successful outcomes
- Confirmations
- Optimal approaches

### Use `tip` for:
- Pro tips
- Performance optimizations
- Helpful suggestions
- Advanced techniques
- Shortcuts

## Alert vs Callout Decision Tree

```
Is the content dynamic or dismissible?
├─ Yes → Use Alert
└─ No → Is it documentation emphasis?
    ├─ Yes → Use Callout
    └─ No → Use regular text
```

## Examples by Documentation Section

### Getting Started Pages

```mdx
<Callout variant="info" title="Prerequisites">
  Before you begin, ensure you have Node.js 20+ installed.
</Callout>

<Callout variant="tip">
  On Windows, use the rustup installer for easier setup.
</Callout>

<Alert variant="success">
  Setup complete! You're ready to build.
</Alert>
```

### Concept Pages

```mdx
<Callout variant="info" title="Key Concept">
  Smart contracts are immutable once deployed.
</Callout>

<Callout variant="warning">
  This feature is experimental and may change.
</Callout>
```

### Tutorial Pages

```mdx
<Callout variant="tip" title="Pro Tip">
  Use the `--release` flag for production builds.
</Callout>

<Callout variant="error" title="Common Mistake">
  Don't forget to initialize the contract before use.
</Callout>
```

### API Reference Pages

```mdx
<Callout variant="warning" title="Deprecated">
  This method is deprecated. Use `newMethod()` instead.
</Callout>

<Callout variant="success" title="Best Practice">
  Always validate input parameters.
</Callout>
```

### Security Pages

```mdx
<Callout variant="error" title="Security Warning">
  Never expose private keys in your code.
</Callout>

<Callout variant="success" title="Secure Pattern">
  Use environment variables for sensitive data.
</Callout>
```

## Styling Tips

### Keep It Concise

**Good:**
```mdx
<Alert variant="warning">
  This operation is irreversible.
</Alert>
```

**Avoid:**
```mdx
<Alert variant="warning">
  Please be aware that this operation is irreversible and cannot be undone once you proceed with it.
</Alert>
```

### Use Titles Effectively

**Good:**
```mdx
<Callout variant="tip" title="Performance Tip">
  Enable caching for faster builds.
</Callout>
```

**Avoid:**
```mdx
<Callout variant="tip" title="This is a tip about performance">
  Enable caching for faster builds.
</Callout>
```

### Rich Content in Callouts

```mdx
<Callout variant="warning" title="Breaking Changes">
  Version 2.0 includes several breaking changes:
  
  1. `oldMethod()` removed → use `newMethod()`
  2. Config format changed → see [migration guide](/docs/migration)
  3. Minimum Node.js version: 20+
  
  ```js
  // Old
  oldMethod();
  
  // New
  newMethod();
  ```
</Callout>
```

## Accessibility Considerations

### Always Provide Context

**Good:**
```mdx
<Alert variant="error" title="Deployment Failed">
  Check your network connection and try again.
</Alert>
```

**Avoid:**
```mdx
<Alert variant="error">
  Error!
</Alert>
```

### Use Semantic Variants

Choose variants based on semantic meaning, not just color preference:
- Info = informational
- Warning = caution
- Error = problem
- Success = positive outcome
- Tip = helpful suggestion

### Keyboard Users

All interactive elements (close buttons) are keyboard accessible. No additional work needed.

## Testing Your Migration

1. **Visual Check:**
   - View page in browser
   - Toggle dark mode
   - Check on mobile

2. **Accessibility Check:**
   - Tab through interactive elements
   - Test with screen reader
   - Verify color contrast

3. **Content Check:**
   - Ensure variant matches content
   - Verify titles are concise
   - Check for proper emphasis

## Common Questions

### Q: Do I need to import in MDX files?
**A:** No! Components are globally available in all MDX files.

### Q: Can I use markdown inside?
**A:** Yes! Callouts support rich markdown content including lists, code blocks, and links.

### Q: How do I customize colors?
**A:** Use the `className` prop to add custom styles, or modify design tokens in `design-tokens.css`.

### Q: Can I use custom icons?
**A:** Yes! Pass a React element to the `icon` prop:
```tsx
<Alert variant="info" icon={<CustomIcon />}>Message</Alert>
```

### Q: Are these accessible?
**A:** Yes! All variants meet WCAG 2.1 AA standards with proper ARIA attributes and keyboard support.

## Need Help?

- See `src/components/Alert/README.md` for full documentation
- See `src/components/Alert/QUICK_REFERENCE.md` for quick examples
- View demos at `/alerts-demo` and `/components-demo`
- Check MDX docs at `/docs/components/alerts-callouts`

## Rollout Strategy

### Phase 1: New Content
Start using Alert/Callout in all new documentation pages.

### Phase 2: High-Traffic Pages
Migrate getting-started and core concept pages.

### Phase 3: Comprehensive Migration
Update remaining documentation pages as time permits.

### Phase 4: Cleanup
Remove old emphasis patterns (blockquotes, bold warnings, etc.).

---

**Ready to start?** Open any `.mdx` file and add your first Alert or Callout!
