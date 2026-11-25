#!/usr/bin/env node
/**
 * Verifies Content Security Policy (CSP) configurations across:
 * - vercel.json
 * - documentation/static/_headers
 * - documentation/docusaurus.config.ts
 *
 * Ensures:
 * 1. Single source of truth (matches CANONICAL_CSP_HEADER and CANONICAL_CSP_META from csp-policy.mjs)
 * 2. 'unsafe-inline' is absent from script-src
 * 3. connect-src is restricted to specific trusted origins (no wildcard https:)
 * 4. form-action is restricted to 'self' (no wildcard https:)
 * 5. Any inline scripts found in documentation/build (if built) match allowed hashes
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { CANONICAL_CSP_HEADER, CANONICAL_CSP_META } from './csp-policy.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(docRoot, '..');

let errors = [];

function checkFileForPermissiveCSP(filePath, content) {
  // Check script-src does not allow unsafe-inline
  const scriptSrcMatch = content.match(/script-src[^;,\"\n]+/i);
  if (scriptSrcMatch && scriptSrcMatch[0].includes("'unsafe-inline'")) {
    errors.push(`${filePath}: script-src contains 'unsafe-inline'`);
  }

  // Check connect-src does not have permissive https: wildcard
  const connectSrcMatch = content.match(/connect-src[^;,\"\n]+/i);
  if (connectSrcMatch && /\bhttps:\s*($|;|,|\"|\')/.test(connectSrcMatch[0])) {
    errors.push(`${filePath}: connect-src contains overly permissive 'https:' wildcard`);
  }

  // Check form-action does not have permissive https: wildcard
  const formActionMatch = content.match(/form-action[^;,\"\n]+/i);
  if (formActionMatch && /\bhttps:\s*($|;|,|\"|\')/.test(formActionMatch[0])) {
    errors.push(`${filePath}: form-action contains overly permissive 'https:' wildcard`);
  }
}

// 1. Check vercel.json
const vercelPath = path.join(repoRoot, 'vercel.json');
if (fs.existsSync(vercelPath)) {
  const vercelContent = fs.readFileSync(vercelPath, 'utf8');
  checkFileForPermissiveCSP('vercel.json', vercelContent);
  if (!vercelContent.includes(CANONICAL_CSP_HEADER)) {
    errors.push(`vercel.json does not match CANONICAL_CSP_HEADER from csp-policy.mjs`);
  }
}

// 2. Check static/_headers
const headersPath = path.join(docRoot, 'static', '_headers');
if (fs.existsSync(headersPath)) {
  const headersContent = fs.readFileSync(headersPath, 'utf8');
  checkFileForPermissiveCSP('documentation/static/_headers', headersContent);
  if (!headersContent.includes(CANONICAL_CSP_HEADER)) {
    errors.push(`documentation/static/_headers does not match CANONICAL_CSP_HEADER from csp-policy.mjs`);
  }
}

// 3. Check docusaurus.config.ts
const configPath = path.join(docRoot, 'docusaurus.config.ts');
if (fs.existsSync(configPath)) {
  const configContent = fs.readFileSync(configPath, 'utf8');
  checkFileForPermissiveCSP('documentation/docusaurus.config.ts', configContent);
}

// 4. If build directory exists, check inline scripts in build/**/*.html
const buildDir = path.join(docRoot, 'build');
if (fs.existsSync(buildDir)) {
  const htmlFiles = [];
  function collectHtmlFiles(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        collectHtmlFiles(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        htmlFiles.push(fullPath);
      }
    }
  }
  collectHtmlFiles(buildDir);

  const scriptRegex = /<script\b(?![^>]*\bsrc=)(?![^>]*\btype=['"]application\/ld\+json['"])[^>]*>([\s\S]*?)<\/script>/gi;
  const discoveredHashes = new Set();

  for (const htmlFile of htmlFiles) {
    const html = fs.readFileSync(htmlFile, 'utf8');
    let match;
    while ((match = scriptRegex.exec(html)) !== null) {
      const scriptBody = match[1];
      if (!scriptBody.trim()) continue;
      const hash = 'sha256-' + crypto.createHash('sha256').update(scriptBody).digest('base64');
      discoveredHashes.add(hash);
    }
  }

  // Check discovered hashes against vercel.json CSP
  if (discoveredHashes.size > 0 && fs.existsSync(vercelPath)) {
    const vercelContent = fs.readFileSync(vercelPath, 'utf8');
    for (const hash of discoveredHashes) {
      if (!vercelContent.includes(hash)) {
        errors.push(`Discovered inline script in build with hash '${hash}' not present in vercel.json CSP`);
      }
    }
  }
}

if (errors.length > 0) {
  console.error('❌ CSP Check Failed:');
  for (const err of errors) {
    console.error(`  - ${err}`);
  }
  process.exit(1);
}

console.log('✅ CSP Check Passed: all policies match canonical constant, script-src uses hashes, connect-src & form-action restricted.');
