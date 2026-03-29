# Alert & Callout - Design Specifications

## Visual Design

### Alert Component

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ [Icon] Title                              [×]   │
│        Body content goes here                   │
└─────────────────────────────────────────────────┘
```

**Spacing:**
- Padding: 16px (--space-4)
- Gap between icon and content: 12px (--space-3)
- Border radius: 8px (--radius-lg)
- Border: 1px solid
- Margin (block): 16px 0 (--space-4)

**Typography:**
- Title: 16px (--font-size-base), semibold (600)
- Body: 14px (--font-size-sm), normal (400)
- Line height: 1.625 (--line-height-relaxed)

### Callout Component

**Structure:**
```
┌─────────────────────────────────────────────────┐
│ [Icon] Title                                    │
│        Body content with rich formatting        │
│        - Lists supported                        │
│        - Code blocks supported                  │
└─────────────────────────────────────────────────┘
```

**Spacing:**
- Padding: 16px 20px (--space-4 --space-5)
- Gap between icon and content: 12px (--space-3)
- Border radius: 8px (--radius-lg)
- Border-left: 4px solid (accent)
- Margin (block): 24px 0 (--space-6)
- Box shadow: --shadow-sm

**Typography:**
- Title: 18px (--font-size-lg), bold (700)
- Body: 16px (--font-size-base), normal (400)
- Line height: 1.625 (--line-height-relaxed)

## Color Specifications

### Light Mode

#### Info (Blue)
- Background: `#eff6ff` (--color-primary-50)
- Border: `#93c5fd` (--color-primary-300)
- Text: `#1e3a8a` (--color-primary-900)
- Icon: `#2563eb` (--color-primary-600)
- Title: `#1e40af` (--color-primary-800)
- Contrast Ratio: > 7:1 ✅

#### Warning (Amber)
- Background: `#fffbeb` (--color-warning-50)
- Border: `#fcd34d` (--color-warning-300)
- Text: `#78350f` (--color-warning-900)
- Icon: `#d97706` (--color-warning-600)
- Title: `#92400e` (--color-warning-800)
- Contrast Ratio: > 7:1 ✅

#### Error (Red)
- Background: `#fef2f2` (--color-error-50)
- Border: `#fca5a5` (--color-error-300)
- Text: `#7f1d1d` (--color-error-900)
- Icon: `#dc2626` (--color-error-600)
- Title: `#991b1b` (--color-error-800)
- Contrast Ratio: > 7:1 ✅

#### Success (Green)
- Background: `#f0fdf4` (--color-success-50)
- Border: `#86efac` (--color-success-300)
- Text: `#14532d` (--color-success-900)
- Icon: `#16a34a` (--color-success-600)
- Title: `#166534` (--color-success-800)
- Contrast Ratio: > 7:1 ✅

#### Tip (Purple - Callout only)
- Background: `#faf5ff` (--color-secondary-50)
- Border: `#d8b4fe` (--color-secondary-300)
- Text: `#581c87` (--color-secondary-900)
- Icon: `#9333ea` (--color-secondary-600)
- Title: `#6b21a8` (--color-secondary-800)
- Contrast Ratio: > 7:1 ✅

### Dark Mode

#### Info (Blue)
- Background: `rgba(37, 99, 235, 0.1)` (10% opacity)
- Border: `#1d4ed8` (--color-primary-700)
- Text: `#dbeafe` (--color-primary-100)
- Icon: `#60a5fa` (--color-primary-400)
- Title: `#bfdbfe` (--color-primary-200)
- Contrast Ratio: > 7:1 ✅

#### Warning (Amber)
- Background: `rgba(217, 119, 6, 0.1)` (10% opacity)
- Border: `#b45309` (--color-warning-700)
- Text: `#fef3c7` (--color-warning-100)
- Icon: `#fbbf24` (--color-warning-400)
- Title: `#fde68a` (--color-warning-200)
- Contrast Ratio: > 7:1 ✅

#### Error (Red)
- Background: `rgba(220, 38, 38, 0.1)` (10% opacity)
- Border: `#b91c1c` (--color-error-700)
- Text: `#fee2e2` (--color-error-100)
- Icon: `#f87171` (--color-error-400)
- Title: `#fecaca` (--color-error-200)
- Contrast Ratio: > 7:1 ✅

#### Success (Green)
- Background: `rgba(22, 163, 74, 0.1)` (10% opacity)
- Border: `#15803d` (--color-success-700)
- Text: `#dcfce7` (--color-success-100)
- Icon: `#4ade80` (--color-success-400)
- Title: `#bbf7d0` (--color-success-200)
- Contrast Ratio: > 7:1 ✅

#### Tip (Purple - Callout only)
- Background: `rgba(147, 51, 234, 0.15)` (15% opacity)
- Border: `#7e22ce` (--color-secondary-700)
- Text: `#f3e8ff` (--color-secondary-100)
- Icon: `#c084fc` (--color-secondary-400)
- Title: `#e9d5ff` (--color-secondary-200)
- Contrast Ratio: > 7:1 ✅

## Icon Mapping

| Variant | Icon | Source |
|---------|------|--------|
| Info | Info circle | lucide-react |
| Warning | Alert triangle | lucide-react |
| Error | X circle | lucide-react |
| Success | Check circle | lucide-react |
| Tip | Lightbulb | lucide-react |

## Accessibility Compliance

### ARIA Attributes
- Alert: `role="alert"`, `aria-live="assertive|polite"`
- Callout: `role="note"`, `aria-label`
- Close button: `aria-label="Close alert"`

### Keyboard Support
- Tab: Navigate to close button
- Enter/Space: Activate close button
- Focus visible indicators on all interactive elements

### Screen Reader Support
- Semantic HTML structure
- Descriptive ARIA labels
- Live region announcements for alerts
- Proper heading hierarchy

### Motion
- Respects `prefers-reduced-motion`
- Smooth transitions (150ms)
- No animations for reduced motion users

### Color Contrast
- All text meets WCAG 2.1 AA (4.5:1 minimum)
- Large text meets AAA (7:1)
- Icons have sufficient contrast
- Tested with contrast checkers

## Responsive Behavior

### Desktop (> 768px)
- Full width for block display
- Inline-flex for inline display
- Comfortable padding and spacing

### Mobile (≤ 768px)
- Maintains readability
- Touch-friendly close buttons
- Appropriate text sizing
- No horizontal scroll

## Browser Support

Tested and supported:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- iOS Safari 14+
- Chrome Mobile 90+

## Performance

- Minimal CSS footprint
- No JavaScript for static callouts
- Efficient re-renders for alerts
- CSS Modules for optimal loading
- No external dependencies beyond existing

## Integration

### Global MDX Availability
Components registered in `src/theme/MDXComponents.tsx`:
```tsx
import { Alert, Callout } from '@site/src/components/Alert';

export default {
  ...MDXComponents,
  Alert,
  Callout,
};
```

### TypeScript Support
Full type definitions exported:
- `AlertProps`, `AlertVariant`, `AlertDisplay`
- `CalloutProps`, `CalloutVariant`, `CalloutDisplay`

## Design Tokens Used

All styling uses existing design tokens:
- Colors: `--color-{variant}-{shade}`
- Spacing: `--space-{size}`
- Typography: `--font-{property}-{value}`
- Borders: `--radius-{size}`
- Shadows: `--shadow-{size}`
- Transitions: `--transition-{speed}`

## Testing Checklist

- ✅ All variants render correctly
- ✅ Icons display properly
- ✅ Titles render when provided
- ✅ Close button works (Alert)
- ✅ Dark mode switches correctly
- ✅ Inline display works
- ✅ Rich content renders (Callout)
- ✅ Keyboard navigation works
- ✅ Screen reader announces correctly
- ✅ Color contrast passes WCAG AA
- ✅ Reduced motion respected
- ✅ Mobile responsive
- ✅ TypeScript types work
- ✅ No console errors

## Maintenance

### Adding New Variants
1. Add color tokens to `design-tokens.css`
2. Add icon to `variantIcons` object
3. Add CSS variant styles
4. Update TypeScript types
5. Document in README

### Customization
Components accept `className` prop for additional styling:
```tsx
<Alert variant="info" className="my-custom-class">
  Custom styled alert
</Alert>
```

## Conclusion

Implementation is complete and production-ready. All acceptance criteria met with comprehensive documentation, accessibility compliance, and full reusability across the documentation site.
