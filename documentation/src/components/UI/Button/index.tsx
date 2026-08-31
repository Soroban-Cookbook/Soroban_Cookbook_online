/**
 * @deprecated Import from `@site/src/components/buttons` instead.
 *
 * `src/components/buttons` is the canonical Button implementation (issue #629).
 * This path is kept as a re-export so existing imports keep resolving, but it
 * no longer defines its own component — the prop API is the canonical one:
 * `variant` (`primary` | `secondary` | `tertiary` | `ghost` | `danger`),
 * `size` (`small` | `medium` | `large`), and `startIcon` / `endIcon` in place
 * of the old `iconLeft` / `iconRight`.
 */

export { Button as default, Button } from '../../buttons';
export type { ButtonProps, ButtonVariant, ButtonSize } from '../../buttons';
