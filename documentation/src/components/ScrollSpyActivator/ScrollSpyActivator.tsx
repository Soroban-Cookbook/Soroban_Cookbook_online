/**
 * ScrollSpyActivator — headless component that activates the useScrollSpy hook
 * for doc pages (issue #133 / Phase 4).
 *
 * It renders nothing but executes the side effect of observing article headings
 * and applying the `.scroll-spy-active` class to matching sidebar links.
 *
 * Mount this component once per doc page render — we wire it into the swizzled
 * `DocItem/Content` wrapper.
 */

import { useScrollSpy } from '@site/src/hooks/useScrollSpy';

export function ScrollSpyActivator(): null {
  useScrollSpy();
  return null;
}

export default ScrollSpyActivator;
