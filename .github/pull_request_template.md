# Pull Request Template

## Description
Provide a clear description of the changes you've made. Explain why you're proposing these changes and link to any relevant issues.

## Type of Change
Select the appropriate type of change:
- [ ] 🚀 New Feature (contracts, patterns, guides)
- [ ] 🐛 Bug Fix
- [ ] 📝 Documentation Update
- [ ] 🎨 UI/UX Improvement
- [ ] 🛠️ Maintenance / Refactor

## How Has This Been Tested?
Explain how you verified your changes. Include any relevant commands or environment details.
- [ ] Locally rendered using `bun start` (or `npm start`)
- [ ] Ran `bun run build` (or `npm run build`) successfully
- [ ] Verified [typecheck/lint/format] in `documentation/`
- [ ] [If code] Ran `cargo test` and `cargo check`

## Screenshots (if applicable)
Add any screenshots or recordings of UI changes here.

## Checklist
Before submitting, please ensure you've checked these off:
- [ ] My code follows the project's code style.
- [ ] I have performed a self-review of my code.
- [ ] I have commented my code where necessary.
- [ ] I have updated the documentation accordingly.
- [ ] My changes generate no new warnings.
- [ ] New and existing tests pass locally.
- [ ] I have checked my code runs on the latest Soroban SDK.

## Accessibility (a11y) Checklist
If your changes include new or modified UI components, please verify the following:
- [ ] **Keyboard Navigation:** All interactive elements can be reached and activated using only the keyboard (`Tab`, `Enter`, `Space`).
- [ ] **Focus States:** Focus indicators are clearly visible and consistent across components.
- [ ] **Color Contrast:** Text and background colors meet WCAG 2.1 AA contrast requirements (at least 4.5:1 for normal text).
- [ ] **ARIA & Semantics:** Proper HTML semantics are used, and `aria-*` attributes are added where necessary for screen readers.

## UAT Sign-Off (releases only)
If this PR is part of a release, confirm UAT has been completed:
- [ ] UAT conducted against [UAT_TEMPLATE.md](UAT_TEMPLATE.md)
- [ ] All critical and high-severity scenarios passed
- [ ] Stakeholder sign-off recorded in the completed UAT template

---

**Thank you for your contribution! 🚀**
