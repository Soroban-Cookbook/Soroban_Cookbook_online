import { describe, it, expect } from 'vitest';

import * as canonical from './index';
import DeprecatedButton, { Button as DeprecatedNamedButton } from '../UI/Button';
import DeprecatedButtonGroup from '../UI/Button/ButtonGroup';
import DeprecatedUiButtonGroup from '../UI/ButtonGroup';

/**
 * Guards the "single public Button API" decision from issue #629:
 * `@site/src/components/buttons` is the one implementation, and the older
 * `components/UI/Button*` paths are deprecated re-exports of it — not a second
 * component with a diverging prop contract.
 */
describe('Button public API', () => {
  it('exports Button and ButtonGroup from the canonical entry point', () => {
    expect(canonical.Button).toBeDefined();
    expect(canonical.ButtonGroup).toBeDefined();
  });

  it('re-exports the canonical Button from the deprecated UI path', () => {
    expect(DeprecatedButton).toBe(canonical.Button);
    expect(DeprecatedNamedButton).toBe(canonical.Button);
  });

  it('re-exports the canonical ButtonGroup from the deprecated UI paths', () => {
    expect(DeprecatedButtonGroup).toBe(canonical.ButtonGroup);
    expect(DeprecatedUiButtonGroup).toBe(canonical.ButtonGroup);
  });
});
