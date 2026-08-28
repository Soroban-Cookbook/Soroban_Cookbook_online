---
title: Privacy Policy
description: How the Soroban Cookbook documentation site handles data, cookies, and analytics
---

# Privacy Policy

**Last updated:** 27 July 2026

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

### Analytics and cookies (optional)

If a Google Analytics 4 measurement ID is configured at build time **and** you
**accept** analytics cookies, the site may load Google Analytics (`gtag`) and
send usage events (for example page views or interaction metrics). Analytics
scripts are **not** initialized before consent.

If you reject analytics, those non-essential scripts are not loaded by our
consent-gated loader.

A custom Web Vitals beacon endpoint may be configured by maintainers
(`ANALYTICS_ENDPOINT`). Remote vital reporting is treated as non-essential and
should only run when analytics consent is granted.

## Purpose of processing

- Operate and secure the documentation website
- Remember display preferences and consent choices
- Process newsletter subscriptions you request
- (Optional, with consent) Understand aggregate documentation usage

## Legal basis (GDPR-oriented summary)

<!-- PLACEHOLDER: Confirm legal bases with counsel for your jurisdiction. -->

Typical bases for a documentation site of this type:

- **Legitimate interest / necessity** for essential storage required to deliver
  the service you request (theme, CSRF, consent record)
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
| Google Analytics 4                         | Optional analytics                | Usage metrics after consent        |
| Newsletter backend (`NEWSLETTER_ENDPOINT`) | Email subscription                | Email address you submit           |
| Discord / Stack Overflow / Stellar docs    | External links you choose to open | Per those sites’ policies          |

We do not sell personal data.

## International transfers

Analytics and hosting providers may process data in the United States or other
countries. Where Google Analytics is enabled, Google’s transfer mechanisms apply.
<!-- PLACEHOLDER: Document SCCs / transfer tools if the operator uses them. -->

## Data retention

| Data                            | Retention                                                                                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Theme / consent in your browser | Until you clear site data or change consent                                                           |
| CSRF token                      | Browser session                                                                                       |
| Newsletter email                | Controlled by the newsletter backend operator <!-- PLACEHOLDER: state retention period when known --> |
| Analytics                       | Per Google Analytics retention settings when enabled                                                  |

## Your rights

Depending on applicable law (including GDPR where it applies), you may have
rights to access, rectify, erase, restrict, or object to certain processing,
and to withdraw consent for analytics at any time.

### Withdraw or change consent

Use **Cookie settings** in the site footer, or clear site data for
`soroban-cookbook.dev` in your browser.

### Newsletter / deletion requests

To request deletion of an email used for the newsletter, contact the maintainers
via GitHub or Discord (see placeholder contact above) and include the email
address used to subscribe. <!-- PLACEHOLDER: Add a dedicated privacy email when available. -->

## Children

This documentation site is intended for a general technical audience. It is not
directed at children under 16, and we do not knowingly collect children’s data.

## Policy updates

We may update this page as the site’s behaviour changes. The “Last updated”
date at the top will change when material revisions are made.

## Related technical docs

- Site security headers and deployment notes: repository `DEPLOYMENT.md`
- Newsletter CSRF guidance: `docs/getting-started/api-security.md`
