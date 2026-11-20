# Rust dependency auditing

The examples workspace is scanned with `cargo-audit` in the Security Scans workflow. The audit runs for Rust dependency changes on pull requests and runs weekly from the default branch.

## What the job checks

The job runs `cargo audit --deny warnings` from `examples/`, using the checked-in `examples/Cargo.lock`. A RustSec advisory, warning, or other non-zero audit result fails CI. This keeps known vulnerable transitive dependencies from being silently recommended by the cookbook.

## Handling a known advisory

Do **not** add a blanket ignore merely to make CI green. When an advisory is reported:

1. Prefer upgrading the direct or transitive dependency to a fixed release.
2. If the dependency is transitive, update the direct dependency that brings it in, when possible.
3. If no safe upgrade is currently available, document the advisory, affected package/version, why the example is not practically affected (if applicable), and the upstream remediation status in the issue/PR.
4. An advisory may only be ignored when the maintainers explicitly accept the documented risk. The exception must be narrowly scoped to the specific RustSec advisory and package/version, have an owner, and include a reason and review date.
5. Revisit every exception when the dependency graph changes or the upstream fix becomes available. Remove the exception as soon as it is no longer necessary.

The CI workflow intentionally does not contain permanent blanket ignores. Security exceptions should remain visible and reviewable rather than being hidden in automation.

## Local verification

From the repository root:

```bash
cargo audit --manifest-path examples/Cargo.toml --deny warnings
```

If `cargo-audit` is not installed:

```bash
cargo install cargo-audit
```
