# Implementation Plan: mobile-responsive-tables

## Overview

CSS-only responsive table implementation with two modes: horizontal scroll (default) and stacked card layout (optional). Uses existing Infima CSS tokens for theme consistency. Testing focuses on visual regression and property validation across breakpoints.

## Tasks

- [ ] 1. Set up testing infrastructure for CSS responsive behavior
  - Identify existing test framework (Vitest/Jest) in the project
  - Configure visual regression testing (Playwright or similar)
  - Set up CSS linting (Stylelint) with responsive rules
  - _Requirements: 7.1, 7.2_

- [ ] 2. Implement horizontal scroll container (.table-responsive)
  - [ ] 2.1 Create `.table-responsive` CSS class in custom.css
    - Add `overflow-x: auto` for viewports <768px
    - Add scroll indicator (box-shadow on right edge)
    - Use existing `--ifm-table-*` tokens for consistency
    - _Requirements: 1.1, 1.2, 1.4_

  - [ ] 2.2 Add desktop breakpoint override
    - Ensure `.table-responsive` has no overflow styles at ≥768px
    - Use `@media (min-width: 768px)` for desktop-first approach
    - _Requirements: 1.3_

  - [ ]* 2.3 Write property test for scroll container visibility
    - **Property 1: Horizontal scroll container visibility**
    - **Validates: Requirements 1.1, 1.2, 1.4**

  - [ ]* 2.4 Write property test for desktop hiding
    - **Property 2: Scroll container hidden on desktop**
    - **Validates: Requirement 1.3**

- [ ] 3. Implement stacked card layout (.table-stacked)
  - [ ] 3.1 Create `.table-stacked` CSS class for card transformation
    - Transform `tr` to `display: block` with border on mobile
    - Transform `td`/`th` to `display: block` with proper padding
    - Add card-style backgrounds and borders
    - _Requirements: 2.1, 2.4_

  - [ ] 3.2 Add header-derived cell labels via CSS ::before
    - Use CSS `content` attr() to pull header labels
    - Fallback to column index if header unavailable
    - _Requirements: 2.2_

  - [ ] 3.3 Add mobile breakpoint isolation
    - Ensure card styles only apply below 768px
    - Use `@media (max-width: 767px)` for mobile-specific styles
    - _Requirements: 2.3_

  - [ ]* 3.4 Write property test for card layout cell labeling
    - **Property 3: Card layout cell labeling**
    - **Validates: Requirement 2.2**

  - [ ]* 3.5 Write property test for breakpoint isolation
    - **Property 4: Card layout breakpoint isolation**
    - **Validates: Requirement 2.3**

- [ ] 4. Add theme support (light/dark mode)
  - [ ] 4.1 Verify CSS uses existing `--ifm-table-*` tokens
    - Use `--ifm-table-border-color` for borders
    - Use `--ifm-table-head-background` for headers
    - Use `--ifm-table-stripe-background` for row stripes
    - _Requirements: 4.1, 4.2_

  - [ ] 4.2 Add theme-aware scroll indicator
    - Use `box-shadow` that adapts via CSS custom properties
    - Light mode: `rgba(0, 0, 0, 0.1)`
    - Dark mode: `rgba(0, 0, 0, 0.3)`
    - _Requirements: 4.3_

  - [ ]* 4.3 Write property test for theme consistency
    - **Property 5: Theme consistency**
    - **Validates: Requirements 4.1, 4.2, 4.3**

- [ ] 5. Add accessibility support
  - [ ] 5.1 Ensure semantic structure preservation
    - Keep table elements (thead, tbody, tr, td, th) intact
    - No JavaScript DOM manipulation
    - _Requirements: 6.1_

  - [ ] 5.2 Add reduced motion support
    - Wrap scroll/transition effects in `@media (prefers-reduced-motion: no-preference)`
    - Disable animations when `prefers-reduced-motion: reduce` is set
    - _Requirements: 6.3_

  - [ ]* 5.3 Write property test for semantic structure
    - **Property 6: Semantic structure preservation**
    - **Validates: Requirement 6.1**

  - [ ]* 5.4 Write property test for reduced motion
    - **Property 7: Reduced motion respect**
    - **Validates: Requirement 6.3**

- [ ] 6. Checkpoint - Verify all CSS syntax is valid
  - Run CSS linter on modified files
  - Ensure no breaking changes to existing table styles

- [ ] 7. Test on gas-and-resources document
  - [ ] 7.1 Apply `.table-responsive` class to tables in gas-and-resources.md
    - Identify table elements in the document
    - Add responsive wrapper classes
    - _Requirements: 5.1, 5.2_

  - [ ] 7.2 Verify mobile responsiveness
    - Test horizontal scroll on viewport <768px
    - Verify scroll indicator appears when needed
    - _Requirements: 5.1, 5.2_

- [ ]* 8. Write CSS-only implementation property test
  - **Property 8: CSS-only implementation**
  - **Validates: Requirements 7.1, 7.2**
  - Verify no JavaScript is required for core functionality

- [ ] 9. Final checkpoint - Full verification
  - Ensure all tests pass
  - Verify responsive behavior on mobile viewport
  - Verify desktop view remains unaffected
  - Ask the user if questions arise

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- This is a CSS-only implementation - no JavaScript required
- Uses existing Infima tokens (`--breakpoint-md`, `--ifm-table-*`) for theme consistency
- Desktop-first architecture with mobile overrides at <768px
- Property tests validate universal correctness across all viewport widths