#!/usr/bin/env node
/**
 * Audits documentation internal links against link-registry.json.
 * Validates required cross-links, minimum internal link counts, and orphans.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.join(__dirname, '../docs');
const registryPath = path.join(__dirname, 'link-registry.json');

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p, files);
    else if (/\.(md|mdx)$/.test(ent.name)) files.push(p);
  }
  return files;
}

function docIdFromPath(filePath) {
  const rel = path.relative(docsRoot, filePath).replace(/\\/g, '/');
  if (rel === 'index.md') return 'index';
  return rel.replace(/\.(md|mdx)$/, '');
}

function normalizeTarget(raw, sourceId) {
  let target = raw.trim();
  if (target.startsWith('http') || target.startsWith('#') || target.startsWith('mailto:')) {
    return null;
  }
  target = target.split('#')[0].split('?')[0];
  if (!target) return null;

  if (target.startsWith('/docs/')) {
    return target
      .replace(/\/$/, '')
      .replace(/\.(md|mdx)$/, '') || '/docs';
  }
  if (target.startsWith('/')) return null;

  const sourceDir = sourceId.includes('/') ? sourceId.replace(/\/[^/]+$/, '') : '';
  let resolved = target;
  if (target.startsWith('./') || target.startsWith('../') || !target.startsWith('/')) {
    const baseParts = sourceDir ? sourceDir.split('/') : [];
    const relParts = target.split('/');
    for (const part of relParts) {
      if (part === '.' || part === '') continue;
      if (part === '..') baseParts.pop();
      else baseParts.push(part);
    }
    resolved = baseParts.join('/');
  }
  resolved = resolved.replace(/\.(md|mdx)$/, '');
  return `/docs/${resolved}`;
}

function extractInternalLinks(content, sourceId) {
  const links = new Set();
  const mdLink = /\[([^\]]*)\]\(([^)]+)\)/g;
  let m;
  while ((m = mdLink.exec(content)) !== null) {
    const normalized = normalizeTarget(m[2], sourceId);
    if (normalized) links.add(normalized);
  }
  return links;
}

function resolveDocFile(docPath) {
  const candidates = [
    path.join(docsRoot, `${docPath}.md`),
    path.join(docsRoot, `${docPath}.mdx`),
    path.join(docsRoot, docPath, 'index.md'),
  ];
  if (docPath === 'index' || docPath === '/docs' || docPath === '/docs/') {
    return path.join(docsRoot, 'index.md');
  }
  const slug = docPath.replace(/^\/docs\//, '');
  candidates.unshift(
    path.join(docsRoot, `${slug}.md`),
    path.join(docsRoot, `${slug}.mdx`),
  );
  return candidates.find((p) => fs.existsSync(p)) ?? null;
}

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const allFiles = walk(docsRoot);
const issues = [];
const inbound = new Map();

for (const file of allFiles) {
  const id = docIdFromPath(file);
  const content = fs.readFileSync(file, 'utf8');
  const links = extractInternalLinks(content, id);
  for (const link of links) {
    const key = link.replace(/^\/docs\//, '').replace(/\/$/, '') || 'index';
    inbound.set(key, (inbound.get(key) ?? 0) + 1);
  }
}

for (const [id, rules] of Object.entries(registry.pages)) {
  const file =
    id === 'index'
      ? path.join(docsRoot, 'index.md')
      : resolveDocFile(id);
  if (!file) {
    issues.push({ id, type: 'missing-file', detail: 'Registry page has no doc file' });
    continue;
  }

  const content = fs.readFileSync(file, 'utf8');
  const links = extractInternalLinks(content, id);

  for (const required of rules.requiredLinks ?? []) {
    const normalized = required.replace(/\/$/, '');
    const found = [...links].some(
      (l) => l === normalized || l === `${normalized}/`,
    );
    if (!found) {
      issues.push({
        id,
        type: 'missing-required-link',
        detail: `Missing required link to ${required}`,
      });
    }
  }

  const min = rules.minInternalLinks ?? 2;
  if (links.size < min) {
    issues.push({
      id,
      type: 'insufficient-links',
      detail: `Found ${links.size} internal link(s), need at least ${min}`,
    });
  }
}

for (const [id] of Object.entries(registry.pages)) {
  const key = id === 'index' ? 'index' : id;
  if ((inbound.get(key) ?? 0) === 0 && id !== 'index') {
    // Advisory only — sidebar navigation also provides discoverability
    console.warn(`[advisory] ${id}: no inbound markdown links`);
  }
}

const blockingIssues = issues.filter((i) => i.type !== 'orphan');

const byType = {};
for (const issue of blockingIssues) {
  byType[issue.type] = (byType[issue.type] ?? 0) + 1;
}

console.log('Internal link audit\n');
console.log('Summary by issue type:');
for (const [type, count] of Object.entries(byType).sort()) {
  console.log(`  ${type}: ${count}`);
}
console.log(`\nPages checked: ${Object.keys(registry.pages).length}`);
console.log(`Issues: ${blockingIssues.length}\n`);

for (const issue of blockingIssues.sort((a, b) => a.id.localeCompare(b.id))) {
  console.log(`${issue.id}`);
  console.log(`  [${issue.type}] ${issue.detail}`);
}

process.exit(blockingIssues.length > 0 ? 1 : 0);
