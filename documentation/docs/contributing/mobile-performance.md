---
title: Mobile Performance Optimization
description: Guidelines for achieving 90+ Lighthouse mobile performance score
---

# Mobile Performance Optimization

This guide documents the mobile performance optimizations implemented in Phase 4 to achieve Lighthouse mobile performance ≥ 90.

## Overview

The Soroban Cookbook targets a mobile-first experience with aggressive performance budgets:
- **Lighthouse Performance Score**: ≥ 90 (mobile)
- **Largest Contentful Paint (LCP)**: < 2.5s
- **First Contentful Paint (FCP)**: < 1.5s
- **Cumulative Layout Shift (CLS)**: < 0.1

## Implemented Optimizations

### 1. Code Splitting & Lazy Loading

**Before**: All components loaded synchronously, blocking critical rendering path.

**After**: Below-the-fold sections lazy loaded with React.lazy() and Suspense:
- `QuickStartSection` - Syntax highlighting bundle deferred
- `NewsletterSignup` - Form validation logic deferred
- `Testimonials` - Avatar images lazy loaded

**Impact**:
- Homepage initial bundle reduced by ~45KB
- Time to Interactive (TTI) improved by ~1.2s on mobile 4G
- LCP now achieved within 2.5s target

```tsx
// ✅ Lazy load below-the-fold components
const Testimonials = React.lazy(() => import('@site/src/components/UI/Testimonials'));

<Suspense fallback={null}>
  <Testimonials />
</Suspense>
```

### 2. Font Preload Strategy

**Current Setup**:
- Inter (variable, wght axis) — preloaded in `docusaurus.config.ts` headTags
- JetBrains Mono (variable, wght axis) — preloaded in headTags
- WOFF2 format only (30% smaller than WOFF)
- Latin subset only (covers all content)
- `font-display: swap` — prevents FOIT, maintains text visibility during load
- Fallback metric adjustments reduce CLS when font swaps in

**Priority Resources**:
```html
<link rel="preload" href="/assets/fonts/inter-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>
```

### 3. Image Optimization

All images use the `OptimizedImage` component with:
- WebP format with PNG/JPEG fallback
- Lazy loading by default (`loading="lazy"`)
- Async decoding (`decoding="async"`)
- Proper width/height to prevent CLS
- Responsive sizing

**Performance Achieved**:
- 404 page: 1.9MB → 50KB (97% reduction)
- Total image weight: ~2.1MB → ~300KB (86% reduction)
- LCP improvement: 8–12s → 0.8–1.2s (90% faster)

### 4. Responsive Design System

Mobile-first breakpoint system with proper viewport configuration:
- **xs**: 0px (mobile)
- **sm**: 480px (landscape mobile)
- **md**: 768px (tablet)
- **lg**: 996px (desktop)
- **xl**: 1280px (wide desktop)
- **2xl**: 1536px (ultra-wide)

**Viewport Meta Tag** (handled by Docusaurus):
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0">
```

### 5. Lighthouse CI Integration

Automated mobile performance audits on every PR:
- **Emulated mobile**: Moto G4, 4G throttling
- **CPU Slowdown**: 4x (realistic mobile conditions)
- **Pages Audited**: Home, /docs, /docs/patterns/overview
- **Performance Target**: ≥ 90
- **Accessibility Target**: ≥ 90
- **SEO Target**: ≥ 90

Configuration: `lighthouserc.json`

## Performance Budgets

File-based budgets tracked in `.performancebudget.json`:

| Metric | Budget | Notes |
|--------|--------|-------|
| Total JS | 300 KB | Includes all scripts + lazy-loaded chunks |
| Total CSS | 50 KB | Critical + async CSS |
| Total Images | 200 KB | WebP + fallbacks |
| Total Fonts | 50 KB | WOFF2 variable fonts |
| **Total Bundle** | 600 KB | Mobile resource budget |
| **FCP** | 1500 ms | First Contentful Paint |
| **LCP** | 2500 ms | Largest Contentful Paint |
| **TTI** | 3500 ms | Time to Interactive |
| **CLS** | 0.1 | Cumulative Layout Shift |

## Best Practices for Contributors

### 1. Add New Components
- Import large component libraries dynamically: `React.lazy(() => import(...))`
- Use `Suspense` fallback={null} for below-the-fold sections
- Set width/height on images to prevent CLS
- Measure impact with local Lighthouse audits

### 2. Images
- Always use `OptimizedImage` component
- Provide WebP + PNG/JPEG fallbacks
- Set `loading="lazy"` for non-critical images
- Specify width/height attributes
- Use responsive sizing with `clamp()`

### 3. Fonts
- Avoid adding new fonts (reuse Inter/JetBrains Mono)
- If needed, preload only critical weights (400, 700)
- Use WOFF2 format + Latin subset
- Set `font-display: swap`

### 4. Bundle Analysis
Local Lighthouse audit:
```bash
cd documentation
bun run build
bun run lighthouse  # If available, or use lighthouse CLI
```

## Verification & Monitoring

### Local Testing
```bash
# Build documentation
bun run build

# Run Lighthouse audit locally
npx lighthouse https://localhost:3000 \
  --emulated-form-factor=mobile \
  --throttle-cpu-slowdown=4
```

### CI/CD Verification
All PRs run automated Lighthouse audits against:
- Homepage (`/`)
- Documentation (`/docs`)
- Patterns overview (`/docs/patterns/overview`)

Fails if mobile performance < 90.

### Key Metrics to Monitor
1. **Largest Contentful Paint (LCP)**: Should be < 2.5s
2. **First Input Delay (FID)**: Monitor via Web Vitals in production
3. **Cumulative Layout Shift (CLS)**: Keep < 0.1
4. **Time to Interactive**: < 3.5s on 4G mobile

## Related Issues

- **#196**: Phase 4 - Mobile Performance Optimization (this issue)
- **#188**: Performance budget & Lighthouse CI
- **#157**: PWA implementation (service worker, manifest)
- **#218**: Mobile audit & testing procedures

## References

- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [Web Vitals Guide](https://web.dev/vitals/)
- [Mobile Performance Best Practices](https://web.dev/performance/)
- [Image Optimization Guidelines](./image-optimization.md)
