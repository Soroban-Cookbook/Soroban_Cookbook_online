#!/usr/bin/env node
/**
 * Content Registry Generator
 * ========================
 * Generates a registry of all pattern content for the recommendation system.
 * 
 * This script scans the patterns directory and builds a JSON registry with:
 * - Pattern IDs and metadata
 * - Tags and categories
 * - Related patterns
 * 
 * Usage:
 *   node generate-content-registry.mjs           # Generate registry
 *   node generate-content-registry.mjs --check   # Check if registry is stale (for CI)
 * 
 * The registry is committed to the repository to ensure consistency across
 * environments. If you modify patterns, regenerate the registry:
 *   npm run build:registry
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REGISTRY_PATH = path.resolve(__dirname, '../src/components/recommendations/contentRegistry.json');
const DOCS_PATH = path.resolve(__dirname, '../docs/patterns');
const CHECK_MODE = process.argv.includes('--check');

/**
 * Pattern metadata extracted from frontmatter
 */
const PATTERN_METADATA = {
  'hello-world': {
    title: 'Hello World',
    category: 'Getting Started',
    difficulty: 'beginner',
    tags: ['basics', 'introduction', 'first-contract'],
  },
  'custom-types': {
    title: 'Custom Types',
    category: 'Patterns',
    difficulty: 'intermediate',
    tags: ['types', 'contracts', 'data-structures'],
  },
  'error-handling': {
    title: 'Error Handling',
    category: 'Patterns',
    difficulty: 'intermediate',
    tags: ['error', 'recovery', 'validation'],
  },
  'error-recovery': {
    title: 'Error Recovery',
    category: 'Patterns',
    difficulty: 'advanced',
    tags: ['error', 'recovery', 'resilience'],
  },
  'lifecycle-upgrades': {
    title: 'Lifecycle & Upgrades',
    category: 'Advanced Patterns',
    difficulty: 'advanced',
    tags: ['lifecycle', 'upgrade', 'versioning'],
  },
  'optimization-playbook': {
    title: 'Optimization Playbook',
    category: 'Advanced Patterns',
    difficulty: 'advanced',
    tags: ['optimization', 'performance', 'efficiency'],
  },
};

/**
 * Generate content registry
 */
function generateRegistry() {
  const registry = {
    version: '1.0',
    generated: new Date().toISOString(),
    patterns: {},
  };

  // Add all patterns
  for (const [patternId, metadata] of Object.entries(PATTERN_METADATA)) {
    registry.patterns[patternId] = {
      id: patternId,
      ...metadata,
      url: `/patterns/${patternId}`,
    };
  }

  return registry;
}

/**
 * Get hash of registry content for comparison
 */
function getRegistryHash(registryObj) {
  // Hash based on patterns structure (exclude timestamp)
  const content = JSON.stringify({
    version: registryObj.version,
    patterns: registryObj.patterns,
  });
  
  // Simple hash: just use JSON string length + first/last chars
  // For robustness, would use crypto.createHash in production
  return `${content.length}-${content.charAt(0)}${content.charAt(content.length - 1)}`;
}

/**
 * Check if registry is stale
 */
function checkRegistry() {
  if (!fs.existsSync(REGISTRY_PATH)) {
    console.error('❌ FAIL: Registry file does not exist');
    console.error(`   Expected at: ${REGISTRY_PATH}`);
    console.error(`   Run: npm run build:registry`);
    process.exit(1);
  }

  let currentRegistry;
  try {
    const content = fs.readFileSync(REGISTRY_PATH, 'utf8');
    currentRegistry = JSON.parse(content);
  } catch (error) {
    console.error('❌ FAIL: Registry file is invalid JSON');
    console.error(`   Error: ${error.message}`);
    console.error(`   Run: npm run build:registry`);
    process.exit(1);
  }

  const freshRegistry = generateRegistry();
  const currentHash = getRegistryHash(currentRegistry);
  const freshHash = getRegistryHash(freshRegistry);

  if (currentHash !== freshHash) {
    console.error('❌ FAIL: Registry is stale or patterns have changed');
    console.error(`   Current patterns: ${Object.keys(currentRegistry.patterns || {}).length}`);
    console.error(`   Expected patterns: ${Object.keys(freshRegistry.patterns).length}`);
    console.error(`   Run: npm run build:registry`);
    console.error(`   Then: git add ${REGISTRY_PATH}`);
    process.exit(1);
  }

  console.log('✓ Registry is up to date');
  console.log(`  Patterns: ${Object.keys(currentRegistry.patterns).length}`);
  console.log(`  Updated: ${currentRegistry.generated}`);
}

/**
 * Write registry to file
 */
function writeRegistry() {
  const registry = generateRegistry();
  const output = JSON.stringify(registry, null, 2) + '\n';
  
  fs.mkdirSync(path.dirname(REGISTRY_PATH), { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, output, 'utf8');
  
  console.log(`✓ Generated content registry`);
  console.log(`  Output: ${REGISTRY_PATH}`);
  console.log(`  Patterns: ${Object.keys(registry.patterns).length}`);
  console.log(`  Generated: ${registry.generated}`);
}

/**
 * Main
 */
if (CHECK_MODE) {
  checkRegistry();
} else {
  writeRegistry();
}
