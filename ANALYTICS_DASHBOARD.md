# Analytics Dashboard

The single place to see how the Soroban Cookbook is actually used. This document
specifies the dashboard the docs team works from, the metrics it tracks, and the
weekly reporting routine built on top of it.

**Prerequisite:** analytics must be configured and consented to — see
[DEPLOYMENT.md → Analytics](./DEPLOYMENT.md#analytics) for setup. Until
`GA_MEASUREMENT_ID` is set, no data flows and the dashboard will be empty.

> **Dashboard link:** _add the Looker Studio share URL here once created._
> It is intentionally not committed as a placeholder URL — a dead link is worse
> than an obvious gap.

---

## Why this exists

Metrics were previously scattered: GA4's default reports, GitHub insights, and
Lighthouse CI each told part of the story, and nobody looked at all three. This
dashboard consolidates the questions the docs team actually asks:

1. Which pages do people read, and which do they leave immediately?
2. What are people searching for — and what are they searching for and *not*
   finding?
3. Do readers say the docs helped?
4. Does the landing page convert visitors into readers?

---

## Metric catalog

Every metric below is derived from events this site already emits. The event
implementations live in
[`documentation/src/utils/analytics.ts`](./documentation/src/utils/analytics.ts).

### Audience

| Metric | GA4 source | Why it matters |
| --- | --- | --- |
| Active users (7d / 28d) | Built-in | Baseline reach. |
| New vs returning | Built-in | Returning readers suggest the docs are reference-worthy, not just a one-time landing. |
| Top countries / languages | Built-in | Informs whether i18n is worth the effort. |
| Device category | Built-in | Justifies mobile work; the site is mobile-first. |

### Content

| Metric | GA4 source | Why it matters |
| --- | --- | --- |
| Top 20 pages by views | Built-in (`page_view`) | Where to spend maintenance effort. |
| Pages with highest exit rate | Built-in | Candidates for a clearer next-step link. |
| Average engagement time per page | Built-in | A guide with high views and low engagement is usually unclear, not concise. |
| Docs pages viewed | `funnel_docs_view` | Reader depth beyond the landing page. |

### Search — see also [issue #358](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/358)

| Metric | GA4 source | Why it matters |
| --- | --- | --- |
| Top search terms | `search` (`search_term`) | Direct evidence of what readers expect to exist. |
| **Zero-result searches** | `search_no_results` | **The highest-signal metric on this dashboard** — each one is a documentation gap a real person hit. |
| Searches per session | `search` | High values can mean navigation is failing. |
| Median result count | `search` (`search_results`) | Very low values suggest the index needs tuning. |

### Feedback — see also [issue #359](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues/359)

| Metric | GA4 source | Why it matters |
| --- | --- | --- |
| Helpful rate (yes ÷ total) | `doc_feedback` (`helpful`) | Blunt but honest quality signal. |
| Pages with lowest helpful rate | `doc_feedback` + `page_path` | The rewrite queue, in priority order. |
| Detailed feedback click-through | `doc_feedback_detail` | How many readers care enough to write prose. |

### Conversion

| Metric | GA4 source | Why it matters |
| --- | --- | --- |
| Landing → docs rate | `funnel_landing_view` → `funnel_docs_view` | Whether the homepage does its job. |
| CTA click rate by button | `funnel_cta_click` (`cta_id`) | Which hero CTA earns its place. |
| Outbound GitHub clicks | `funnel_github_click` | Proxy for developers going to use the code. |

### Experiments

| Metric | GA4 source | Why it matters |
| --- | --- | --- |
| Exposures by variant | `experiment_exposure` | Sanity-check that assignment is roughly balanced. |

---

## Building the dashboard

### Option A — Looker Studio (recommended for sharing)

Free, and shareable with people who have no GA4 access.

1. Open [Looker Studio](https://lookerstudio.google.com) → **Create → Report**.
2. Add a **Google Analytics** data source and pick the Cookbook GA4 property.
3. Build one page per section above. Suggested layout:
   - **Overview** — scorecards: active users, docs pages viewed, helpful rate,
     zero-result search count. Time series of active users (28 days).
   - **Content** — table of top 20 pages: views, engagement time, exit rate.
   - **Search** — table of `search_term` by count; a second table filtered to
     `search_no_results`, sorted descending. This is the page the team should
     look at most.
   - **Feedback** — helpful rate over time; table of pages by helpful rate
     ascending, with a minimum-responses filter so a single downvote on a
     rarely-read page does not top the list.
   - **Conversion** — the funnel exploration, plus CTA breakdown by `cta_id`.
4. Set the default date range to **Last 28 days**.
5. **Share → anyone with the link can view**, then paste that URL at the top of
   this file.

### Option B — GA4 native

For anyone with property access, no extra tooling:

- **Reports → Engagement → Pages and screens** covers the Content section.
- **Explore → Funnel exploration** covers Conversion (steps in
  [DEPLOYMENT.md → Conversion funnel](./DEPLOYMENT.md#conversion-funnel-ga4)).
- **Explore → Free form** with `search_term` as the dimension covers Search.

### Required custom dimensions

GA4 will not report on custom event parameters until they are registered.
**Admin → Custom definitions → Create custom dimension**, all scoped to Event:

| Dimension name | Event parameter |
| --- | --- |
| Search term | `search_term` |
| Search results | `search_results` |
| Page path (feedback) | `page_path` |
| Helpful | `helpful` |
| CTA ID | `cta_id` |
| Experiment ID | `experiment_id` |
| Variant | `variant` |

Registration is **not retroactive** — data collected before a dimension exists
cannot be broken down by it. Do this on day one.

---

## Weekly popular pages report

A 15-minute Monday routine. The point is to convert numbers into issues.

1. Open the dashboard, set the range to **the last 7 days**.
2. Record in the weekly thread:
   - Top 10 pages by views, and the change vs the previous week.
   - **Every zero-result search term.** These are free, specific requests for
     documentation from real users.
   - Any page whose helpful rate fell below 60% with at least 5 responses.
3. **File issues**, don't just report:
   - Recurring zero-result term → issue: "Document `<term>`".
   - Low helpful rate → issue: "Rewrite `<page>`", linked to this report.
4. Post the summary in the docs channel and link the issues created.

### Automating the pull

The GA4 Data API can produce the numbers without opening a browser:

```bash
# Requires a service account with Viewer on the GA4 property.
# Docs: https://developers.google.com/analytics/devguides/reporting/data/v1
curl -X POST \
  "https://analyticsdata.googleapis.com/v1beta/properties/<PROPERTY_ID>:runReport" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H 'Content-Type: application/json' \
  -d '{
    "dateRanges": [{ "startDate": "7daysAgo", "endDate": "yesterday" }],
    "dimensions": [{ "name": "pagePath" }],
    "metrics": [{ "name": "screenPageViews" }],
    "orderBys": [{ "metric": { "metricName": "screenPageViews" }, "desc": true }],
    "limit": 10
  }'
```

This is deliberately **not** wired into CI: it needs a credential with access to
analytics data, and the review step — deciding which numbers deserve an issue —
is the part that carries the value. Automate the fetch if it becomes a chore;
don't automate the judgment.

---

## Data handling

- Analytics only runs for visitors who explicitly consent
  ([DEPLOYMENT.md → Privacy model](./DEPLOYMENT.md#privacy-model)). Treat all
  figures as **consented traffic only** — real totals are higher, and the gap is
  not measurable. Never present these numbers as absolute traffic counts.
- Ad blockers suppress GA4 for a meaningful share of a developer audience. This
  dashboard is directionally useful, not an audit trail.
- Search terms are typed by users and could in principle contain something
  personal. Do not export raw search terms outside the docs team.
- Access to the GA4 property and the dashboard is limited to maintainers.




<!-- ## Data handling

- Analytics only runs for visitors who explicitly consent
  ([DEPLOYMENT.md → Privacy model](./DEPLOYMENT.md#privacy-model)). Treat all
  figures as **consented traffic only** — real totals are higher, and the gap is
  not measurable. Never present these numbers as absolute traffic counts.
- Ad blockers suppress GA4 for a meaningful share of a developer audience. This
  dashboard is directionally useful, not an audit trail.
- Search terms are typed by users and could in principle contain something
  personal. Do not export raw search terms outside the docs team.
- Access to the GA4 property and the dashboard is limited to maintainers. -->
- Full data-handling practices are documented in our
  [Privacy Policy](/docs/legal/privacy) (GDPR-compliant, with data-controller
  contact, lawful basis, retention periods, and third-party processor details).
