import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, '../docs');
const outputDir = path.resolve(__dirname, '../src/components/recommendations');
const outputPath = path.join(outputDir, 'contentRegistry.json');

// Ensure output dir exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function walk(dir, files = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory() && ent.name !== 'node_modules' && ent.name !== 'planning') {
      walk(p, files);
    } else if (/\.(md|mdx)$/.test(ent.name)) {
      files.push(p);
    }
  }
  return files;
}

function parseMarkdownFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relPath = path.relative(docsRoot, filePath).replace(/\\/g, '/');
  // Skip index pages or home page
  if (relPath === 'index.md' || relPath === 'index.mdx' || relPath.endsWith('/index.md') || relPath.endsWith('/index.mdx')) return null;

  // Extract ID (e.g. "getting-started/setup")
  const id = relPath.replace(/\.(md|mdx)$/, '');

  // Extract frontmatter
  let title = '';
  let description = '';
  let time = null;
  let frontmatterTags = [];

  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (frontmatterMatch) {
    const fmText = frontmatterMatch[1];
    const lines = fmText.split('\n');
    for (const line of lines) {
      const matchTitle = line.match(/^title:\s*(.*)$/i);
      if (matchTitle) title = matchTitle[1].replace(/['"]/g, '').trim();

      const matchDesc = line.match(/^description:\s*(.*)$/i);
      if (matchDesc) description = matchDesc[1].replace(/['"]/g, '').trim();

      const matchTime = line.match(/^time:\s*(.*)$/i);
      if (matchTime) {
        const val = matchTime[1].trim();
        time = isNaN(Number(val)) ? val : Number(val);
      }

      const matchTags = line.match(/^tags:\s*\[(.*)\]$/i);
      if (matchTags) {
        frontmatterTags = matchTags[1].split(',').map(t => t.trim().replace(/['"]/g, ''));
      }
    }
  }

  // Fallback title if not in frontmatter
  if (!title) {
    const h1Match = content.match(/^#\s+(.*)$/m);
    if (h1Match) {
      title = h1Match[1].trim();
    } else {
      title = path.basename(filePath, path.extname(filePath));
    }
  }

  // Parse JSX PatternMeta tag
  let difficulty = 'beginner'; // default
  let category = '';
  let status = 'stable';

  // Category based on path directory
  const parts = id.split('/');
  if (parts.length > 1) {
    category = parts[0];
  } else {
    category = 'general';
  }

  const metaMatch = content.match(/<PatternMeta([\s\S]*?)\/>/);
  if (metaMatch) {
    const metaAttrs = metaMatch[1];
    const diffMatch = metaAttrs.match(/difficulty=["'](.*?)["']/);
    if (diffMatch) difficulty = diffMatch[1];

    const catMatch = metaAttrs.match(/category=["'](.*?)["']/);
    if (catMatch) category = catMatch[1].toLowerCase();

    const statusMatch = metaAttrs.match(/status=["'](.*?)["']/);
    if (statusMatch) status = statusMatch[1];

    const timeMatch = metaAttrs.match(/time=\{(.*?)\}/);
    if (timeMatch) {
      const val = timeMatch[1].trim();
      time = isNaN(Number(val)) ? val : Number(val);
    } else {
      const timeStrMatch = metaAttrs.match(/time=["'](.*?)["']/);
      if (timeStrMatch) {
        const val = timeStrMatch[1].trim();
        time = isNaN(Number(val)) ? val : Number(val);
      }
    }
  }

  // Derive difficulty and category mapping based on path if not set
  if (id.startsWith('getting-started/')) {
    difficulty = 'beginner';
    category = 'getting-started';
  } else if (id.startsWith('concepts/')) {
    category = 'concepts';
    if (id.includes('storage') || id.includes('auth') || id.includes('gas') || id.includes('cross-contract') || id.includes('events')) {
      difficulty = 'intermediate';
    } else {
      difficulty = 'beginner';
    }
  } else if (id.startsWith('security/')) {
    category = 'security';
    if (id.includes('defi')) {
      difficulty = 'advanced';
    } else if (id.includes('governance')) {
      difficulty = 'intermediate';
    } else {
      difficulty = 'beginner';
    }
  } else if (id.startsWith('patterns/')) {
    category = 'patterns';
    if (id.includes('hello-world') || id.includes('overview')) {
      difficulty = 'beginner';
    } else if (id.includes('optimization') || id.includes('lifecycle') || id.includes('proposal')) {
      difficulty = 'advanced';
    } else {
      difficulty = 'intermediate';
    }
  }

  // Normalize category names
  category = category.trim().toLowerCase();
  if (category === 'defi' || category === 'defi-patterns') category = 'defi';
  if (category === 'tokens' || category === 'basic-token') category = 'tokens';

  // Normalize difficulty
  difficulty = difficulty.trim().toLowerCase();

  // Combine tags
  const tags = new Set(frontmatterTags);
  // Auto tags based on keywords
  const lowerContent = content.toLowerCase();
  const lowerTitle = title.toLowerCase();
  
  if (lowerContent.includes('auth') || lowerContent.includes('authorization') || lowerContent.includes('permission') || lowerTitle.includes('auth')) {
    tags.add('auth');
  }
  if (lowerContent.includes('storage') || lowerContent.includes('instance') || lowerContent.includes('persistent') || lowerTitle.includes('storage')) {
    tags.add('storage');
  }
  if (lowerContent.includes('event') || lowerContent.includes('publish') || lowerTitle.includes('event')) {
    tags.add('events');
  }
  if (lowerContent.includes('optimize') || lowerContent.includes('gas') || lowerContent.includes('efficiency') || lowerTitle.includes('optimize')) {
    tags.add('optimization');
  }
  if (lowerContent.includes('error') || lowerContent.includes('panic') || lowerTitle.includes('error')) {
    tags.add('errors');
  }
  if (lowerContent.includes('token') || lowerContent.includes('balance') || lowerTitle.includes('token')) {
    tags.add('tokens');
  }
  if (lowerContent.includes('governance') || lowerContent.includes('dao') || lowerTitle.includes('governance')) {
    tags.add('governance');
  }
  if (lowerContent.includes('upgrade') || lowerContent.includes('lifecycle') || lowerTitle.includes('upgrade')) {
    tags.add('upgrade');
  }
  
  return {
    id,
    title,
    description: description || `Soroban tutorial on ${title}.`,
    category,
    difficulty,
    status,
    time: time || 10,
    tags: Array.from(tags),
    href: `/docs/${id}`
  };
}

const files = walk(docsRoot);
const registry = [];
for (const file of files) {
  const meta = parseMarkdownFile(file);
  if (meta) {
    registry.push(meta);
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(registry, null, 2)}\n`, 'utf8');
try {
  const prettierBin = path.resolve(__dirname, '../node_modules/.bin/prettier');
  if (fs.existsSync(prettierBin)) {
    execFileSync(prettierBin, ['--write', outputPath], { stdio: 'inherit' });
  }
} catch (err) {
  console.warn('Prettier format skipped for content registry:', err.message);
}
console.log(`Generated content registry with ${registry.length} items at ${outputPath}`);
