/**
 * Feature flags and A/B experiment assignment (issue #360).
 *
 * Deliberately dependency-free: no PostHog, no Optimizely, no extra script on
 * the critical path. Assignment is a pure function of a per-visitor ID and the
 * experiment key, so a visitor sees the same variant on every page and across
 * sessions without a server round-trip.
 *
 * **No experiment runs until it is enabled here and an A/B plan is approved** —
 * see `documentation/docs/planning/ab-testing.md` for the required process.
 */

import { hasConsent } from './analyticsConsent';
import { trackExperimentExposure } from './analytics';

export interface ExperimentConfig {
  /** Stable ID; also the GA4 `experiment_id` dimension. Never reuse across experiments. */
  id: string;
  /** Variant names. The first entry is the control and the default fallback. */
  variants: readonly string[];
  /** Experiments ship disabled; flipping this to true starts assignment. */
  enabled: boolean;
  /** Percentage of visitors entering the experiment at all, 0–100. */
  trafficAllocation: number;
  /** Why this experiment exists — kept next to the config so it cannot drift. */
  hypothesis: string;
}

/**
 * The experiment registry. Everything here is `enabled: false` until its plan
 * is approved; the entry below is a worked example of the required shape, not
 * a live experiment.
 */
export const EXPERIMENTS: Record<string, ExperimentConfig> = {
  heroCtaCopy: {
    id: 'hero_cta_copy',
    variants: ['control', 'start_building'],
    enabled: false,
    trafficAllocation: 100,
    hypothesis:
      'A task-oriented hero CTA ("Start Building") converts more landing visitors into docs readers than the generic "Get Started".',
  },
};

const VISITOR_ID_KEY = 'sc-visitor-id';
/** Overrides let a reviewer force a variant: ?exp_hero_cta_copy=start_building */
const OVERRIDE_PREFIX = 'exp_';

/**
 * Stable per-visitor ID. Random, not derived from any personal data, and
 * created only once a visitor is already in a running experiment.
 */
function getVisitorId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    let id = window.localStorage.getItem(VISITOR_ID_KEY);
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      window.localStorage.setItem(VISITOR_ID_KEY, id);
    }
    return id;
  } catch {
    // Private browsing / storage disabled: fall back to control rather than
    // assigning a variant that would change on every page view.
    return null;
  }
}

/**
 * Hashes a string to a uniform fraction in [0, 1).
 *
 * FNV-1a alone is not safe to bucket with. Multiplying by an odd prime leaves
 * the lowest bit unchanged, so `fnv(x) % 2` reduces to the XOR of the input
 * bytes' low bits — a parity check, not a hash. Two experiment IDs differing
 * only in their last character ("exp_a" vs "exp_b") would then land every
 * visitor in *opposite* variants rather than independent ones.
 *
 * The murmur3-style finalizer below avalanches those weak low bits before we
 * use them, and returning a fraction keeps callers off the modulo entirely.
 */
function hashToUnitInterval(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }

  hash ^= hash >>> 16;
  hash = Math.imul(hash, 0x7feb352d);
  hash ^= hash >>> 15;
  hash = Math.imul(hash, 0x846ca68b);
  hash ^= hash >>> 16;

  return (hash >>> 0) / 0x100000000;
}

function readOverride(experimentId: string): string | null {
  if (typeof window === 'undefined') return null;
  const raw = new URLSearchParams(window.location.search).get(`${OVERRIDE_PREFIX}${experimentId}`);
  return raw?.trim() || null;
}

/**
 * Resolves the variant for the given experiment.
 *
 * Returns the control variant when the experiment is unknown, disabled, the
 * visitor falls outside the traffic allocation, or assignment is not possible
 * (server render, storage unavailable). Callers can therefore treat the return
 * value as "what to render" with no further checks.
 */
export function getVariant(experimentKey: string): string {
  const config = EXPERIMENTS[experimentKey];
  if (!config) return 'control';

  const control = config.variants[0] ?? 'control';
  if (typeof window === 'undefined') return control;

  const override = readOverride(config.id);
  if (override && config.variants.includes(override)) return override;

  if (!config.enabled) return control;

  const visitorId = getVisitorId();
  if (!visitorId) return control;

  // Hash the pair so a visitor's bucket in one experiment says nothing about
  // their bucket in another. Traffic gating and variant choice use separately
  // salted hashes so that being near the allocation edge does not skew which
  // variant a visitor gets.
  const trafficRoll = hashToUnitInterval(`${config.id}:${visitorId}:traffic`);
  if (trafficRoll * 100 >= config.trafficAllocation) return control;

  const variantRoll = hashToUnitInterval(`${config.id}:${visitorId}:variant`);
  const index = Math.floor(variantRoll * config.variants.length);

  return config.variants[index] ?? control;
}

/**
 * Reports that a variant was rendered. Only fires when the visitor has
 * consented to analytics — an unconsented visitor is still assigned a variant
 * (so the page renders consistently) but generates no telemetry.
 */
export function trackExposure(experimentKey: string, variant: string): void {
  const config = EXPERIMENTS[experimentKey];
  if (!config?.enabled || !hasConsent()) return;
  trackExperimentExposure(config.id, variant);
}

/** True when a flag/experiment is live. Use for simple on/off feature flags. */
export function isEnabled(experimentKey: string): boolean {
  return EXPERIMENTS[experimentKey]?.enabled ?? false;
}
