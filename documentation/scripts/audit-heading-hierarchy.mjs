#!/usr/bin/env node
/**
 * Audits markdown/MDX docs for H1–H6 heading hierarchy issues.
 * Docusaurus renders frontmatter `title` as an implicit H1.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docRoots = [
  path.join(__dirname, '../docs'),
  path.join(__dirname, '../src/pages'),
];

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules') walk(p, files);
    else if (/\.(md|mdx)$/.test(ent.name)) files.push(p);
  }
  return files;
}

function parseHeadings(content) {
  const lines = content.split(/\r?\n/);
  const headings = [];
  let inCode = false;
  let fmTitle = null;

  if (lines[0]?.trim() === '---') {
    let i = 1;
    while (i < lines.length && lines[i].trim() !== '---') {
      const m = lines[i].match(/^title:\s*(.+)$/);
      if (m) fmTitle = m[1].replace(/^['"]|['"]$/g, '').trim();
      i++;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith('```')) {
      inCode = !inCode;
      continue;
    }
    if (inCode) continue;
    const m = line.match(/^(#{1,6})\s+(.+)$/);
    if (m) headings.push({ level: m[1].length, text: m[2].trim(), line: i + 1 });
  }

  return { headings, fmTitle };
}

function auditFile(file) {
  const rel = path.relative(path.join(__dirname, '..'), file).replace(/\\/g, '/');
  const content = fs.readFileSync(file, 'utf8');
  const { headings, fmTitle } = parseHeadings(content);
  const h1s = headings.filter((h) => h.level === 1);
  const issues = [];

  const effectiveH1 = (fmTitle ? 1 : 0) + h1s.length;
  if (effectiveH1 === 0) {
    issues.push({ type: 'missing-h1', detail: 'No frontmatter title and no # heading' });
  }
  if (effectiveH1 > 1) {
    issues.push({
      type: 'multiple-h1',
      detail: `frontmatter title: ${Boolean(fmTitle)}, markdown H1 count: ${h1s.length}`,
      h1Lines: h1s.map((h) => h.line),
    });
  }

  if (headings.length && fmTitle && headings[0].level === 1) {
    issues.push({
      type: 'duplicate-h1',
      detail: `Remove markdown H1 "${headings[0].text}" — frontmatter title "${fmTitle}" is already H1`,
      line: headings[0].line,
    });
  }

  if (headings.length && !fmTitle && h1s.length === 0 && headings[0].level > 1) {
    issues.push({
      type: 'starts-without-h1',
      detail: `First heading is H${headings[0].level}: "${headings[0].text}"`,
      line: headings[0].line,
    });
  }

  const tree = [];
  if (fmTitle) tree.push({ level: 1, text: fmTitle, line: 0 });
  for (const h of headings) tree.push(h);

  for (let i = 1; i < tree.length; i++) {
    const prev = tree[i - 1].level;
    const curr = tree[i].level;
    if (curr > prev + 1) {
      issues.push({
        type: 'skip-level',
        detail: `H${prev} "${tree[i - 1].text}" → H${curr} "${tree[i].text}"`,
        line: tree[i].line,
      });
    }
  }

  return issues.length ? { file: rel, issues } : null;
}

const results = [];
for (const root of docRoots) {
  if (!fs.existsSync(root)) continue;
  for (const file of walk(root)) {
    const result = auditFile(file);
    if (result) results.push(result);
  }
}

const byType = {};
for (const r of results) {
  for (const issue of r.issues) {
    byType[issue.type] = (byType[issue.type] || 0) + 1;
  }
}

console.log('Heading hierarchy audit\n');
console.log('Summary by issue type:');
for (const [type, count] of Object.entries(byType).sort()) {
  console.log(`  ${type}: ${count}`);
}
console.log(`\nFiles with issues: ${results.length}\n`);

for (const r of results.sort((a, b) => a.file.localeCompare(b.file))) {
  console.log(`${r.file}`);
  for (const issue of r.issues) {
    const loc = issue.line ? ` (line ${issue.line})` : '';
    console.log(`  [${issue.type}]${loc} ${issue.detail}`);
  }
  console.log('');
}

process.exit(results.length > 0 ? 1 : 0);
