---
title: Analytics Event Catalog
description: Custom GA4 interaction events tracked by the Soroban Cookbook documentation site
---

# Analytics Event Catalog

This catalog documents custom Google Analytics 4 (GA4) interaction events.
Events are emitted through `documentation/src/utils/analytics.ts` via `gtag` /
`dataLayer` when analytics is configured.

:::note GA4 DebugView
Events appear in GA4 DebugView only when a measurement ID is configured at
build time (`GTAG_MEASUREMENT_ID` or `GOOGLE_ANALYTICS_ID`) and the site is
loaded with GA debug mode enabled. Without credentials, events are still
dispatched safely when `gtag`/`dataLayer` exist, but cannot be verified in
DebugView in this environment.
:::

## How events are sent

```ts
import { trackEvent, trackSearch, trackCopyCode, trackNewsletterSubmit } from '@site/src/utils/analytics';
```

- Calls are no-ops during SSR and when GA is not loaded.
- Errors inside analytics are swallowed so UI actions always continue.
- Personally identifiable information (email addresses, full search queries)
  is **not** sent.

## Event catalog

### `search`

| Field | Value |
|-------|--------|
| **Purpose** | Measure when visitors use site search |
| **Trigger** | Navbar search input: Enter, change, or debounced input (≥ 2 characters) |
| **Parameters** | `query_length` (number), `result_count` (optional number), `search_source` (e.g. `navbar`) |
| **PII notes** | Raw query text is intentionally omitted |

### `copy_code`

| Field | Value |
|-------|--------|
| **Purpose** | Measure engagement with code samples |
| **Trigger** | Successful clipboard copy from a code block or Quick Start snippet |
| **Parameters** | `code_language` (e.g. `rust`), `code_section` (e.g. `code_block`, `quick_start`) |
| **PII notes** | Code contents are not sent |

### `newsletter_submit`

| Field | Value |
|-------|--------|
| **Purpose** | Measure newsletter signup conversions |
| **Trigger** | Newsletter form reaches the success state (demo or HTTP endpoint) |
| **Parameters** | `submission_status` (`success`), `submission_method` (`endpoint` \| `demo`) |
| **PII notes** | Email addresses are never included |

## Enabling GA4

Set a measurement ID when building:

```bash
GTAG_MEASUREMENT_ID=G-XXXXXXXXXX bun run build
```

Optional alias: `GOOGLE_ANALYTICS_ID`.

With the ID present, Docusaurus loads gtag (page views) and custom events above
can surface in GA4, including DebugView when debug mode is active.
