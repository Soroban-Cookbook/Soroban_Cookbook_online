#!/usr/bin/env bash
# Vercel install when project root is the repository root (not documentation/).
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${root}/documentation"
exec bun install --frozen-lockfile
