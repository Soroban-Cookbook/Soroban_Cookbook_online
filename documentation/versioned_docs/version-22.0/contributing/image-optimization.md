---
title: Image Optimization Guidelines
description: Best practices for using images in Soroban Cookbook documentation
---

This guide covers best practices for using images in the Soroban Cookbook documentation to ensure optimal performance and user experience.

## Quick Start

Use the `OptimizedImage` component for all images:

```tsx
import OptimizedImage from '@site/src/components/OptimizedImage';

<OptimizedImage
  src="/img/example.png"
  alt="Descriptive alt text"
  width={300}
  height={200}
  loading="lazy"
/>;
```

## Image Formats

### Preferred Formats

- **WebP**: Use for all photographic images and illustrations
- **SVG**: Use for icons, logos, and simple graphics
- **PNG**: Use only when transparency is required and WebP isn't suitable

### Format Priority

1. WebP (modern browsers) → PNG/JPEG fallback
2. SVG for vector graphics
3. Avoid GIFs (use WebP for animations)

## Image Sizing

### Responsive Images

- Always specify `width` and `height` attributes
- Use appropriate sizes for display (don't serve larger images than needed)
- Consider retina displays (2x resolution)

### Common Sizes

- **Thumbnails**: 150-300px width
- **Content images**: 600-800px width
- **Hero images**: 1200px width
- **Social cards**: 1200x630px

## Performance Optimization

### Lazy Loading

All images should use lazy loading except for:

- Above-the-fold hero images
- Critical images for user experience

```tsx
<OptimizedImage
  src="/img/example.png"
  alt="Description"
  loading="lazy" // Default for OptimizedImage
/>
```

### Compression Guidelines

- **Photographic images**: Quality 80-85%
- **Illustrations**: Quality 85-90%
- **Icons/logos**: Quality 90-95%

## Dark Mode Support

Consider providing dark mode variants for images that:

- Contain text that may be hard to read in dark mode
- Use bright colors that may be jarring in dark themes
- Are screenshots showing light interfaces

### Implementation

```tsx
import useThemeContext from '@theme/hooks/useThemeContext';

const { isDarkTheme } = useThemeContext();

<OptimizedImage
  src={isDarkTheme ? '/img/example-dark.png' : '/img/example.png'}
  alt="Description"
  width={300}
  height={200}
/>;
```

## File Organization

### Directory Structure

```
static/img/
├── components/     # UI component images
├── patterns/       # Pattern illustrations
├── social/         # Social media cards
├── tutorials/      # Tutorial screenshots
└── icons/          # Icon files
```

### Naming Convention

- Use kebab-case: `pattern-overview.png`
- Include size suffix for variants: `pattern-overview-small.webp`
- Include theme suffix: `pattern-overview-dark.webp`

## Alt Text Guidelines

### Good Alt Text

- Descriptive and concise
- Conveys the image's purpose
- Includes relevant context

### Examples

```tsx
// Good
<OptimizedImage src="/img/soroban-logo.svg" alt="Soroban smart contract platform logo" />

// Bad
<OptimizedImage src="/img/soroban-logo.svg" alt="logo" />
```

## Image Optimization Script

Use the provided PowerShell script to optimize images:

```powershell
.\scripts\optimize-images.ps1
```

This script:

- Converts images to WebP format
- Resizes images appropriately
- Maintains original files as backups
- Reports size reductions

## Performance Monitoring

### Before/After Metrics

Track these metrics when optimizing images:

- Total page weight reduction
- Largest Contentful Paint (LCP) improvement
- Cumulative Layout Shift (CLS) reduction

### Tools

- Lighthouse audits
- WebPageTest
- Chrome DevTools Network tab

## Common Issues and Solutions

### Large File Sizes

- **Problem**: Images over 1MB
- **Solution**: Resize and compress, use WebP format

### Missing Dimensions

- **Problem**: Layout shift during loading
- **Solution**: Always specify width/height attributes

### Poor Alt Text

- **Problem**: Accessibility issues
- **Solution**: Write descriptive alt text for all images

### No WebP Support

- **Problem**: Older browsers can't display WebP
- **Solution**: Use `OptimizedImage` component with fallbacks

## Review Checklist

Before adding new images:

- [ ] Image is appropriately sized for display
- [ ] WebP format is used (when applicable)
- [ ] Alt text is descriptive and accurate
- [ ] Width/height attributes are specified
- [ ] Lazy loading is used (unless above-the-fold)
- [ ] Dark mode variant is considered
- [ ] File follows naming conventions
- [ ] Image is placed in correct directory

## Migration Guide

### Existing Images

1. Run the optimization script
2. Update image usage to use `OptimizedImage` component
3. Add proper alt text
4. Specify dimensions
5. Test in both light and dark modes

### Performance Impact

- **404 page**: Reduced from 1.9MB to ~50KB (97% reduction)
- **Social cards**: Reduced by 60-80%
- **Overall site weight**: Reduced by 40-60%

---

## Related links

- [Contributing Guide](/docs/contributing) — documentation contribution workflow
- [Image Optimization Performance Impact](/docs/contributing/performance-impact) — before/after metrics
- [Empty States](/docs/design-system/empty-states) — image usage in UI patterns
