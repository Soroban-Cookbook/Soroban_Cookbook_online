# Issue #350 — Phase 6: Offline Behavior Testing
## Verification Report

**Status**: ✅ COMPLETE (pre-PWA baseline)

### Objective
Test and document how the site behaves without internet. Offline 404 fallback via service worker remains gated on PWA (#326).

### Implementation Summary

| Deliverable | Location |
|-------------|----------|
| Expected-behavior doc | `documentation/docs/contributing/offline-behavior.md` |
| Offline banner | `documentation/src/components/OfflineNotice/` |
| Root mount | `documentation/src/theme/Root.tsx` |
| Unit tests | `OfflineNotice.test.tsx` |
| E2E | `documentation/e2e/offline.spec.ts` |

### Verification steps

1. Load homepage → DevTools Offline → banner “You are offline” appears.
2. Go online → banner clears.
3. Confirm docs page documents pre-PWA vs post-PWA matrix.
4. After #326: extend `offline.spec.ts` for cached pages + offline 404 shell.

### Closes
Closes #350
