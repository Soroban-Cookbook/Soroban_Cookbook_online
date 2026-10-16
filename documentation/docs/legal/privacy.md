---
sidebar_label: Privacy Policy
title: Privacy Policy
hide_table_of_contents: true
---

**Last updated:** 15 October 2026

The [canonical Privacy Policy](/privacy) describes how the Soroban Cookbook site
handles information, optional analytics, newsletter submissions, browser storage,
and privacy requests.

Please read that policy for the current disclosures about Google Analytics 4,
optional Microsoft Clarity heatmaps/session replay, consent controls, and
retention. This docs entry points to the same policy used by the site's footer
and consent banner so there is one maintained source for these details.

## Withdraw or change consent

Use **Cookie settings** in the site footer to reopen the consent banner, then
choose **Reject analytics** and reload so the loader does not initialize GA4
or Clarity on subsequent loads. This matches the footer control described in
the [canonical Privacy Policy](/privacy).

The banner persists its choice in `localStorage` under the canonical key
`soroban-cookie-consent` (see
`documentation/src/utils/cookieConsent.ts`, `CONSENT_STORAGE_KEY`). Clearing
that entry, or clearing all site data for `soroban-cookbook.dev` in your
browser, resets the banner. Clearing all site data also removes local
preferences; it does not erase data already held by providers.

A separate helper key, `sc-analytics-consent`, gates Web Vitals, search/funnel
reporting, and experiment exposure. The banner does not set or clear that
entry, and removing only that entry does not change the banner's saved choice.
To withdraw both, reject in the banner and also remove `sc-analytics-consent`
via browser storage settings (or clear all site data).
