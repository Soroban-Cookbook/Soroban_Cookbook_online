---
sidebar_position: 20
title: Offline behavior
description: Expected offline UX for the Soroban Cookbook site (pre- and post-PWA).
---

# Offline behavior

This page documents how the cookbook site behaves without a network connection
(Phase 6 / issue #350). It is the source of truth until a Progressive Web App
(PWA) service worker lands (tracked in issue #326 / original #157).

## Current state (no service worker)

The site is a static Docusaurus build. There is **no** `@docusaurus/plugin-pwa`
and no service worker registered in `docusaurus.config.ts`.

| Scenario | Expected behavior today |
|----------|-------------------------|
| Tab already loaded, then go offline | `OfflineNotice` banner appears (“You are offline”). In-memory SPA navigation to **already visited** routes may still work. |
| Hard refresh while offline | Browser shows its own offline / network-error page. |
| Unvisited route while offline | Navigation fails; no custom offline 404 shell yet. |
| Local search (`/search`) | Requires the Lunr index to have been loaded earlier in the session; otherwise fails offline. |
| Newsletter submit | Network `fetch` fails → existing error alert (“Something went wrong…”). |

## Target state (after PWA / issue #326)

| Scenario | Expected behavior |
|----------|-------------------|
| Visited docs & homepage | Served from the service worker cache. |
| Unvisited route | Custom offline / cached 404 fallback (not the browser chrome error). |
| Search | Cached search index when previously warmed. |
| Newsletter POST | Still requires network; show existing error UI. |

## Manual verification checklist

1. Open `/` online, then DevTools → Network → **Offline**.
2. Confirm the sticky **You are offline** banner is visible.
3. Soft-navigate to a page you already opened — content should still render when the SPA has it in memory.
4. Toggle Online — banner disappears.
5. After PWA ships: repeat with a cold offline load of a previously cached URL and an uncached URL (expect offline 404 shell).

## Automated tests

Playwright coverage lives in `documentation/e2e/offline.spec.ts`:

- Forces `context.setOffline(true)` after a warm visit.
- Asserts the offline notice is shown.
- Asserts returning online hides the notice.

## Related config

- `documentation/docusaurus.config.ts` — plugins (PWA will be added here).
- `documentation/src/components/OfflineNotice/` — pre-PWA messaging.
- `documentation/src/theme/Root.tsx` — mounts the notice site-wide.
