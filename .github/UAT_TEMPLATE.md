# User Acceptance Testing (UAT) Template

**Release version:** <!-- e.g. v1.2.0 -->  
**UAT date:** <!-- YYYY-MM-DD -->  
**Conducted by:** <!-- name(s) -->  
**Environment:** <!-- staging URL or local build -->

---

## 1. Pre-UAT Checklist

- [ ] Build passes (`bun run build`)
- [ ] All automated tests pass (`cargo test`)
- [ ] Staging environment is live and accessible
- [ ] UAT participants have been briefed on scenarios below

---

## 2. UAT Scenarios

Mark each scenario **PASS**, **FAIL**, or **BLOCKED**. Add notes for any failures.

### Getting Started

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| S-01 | New user lands on homepage and understands what the Cookbook is | | |
| S-02 | User follows the Getting Started guide on Linux without external help | | |
| S-03 | User follows the Getting Started guide on Windows without external help | | |
| S-04 | User installs the Soroban CLI and runs `soroban --version` successfully | | |

### Contract Examples

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| S-05 | User reads and understands the Hello World example end-to-end | | |
| S-06 | User reads and understands the Counter example end-to-end | | |
| S-07 | User reads and understands the Token Transfer example end-to-end | | |
| S-08 | User reads and understands the Simple Voting example end-to-end | | |
| S-09 | User can copy a contract snippet and compile it locally without errors | | |

### Documentation Navigation

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| S-10 | User can find a concept (e.g. authorization) using the sidebar | | |
| S-11 | User can find a pattern (e.g. error handling) using search | | |
| S-12 | User can navigate between concepts, patterns, and examples without confusion | | |
| S-13 | All internal links resolve (no 404s encountered during walkthrough) | | |

### UI & Accessibility

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| S-14 | Site is usable on mobile (320px–768px viewport) | | |
| S-15 | Dark mode and light mode both render correctly | | |
| S-16 | User can navigate all pages using keyboard only | | |
| S-17 | Images load with correct WebP fallback in supported browsers | | |

### Contributing

| # | Scenario | Result | Notes |
|---|----------|--------|-------|
| S-18 | User can follow the Contributing guide to open a PR | | |
| S-19 | PR template pre-fills correctly when opening a new PR on GitHub | | |

---

## 3. Issues Found

| ID | Scenario | Severity | Description |
|----|----------|----------|-------------|
| | | Critical / High / Medium / Low | |

---

## 4. Stakeholder Sign-Off

All parties below must sign off before the release is considered UAT-complete.

| Role | Name | Sign-Off | Date |
|------|------|----------|------|
| Product Lead | | [ ] Approved | |
| Engineering Lead | | [ ] Approved | |
| Docs Lead | | [ ] Approved | |
| QA / UAT Coordinator | | [ ] Approved | |

**Release decision:**
- [ ] Approved — no blocking issues found
- [ ] Approved with conditions — minor issues to be resolved post-release (list below)
- [ ] Rejected — blocking issues must be resolved before release

**Conditions / blocking issues:**
<!-- List any issues that must be resolved -->

---

## 5. Notes

<!-- Any additional observations from UAT participants -->
