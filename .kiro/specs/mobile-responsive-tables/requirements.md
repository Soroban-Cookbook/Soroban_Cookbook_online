# Requirements Document

## Introduction

This feature enables mobile-responsive tables in the Soroban Cookbook documentation. Currently, table styles are defined in custom.css using Infima's `--ifm-table-*` CSS custom properties. Wide tables may overflow on mobile devices without proper responsive handling. The feature will add CSS-based responsive behavior using either horizontal scrolling or card-based stacked layouts at mobile breakpoints.

## Glossary

- **Mobile_Viewport**: A browser viewport with width less than 768px (the `md` breakpoint)
- **Wide_Table**: A table with total column width exceeding the mobile viewport width
- **Scrollable_Table**: A table container with horizontal overflow scroll enabled
- **Stacked_Table**: A table transformed into a card-based layout where each row becomes a card on mobile
- **Breakpoint**: A CSS media query width threshold where responsive behavior changes

## Requirements

### Requirement 1: Horizontal Scroll Container

**User Story:** As a mobile reader, I want to view wide tables without horizontal page overflow, so that I can scroll horizontally within the table to see all columns.

#### Acceptance Criteria

1. THE Documentation_Site SHALL wrap tables in a horizontally scrollable container on mobile viewports
2. WHEN a table exceeds the mobile viewport width, THE Scroll_Container SHALL enable horizontal scrolling
3. THE Scroll_Container SHALL remain hidden on viewports 768px and wider
4. THE Scroll_Container SHALL have a visual indicator (shadow or border) when horizontal scroll is available

### Requirement 2: Mobile Card Layout Alternative

**User Story:** As a mobile reader, I want tables displayed as stacked cards for better readability, so that I can scan information without horizontal scrolling.

#### Acceptance Criteria

1. WHERE mobile card layout is enabled, THE Table_Transform SHALL convert table rows into card-style blocks
2. WHILE card layout is active, THE Table_Cell SHALL display with a label derived from the table header
3. THE Card_Layout SHALL apply only on viewports narrower than 768px
4. THE Card_Layout SHALL maintain proper spacing and border styling from the base table theme

### Requirement 3: Breakpoint Configuration

**User Story:** As a developer, I want configurable breakpoints for table responsiveness, so that I can tune the behavior for different screen sizes.

#### Acceptance Criteria

1. THE CSS SHALL use the existing breakpoint token `--breakpoint-md` (768px) as the mobile threshold
2. THE Mobile_Styles SHALL apply using a `min-width` media query of 768px to provide desktop-first base styles

### Requirement 4: Light and Dark Mode Support

**User Story:** As a reader, I want tables to remain readable in both light and dark themes, so that I have a consistent experience regardless of system theme.

#### Acceptance Criteria

1. THE Mobile_Table_Styles SHALL work with existing light mode table colors defined in `--ifm-table-*` tokens
2. THE Mobile_Table_Styles SHALL work with existing dark mode table colors defined in `--ifm-table-*` tokens
3. THE Scroll_Indicator SHALL adapt to theme (light shadow on light mode, dark shadow on dark mode)

### Requirement 5: Test on Gas and Resources Document

**User Story:** As a reviewer, I want the mobile-responsive tables tested on the gas-and-resources document, so that I can verify the feature works on real documentation tables.

#### Acceptance Criteria

1. THE Responsive_Styles SHALL be tested against tables in `docs/concepts/gas-and-resources.md`
2. WHEN gas-and-resources tables are viewed on mobile, THE Content SHALL be accessible via scroll or card layout

### Requirement 6: Accessibility Compliance

**User Story:** As a user relying on assistive technology, I want accessible table navigation on mobile, so that I can access table content without losing context.

#### Acceptance Criteria

1. THE Scroll_Container SHALL preserve table semantic structure (thead, tbody, tr, td) for screen readers
2. THE Card_Layout SHALL use proper ARIA roles where semantic table structure is transformed
3. THE Mobile_Table_Styles SHALL respect `prefers-reduced-motion` settings

### Requirement 7: Performance

**User Story:** As a site maintainer, I want responsive tables to have minimal performance impact, so that page load times remain fast on mobile.

#### Acceptance Criteria

1. THE Responsive_Behavior SHALL be implemented using CSS only (no JavaScript required for core functionality)
2. THE CSS_Media_Queries SHALL use existing breakpoint variables to avoid redundant parsing

## Implementation Notes

The suggested approach adds `@media` rules in custom.css for stacked table cells. Two patterns are recommended:

1. **Horizontal scroll (default):** Wrap tables in `.table-responsive` container with `overflow-x: auto`
2. **Card stack (optional):** Use `display: block` on rows with `::before` for header labels

Verification: Tables in the gas-and-resources document scroll horizontally or stack into cards on mobile viewports below 768px.