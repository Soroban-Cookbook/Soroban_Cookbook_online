/**
 * generate-examples-index.mjs
 * 
 * Scans the examples/ directory, reads Cargo.toml metadata,
 * checks for corresponding pattern docs, and generates/verify
 * the documentation/docs/patterns/examples-index.mdx file.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(REPO_ROOT, 'examples');
const PATTERNS_DIR = path.join(REPO_ROOT, 'documentation', 'docs', 'patterns');
const INDEX_MDX_PATH = path.join(PATTERNS_DIR, 'examples-index.mdx');

const GITHUB_REPO = 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online';

function scanExamples() {
  const entries = fs.readdirSync(EXAMPLES_DIR, { withFileTypes: true });
  const crates = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const cratePath = path.join(EXAMPLES_DIR, entry.name);
    const cargoToml = path.join(cratePath, 'Cargo.toml');

    if (!fs.existsSync(cargoToml)) continue;

    const content = fs.readFileSync(cargoToml, 'utf-8');
    const cargo = parseCargoToml(content);

    // Determine difficulty from pattern or default
    const difficulty = determineDifficulty(entry.name, cargo.name);

    crates.push({
      name: entry.name,
      cargo,
      difficulty,
    });
  }

  return crates;
}

function parseCargoToml(content) {
  const result = {};
  const lines = content.split('\n');
  let currentSection = null;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      currentSection = trimmed.slice(1, -1);
      result[currentSection] = {};
    } else if (trimmed.includes('=') && currentSection) {
      const [key, ...valueParts] = trimmed.split('=');
      const value = valueParts.join('=').trim();
      if (value.startsWith('"') && value.endsWith('"')) {
        result[currentSection][key.trim()] = value.slice(1, -1);
      } else if (value === 'true' || value === 'false') {
        result[currentSection][key.trim()] = value === 'true';
      } else if (!isNaN(Number(value))) {
        result[currentSection][key.trim()] = Number(value);
      } else {
        result[currentSection][key.trim()] = value;
      }
    }
  }

  return result;
}
function determineDifficulty(crateName, cargoName) {
  const target = (cargoName || crateName || '').toLowerCase();

  const beginnerCrates = [
    'counter', 'hello-world', 'authorization', 'escrow-basic',
    'simple-voting', 'token-transfer',
  ];

  const advancedCrates = [
    'cross-contract', 'constant-product-amm', 'flash-loan',
    'htlc-swap', 'upgradeable',
  ];

  if (beginnerCrates.includes(crateName)) return 'Beginner';
  if (advancedCrates.includes(crateName)) return 'Advanced';
  return 'Intermediate';
}

function patternExists(patternName) {
  const mdxPath = path.join(PATTERNS_DIR, `${patternName}.mdx`);
  return fs.existsSync(mdxPath);
}

function generateIndexMDX(crates) {
  const lines = [];

  lines.push('import Tabs from \'@theme/Tabs\';');
  lines.push('import TabItem from \'@theme/TabItem\';');
  lines.push('import Badge from \'@site/src/components/Badge\';');
  lines.push('');
  lines.push('const examples = [');
  for (const ex of crates) {
    lines.push(`  {`);
    lines.push(`    name: '${ex.name}',`);
    lines.push(`    difficulty: '${ex.difficulty}',`);
    lines.push(`    hasPattern: ${ex.hasPattern},`);
    lines.push(`    patternName: ${ex.patternName ? `'${ex.patternName}'` : 'null'},`);
    lines.push(`  },`);
  }
  lines.push('];');
  lines.push('');
  lines.push('## Examples Index');
  lines.push('');
  lines.push('| Example / Crate Name | Difficulty | Source Code Link | Pattern Documentation |');
  lines.push('|----------------------|------------|------------------|----------------------|');
  for (const ex of crates) {
    const patternLink = ex.hasPattern
      ? `https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/documentation/docs/patterns/${ex.patternName}.mdx`
      : 'Docs Missing';
    const patternCell = ex.hasPattern
      ? `<a href="${patternLink}">Docs</a>`
      : `<span style="border: 1px solid #ef4444; border-radius: 3px; padding: 2px 6px; font-size: 0.7em; color: #ef4444">Docs Missing</span>`;
    lines.push(`| ${ex.name} | <Badge variant="${ex.difficulty.toLowerCase()}">${ex.difficulty}</Badge> | <a href="https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/${ex.name}">GitHub</a> | ${patternCell} |`);
  }
  lines.push(']');

  return lines.join('\n');
}

function main() {
  console.log('Scanning examples directory...');
  const crates = scanExamples();

  // Check pattern existence for each crate
  for (const ex of crates) {
    ex.hasPattern = patternExists(ex.name);
    ex.patternName = ex.name; // pattern has same name as example
  }

  console.log(`Found ${crates.length} example crates`);
  const hasPatternCount = crates.filter(c => c.hasPattern).length;
  console.log(`${hasPatternCount} have pattern docs, ${crates.length - hasPatternCount} missing`);

  // Generate the index MDX
  const indexContent = generateIndexMDX(crates);
  fs.writeFileSync(INDEX_MDX_PATH, indexContent + '\n');
  console.log(`Generated ${INDEX_MDX_PATH}`);

  // Summary
  console.log('\n--- Summary ---');
  for (const ex of crates) {
    const patternStatus = ex.hasPattern ? '✓' : '✗';
    console.log(`${patternStatus} ${ex.name} (${ex.difficulty}) - ${ex.hasPattern ? 'pattern exists' : 'docs missing'}`);
  }
}

main();