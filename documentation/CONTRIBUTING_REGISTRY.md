# Contributing: Content Registry

This guide explains how to work with the content registry when adding or modifying patterns.

## Quick Reference

When you **add a new pattern**:

```bash
# 1. Update pattern metadata
# Edit: documentation/scripts/generate-content-registry.mjs
# Add your pattern to PATTERN_METADATA

# 2. Regenerate registry
cd documentation
npm run build:registry

# 3. Commit both files
git add scripts/generate-content-registry.mjs
git add src/components/recommendations/contentRegistry.json
git commit -m "feat: add pattern to registry"
```

When you **modify pattern metadata**:

```bash
# 1. Update metadata in the script
# Edit: documentation/scripts/generate-content-registry.mjs

# 2. Regenerate
npm run build:registry

# 3. Commit output
git add src/components/recommendations/contentRegistry.json
git commit -m "chore: update pattern metadata"
```

## Overview

The content registry powers the recommendation system. It's a committed JSON file that maps pattern IDs to their metadata (title, category, tags, difficulty).

**Key Points:**
- ✅ Registry is **committed** to git (not generated in CI)
- ✅ Generated from `scripts/generate-content-registry.mjs`
- ✅ Verified in CI with `npm run check:registry`
- ✅ Used by RecommendationWidget and search features

## Adding a New Pattern

### Step 1: Create Your Pattern

Add your pattern documentation to `documentation/docs/patterns/your-pattern.mdx`.

Example:
```mdx
---
title: Your Pattern
---

# Your Pattern

## Overview
...
```

### Step 2: Add Metadata

Edit `documentation/scripts/generate-content-registry.mjs` and add your pattern to `PATTERN_METADATA`:

```javascript
const PATTERN_METADATA = {
  'hello-world': { ... },
  'your-pattern-id': {  // ← Add here
    title: 'Your Pattern',
    category: 'Patterns',
    difficulty: 'beginner',
    tags: ['tag1', 'tag2', 'tag3'],
  },
};
```

**Guidelines:**
- `title` - Human-readable name (shown in recommendations)
- `category` - Grouping (e.g., "Getting Started", "Patterns", "Advanced Patterns")
- `difficulty` - One of: `beginner`, `intermediate`, `advanced`
- `tags` - 2-5 relevant keywords (kebab-case, lowercase)

### Step 3: Regenerate Registry

```bash
cd documentation
npm run build:registry
```

**Output:**
```
✓ Generated content registry
  Output: .../contentRegistry.json
  Patterns: 7
  Generated: 2026-08-27T12:34:56.789Z
```

### Step 4: Verify

Check the generated registry file:

```bash
# View your pattern in registry
cat src/components/recommendations/contentRegistry.json | jq '.patterns["your-pattern-id"]'
```

**Expected output:**
```json
{
  "id": "your-pattern-id",
  "title": "Your Pattern",
  "category": "Patterns",
  "difficulty": "beginner",
  "tags": ["tag1", "tag2", "tag3"],
  "url": "/patterns/your-pattern-id"
}
```

### Step 5: Commit

```bash
# Commit both the source and output
git add documentation/scripts/generate-content-registry.mjs
git add documentation/src/components/recommendations/contentRegistry.json
git commit -m "feat: add your-pattern-id to registry"
```

## Modifying Pattern Metadata

If you need to update pattern information (title, category, tags, difficulty):

### Step 1: Update Metadata

Edit `scripts/generate-content-registry.mjs`:

```javascript
'existing-pattern': {
  title: 'Updated Title',  // Changed
  category: 'Getting Started',
  difficulty: 'intermediate',  // Changed
  tags: ['new-tag', 'updated-tag'],  // Changed
},
```

### Step 2: Regenerate

```bash
npm run build:registry
```

### Step 3: Verify Changes

```bash
git diff src/components/recommendations/contentRegistry.json
```

### Step 4: Commit

```bash
git add src/components/recommendations/contentRegistry.json
git commit -m "chore: update metadata for existing-pattern"
```

## Before Submitting PR

Run the registry check locally:

```bash
cd documentation
npm run check:registry
```

**Should output:**
```
✓ Registry is up to date
  Patterns: 7
  Updated: 2026-08-27T12:34:56.789Z
```

If it fails, regenerate:

```bash
npm run build:registry
git add src/components/recommendations/contentRegistry.json
git commit --amend --no-edit
git push --force-with-lease
```

## CI Validation

When you push a PR, CI will run:

```bash
npm run check:registry
```

This validates:
- ✅ Registry file exists
- ✅ JSON is valid
- ✅ Pattern count matches expected
- ✅ No uncommitted changes

**If CI fails:**

1. **"Registry is stale"** - You added patterns but didn't regenerate:
   ```bash
   npm run build:registry
   git add src/components/recommendations/contentRegistry.json
   git commit -m "chore: regenerate registry"
   git push
   ```

2. **"File does not exist"** - Registry accidentally deleted:
   ```bash
   git restore src/components/recommendations/contentRegistry.json
   git push
   ```

## Pattern Metadata Guidelines

### Title
- ✅ Clear, concise name
- ✅ Title Case
- ✅ 2-5 words
- ❌ "hello world" (should be "Hello World")
- ❌ "A guide to hello world" (too long)

### Category
Use consistent categories:
- `Getting Started` - Beginner entry points
- `Patterns` - General patterns
- `Advanced Patterns` - Complex patterns

### Difficulty

| Level | When to Use |
|-------|-------------|
| `beginner` | First pattern, no prerequisites |
| `intermediate` | Requires basic understanding |
| `advanced` | Complex concepts, multiple dependencies |

### Tags

Good tags:
- ✅ Specific keywords (e.g., "error-recovery", "async")
- ✅ 2-5 tags per pattern
- ✅ Lowercase, kebab-case
- ✅ Searchable terms

Bad tags:
- ❌ Too generic ("soroban", "pattern")
- ❌ Too specific ("for-rust-developers-on-mac")
- ❌ Multiple words ("error recovery" should be "error-recovery")

### Example

**Good metadata:**
```javascript
'error-handling': {
  title: 'Error Handling',
  category: 'Patterns',
  difficulty: 'intermediate',
  tags: ['error', 'recovery', 'validation'],
}
```

**Bad metadata:**
```javascript
'handling-errors-in-soroban': {
  title: 'A comprehensive guide to handling errors',
  category: 'Pattern',  // Inconsistent
  difficulty: 'beginner',  // Wrong - this is intermediate
  tags: ['soroban', 'pattern', 'error handling', 'recovery methods'],  // Too many, generic
}
```

## Troubleshooting

### Registry generation fails

```
❌ Error: Cannot find module 'fs'
```

**Solution:** Must run from documentation directory:
```bash
cd documentation
npm run build:registry
```

### Pattern not appearing in recommendations

1. **Check metadata exists:**
   ```bash
   grep 'pattern-id' scripts/generate-content-registry.mjs
   ```

2. **Regenerate registry:**
   ```bash
   npm run build:registry
   ```

3. **Verify in output:**
   ```bash
   cat src/components/recommendations/contentRegistry.json | jq '.patterns | keys'
   ```

4. **Commit if needed:**
   ```bash
   git add src/components/recommendations/contentRegistry.json
   ```

### CI says registry is stale

**Problem:** You modified the script but forgot to commit the JSON output.

**Solution:**
```bash
npm run build:registry
git add src/components/recommendations/contentRegistry.json
git commit -m "chore: commit registry output"
git push
```

## Related Documentation

- **CONTENT_REGISTRY_GUIDE.md** - Full registry documentation
- **CI_REGISTRY_CHECK.md** - CI validation details
- **scripts/generate-content-registry.mjs** - Generator source code
- **src/components/recommendations/contentRegistry.json** - Generated registry

## Key Takeaways

1. **Always regenerate** after modifying `PATTERN_METADATA`
2. **Always commit** both script and JSON output
3. **Verify locally** with `npm run check:registry`
4. **CI validates** that registry is fresh

## Quick Commands

```bash
# Generate/regenerate registry
npm run build:registry

# Check if registry is up to date (for CI)
npm run check:registry

# View registry as pretty JSON
cat src/components/recommendations/contentRegistry.json | jq

# List all patterns
cat src/components/recommendations/contentRegistry.json | jq '.patterns | keys'

# View specific pattern
cat src/components/recommendations/contentRegistry.json | jq '.patterns["pattern-id"]'
```

---

**Questions?** Check CONTENT_REGISTRY_GUIDE.md for detailed information.

---

**Last Updated:** August 27, 2026  
**Status:** Active
