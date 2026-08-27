# Design Document: Mobile Responsive Tables

## Overview

This design document specifies CSS-based responsive table behavior for the Soroban Cookbook documentation site. The feature addresses mobile readability issues with wide tables by providing two responsive modes: horizontal scrolling and stacked card layout.

The implementation leverages existing Infima CSS custom properties (`--ifm-table-*`, `--breakpoint-md`) to minimize maintenance overhead and ensure theme consistency across light/dark modes.

## Architecture

### Design Decisions

The responsive table feature uses a **desktop-first architecture** where base table styles apply at viewport widths ≥768px, with mobile overrides applying below this threshold via CSS media queries. This approach:

- Aligns with Infima's existing CSS architecture
- Avoids redundant breakpoint definitions
- Ensures minimal CSS specificity conflicts

### Two Responsive Modes

1. **Horizontal Scroll (Default)**: Tables wrap in a horizontally scrollable container that becomes visible only on mobile viewports
2. **Card Stack (Optional)**: Transforms table rows into card-style blocks using CSS pseudo-elements for header labels

### Component Hierarchy

```
Documentation Page
└── Table Wrapper (.table-responsive)
    └── HTML Table (native semantic structure)
        ├── Table Head (thead)
        ├── Table Body (tbody)
        │   └── Table Row (tr)
        │       └── Table Cell (td) + Table Header (th)
```

## Components and Interfaces

### CSS Custom Properties

The feature introduces no new CSS variables. It reuses existing tokens:

| Token | Purpose | Source |
|-------|---------|--------|
| `--breakpoint-md` | Mobile threshold (768px) | Infima |
| `--ifm-table-border-color` | Table borders | custom.css |
| `--ifm-table-head-background` | Header background | custom.css |
| `--ifm-table-stripe-background` | Alternating row background | custom.css |
| `--ifm-font-color-base` | Text color | Infima |
| `--ifm-background-color` | Page background | Infima |

### CSS Classes

| Class | Scope | Purpose |
|-------|-------|---------|
| `.table-responsive` | Container | Enables horizontal scroll on mobile |
| `.table-stacked` | Table | Transforms to card layout on mobile |

### Media Query Specification

```css
/* Mobile-first: apply styles below 768px */
@media (max-width: 767px) {
  .table-responsive { /* horizontal scroll styles */ }
  .table-stacked { /* card layout styles */ }
}
```

## Data Models

### Table State Transitions

| State | Viewport | Behavior |
|-------|----------|----------|
| Desktop | ≥768px | Standard table layout, no wrapper |
| Mobile Scroll | <768px | Horizontal overflow container visible |
| Mobile Stacked | <768px with `.table-stacked` | Card-based row blocks |

### Theme Adaptation

The scroll indicator uses theme-aware shadows:

| Theme | Shadow Color |
|-------|--------------|
| Light | `rgba(0, 0, 0, 0.1)` |
| Dark | `rgba(0, 0, 0, 0.3)` |

This adapts automatically via CSS custom properties that Infima provides for both themes.

---

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

## Correctness Properties

### Property 1: Horizontal scroll container visibility

*For any* documentation page containing a table wrapped in `.table-responsive`, when the viewport width is less than 768px, the container SHALL enable horizontal scrolling and display a visual scroll indicator.

**Validates: Requirements 1.1, 1.2, 1.4**

### Property 2: Scroll container hidden on desktop

*For any* documentation page containing a table wrapped in `.table-responsive`, when the viewport width is 768px or greater, the container SHALL NOT apply overflow scrolling styles.

**Validates: Requirements 1.3**

### Property 3: Card layout cell labeling

*For any* table with `.table-stacked` class on mobile viewports, each table cell in the body SHALL display a label derived from its corresponding column header using CSS `::before` pseudo-elements.

**Validates: Requirements 2.2**

### Property 4: Card layout breakpoint isolation

*For any* table with `.table-stacked` class, the card transformation styles SHALL NOT apply when the viewport width is 768px or greater.

**Validates: Requirements 2.3**

### Property 5: Theme consistency

*For any* responsive table style applied, the visual appearance (borders, backgrounds, text colors) SHALL use the same CSS custom properties (`--ifm-table-*`) as the base table theme, ensuring consistent light/dark mode support.

**Validates: Requirements 4.1, 4.2, 4.3**

### Property 6: Semantic structure preservation

*For any* responsive table transformation applied (scroll or stacked), the DOM structure of the table elements (thead, tbody, tr, td, th) SHALL remain unchanged for screen reader accessibility.

**Validates: Requirements 6.1**

### Property 7: Reduced motion respect

*For any* responsive table behavior, when the user's system prefers reduced motion (`prefers-reduced-motion: reduce`), the scroll and transition effects SHALL be disabled or use instant timing.

**Validates: Requirements 6.3**

### Property 8: CSS-only implementation

*For any* responsive table functionality, all core responsive behaviors SHALL be implemented using CSS only, with no JavaScript dependencies for detection, wrapping, or transformation.

**Validates: Requirements 7.1, 7.2**

---

## Error Handling

### Handling Strategies

| Scenario | Handling |
|----------|----------|
| Missing table headers for card labels | Fall back to column index (e.g., "Column 1") |
| Malformed table HTML | Browser's native table rendering applies |
| Very narrow viewports (<320px) | CSS allows natural overflow; containers use min-width |

The feature uses defensive CSS that gracefully degrades to native table behavior when responsive styles cannot be applied.

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests (for specific examples and edge cases) and property-based tests (for universal properties across all valid inputs).

### Unit Tests

Unit tests verify specific examples and edge cases:

1. **Scroll container rendering**: Verify `.table-responsive` applies `overflow-x: auto` on viewports <768px
2. **Card layout transformation**: Verify table rows transform to `display: block` with proper borders
3. **Theme switching**: Verify visual consistency when toggling between light/dark modes
4. **Reduced motion**: Verify animations disable when `prefers-reduced-motion` is set

### Property-Based Tests

Property-based tests verify universal properties across generated inputs:

1. **For all** viewport widths <768px, horizontal scroll containers enable overflow scrolling
2. **For all** viewport widths ≥768px, scroll containers have no overflow styles
3. **For all** theme configurations, responsive styles use existing `--ifm-table-*` tokens
4. **For all** table structures, semantic DOM elements remain intact after responsive transformation

### Configuration

- Property-based tests: minimum 100 iterations per property
- Test tagging: `Feature: mobile-responsive-tables, Property N: [description]`
- Browser compatibility: Chrome, Firefox, Safari, Edge (latest 2 versions)

### Testing Tools

- **Unit tests**: Vitest or Jest with JSDOM for DOM manipulation tests
- **Visual regression**: Chrome DevTools Device Mode or Playwright for cross-browser testing
- **CSS validation**: CSS Lint or Stylelint with responsive-suffix rules