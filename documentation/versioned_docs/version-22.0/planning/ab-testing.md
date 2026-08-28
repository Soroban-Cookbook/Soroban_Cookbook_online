---
title: A/B Testing Plan
description: How experiments are proposed, approved, run, and concluded on the Soroban Cookbook.
sidebar_label: A/B Testing
---

# A/B Testing

The Soroban Cookbook ships a small, dependency-free experiment framework. This
page is the **process** half of it: no experiment may be enabled until a plan
following this template has been approved in a GitHub issue.

The code half lives in
[`src/utils/experiments.ts`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/src/utils/experiments.ts)
and [`src/hooks/useExperiment.ts`](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/src/hooks/useExperiment.ts).

## Why not PostHog or Optimizely?

We evaluated hosted experimentation platforms and chose not to adopt one yet:

| Consideration | Hosted platform | This framework |
| --- | --- | --- |
| Extra JS on every page | 30–60 KB | 0 KB |
| Third-party origin in CSP | Required | None |
| Cost at our traffic | Free tier, then paid | Free |
| Statistical analysis | Built in | Manual, in GA4 |
| Setup for one experiment | Account, project, SDK | Add a registry entry |

For a docs site running at most one or two experiments at a time, the hosted
tooling costs more (in page weight and privacy surface) than the analysis
convenience is worth. If we ever need sequential testing or automated
significance calls, revisit this — PostHog is the likely choice because it can
be self-hosted and its feature-flag API maps cleanly onto `getVariant()`.

## How assignment works

- A random visitor ID is stored in `localStorage` under `sc-visitor-id`. It is
  not derived from any personal data and is never sent anywhere.
- The variant is `FNV1a(experimentId + ":" + visitorId) % variants.length`,
  so assignment is deterministic — a visitor sees the same variant on every
  page and on repeat visits — and independent across experiments.
- `trafficAllocation` gates what share of visitors enter at all.
- Visitors who decline analytics consent **still get a stable variant** (so the
  page does not flicker between visits) but generate **no exposure events**.
  Their behavior is therefore not measured, which is the intended trade-off.
- If `localStorage` is unavailable, the visitor always gets the control.

### Forcing a variant

Append `?exp_<experiment_id>=<variant>` to any URL — for example
`/?exp_hero_cta_copy=start_building`. This works regardless of whether the
experiment is enabled, which makes it the way to review a variant in a PR.

## Required plan template

Copy this into the experiment's tracking issue. **An experiment is not approved
until a maintainer has signed off on a completed version of this.**

```markdown
### Experiment: <name>

**Hypothesis**
Changing <X> will improve <metric> because <reasoning>.

**Variants**
- `control`: <current behavior>
- `<variant>`: <proposed behavior>

**Primary metric**
<single GA4 event or funnel step this is judged on>

**Guardrail metrics**
<what must not get worse — e.g. bounce rate, search usage>

**Traffic allocation**
<percentage, and why>

**Minimum sample size**
<visitors per variant, from a power calculation>

**Planned duration**
<at least one full week, to cover weekday/weekend cycles>

**Decision rule**
Ship <variant> if <metric> improves by ≥<threshold> with no guardrail
regression. Otherwise keep control and record the finding.

**Approved by**
<maintainer> on <date>
```

### Why a minimum sample size is mandatory

This site's traffic is modest. Most plausible CTA changes produce effects small
enough that a week of data cannot distinguish them from noise. Calculating the
required sample **before** running tells you whether the experiment is worth
running at all — and stops the far more common failure mode of watching a
dashboard until the numbers happen to look good, which reliably manufactures
false positives.

## Running an experiment

1. **Write the plan** in a GitHub issue using the template above. Get sign-off.
2. **Add the registry entry** in `src/utils/experiments.ts` with
   `enabled: false`:

   ```ts
   myExperiment: {
     id: 'my_experiment',
     variants: ['control', 'treatment'],
     enabled: false,
     trafficAllocation: 100,
     hypothesis: '…',
   },
   ```

3. **Implement both variants** behind the hook:

   ```tsx
   const variant = useExperiment('myExperiment');
   return variant === 'treatment' ? <Treatment /> : <Control />;
   ```

4. **Review both** using the `?exp_my_experiment=treatment` override.
5. **Enable** in a separate, easily reverted PR flipping `enabled: true`.
6. **Wait for the planned duration.** Do not peek-and-stop early.
7. **Analyze** in GA4 (see below), then **conclude**: ship the winner by making
   it the only code path, and delete the experiment entry.

Leaving concluded experiments in the registry is how a codebase accumulates
permanent dead branches — removal is part of finishing.

## Analyzing results in GA4

Each assignment emits `experiment_exposure` with `experiment_id` and `variant`.
Register both as custom dimensions (**Admin → Custom definitions**), then:

1. **Explore → Free form.**
2. Breakdown dimension: `variant`.
3. Metric: the primary metric from the plan (e.g. `funnel_cta_click` count).
4. Filter: `experiment_id` equals your experiment.

Compare the conversion rate per variant — exposures are the denominator, not
sessions. GA4 will not test significance for you; use an external two-proportion
z-test calculator with the exposure and conversion counts.

See [DEPLOYMENT.md → Analytics](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/DEPLOYMENT.md#analytics)
for the underlying event catalog.

## Constraints

- **Never experiment on documentation correctness.** Layout, copy, and
  navigation are fair game; the accuracy of a contract example is not.
- **Never run two experiments that touch the same element.** Assignment is
  independent, so overlapping experiments make effects uninterpretable.
- **Accessibility is not a variant.** Every variant must meet the same a11y bar.
- **No experiment may block first paint.** Variants resolve after mount, so
  design them to swap in without layout shift.
