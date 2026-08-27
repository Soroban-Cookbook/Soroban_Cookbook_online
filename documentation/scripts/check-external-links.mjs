#!/usr/bin/env node
/**
 * Checks external (https/http) links in docs and site source.
 * Complements Docusaurus onBrokenLinks which only validates internal routes at build.
 *
 * Usage: node scripts/check-external-links.mjs
 * Env:
 *   EXTERNAL_LINK_TIMEOUT_MS — per-request timeout (default 15000)
 *   EXTERNAL_LINK_CONCURRENCY — parallel checks (default 8)
 *   EXTERNAL_LINK_REPORT — report path relative to documentation/ (default reports/external-links.md)
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docRoot = path.join(__dirname, '..');
const docsDir = path.join(docRoot, 'docs');
const srcDir = path.join(docRoot, 'src');
const ignorePath = path.join(__dirname, 'external-link-ignore.json');
const reportRel =
  process.env.EXTERNAL_LINK_REPORT ?? 'reports/external-links.md';
const reportPath = path.join(docRoot, reportRel);
const timeoutMs = Number(process.env.EXTERNAL_LINK_TIMEOUT_MS ?? 15000);
const concurrency = Number(process.env.EXTERNAL_LINK_CONCURRENCY ?? 8);
const userAgent = 'Soroban-Cookbook-LinkChecker/1.0 (+https://soroban-cookbook.dev)';

const scanRoots = [
  { dir: docsDir, exts: ['.md', '.mdx'] },
  { dir: srcDir, exts: ['.tsx', '.ts', '.jsx', '.js', '.md', '.mdx'] },
];

const skipDirs = new Set(['node_modules', 'build', '.docusaurus', '__tests__']);

function walk(dir, exts, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (skipDirs.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, exts, files);
    else if (exts.some((e) => ent.name.endsWith(e))) files.push(p);
  }
  return files;
}

function stripTrailingPunctuation(url) {
  return url.replace(/[),.;:!?\]]+$/, '');
}

function isCheckableUrl(url) {
  if (url.includes('[') || url.includes('<')) return false;
  return true;
}

function extractExternalUrls(content) {
  const urls = new Set();
  const patterns = [
    /\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g,
    /href=["'](https?:\/\/[^"']+)["']/g,
    /(?:^|\s)(https?:\/\/[^\s<>"')\]`]+)/g,
  ];
  for (const pattern of patterns) {
    let m;
    while ((m = pattern.exec(content)) !== null) {
      const normalized = stripTrailingPunctuation(m[1]);
      if (isCheckableUrl(normalized)) urls.add(normalized);
    }
  }
  return urls;
}

function loadIgnoreRules() {
  const rules = JSON.parse(fs.readFileSync(ignorePath, 'utf8'));
  return {
    hostPatterns: (rules.hostPatterns ?? []).map((p) => new RegExp(p, 'i')),
    urlPatterns: (rules.urlPatterns ?? []).map((p) => new RegExp(p, 'i')),
    urls: new Set(rules.urls ?? []),
  };
}

function shouldIgnore(url, ignore) {
  if (ignore.urls.has(url)) return true;
  for (const p of ignore.urlPatterns) {
    if (p.test(url)) return true;
  }
  try {
    const host = new URL(url).hostname;
    for (const p of ignore.hostPatterns) {
      if (p.test(host)) return true;
    }
  } catch {
    return true;
  }
  return false;
}

async function checkUrlOnce(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const headers = { 'User-Agent': userAgent, Accept: '*/*' };

  try {
    let response = await fetch(url, {
      method: 'HEAD',
      redirect: 'follow',
      signal: controller.signal,
      headers,
    });

    if ([403, 404, 405, 501].includes(response.status)) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers: { ...headers, Range: 'bytes=0-0' },
      });
    }

    if ([403, 404, 405, 501].includes(response.status)) {
      response = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        signal: controller.signal,
        headers,
      });
    }

    const ok = response.ok || (response.status >= 300 && response.status < 400);
    return { ok, status: response.status, finalUrl: response.url };
  } catch (error) {
    const message =
      error.name === 'AbortError' ? `Timeout after ${timeoutMs}ms` : error.message;
    return { ok: false, status: 0, error: message };
  } finally {
    clearTimeout(timer);
  }
}

async function checkUrl(url) {
  let last = await checkUrlOnce(url);
  if (last.ok) return last;

  for (let attempt = 0; attempt < 2; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 1500));
    last = await checkUrlOnce(url);
    if (last.ok) return last;
  }

  return last;
}

async function mapPool(items, limit, fn) {
  const results = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

function relPath(filePath) {
  return path.relative(docRoot, filePath).replace(/\\/g, '/');
}

const ignore = loadIgnoreRules();
const urlToFiles = new Map();

for (const { dir, exts } of scanRoots) {
  for (const file of walk(dir, exts)) {
    const content = fs.readFileSync(file, 'utf8');
    const urls = extractExternalUrls(content);
    const fileRel = relPath(file);
    for (const url of urls) {
      if (!urlToFiles.has(url)) urlToFiles.set(url, new Set());
      urlToFiles.get(url).add(fileRel);
    }
  }
}

const allUrls = [...urlToFiles.keys()].sort();
const skipped = [];
const toCheck = [];

for (const url of allUrls) {
  if (shouldIgnore(url, ignore)) {
    skipped.push({ url, files: [...urlToFiles.get(url)] });
  } else {
    toCheck.push(url);
  }
}

console.log(`Checking ${toCheck.length} external URL(s) (${skipped.length} skipped)...\n`);

const checkResults = await mapPool(toCheck, concurrency, async (url) => {
  const result = await checkUrl(url);
  process.stdout.write(result.ok ? '.' : 'x');
  return { url, ...result, files: [...urlToFiles.get(url)] };
});
console.log('\n');

const broken = checkResults.filter((r) => !r.ok);
const ok = checkResults.filter((r) => r.ok);

function mdEscape(s) {
  return s.replace(/\|/g, '\\|');
}

const lines = [
  '# External Link Audit Report',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Summary',
  '',
  '| Metric | Count |',
  '|--------|------:|',
  `| Unique external URLs found | ${allUrls.length} |`,
  `| Checked | ${toCheck.length} |`,
  `| Skipped (ignored) | ${skipped.length} |`,
  `| OK | ${ok.length} |`,
  `| **Broken** | **${broken.length}** |`,
  '',
];

if (broken.length > 0) {
  lines.push('## Broken links', '', '| URL | Status | Error | Referenced in |', '|-----|--------|-------|---------------|');
  for (const row of broken.sort((a, b) => a.url.localeCompare(b.url))) {
    const status = row.status ? String(row.status) : '—';
    const err = row.error ? mdEscape(row.error) : '—';
    const files = row.files.map((f) => `\`${f}\``).join(', ');
    lines.push(`| ${mdEscape(row.url)} | ${status} | ${err} | ${files} |`);
  }
  lines.push('');
}

if (skipped.length > 0) {
  lines.push('## Skipped URLs', '');
  for (const { url, files } of skipped.sort((a, b) => a.url.localeCompare(b.url))) {
    lines.push(`- \`${url}\` — ${files.map((f) => `\`${f}\``).join(', ')}`);
  }
  lines.push('');
}

lines.push('## How to fix', '');
lines.push('- Update or remove broken URLs in the files listed above.');
lines.push('- Add intentional placeholders to `scripts/external-link-ignore.json` only for localhost/demo URLs.');
lines.push('- Re-run: `bun run check:external-links` from the `documentation/` directory.');
lines.push('');

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, lines.join('\n'));

console.log(`Report written to ${reportRel}\n`);

if (broken.length > 0) {
  console.log('Broken external links:');
  for (const row of broken) {
    console.log(`  [${row.status || 'ERR'}] ${row.url}`);
    for (const f of row.files) console.log(`         → ${f}`);
  }
  process.exit(1);
}

console.log('All checked external links OK.');
process.exit(0);
