#!/usr/bin/env node

/**
 * Script to sync content from Soroban Cookbook GitHub repository
 * Fetches examples, guides, and documentation
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const REPO_OWNER = 'Soroban-Cookbook';
const REPO_NAME = 'Soroban-Cookbook-';
const REPO_BRANCH = 'main';
const DOCS_DIR = path.join(__dirname, '..', 'docs');

/**
 * Fetch file from GitHub
 */
function fetchFromGitHub(filePath) {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/${REPO_BRANCH}/${filePath}`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(data);
        } else {
          reject(new Error(`Failed to fetch ${filePath}: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Fetch directory listing from GitHub API
 */
function fetchDirectoryListing(dirPath) {
  return new Promise((resolve, reject) => {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${dirPath}`;

    const options = {
      headers: {
        'User-Agent': 'Soroban-Cookbook-Sync',
      }
    };

    https.get(url, options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 200) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to fetch directory ${dirPath}: ${res.statusCode}`));
        }
      });
    }).on('error', reject);
  });
}

/**
 * Convert GitHub markdown to Docusaurus MDX
 */
function convertToMDX(content, metadata = {}) {
  // Add frontmatter
  const frontmatter = `---
${Object.entries(metadata).map(([key, value]) => `${key}: ${JSON.stringify(value)}`).join('\n')}
---

`;

  return frontmatter + content;
}

/**
 * Main sync function
 */
async function syncContent() {
  console.log('🔄 Syncing content from Soroban Cookbook repository...\n');

  try {
    // Fetch README for homepage content
    console.log('📄 Fetching README...');
    const readme = await fetchFromGitHub('README.md');
    console.log('✅ README fetched\n');

    // Fetch guides
    console.log('📚 Fetching guides...');
    try {
      const guides = await fetchDirectoryListing('guides');
      console.log(`Found ${guides.length} guides`);

      for (const guide of guides) {
        if (guide.type === 'file' && guide.name.endsWith('.md')) {
          console.log(`  - ${guide.name}`);
        }
      }
    } catch (error) {
      console.log('⚠️  Guides directory not found (this is okay for now)');
    }
    console.log('');

    // Fetch examples
    console.log('💡 Fetching examples...');
    try {
      const examples = await fetchDirectoryListing('examples');
      console.log(`Found ${examples.length} example categories`);

      for (const example of examples) {
        if (example.type === 'dir') {
          console.log(`  - ${example.name}/`);
        }
      }
    } catch (error) {
      console.log('⚠️  Examples directory not found (this is okay for now)');
    }
    console.log('');

    console.log('✅ Content sync complete!\n');
    console.log('📝 Note: This is a basic sync. Enhance this script to:');
    console.log('   - Parse contract examples and create MDX pages');
    console.log('   - Extract metadata from contracts');
    console.log('   - Generate pattern pages automatically');
    console.log('   - Create index pages for each category\n');

  } catch (error) {
    console.error('❌ Error syncing content:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  syncContent();
}

module.exports = { syncContent, fetchFromGitHub };
