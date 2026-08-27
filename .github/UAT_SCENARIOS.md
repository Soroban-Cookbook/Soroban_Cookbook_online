# UAT Scenarios — Soroban Cookbook

This document defines the canonical UAT scenario set for the Soroban Cookbook. Each release must be validated against the scenarios in [UAT_TEMPLATE.md](UAT_TEMPLATE.md) before stakeholder sign-off.

---

## Participant Profiles

UAT should involve at least one participant from each profile:

| Profile | Description |
|---------|-------------|
| **Newcomer** | No prior Soroban or Rust experience |
| **Rust developer** | Rust experience, new to Soroban |
| **Soroban developer** | Familiar with Soroban, using Cookbook as reference |
| **Contributor** | Wants to submit a PR or example |

---

## Scenario Definitions

### S-01 — Homepage clarity
**Goal:** A newcomer can describe what the Soroban Cookbook is after landing on the homepage.  
**Steps:** Open the site root. Read the homepage for 60 seconds without scrolling to docs.  
**Pass criteria:** Participant can explain the site's purpose in their own words.

---

### S-02 — Getting Started (Linux)
**Goal:** A newcomer can complete the Linux setup guide without external help.  
**Steps:** Follow `docs/getting-started` on a fresh Linux environment.  
**Pass criteria:** `soroban --version` returns a version string with no errors.

---

### S-03 — Getting Started (Windows)
**Goal:** Same as S-02 on a Windows machine.  
**Pass criteria:** `soroban --version` returns a version string with no errors.

---

### S-04 — CLI install
**Goal:** User installs Soroban CLI following the guide.  
**Pass criteria:** CLI installs and responds to `--help` and `--version` flags.

---

### S-05 — Hello World comprehension
**Goal:** User reads the Hello World example and understands what it does.  
**Steps:** Navigate to the Hello World example page. Read through code and explanation.  
**Pass criteria:** Participant can describe the contract's behaviour without re-reading.

---

### S-06 — Counter comprehension
**Goal:** User reads the Counter example and understands persistent state.  
**Pass criteria:** Participant can explain what `increment`, `get`, and `reset` do, and why instance storage is used.

---

### S-07 — Token Transfer comprehension
**Goal:** User reads the Token Transfer example and understands authorization.  
**Pass criteria:** Participant can explain `require_auth()` and the three error cases.

---

### S-08 — Simple Voting comprehension
**Goal:** User reads the Simple Voting example and understands proposal lifecycle.  
**Pass criteria:** Participant can explain how one-vote-per-address is enforced and what `tally` returns.

---

### S-09 — Copy and compile
**Goal:** User copies a contract snippet and compiles it locally.  
**Steps:** Copy any complete contract from the docs. Paste into a local Soroban project. Run `cargo build`.  
**Pass criteria:** No compilation errors introduced by the snippet itself.

---

### S-10 — Sidebar navigation
**Goal:** User can locate a concept page using the sidebar alone.  
**Steps:** Without using search, find the Authorization concept page.  
**Pass criteria:** User reaches the page in under 3 clicks.

---

### S-11 — Search
**Goal:** User can find content using the search bar.  
**Steps:** Search for "error handling".  
**Pass criteria:** Relevant results appear and clicking one leads to the correct page.

---

### S-12 — Cross-section navigation
**Goal:** User can move between Concepts, Patterns, and Examples without confusion.  
**Pass criteria:** User does not express confusion about site structure during walkthrough.

---

### S-13 — No broken links
**Goal:** No internal links return a 404 during a walkthrough session.  
**Pass criteria:** Zero 404 errors encountered across at least 10 page navigations.

---

### S-14 — Mobile usability
**Goal:** Site is usable on a mobile viewport.  
**Steps:** Open the site at 375px width. Navigate to an example page and read the code snippet.  
**Pass criteria:** Text is readable, code is scrollable, and navigation is accessible.

---

### S-15 — Dark / light mode
**Goal:** Both themes render without broken layouts or invisible text.  
**Steps:** Toggle between dark and light mode on at least three different page types.  
**Pass criteria:** No contrast failures or layout breaks observed.

---

### S-16 — Keyboard navigation
**Goal:** All pages are navigable by keyboard.  
**Steps:** Tab through the homepage and one docs page without using a mouse.  
**Pass criteria:** All interactive elements receive visible focus; none are skipped.

---

### S-17 — WebP image delivery
**Goal:** Images serve WebP in supported browsers.  
**Steps:** Open DevTools Network panel. Load a page containing an `OptimizedImage`. Filter by image type.  
**Pass criteria:** WebP format is served in Chrome/Edge; PNG/JPG fallback served in browsers without WebP support.

---

### S-18 — Contributor flow
**Goal:** A new contributor can open a PR following the contributing guide.  
**Steps:** Follow `docs/contributing`. Fork the repo, make a small change, open a PR.  
**Pass criteria:** PR is opened successfully with the template pre-filled.

---

### S-19 — PR template
**Goal:** The PR template populates correctly on GitHub.  
**Steps:** Open a new PR on GitHub against the main branch.  
**Pass criteria:** All sections of `pull_request_template.md` appear in the PR body.

---

## Severity Definitions

| Severity | Definition |
|----------|------------|
| **Critical** | Blocks a core user journey; release must not proceed |
| **High** | Significantly degrades experience; should be fixed before release |
| **Medium** | Noticeable issue but workaround exists; can ship with tracking |
| **Low** | Minor polish issue; schedule for next cycle |
