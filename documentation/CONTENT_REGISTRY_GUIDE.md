# Content Registry Guide

## Overview

The content registry is a JSON file that maintains metadata about all available patterns in the Soroban Cookbook. It's used by the recommendation system to display pattern information and suggest related content.

**Location:** `src/components/recommendations/contentRegistry.json`  
**Generator:** `scripts/generate-content-registry.mjs`  
**Status:** ✅ Committed (verified in CI)

## Registry Format

```json
{
  "version": "1.0",
  "generated": "2026-08-27T12:34:56.789Z",
  "patterns": {
    "hello-world": {
      "id": "hello-world",
      "title": "Hello World",
      "category": "Getting Started",
      "difficulty": "beginner",
      "tags": ["basics", "introduction", "first-contract"],
      "url": "/patterns/hello-world"
    }
  }
}
```

### Fields

- **version** - Registry format version (bumped on breaking changes)
- **generated** - ISO timestamp when registry was generated
- **patterns** - Object mapping pattern IDs to metadata
  - **id** - Unique pattern identifier (kebab-case)
  - **title** - Human-readable pattern name
  - **category** - Grouping category (e.g., "Getting Started", "Patterns")
  - **difficulty** - Skill level (beginner, intermediate, advanced)
  - **tags** - Array of searchable keywords
  - **url** - Link to pattern documentation

## When Registry is Used

The registry is consumed by:

1. **Recommendation Widget** - Display pattern cards with metadata
2. **Search/Discovery** - Tags enable pattern finding
3. **Pattern Navigation** - URL construction for links
4. **Analytics** - Track pattern difficulty and category

## Maintaining the Registry

### Adding a New Pattern

1. **Add pattern metadata** to `scripts/generate-content-registry.mjs`:

```javascript
const PATTERN_METADATA = {
  'your-pattern-id': {
    title: 'Your Pattern Title',
    category: 'Patterns',
    difficulty: 'beginner',
    tags: ['tag1', 'tag2', 'tag3'],
  },
  // ... existing patterns
};
```

2. **Regenerate the registry**:

```bash
npm run build:registry
```

3. **Commit both files**:

```bash
git add scripts/generate-content-registry.mjs
git add src/components/recommendations/contentRegistry.json
git commit -m "feat: add new pattern to registry"
```

### Updating Pattern Metadata

1. **Modify metadata** in `scripts/generate-content-registry.mjs`
2. **Regenerate**: `npm run build:registry`
3. **Commit**: `git add src/components/recommendations/contentRegistry.json`

### Pattern Deletion

1. **Remove entry** from PATTERN_METADATA
2. **Regenerate**: `npm run build:registry`
3. **Commit**: The contentRegistry.json will reflect the removal

## CI/CD Integration

### Pre-commit Check

The registry freshness is validated in CI to prevent drift:

```bash
npm run check:registry
```

**What it validates:**
- Registry file exists
- Registry JSON is valid
- Pattern count matches source
- No uncommitted changes to registry

**Failure modes:**
- ❌ File missing → regenerate with `npm run build:registry`
- ❌ Invalid JSON → regenerate with `npm run build:registry`
- ❌ Stale patterns → regenerate and commit
- ❌ Patterns added but registry not updated → regenerate and commit

### CI Configuration

The CI pipeline includes:

```bash
# Before building/deploying
npm run check:registry

# If check fails, build aborts with helpful message
```

This ensures:
✅ No stale recommendations in production
✅ Pattern metadata stays synchronized
✅ Builds fail fast with clear errors

## Development Workflow

### Start of work

Clone repo normally - registry is committed and ready to use.

### During development

If you add/modify patterns:

```bash
# Make changes to pattern files
# Update pattern metadata in generate-content-registry.mjs

# Regenerate registry
npm run build:registry

# Commit both the metadata source and output
git add scripts/generate-content-registry.mjs src/components/recommendations/contentRegistry.json
git commit -m "feat: update pattern metadata"
```

### Before committing

```bash
# Verify registry is fresh
npm run check:registry

# Should output:
# ✓ Registry is up to date
#   Patterns: 6
#   Updated: 2026-08-27T12:34:56.789Z
```

### PR Review

Reviewers should check:
- ✅ Both `generate-content-registry.mjs` and `contentRegistry.json` are updated
- ✅ Pattern metadata is accurate
- ✅ Tags are appropriate and consistent
- ✅ Difficulty levels are realistic

## Why the Registry is Committed

### ✅ Benefits of committed registry:

1. **Guarantees consistency** - All environments have identical metadata
2. **Enables offline usage** - No regeneration needed in CI/deployment
3. **Clear history** - Git tracks metadata changes
4. **Auditable** - What metadata shipped is in git history
5. **Fast recommendation loading** - No build step needed

### ❌ Why it's NOT generated-only:

- Differences between local and CI builds break recommendations
- Empty recommendations in staging/production if script fails
- Harder to debug metadata issues
- Requires script in all environments

## Troubleshooting

### CI Fails: "Registry is stale"

```bash
cd documentation
npm run build:registry
git add src/components/recommendations/contentRegistry.json
git commit -m "chore: regenerate content registry"
git push
```

### Local test shows empty recommendations

1. **Check registry exists:**
```bash
ls -la src/components/recommendations/contentRegistry.json
```

2. **Verify it has patterns:**
```bash
cat src/components/recommendations/contentRegistry.json | jq '.patterns | length'
```

3. **Regenerate if needed:**
```bash
npm run build:registry
```

### Add new pattern but recommendations don't show

1. **Updated metadata file?**
```bash
grep 'your-pattern-id' scripts/generate-content-registry.mjs
```

2. **Regenerated registry?**
```bash
npm run build:registry
```

3. **Committed both files?**
```bash
git status
```

## API Usage

### In React Components

```typescript
import contentRegistry from '@/components/recommendations/contentRegistry.json';

function PatternCard({ patternId }) {
  const pattern = contentRegistry.patterns[patternId];
  
  return (
    <div>
      <h3>{pattern.title}</h3>
      <p>{pattern.category} • {pattern.difficulty}</p>
      <div>{pattern.tags.join(', ')}</div>
    </div>
  );
}
```

### For Recommendations

```typescript
import contentRegistry from '@/components/recommendations/contentRegistry.json';
import { getTopRecommendations } from '@/lib/recommendations/tracker';

function RecommendationsView({ currentPatternId }) {
  const allPatterns = Object.keys(contentRegistry.patterns);
  const recommended = getTopRecommendations(allPatterns, 3, currentPatternId);
  
  return recommended.map(patternId => {
    const pattern = contentRegistry.patterns[patternId];
    return <PatternCard key={patternId} pattern={pattern} />;
  });
}
```

## Future Enhancements

Possible improvements:

1. **Auto-discovery** - Scan docs/ directory for new patterns
2. **Validation** - Ensure pattern files exist before registering
3. **Relationships** - Define related/prerequisite patterns
4. **Analytics** - Track which patterns users view most
5. **Versioning** - Support multiple docs versions

## Related Files

- `scripts/generate-content-registry.mjs` - Generator script with --check mode
- `src/components/recommendations/contentRegistry.json` - Generated registry
- `src/components/recommendations/RecommendationWidget.tsx` - Consumer component
- `lib/recommendations/tracker.ts` - Scoring recommendations

## Summary

The content registry is:
- ✅ **Generated** from source metadata in the generator script
- ✅ **Committed** to ensure consistency across environments
- ✅ **Validated** in CI with --check mode to prevent stale registries
- ✅ **Documented** with clear guidelines for maintenance

When you add patterns:
1. Update `generate-content-registry.mjs` with pattern metadata
2. Run `npm run build:registry` to regenerate
3. Commit both files
4. CI validates with `npm run check:registry`

---

**Last Updated:** August 27, 2026  
**Status:** Active  
**CI Integration:** Enabled
