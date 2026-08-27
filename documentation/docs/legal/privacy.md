---
sidebar_label: Privacy Policy
title: Privacy Policy
hide_table_of_contents: true
---

This page explains what data the Soroban Cookbook website collects, how it is
used, and your rights under the General Data Protection Regulation (GDPR) and
similar privacy frameworks.

## Data controller

The Soroban Cookbook is a community-maintained open-source project. The
repository maintainers act as the data controller for analytics data collected
through the website. Contact us by opening an issue on
[GitHub](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online).

## What we collect

### Optional analytics (consent-gated)

When you accept the consent banner, we load Google Analytics 4 (GA4) and,
if configured by the operator, Microsoft Clarity. These tools collect:

- **Page views and navigation flow** — which pages you visit and in what order.
- **Search queries** — terms you search for and how many results are returned.
- **Feedback votes** — thumbs up/down on docs pages and any detailed comments
  you choose to submit.
- **CTA interactions** — clicks on "Get Started" and other call-to-action
  buttons.
- **Aggregated technical data** — browser type, device category, approximate
  geographic region (country/city level), and referral source.

**IP addresses are anonymised** (`anonymize_ip: true`) before being logged by
GA4. No personal identifiers (name, email, precise location) are collected.

### Newsletter sign-up

If you submit your email via the newsletter form, it is sent to the
operator-configured endpoint. The Soroban Cookbook project does not store or
process this data directly — refer to the newsletter provider's own privacy
policy. The newsletter form is served through a POST endpoint set at build time
via the `NEWSLETTER_ENDPOINT` environment variable.

### Embedded content

Pages may embed content from external services (GitHub, Discord, Stack
Overflow). These services set their own cookies and collect data according to
their own privacy policies.

## Legal basis

Processing is based on your **consent** (Article 6(1)(a) GDPR). Analytics
scripts do not load until you explicitly click "Accept" on the consent banner.
You can withdraw consent at any time by clearing the `sc-analytics-consent`
entry from your browser's local storage.

## Your rights

Under GDPR you have the right to:

- **Access** — request a copy of the data held about you.
- **Erasure** — request deletion of your data.
- **Restrict processing** — object to analytics tracking.
- **Data portability** — request a machine-readable export of your data.

To exercise these rights, open an issue on our
[GitHub repository](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)
or contact the maintainers through the Soroban Cookbook Discord.

Since almost all data is anonymised at collection, we may not be able to
identify or isolate data related to a specific individual. In such cases we
will explain the limitation.

## Data retention

GA4 data is retained for the default Google Analytics retention period
(currently 14 months). Aggregated reports may be kept longer but contain no
individual-level data. Clarity session recordings, if enabled, are retained per
the Clarity default (currently 30 days).

## Third-party processors

| Service | Purpose | Privacy policy |
|---------|---------|----------------|
| Google Analytics 4 | Page analytics, conversion funnel | https://policies.google.com/privacy |
| Microsoft Clarity | Heatmaps, session replay (optional) | https://privacy.microsoft.com/en-us/privacy |

Both processors are EU-US Data Privacy Framework certified.

## Changes to this policy

Updates will be documented via the project's commit history. Material changes
will be announced in the project's release notes or Discord server.

---

_Last updated: July 2026_
