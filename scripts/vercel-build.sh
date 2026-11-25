#!/usr/bin/env bash
# Vercel build script for Soroban Cookbook documentation (executed from repo root).
set -euo pipefail
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${root}/documentation"
exec bun run build
