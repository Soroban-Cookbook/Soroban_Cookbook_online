# Performance Budgets (CI)

The documentation site enforces **on-disk bundle size budgets** in CI after
`bun run build`. Builds fail when JavaScript or CSS assets exceed the
configured thresholds.

## Configuration

| File | Role |
|------|------|
| `documentation/bundle-budgets.json` | Hard CI budgets (this issue) |
| `documentation/.performancebudget.json` | Historical / Lighthouse-oriented targets (not the CI gate) |
| `documentation/scripts/check-performance-budget.mjs` | Checker script |
| `.github/workflows/ci.yml` | Runs the checker in the **Build Documentation** job |

## Current budgets

Measured from a production build on 2026-08-06 (after docs versioning), then given ~12% headroom:

| Budget ID | What is measured | Limit |
|-----------|------------------|-------|
| `main-js` | `build/assets/js/main.*.js` | 704 KB (720,896 bytes) |
| `main-css` | `build/assets/css/styles.*.css` | 272 KB (278,528 bytes) |
| `total-js` | All `build/**/*.js` | ~8.75 MB (9,175,040 bytes) |
| `total-css` | All `build/**/*.css` | 272 KB (278,528 bytes) |

Sizes are **uncompressed** file sizes on disk (not gzip transfer size).

## Local usage

```bash
cd documentation
bun run build
bun run check:bundle-budget
```

To confirm CI would fail on regression, temporarily lower a limit in
`bundle-budgets.json` and re-run the check (do not commit the lowered value).

## Updating budgets intentionally

1. Run `bun run build` and note the checker output.
2. Raise only the budget IDs that must grow, with a small margin.
3. Explain the reason in the PR (new dependency, larger syntax highlighter, etc.).
4. Prefer code-splitting / lazy-loading before raising `main-js` or `total-js`.
