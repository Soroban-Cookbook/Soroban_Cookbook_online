#!/usr/bin/env bash
# check-wasm-budgets.sh — Fail CI if any example contract's WASM binary exceeds
# its documented size budget.
#
# Budgets live in examples/wasm-budgets.toml (per-crate byte limits built from
# release `wasm32v1-none` baselines). See that file and
# documentation/docs/patterns/optimization-playbook.mdx for the operating
# procedure.
#
# Usage:
#   ./scripts/check-wasm-budgets.sh           # build & check every workspace member
#
# Exit codes:
#   0 — every built candidate is within budget (missing WASM from a build failure
#       is reported but non-fatal, mirroring test-examples.sh)
#   1 — one or more built candidates exceeded their budget

set -euo pipefail

EXAMPLES_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../examples" && pwd)"
TARGET_DIR="${CARGO_TARGET_DIR:-${EXAMPLES_DIR}/target}"
WASM_TARGET="${WASM_TARGET:-wasm32v1-none}"
PASS=0
FAIL=0
FAILED_EXAMPLES=()

# Colours (disabled when not writing to a terminal)
if [ -t 1 ]; then
  GREEN="\033[0;32m"; RED="\033[0;31m"; YELLOW="\033[0;33m"; RESET="\033[0m"
else
  GREEN=""; RED=""; YELLOW=""; RESET=""
fi

log_info() { echo -e "${YELLOW}[info]${RESET}  $*"; }
log_pass() { echo -e "${GREEN}[pass]${RESET}  $*"; }
log_fail() { echo -e "${RED}[fail]${RESET}  $*"; }

if ! command -v cargo &>/dev/null; then
  echo "ERROR: cargo is not installed or not on PATH." >&2
  exit 1
fi

if ! command -v python3 &>/dev/null; then
  echo "ERROR: python3 is required to parse examples/wasm-budgets.toml." >&2
  exit 1
fi

# ── load budget file ─────────────────────────────────────────────────────────

BUDGET_FILE="${EXAMPLES_DIR}/wasm-budgets.toml"
if [ ! -f "${BUDGET_FILE}" ]; then
  echo "ERROR: budget file not found: ${BUDGET_FILE}" >&2
  exit 1
fi
eval "$(python3 - "${BUDGET_FILE}" <<'PY'
import sys, tomllib
with open(sys.argv[1], "rb") as fh:
    data = tomllib.load(fh)
for name, budget in data.get("budgets", {}).items():
    var = name.replace("-", "_")
    print(f"BUDGET_{var}={budget}")
PY
)"

# ── workspace members ────────────────────────────────────────────────────────

mapfile -t MEMBERS < <(python3 - "${EXAMPLES_DIR}/Cargo.toml" <<'PY'
import sys, tomllib
with open(sys.argv[1], "rb") as fh:
    data = tomllib.load(fh)
for m in data["workspace"]["members"]:
    print(m)
PY
)

echo ""
log_info "Building ${#MEMBERS[@]} example(s) for target '${WASM_TARGET}'"
echo ""

# ── build & check each crate ────────────────────────────────────────────────

for member in "${MEMBERS[@]}"; do
  name="$(basename "${member}")"
  crate="${name//-/_}"

  if ! cargo build --manifest-path "${EXAMPLES_DIR}/${member}/Cargo.toml" \
      --target "${WASM_TARGET}" --release \
      --target-dir "${TARGET_DIR}" 2>&1; then
    log_info "'${name}' — build FAILED, skipping size check (non-fatal)"
    echo ""
    continue
  fi

  wasm="${TARGET_DIR}/${WASM_TARGET}/release/${crate}.wasm"
  if [ ! -f "${wasm}" ]; then
    log_info "'${name}' — no .wasm produced, skipping size check (non-fatal)"
    echo ""
    continue
  fi

  size="$(stat -c%s "${wasm}")"
  budget_var="BUDGET_${name//-/_}"
  budget="${!budget_var:-}"

  if [ -z "${budget}" ]; then
    log_fail "'${name}' — no budget entry for ${name} in ${BUDGET_FILE}"
    (( FAIL++ )) || true
    FAILED_EXAMPLES+=("${name} (missing budget)")
    echo ""
    continue
  fi

  if [ "${size}" -gt "${budget}" ]; then
    log_fail "'${name}' — ${size} bytes exceeds budget of ${budget} bytes"
    (( FAIL++ )) || true
    FAILED_EXAMPLES+=("${name} (${size} > ${budget})")
  else
    log_pass "'${name}' — ${size} bytes (budget ${budget})"
    (( PASS++ )) || true
  fi

  echo ""
done

# ── summary ──────────────────────────────────────────────────────────────────

echo "─────────────────────────────────────"
echo "Results: ${PASS} passed, ${FAIL} failed"
echo "─────────────────────────────────────"

if [ "${FAIL}" -gt 0 ]; then
  echo ""
  log_fail "Wasm budget violation(s):"
  for ex in "${FAILED_EXAMPLES[@]}"; do
    echo "  • ${ex}"
  done
  echo ""
  echo "Re-run: ./scripts/check-wasm-budgets.sh"
  exit 1
fi

echo ""
log_pass "All Wasm binaries within budget."