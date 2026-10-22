---
title: Privacy Policy
description: How the Soroban Cookbook documentation site handles data, cookies, and analytics
---

# Privacy Policy

**Last updated:** 21 October 2026

This is the canonical privacy policy for the site. The docs legal privacy page
links here so both entry points describe the same behaviour.

This page describes how the **Soroban Cookbook** documentation site
(`soroban-cookbook.dev`) handles information when you browse the docs, use
search, copy code samples, or subscribe to the newsletter.

> **Not legal advice.** This policy describes the site’s technical behaviour.
> It is **not** a guarantee of GDPR compliance or other legal conformity.
> Project maintainers should have the text reviewed before treating it as final
> legal policy. Placeholders that need owner/legal input are marked clearly.

## Who operates this site

Soroban Cookbook is an open-source community documentation project hosted on
GitHub under the [Soroban-Cookbook](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)
organization.

<!-- PLACEHOLDER: Replace with project legal entity / contact if established. -->

**Controller / contact (placeholder):** For privacy requests, open a GitHub
issue or discussion on the repository, or contact the maintainers via the
project Discord listed on the site. A formal registered address, Data
Protection Officer, and corporate legal entity are **not** established in this
repository at the time of writing.

## What we collect

### Information you provide

| Data          | When                       | Purpose                                                             |
| ------------- | -------------------------- | ------------------------------------------------------------------- |
| Email address | Newsletter form (optional) | Send project announcements when a newsletter endpoint is configured |

We do **not** ask for names, payment details, or account passwords on this
documentation site.

### Information stored in your browser

| Storage                                          | Type             | Purpose                             | Essential?       |
| ------------------------------------------------ | ---------------- | ----------------------------------- | ---------------- |
| Theme preference (`theme` / color mode keys)     | `localStorage`   | Remember light/dark mode            | Yes (functional) |
| Cookie consent choice (`soroban-cookie-consent`) | `localStorage`   | Remember analytics preference       | Yes (functional) |
| CSRF token (`soroban-csrf-token`)                | `sessionStorage` | Protect newsletter form submissions | Yes (security)   |
| Separate analytics helper (`sc-analytics-consent`) | `localStorage` | Gate Web Vitals, search/funnel reporting, and experiment exposure | Optional analytics |
| Search history (`soroban_search_history`) | `localStorage` | Remember recent searches | Functional |
| Recommendations (`soroban_recommendations_history`) | `localStorage` | Keep up to 20 recent docs and topic/difficulty preference counts for local recommendations | Functional |
| Bookmarks (`bookmarks`, `bookmarkedPatterns`) | `localStorage` | Save documentation and patterns | Functional |
| Tutorial progress (`sc-tutorial-progress`) | `localStorage` | Remember completed pages | Functional |
| Prerequisites (`soroban_prerequisites_checked_v1`) | `localStorage` | Remember checked setup items | Functional |
| Feedback (`sc-doc-feedback:` followed by the page path) | `localStorage` | Remember a page's helpfulness vote | Functional |
| Experiment visitor ID (`sc-visitor-id`) | `localStorage` | Keep variant assignment stable when an experiment is enabled | Optional experiment |

Functional preferences and local reading history can be stored without accepting
analytics. Experiments are currently disabled; if enabled, assignment can create
`sc-visitor-id` without analytics consent, while exposure reporting checks the
separate analytics helper. Clear site data to remove these stored entries.

### Analytics and cookies (optional)

If a Google Analytics 4 measurement ID is configured at build time **and** you
**accept** analytics cookies, the consent-banner loader may load Google Analytics
(`gtag`) and send usage events (for example page views or interaction metrics).
This loader waits for acceptance before injecting either analytics script.

There is also a separate built-in Docusaurus GA4 integration enabled by
`GTAG_MEASUREMENT_ID` or `GOOGLE_ANALYTICS_ID`. That configuration is not wired to
the consent banner and can initialize GA4 independently of the saved choice.
Operators should use `GA_MEASUREMENT_ID` alone for the consent-banner loader;
the banner cannot prevent the separate integration from running when enabled.

Independently, if a Microsoft Clarity project ID is configured at build time
(`CLARITY_PROJECT_ID`, exposed as `clarityProjectId`), accepting analytics also
allows the loader to load Clarity from `www.clarity.ms` for heatmaps and session
replay. Clarity does not require a GA4 measurement ID. These providers may use
analytics cookies and browser storage after loading; session replay can capture
page interactions and visible page content.

The banner records `accepted` or `rejected` in `soroban-cookie-consent` with a
version and update timestamp. A saved acceptance permits configured scripts to
load on later visits. Without acceptance, the loader does not inject GA4 or
Clarity. Rejecting after scripts have already loaded does not unload them in the
current page; reload after changing your choice to prevent this loader from
initializing them on the next page load. The separate built-in GA4 integration
described above is unaffected by that choice.

A custom Web Vitals beacon endpoint may be configured by maintainers
(`ANALYTICS_ENDPOINT`). Remote vital reporting checks for `granted` in the
separate `sc-analytics-consent` entry. The current banner does not set or clear
that entry. Search/funnel trackers and experiment exposure use that helper too;
the banner's acceptance alone does not enable those paths. Vitals beacons, when
enabled, contain performance measurements and the page pathname.

Usage events can include search terms, code-copy metadata, newsletter success
(without the email address), CTA clicks, and feedback votes. Avoid entering
secrets or personal information into search or page content. The GA4 loader sets
`anonymize_ip: true`; this does not establish that all provider data is anonymous.

### Newsletter submissions

The newsletter form sends your trimmed email address only when the site has a
valid HTTPS `NEWSLETTER_ENDPOINT` configured. It sends a JSON POST with an
`X-CSRF-Token` header; the token is kept in browser session storage to help
protect the request. The endpoint is configured by the site operator, and its
backend operator is responsible for processing and retaining submitted email
addresses. The project may not store the address directly. Without a valid
endpoint, the form displays a demo success message but sends no request and
does not subscribe you.

### Error monitoring

When `SENTRY_DSN` is configured, Sentry initializes independently of the analytics
banner for error monitoring and sampled performance tracing. Error reports may
include request URLs and diagnostic context. The integration removes selected
sensitive URL query parameters before sending errors; it does not guarantee
that every personal or sensitive value is removed.

## Purpose of processing

- Operate and secure the documentation website
- Remember display preferences and consent choices
- Process newsletter subscriptions you request
- (Optional, with consent) Understand aggregate documentation usage

## Legal basis (GDPR-oriented summary)

<!-- PLACEHOLDER: Confirm legal bases with counsel for your jurisdiction. -->

Typical bases for a documentation site of this type:

- **Legitimate interest / necessity** for essential storage required to deliver
  the service you request (theme, CSRF, consent record) and for essential
  error monitoring (Sentry) when `SENTRY_DSN` is configured — Sentry loads
  independently of analytics consent
- **Consent** for optional analytics cookies/scripts
- **Consent or contract** for newsletter email processing, depending on how the
  newsletter backend is operated

Exact legal bases depend on the operator’s jurisdiction and should be confirmed
by the project owner.

## Third-party services

Depending on configuration and your actions, data may be processed by:

| Service                                    | Role                              | Data involved                      |
| ------------------------------------------ | --------------------------------- | ---------------------------------- |
| GitHub Pages / hosting provider            | Hosts static site files           | Standard HTTP logs per host policy |
| Vercel (if used for previews/deploy)       | Hosting                           | Standard HTTP logs per host policy |
| Google Analytics 4                         | Optional analytics                | Usage metrics; banner loader waits for consent, separate built-in integration does not |
| Microsoft Clarity (`CLARITY_PROJECT_ID`)    | Optional heatmaps and session replay | Page interactions/content after consent |
| Custom analytics endpoint (`ANALYTICS_ENDPOINT`) | Optional performance reporting | Web Vitals and pathname when the separate helper grants consent |
| Sentry (`SENTRY_DSN`)                      | Configured error monitoring and tracing | Error diagnostics and performance data |
| Newsletter backend (`NEWSLETTER_ENDPOINT`) | Email subscription                | Email address you submit           |
| Discord / Stack Overflow / Stellar docs    | External links you choose to open | Per those sites’ policies          |

We do not sell personal data.

## International transfers

Analytics and hosting providers may process data in the United States or other
countries. Consult the configured providers' policies, including
[Google's privacy policy](https://policies.google.com/privacy) and
[Microsoft's privacy statement](https://privacy.microsoft.com/en-us/privacy),
for their processing and transfer terms.
<!-- PLACEHOLDER: Document SCCs / transfer tools if the operator uses them. -->

## Data retention

| Data                            | Retention                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Functional preferences, history, consent records, and experiment ID | Until cleared or overwritten by the relevant feature; no application expiry is set |
| CSRF token                      | Browser session, cleared after a successful newsletter request; may be rotated by the backend |
| Newsletter email                | Controlled by the newsletter backend operator <!-- PLACEHOLDER: state retention period when known --> |
| GA4 / Clarity analytics         | Per the operator's provider settings and provider policies; `analytics.ts` sets no retention period |
| Custom analytics / Sentry       | Per the configured backend or provider's retention settings |

Rejecting analytics does not delete existing provider cookies, stored data, or
previously collected reports. Browser storage and provider-side retention are
separate; no fixed GA4 or Clarity retention duration is enforced by this site.

## Your rights

Depending on applicable law (including GDPR where it applies), you may have
rights to access, rectify, erase, restrict, or object to certain processing,
and to withdraw consent for analytics at any time.

### Withdraw or change consent

Use **Cookie settings** in the site footer, or clear site data for
`soroban-cookbook.dev` in your browser.

Choose **Reject analytics**, then reload to stop the loader from initializing
GA4 and Clarity on subsequent loads. If the separate built-in GA4 integration is
configured, this choice does not disable it; browser tracking controls can block
provider requests. To withdraw the separate helper's grant,
also remove `sc-analytics-consent` using browser storage settings, or clear all
site data. Clearing only that helper entry does not change the banner's saved
choice. Clearing all site data resets the banner and local preferences and
removes site cookies; it does not erase data already held by providers.

### Newsletter / deletion requests

To request deletion of an email used for the newsletter, contact the maintainers
via a GitHub issue or discussion, or via the project Discord listed on the
site, to arrange a private channel for the email address used to subscribe. Do
not post it in a public issue. <!-- PLACEHOLDER: Add a dedicated privacy email when available. -->

## Children

This documentation site is intended for a general technical audience. It is not
directed at children under 16, and we do not knowingly collect children’s data.

## Policy updates

We may update this page as the site’s behaviour changes. The “Last updated”
date at the top will change when material revisions are made.

## Related technical docs

- Site security headers and deployment notes: repository `DEPLOYMENT.md`
- Newsletter CSRF guidance: `docs/getting-started/api-security.md`
