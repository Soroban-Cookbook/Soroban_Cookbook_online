import { useEffect, useState } from 'react';
import { getVariant, trackExposure } from '@site/src/utils/experiments';

/**
 * Returns the active variant for an experiment and reports the exposure once
 * (issue #360).
 *
 * Assignment happens in an effect, not during render, because the variant
 * depends on `localStorage` — resolving it during the first render would make
 * the client markup disagree with the statically pre-rendered HTML and trigger
 * a hydration mismatch. The control variant renders first and swaps in the
 * assigned one immediately after mount.
 *
 * ```tsx
 * const variant = useExperiment('heroCtaCopy');
 * return <Link>{variant === 'start_building' ? 'Start Building' : 'Get Started'}</Link>;
 * ```
 */
export function useExperiment(experimentKey: string): string {
  const [variant, setVariant] = useState('control');

  useEffect(() => {
    const assigned = getVariant(experimentKey);
    setVariant(assigned);
    trackExposure(experimentKey, assigned);
  }, [experimentKey]);

  return variant;
}

export default useExperiment;
