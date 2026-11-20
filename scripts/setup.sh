#!/usr/bin/env bash
# setup.sh — Idempotent local development environment setup for Soroban Cookbook.
#
# Checks for and installs (if missing):
#   1. Rust toolchain (via rustup)
#   2. Soroban WASM target (wasm32v1-none)
#   3. Bun JavaScript runtime
#   4. Documentation dependencies (`bun install --frozen-lockfile` in documentation/)
#
# Usage:
#   ./scripts/setup.sh

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DOCS_DIR="${REPO_ROOT}/documentation"
WASM_TARGET="wasm32v1-none"

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

log_info() { echo -e "${YELLOW}[info]${RESET}  $*"; }
log_pass() { echo -e "${GREEN}[pass]${RESET}  $*"; }
log_fail() { echo -e "${RED}[fail]${RESET}  $*" >&2; }

# ── 1. Rust toolchain ─────────────────────────────────────────────────────────

if [ -f "${HOME}/.cargo/env" ]; then
  # shellcheck disable=SC1091
  source "${HOME}/.cargo/env"
fi

if command -v rustup &>/dev/null && command -v cargo &>/dev/null; then
  log_pass "Rust is already installed ($(rustc --version))."
else
  if ! command -v curl &>/dev/null; then
    log_fail "curl is required to install Rust. Please install curl and re-run."
    exit 1
  fi
  log_info "Rust not found. Installing via rustup..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  if [ -f "${HOME}/.cargo/env" ]; then
    # shellcheck disable=SC1091
    source "${HOME}/.cargo/env"
  fi
  log_pass "Rust installed ($(rustc --version))."
fi

# ── 2. WASM target ────────────────────────────────────────────────────────────

if rustup target list --installed 2>/dev/null | grep -q "^${WASM_TARGET}\$"; then
  log_pass "Rust target '${WASM_TARGET}' is already installed."
else
  log_info "Adding Rust target '${WASM_TARGET}'..."
  rustup target add "${WASM_TARGET}"
  log_pass "Rust target '${WASM_TARGET}' added."
fi

# ── 3. Bun runtime ────────────────────────────────────────────────────────────

export BUN_INSTALL="${BUN_INSTALL:-${HOME}/.bun}"
if [ -d "${BUN_INSTALL}/bin" ]; then
  export PATH="${BUN_INSTALL}/bin:${PATH}"
fi

if command -v bun &>/dev/null; then
  log_pass "Bun is already installed ($(bun --version))."
else
  if ! command -v curl &>/dev/null; then
    log_fail "curl is required to install Bun. Please install curl and re-run."
    exit 1
  fi
  log_info "Bun not found. Installing..."
  curl -fsSL https://bun.sh/install | bash
  export PATH="${BUN_INSTALL}/bin:${PATH}"
  log_pass "Bun installed ($(bun --version))."
fi

# ── 4. Documentation dependencies ─────────────────────────────────────────────

if [ ! -d "${DOCS_DIR}" ]; then
  log_fail "Documentation directory not found at ${DOCS_DIR}."
  exit 1
fi

log_info "Installing documentation dependencies in documentation/..."
(cd "${DOCS_DIR}" && bun install --frozen-lockfile)
log_pass "Documentation dependencies installed."

echo ""
log_pass "Setup complete! Next steps:"
echo "  - Start the docs dev server:  cd documentation && bun start"
echo "  - Run example contract tests: ./scripts/test-examples.sh"
echo "  - Build example contracts:    ./scripts/build-examples-wasm.sh"
