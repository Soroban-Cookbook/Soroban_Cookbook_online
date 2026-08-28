# Issue #351 — Phase 6: Rate Limiting
## Verification Report

**Status**: ✅ COMPLETE

### Objective
Implement rate limiting for newsletter/API usage: client-side debounce/cooldown, document gateway limits, handle abuse (429).

### Implementation Summary

| Layer | Change |
|-------|--------|
| Client | 3s submit cooldown + in-flight guard in `NewsletterSignup.tsx` |
| 429 UX | Dedicated “Too many requests…” alert |
| Docs | `SECURITY.md` abuse scenario + gateway checklist |
| Tests | `NewsletterSignup.rateLimit.test.tsx` |

### Verification steps

1. Submit newsletter twice within 3s after an error → second attempt shows “Please wait…”.
2. Mock `fetch` → 429 → alert contains “Too many requests”.
3. Rapid clicks while loading → only one `fetch`.
4. Confirm `SECURITY.md` documents gateway rate-limit requirements.

### Closes
Closes #351
