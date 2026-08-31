#!/usr/bin/env bash
# test-examples.sh — Validate all Soroban code examples compile and their tests pass.
#
# Usage:
#   ./scripts/test-examples.sh           # test all examples
#   ./scripts/test-examples.sh counter   # test a single example by directory name
#
# Exit codes:
#   0 — all examples passed
#   1 — one or more examples failed

set -euo pipefail

EXAMPLES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../examples" && pwd)"
PASS=0
FAIL=0
FAILED_EXAMPLES=()

# Colours (disabled when not writing to a terminal)
if [ -t 1 ]; then
  GREEN="\033[0;32m"
  RED="\033[0;31m"
  YELLOW="\033[0;33m"
  RESET="\033[0m"
else
  GREEN=""
  RED=""
  YELLOW=""
  RESET=""
fi

log_info()  { echo -e "${YELLOW}[info]${RESET}  $*"; }
log_pass()  { echo -e "${GREEN}[pass]${RESET}  $*"; }
log_fail()  { echo -e "${RED}[fail]${RESET}  $*"; }

# ── prerequisite checks ───────────────────────────────────────────────────────

if ! command -v cargo &>/dev/null; then
  echo "ERROR: cargo is not installed or not on PATH." >&2
  echo "Install Rust: https://www.rust-lang.org/tools/install" >&2
  exit 1
fi

# ── determine which examples to run ──────────────────────────────────────────

if [ $# -gt 0 ]; then
  # Single example requested
  EXAMPLE_DIRS=("$EXAMPLES_DIR/$1")
  if [ ! -d "${EXAMPLE_DIRS[0]}" ]; then
    echo "ERROR: Example '${1}' not found in ${EXAMPLES_DIR}" >&2
    exit 1
  fi
else
  # Collect every sub-directory that contains a Cargo.toml (i.e. every example)
  EXAMPLE_DIRS=()
  while IFS= read -r dir; do
    [ -n "$dir" ] && EXAMPLE_DIRS+=("$dir")
  done < <(find "$EXAMPLES_DIR" -mindepth 1 -maxdepth 1 -type d | sort)
fi

echo ""
log_info "Running tests for ${#EXAMPLE_DIRS[@]} example(s) in ${EXAMPLES_DIR}"
echo ""

# ── run tests ─────────────────────────────────────────────────────────────────

for dir in "${EXAMPLE_DIRS[@]}"; do
  name="$(basename "$dir")"

  # Skip the workspace root itself
  [ -f "$dir/Cargo.toml" ] || continue

  log_info "Testing '${name}' …"

  # Upgradeable example requires v2 Wasm to be built before running tests.
  if [ "$name" = "upgradeable" ] && [ -f "$dir/v2/Cargo.toml" ]; then
    log_info "Building v2 Wasm for '${name}' …"
    if ! cargo build --locked --manifest-path "$dir/v2/Cargo.toml" \
        --target wasm32-unknown-unknown --release \
    WASM_TARGET="wasm32v1-none"
    if ! cargo build --manifest-path "$dir/v2/Cargo.toml" \
        --target "$WASM_TARGET" --release \
        --target-dir "$dir/v2/target" 2>&1; then
      WASM_TARGET="wasm32-unknown-unknown"
      if ! cargo build --manifest-path "$dir/v2/Cargo.toml" \
          --target "$WASM_TARGET" --release \
          --target-dir "$dir/v2/target" 2>&1; then
        log_fail "'${name}' — v2 Wasm build FAILED"
        (( FAIL++ )) || true
        FAILED_EXAMPLES+=("$name")
        echo ""
        continue
      fi
    fi
    mkdir -p "$dir/v2/target/wasm32-unknown-unknown/release" "$dir/v2/target/wasm32v1-none/release"
    cp -f "$dir/v2/target/$WASM_TARGET/release/upgradeable_v2.wasm" "$dir/v2/target/wasm32-unknown-unknown/release/upgradeable_v2.wasm" 2>/dev/null || true
    cp -f "$dir/v2/target/$WASM_TARGET/release/upgradeable_v2.wasm" "$dir/v2/target/wasm32v1-none/release/upgradeable_v2.wasm" 2>/dev/null || true
  fi

  # Contract factory requires child Wasm to be built before running tests.
  if [ "$name" = "contract-factory" ] && [ -f "$dir/child/Cargo.toml" ]; then
    log_info "Building child Wasm for '${name}' …"
    if ! cargo build --locked --manifest-path "$dir/child/Cargo.toml" \
        --target wasm32-unknown-unknown --release \
    WASM_TARGET="wasm32v1-none"
    if ! cargo build --manifest-path "$dir/child/Cargo.toml" \
        --target "$WASM_TARGET" --release \
        --target-dir "$dir/child/target" 2>&1; then
      WASM_TARGET="wasm32-unknown-unknown"
      if ! cargo build --manifest-path "$dir/child/Cargo.toml" \
          --target "$WASM_TARGET" --release \
          --target-dir "$dir/child/target" 2>&1; then
        log_fail "'${name}' — child Wasm build FAILED"
        (( FAIL++ )) || true
        FAILED_EXAMPLES+=("$name")
        echo ""
        continue
      fi
    fi
    mkdir -p "$dir/child/target/wasm32-unknown-unknown/release" "$dir/child/target/wasm32v1-none/release"
    cp -f "$dir/child/target/$WASM_TARGET/release/contract_factory_child.wasm" "$dir/child/target/wasm32-unknown-unknown/release/contract_factory_child.wasm" 2>/dev/null || true
    cp -f "$dir/child/target/$WASM_TARGET/release/contract_factory_child.wasm" "$dir/child/target/wasm32v1-none/release/contract_factory_child.wasm" 2>/dev/null || true
  fi

  if cargo test --locked --manifest-path "$dir/Cargo.toml" 2>&1; then
  if cargo test --manifest-path "$dir/Cargo.toml" --lib 2>&1; then
    log_pass "'${name}' — all tests passed"
    (( PASS++ )) || true
  else
    log_fail "'${name}' — tests FAILED"
    (( FAIL++ )) || true
    FAILED_EXAMPLES+=("$name")
  fi

  echo ""
done

# ── summary ───────────────────────────────────────────────────────────────────

echo "─────────────────────────────────────"
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "─────────────────────────────────────"

if [ "${FAIL}" -gt 0 ]; then
  echo ""
  log_fail "The following example(s) failed:"
  for ex in "${FAILED_EXAMPLES[@]}"; do
    echo "  • ${ex}"
  done
  echo ""
  echo "Fix the errors above, then re-run: ./scripts/test-examples.sh"
  exit 1
fi

echo ""
log_pass "All examples passed."
