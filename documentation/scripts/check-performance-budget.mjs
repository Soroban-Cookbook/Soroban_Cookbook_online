#!/usr/bin/env node
/**
 * Enforce documentation bundle size budgets after `bun run build`.
 *
 * Usage:
 *   node scripts/check-performance-budget.mjs
 *   node scripts/check-performance-budget.mjs --budgets bundle-budgets.json
 *
 * Exit codes:
 *   0 — all budgets within limits
 *   1 — one or more budgets exceeded, or configuration/build missing
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const budgetsArgIndex = args.indexOf('--budgets');
const budgetsPath = path.resolve(
  root,
  budgetsArgIndex >= 0 && args[budgetsArgIndex + 1]
    ? args[budgetsArgIndex + 1]
    : 'bundle-budgets.json',
);

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
}

function globToRegExp(pattern) {
  const escaped = pattern
    .replace(/\\/g, '/')
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '::DOUBLE::')
    .replace(/\*/g, '[^/]*')
    .replace(/::DOUBLE::/g, '.*');
  return new RegExp(`^${escaped}$`);
}

function walkFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkFiles(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

function matchFiles(pattern) {
  const buildRoot = path.join(root, 'build');
  if (!fs.existsSync(buildRoot)) {
    fail(`Build directory not found at ${buildRoot}. Run \`bun run build\` first.`);
  }
  const re = globToRegExp(pattern.replace(/\\/g, '/'));
  return walkFiles(buildRoot)
    .map((abs) => ({
      abs,
      rel: path.relative(root, abs).split(path.sep).join('/'),
      size: fs.statSync(abs).size,
    }))
    .filter((f) => re.test(f.rel));
}

function checkBudget(budget) {
  const files = matchFiles(budget.pattern);
  if (files.length === 0) {
    return {
      id: budget.id,
      ok: false,
      detail: `No files matched pattern \`${budget.pattern}\``,
    };
  }

  if (budget.aggregate) {
    const total = files.reduce((sum, f) => sum + f.size, 0);
    const ok = total <= budget.maxBytes;
    return {
      id: budget.id,
      ok,
      detail: `${budget.description}: ${formatBytes(total)} / ${formatBytes(budget.maxBytes)} across ${files.length} file(s)${ok ? '' : ' — EXCEEDED'}`,
      total,
    };
  }

  const largest = files.reduce((a, b) => (a.size >= b.size ? a : b));
  const ok = files.every((f) => f.size <= budget.maxBytes);
  return {
    id: budget.id,
    ok,
    detail: `${budget.description}: largest ${largest.rel} is ${formatBytes(largest.size)} / ${formatBytes(budget.maxBytes)}${ok ? '' : ' — EXCEEDED'}`,
    total: largest.size,
  };
}

function main() {
  if (!fs.existsSync(budgetsPath)) {
    fail(`Budget config not found: ${budgetsPath}`);
  }

  const config = JSON.parse(fs.readFileSync(budgetsPath, 'utf8'));
  if (!Array.isArray(config.budgets) || config.budgets.length === 0) {
    fail('Budget config must include a non-empty `budgets` array.');
  }

  console.log('📦 Checking documentation performance budgets…');
  console.log(`   Config: ${path.relative(root, budgetsPath)}`);

  const results = config.budgets.map(checkBudget);
  for (const result of results) {
    console.log(`${result.ok ? '✅' : '❌'} [${result.id}] ${result.detail}`);
  }

  const failed = results.filter((r) => !r.ok);
  if (failed.length > 0) {
    console.error('');
    console.error(
      `${failed.length} budget(s) exceeded. If this growth is intentional, update documentation/bundle-budgets.json and document why in the PR.`,
    );
    process.exit(1);
  }

  console.log('✅ All performance budgets passed.');
}

main();
