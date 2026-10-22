---
sidebar_label: Privacy Policy
title: Privacy Policy
hide_table_of_contents: true
---

**Last updated:** 21 October 2026

The [canonical Privacy Policy](/privacy) describes how the Soroban Cookbook site
handles information, optional analytics, newsletter submissions, browser storage,
and privacy requests.

Please read that policy for the current disclosures about Google Analytics 4,
optional Microsoft Clarity heatmaps/session replay, consent controls, and
retention. This docs entry points to the policy used by the site's footer and
consent banner. The newsletter summary below is repeated here for readers of
this page; the canonical policy remains the full policy source.

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

## Error monitoring (Sentry, when enabled)

When the deployment configures `SENTRY_DSN`, the site initializes Sentry
error monitoring independently of the analytics consent banner (see
`documentation/src/theme/Root.tsx`). Sentry is treated as essential
error-monitoring traffic under the operator's legitimate interest in operating
a reliable documentation site — it is **not** consent-gated like GA4 or
Clarity. When `SENTRY_DSN` is absent (for example local development), Sentry
is not initialized.

Error reports may include request URLs, release/environment metadata
(`SENTRY_ENVIRONMENT`, `SENTRY_RELEASE`), and diagnostic context needed to
reproduce the failure. The integration strips selected sensitive URL query
parameters (`token`, `key`, `secret`, `password`, `auth`) before sending
events; this scrubbing does not guarantee every personal or sensitive value
is removed, so avoid putting secrets in URLs.

Retention and contact details follow the operator's Sentry project settings.
<!-- PLACEHOLDER: State the operator's Sentry data-retention period and the privacy contact for Sentry-related requests once known. -->
See the [canonical Privacy Policy](/privacy) (Error monitoring, Third-party
services, and Data retention rows) for the maintained disclosure.

## Newsletter submissions

The newsletter form sends your trimmed email address only when the site has a
valid HTTPS `NEWSLETTER_ENDPOINT` configured. It sends a JSON POST with an
`X-CSRF-Token` header; the token is kept in browser session storage to help
protect the request. The endpoint is configured by the site operator, and its
backend operator is responsible for processing and retaining submitted email
addresses. The project may not store the address directly. Without a valid
endpoint, the form displays a demo success message but sends no request and
does not subscribe you.

To request deletion of an email used for the newsletter, contact the
maintainers via a GitHub issue or discussion, or via the project Discord listed
on the site, to arrange a private channel for the email address used to
subscribe. Do not post it in a public issue. <!-- PLACEHOLDER: Add a dedicated privacy email when available. -->
<!-- PLACEHOLDER: State the configured newsletter backend's retention period when known. -->
