# CI Registry Check

## Purpose

The registry check step in CI validates that the content registry is up-to-date before building/deploying. This prevents stale recommendations and ensures all environments have consistent pattern metadata.

## How It Works

### Check Mode

The registry generator has a `--check` mode that validates freshness:

```bash
npm run check:registry
```

This:
1. ✅ Verifies registry file exists
2. ✅ Validates JSON syntax
3. ✅ Compares current patterns with expected patterns
4. ✅ Fails if registry is stale or patterns don't match

### Success Output

```
✓ Registry is up to date
  Patterns: 6
  Updated: 2026-08-27T12:34:56.789Z
```

Exit code: `0` (success)

### Failure Output

```
❌ FAIL: Registry is stale or patterns have changed
   Current patterns: 5
   Expected patterns: 6
   Run: npm run build:registry
   Then: git add src/components/recommendations/contentRegistry.json
```

Exit code: `1` (failure)

## CI Integration

### GitHub Actions Example

```yaml
name: Build & Deploy

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      
      - run: cd documentation && npm install
      
      # Registry check BEFORE build
      - run: cd documentation && npm run check:registry
      
      - run: cd documentation && npm run build
      
      - run: cd documentation && npm run test:run
```

### When Check Runs

The check should run:
- ✅ **Before build** - Prevents deploying stale metadata
- ✅ **On PRs** - Ensures contributors update registry
- ✅ **On main** - Catches accidental direct pushes

The check should NOT run on:
- ❌ Branches that only modify non-pattern files
- ❌ Documentation-only changes

### Failing CI Due to Stale Registry

If CI fails with registry error:

**Local fix:**
```bash
cd documentation
npm run build:registry
git add src/components/recommendations/contentRegistry.json
git commit -m "chore: regenerate content registry"
git push
```

**Why it failed:**
- New pattern added but registry not regenerated
- Pattern metadata modified but registry not updated
- Registry file accidentally reverted

## Validation Details

### What Gets Compared

The check compares:
1. **Pattern count** - Number of patterns matches expected
2. **Pattern structure** - Each pattern has required fields
3. **Pattern IDs** - IDs match between source and registry
4. **Generated timestamp** - Must be recent (not stale)

### What's Ignored

The check ignores:
- ❌ Minor timestamp differences (within build window)
- ❌ Tag order changes
- ❌ Whitespace/formatting differences

### Error Conditions

**File missing:**
```
❌ FAIL: Registry file does not exist
   Expected at: /path/to/contentRegistry.json
   Run: npm run build:registry
```

**Invalid JSON:**
```
❌ FAIL: Registry file is invalid JSON
   Error: Unexpected token } in JSON at position 42
   Run: npm run build:registry
```

**Stale patterns:**
```
❌ FAIL: Registry is stale or patterns have changed
   Current patterns: 5
   Expected patterns: 6
   Run: npm run build:registry
   Then: git add src/components/recommendations/contentRegistry.json
```

## Recommended CI Configuration

### Step 1: Registry Check

```bash
npm run check:registry
```

**Placement:** After `npm install`, before build

**Why:** Fails fast if patterns are out of sync, prevents unnecessary build time

### Step 2: Linting

```bash
npm run lint
npm run format:check
```

**Placement:** After registry check

**Why:** Validates code quality of modified registry script

### Step 3: Type Checking

```bash
npm run typecheck
```

**Placement:** After linting

**Why:** Ensures TypeScript compilation succeeds

### Step 4: Tests

```bash
npm run test:run
```

**Placement:** After type checking

**Why:** Validates recommendation system works with registry

### Step 5: Build

```bash
npm run build
```

**Placement:** After all checks pass

**Why:** Only build if everything is valid

### Full CI Example

```bash
#!/bin/bash
set -e  # Exit on first error

cd documentation

echo "Installing dependencies..."
npm install

echo "Checking content registry..."
npm run check:registry

echo "Linting code..."
npm run lint
npm run format:check

echo "Type checking..."
npm run typecheck

echo "Running tests..."
npm run test:run

echo "Building..."
npm run build

echo "✓ All checks passed"
```

## For Contributors

### Before Pushing

If you modified patterns, verify registry:

```bash
cd documentation
npm run check:registry
```

If it fails:
```bash
npm run build:registry
git add src/components/recommendations/contentRegistry.json
git commit --amend --no-edit
git push
```

### In Pull Request

Reviewers check:
- ✅ Registry updated if patterns modified
- ✅ Both script and JSON files committed
- ✅ CI check passes

## Troubleshooting

### "CI Fails: Registry is stale"

**Problem:** You added/modified patterns but didn't regenerate registry

**Fix:**
```bash
npm run build:registry
git add src/components/recommendations/contentRegistry.json
git commit -m "chore: regenerate registry"
git push
```

### "Registry check passes locally but fails in CI"

**Problem:** Line endings differ (CRLF vs LF)

**Fix:**
```bash
# On Windows, ensure LF is configured
git config core.autocrlf false
npm run build:registry
git add -A
git commit -m "chore: normalize line endings"
git push
```

### "Registry has 5 patterns, expected 6"

**Problem:** Pattern added to script but script not run

**Fix:**
```bash
npm run build:registry  # This will regenerate with new pattern
git add src/components/recommendations/contentRegistry.json
git push
```

## Rollback Scenarios

### Accidental Registry Deletion

```bash
git restore src/components/recommendations/contentRegistry.json
git push
```

### Wrong Registry Committed

```bash
npm run build:registry
git add src/components/recommendations/contentRegistry.json
git commit -m "fix: regenerate correct registry"
git push
```

## CI/CD Best Practices

### ✅ DO

- ✅ Run check before build
- ✅ Fail fast on stale registry
- ✅ Provide clear error messages
- ✅ Document registry maintenance
- ✅ Require updated registry in PRs

### ❌ DON'T

- ❌ Skip registry check to speed up CI
- ❌ Auto-generate registry in CI (defeats purpose)
- ❌ Ignore registry validation errors
- ❌ Commit script but not JSON output
- ❌ Regenerate registry on every PR

## Integration Checklist

- [ ] Add `npm run check:registry` to CI pipeline
- [ ] Run check before build step
- [ ] Configure to fail on error
- [ ] Document in CONTRIBUTING.md
- [ ] Add example to PR template
- [ ] Test locally first with --check mode

## Summary

The CI registry check:
- **Validates** registry is fresh and accurate
- **Prevents** stale recommendations in production
- **Fails fast** before expensive build steps
- **Provides** clear error messages with fixes
- **Ensures** consistency across all environments

**Key command:** `npm run check:registry`

---

**Last Updated:** August 27, 2026  
**Status:** Ready for CI Integration
