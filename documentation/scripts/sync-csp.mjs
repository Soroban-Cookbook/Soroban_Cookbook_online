#!/usr/bin/env node
/**
 * Synchronizes the canonical Content Security Policy (from csp-policy.mjs)
 * into:
 * 1. vercel.json (repo root)
 * 2. documentation/static/_headers
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { CANONICAL_CSP_HEADER } from './csp-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(docRoot, '..');

// 1. Update vercel.json
const vercelPath = path.join(repoRoot, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercel = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  let updated = false;
  if (Array.isArray(vercel.headers)) {
    for (const route of vercel.headers) {
      if (Array.isArray(route.headers)) {
        for (const h of route.headers) {
          if (h.key === 'Content-Security-Policy') {
            h.value = CANONICAL_CSP_HEADER;
            updated = true;
          }
        }
      }
    }
  }
  if (updated) {
    fs.writeFileSync(vercelPath, JSON.stringify(vercel, null, 2) + '\n', 'utf8');
    console.log('✅ Synchronized vercel.json with canonical CSP');
  }
}

// 2. Update documentation/static/_headers
const headersPath = path.join(docRoot, 'static', '_headers');
if (fs.existsSync(headersPath)) {
  const lines = fs.readFileSync(headersPath, 'utf8').split('\n');
  const updatedLines = lines.map((line) => {
    if (line.trim().startsWith('Content-Security-Policy:')) {
      return `  Content-Security-Policy: ${CANONICAL_CSP_HEADER}`;
    }
    return line;
  });
  fs.writeFileSync(headersPath, updatedLines.join('\n'), 'utf8');
  console.log('✅ Synchronized documentation/static/_headers with canonical CSP');
}
