---
sidebar_position: 5
title: Accessibility Guide
description: WCAG 2.1 Level AA accessibility guidelines for the Soroban Cookbook.
---

# Accessibility Guide

This guide provides practical, hands-on instructions for building accessible components and documentation in the Soroban Cookbook. We follow **WCAG 2.1 Level AA** standards, which is the industry baseline for accessible web content.

---

## Quick Reference: WCAG 2.1 AA Success Criteria

| Criterion | Standard | Test |
|-----------|----------|------|
| **Contrast** | 4.5:1 for normal text, 3:1 for large text (18pt+) | DevTools color checker |
| **Keyboard Nav** | All functions via keyboard only | Tab through page; no traps |
| **Focus Visible** | Clear focus indicators on all focusable elements | `:focus-visible` with 2px outline |
| **ARIA Labels** | Interactive elements have accessible names | Screen reader test |
| **Alt Text** | All meaningful images have descriptive alt text | Inspect img/@alt |
| **Color Not Alone** | Don't convey info by color alone | Add icon/text in addition to color |
| **Motion** | Animations respect `prefers-reduced-motion` | Test in browser settings |
| **Form Labels** | All inputs linked to labels | Inspect `<label htmlFor>` |

---

## Component Checklist

### Buttons
```tsx
// ✅ Good: Icon button with aria-label
<button aria-label="Close modal">
  <Icon name="close" aria-hidden="true" />
</button>

// ✅ Good: Button with clear disabled state
<button disabled aria-disabled="true">
  Submit
</button>

// ✅ Good: Toggle with aria-pressed
<button aria-pressed={isActive} aria-label={`Toggle ${name}`}>
  {isActive ? 'On' : 'Off'}
</button>

// ❌ Bad: No aria-label for icon button
<button>
  <Icon name="settings" />
</button>

// ❌ Bad: No disabled attribute
<button onClick={disabled ? null : handleClick}>
  Submit
</button>
```

### Links
```tsx
// ✅ Good: Descriptive link text
<a href="/docs/setup">Getting Started Guide</a>

// ✅ Good: External link with aria-label
<a href="https://example.com" aria-label="External resource (opens in new window)" target="_blank">
  Learn more
</a>

// ❌ Bad: Generic "Click here" link
<a href="/docs">Click here</a>

// ❌ Bad: No indication of external link
<a href="https://example.com" target="_blank">
  Resource
</a>
```

### Forms
```tsx
// ✅ Good: Label linked to input
<label htmlFor="email">Email Address</label>
<input id="email" type="email" required aria-required="true" />

// ✅ Good: Error messages linked via aria-describedby
<label htmlFor="password">Password</label>
<input id="password" type="password" aria-describedby="password-error" />
{error && <span id="password-error" role="alert">{error}</span>}

// ❌ Bad: Placeholder as only label
<input placeholder="Enter email" />

// ❌ Bad: Error not linked to input
<input type="email" />
{error && <span>{error}</span>}
```

### Images
```tsx
// ✅ Good: Descriptive alt text
<img src="architecture.png" alt="Soroban smart contract architecture diagram" />

// ✅ Good: Decorative image hidden from screen reader
<img src="divider.svg" alt="" aria-hidden="true" />

// ✅ Good: Icon image with role and label
<img src="icon-check.svg" role="img" aria-label="Completed" />

// ❌ Bad: Empty alt text for meaningful image
<img src="architecture.png" alt="" />

// ❌ Bad: Generic alt text
<img src="diagram.png" alt="image" />
```

### Icons
```tsx
// ✅ Good: Decorative icon hidden from screen readers
<Icon name="info" aria-hidden="true" focusable="false" />
<span>Information</span>

// ✅ Good: Icon-only button with label
<button aria-label="Open menu">
  <Icon name="menu" aria-hidden="true" />
</button>

// ❌ Bad: Icon without aria-hidden when decorative
<Icon name="info" />
<span>Information</span>

// ❌ Bad: Icon button without accessible label
<button>
  <Icon name="menu" />
</button>
```

### Alert & Callout Components
```tsx
// ✅ Good: Alert with aria-live for dynamic updates
<div role="alert" aria-live="assertive">
  Error saving document
</div>

// ✅ Good: Callout with aria-label
<aside role="note" aria-label="Tip: Gas optimization">
  Use this pattern to reduce costs.
</aside>

// ❌ Bad: Alert without aria-live
<div role="alert">
  Error saving
</div>

// ❌ Bad: Callout without accessible name
<aside role="note">
  Important information
</aside>
```

### Navigation
```tsx
// ✅ Good: Labeled navigation landmark
<nav aria-label="Main navigation">
  <ul>
    <li><a href="/docs">Docs</a></li>
    <li><a href="/patterns">Patterns</a></li>
  </ul>
</nav>

// ✅ Good: Skip link visible on focus
<a href="#main-content" className="skip-link">
  Skip to main content
</a>

// ❌ Bad: Unlabeled nav
<div className="navbar">
  <a href="/">Home</a>
</div>

// ❌ Bad: Skip link hidden from keyboard
<a href="#main" style={{ display: 'none' }}>
  Skip
</a>
```

---

## CSS Accessibility Patterns

### Focus Indicators
```css
/* ✅ Good: Always visible focus indicator */
button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

/* ✅ Good: Hide focus ring for mouse users only */
button:focus:not(:focus-visible) {
  outline: none;
}

/* ❌ Bad: Removing focus outline */
button:focus {
  outline: none;
}
```

### Color Contrast
```css
/* ✅ Good: 4.5:1 contrast ratio for normal text */
--text-primary: #1a1a1a; /* on #ffffff */
--text-secondary: #4a4a4a; /* on #ffffff */

/* ✅ Good: 3:1 contrast for large text (18pt+) */
.large-text {
  font-size: 1.25rem; /* 20px */
  color: var(--text-secondary); /* 3.5:1 ratio is acceptable */
}

/* ❌ Bad: Insufficient contrast */
.text {
  color: #888888; /* on #ffffff = 3.14:1, fails AA */
}
```

### Motion Preferences
```css
/* ✅ Good: Animations respect user preferences */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}

/* ✅ Good: Alternative animation duration */
.fade-in {
  animation: fade 0.3s ease-in;
}

@media (prefers-reduced-motion: reduce) {
  .fade-in {
    animation-duration: 0.01ms;
  }
}

/* ❌ Bad: Ignoring motion preferences */
.spin {
  animation: spin 2s infinite;
  /* No prefers-reduced-motion fallback */
}
```

### High Contrast Mode
```css
/* ✅ Good: Support high contrast mode */
@media (prefers-contrast: more) {
  .card {
    border: 2px solid currentColor; /* Use 2px instead of 1px */
  }
}

/* ✅ Good: Dark mode with proper contrast */
[data-theme='dark'] {
  --text-primary: #f0f0f0; /* 4.5:1 on #1a1a1a */
}
```

---

## Testing Workflow

### 1. Keyboard Navigation Test
1. Open page in browser
2. Press **Tab** repeatedly to move through all interactive elements
3. Press **Shift+Tab** to move backward
4. Verify:
   - All buttons, links, and inputs are reachable
   - Focus order is logical (left-to-right, top-to-bottom)
   - Focus indicator is clearly visible
   - No "keyboard traps" (cannot escape with Tab)
   - Skip link appears when pressing Tab immediately after page load

### 2. Focus Indicator Check
1. In DevTools, inspect `:focus-visible` styles
2. Verify:
   - Outline is at least 2px
   - Outline color contrasts with background (3:1 minimum)
   - Outline offset is visible (not overlapping element)
   - Works for keyboard only (not on mouse click)

### 3. Color Contrast Test
1. **Browser DevTools Method:**
   - Right-click element → Inspect
   - Go to "Accessibility" tab
   - View contrast ratio
   - Should show 4.5:1 (AA) or 7:1 (AAA)

2. **WebAIM Contrast Checker:**
   - https://webaim.org/resources/contrastchecker/
   - Enter foreground and background colors
   - Check both normal and large text

### 4. Screen Reader Test (NVDA/VoiceOver)
1. **macOS Users:** Enable VoiceOver (Cmd+F5)
2. **Windows Users:** Download NVDA (free): https://www.nvaccess.org/
3. Navigate through page and verify:
   - All text is announced
   - Links have descriptive text
   - Buttons announce state (pressed, disabled)
   - Form labels are announced before inputs
   - Alerts announce with appropriate urgency

### 5. Automated Testing
```bash
# Run ESLint with jsx-a11y rules
bun run lint

# Use browser extensions:
# - axe DevTools (free, recommended)
# - WAVE (free)
# - Lighthouse (built into Chrome DevTools)
```

---

## Common Mistakes & Fixes

| Mistake | Impact | Fix |
|---------|--------|-----|
| No `<label>` for form inputs | Screen reader users can't identify fields | Use `<label htmlFor="id">` |
| Icon buttons without aria-label | Icon purpose is unclear | Add `aria-label="action name"` |
| Images without alt text | Blind users can't understand images | Add descriptive `alt` attribute |
| Color used as only indicator | Color-blind users miss info | Add icon, text, or pattern |
| No focus indicator on keyboard nav | Keyboard users can't see where they are | Use `:focus-visible` with outline |
| Animations don't respect reduced motion | Users get nausea/headaches | Add `@media (prefers-reduced-motion)` |
| Insufficient contrast (< 4.5:1) | Low vision users can't read text | Use darker text or lighter background |
| Focus trap in modal | Keyboard users can't close modal | Trap focus inside, release on close |
| Auto-playing video/audio | Users get startled/distracted | Remove autoplay; add play control |
| Form errors not linked | Screen readers don't announce errors | Use `aria-describedby` on input |

---

## Resources

- **WCAG 2.1 Guidelines:** https://www.w3.org/WAI/WCAG21/quickref/
- **ARIA Authoring Practices:** https://www.w3.org/WAI/ARIA/apg/
- **WebAIM Articles:** https://webaim.org/articles/
- **Deque University:** https://dequeuniversity.com/ (paid, comprehensive)
- **Browser DevTools Accessibility Tab:** Built-in contrast checker and accessibility tree

---

## Accessibility Audit Checklist

Run this before merging any PR with UI changes:

- [ ] All text meets 4.5:1 contrast ratio
- [ ] All interactive elements reachable via Tab key
- [ ] Focus indicators visible on all focusable elements
- [ ] No keyboard traps (can Tab away from any component)
- [ ] All images have alt text
- [ ] Icon buttons have aria-label
- [ ] Form inputs have labels
- [ ] No information conveyed by color alone
- [ ] Animations respect prefers-reduced-motion
- [ ] Screen reader test passed (NVDA/VoiceOver)
- [ ] ESLint passes with jsx-a11y rules
- [ ] axe DevTools reports zero violations
- [ ] Tested at 200% zoom without horizontal scroll
- [ ] Tested in high contrast mode
- [ ] Tested on at least one actual screen reader

---

**Questions?** Open a discussion or ask in the `#soroban` Discord channel.
