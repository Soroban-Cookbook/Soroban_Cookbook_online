// Vitest does not infer matchers added via `expect.extend(...)` into its
// `Assertion<T>` type interface without an explicit declaration-merge. Adding
// jest-axe's `toHaveNoViolations` here means any spec that imports `expect`
// from 'vitest' can write `expect(results).toHaveNoViolations()` and have it
// typecheck without per-test casts.
//
// This file lives under src/ so the existing tsconfig's default include (set
// by @docusaurus/tsconfig) captures it without needing an explicit reference.
// If you ever switch to a custom include that skips **/*.d.ts, add this path
// back to the include array — or just leave it under src/.
import 'vitest';

declare module 'vitest' {
  // The real interface is `Assertion<T>`, but the merge itself doesn't need
  // to re-introduce the generic — vitest keeps the parameterised shape of
  // any methods that already reference T, and tooling that imports Assertion
  // generically still resolves it.
  interface Assertion {
    // jest-axe@8 accepts an optional RunOptions object; typing the
    // parameter as unknown keeps the merge permissive while still
    // preventing accidental misuse of an open-ended argument list.
    toHaveNoViolations(options?: unknown): void;
  }
}
