# ESLint/Prettier Support for .mjs Files

## Overview

ESLint and Prettier now support ES module (.mjs) files in the `scripts/` directory, ensuring all build scripts including `generate-content-registry.mjs` are properly linted and formatted.

## What Changed

### package.json Scripts

**ESLint Commands:**
```json
"lint": "eslint src scripts docusaurus.config.ts --ext .ts,.tsx,.js,.mjs --max-warnings 0",
"lint:fix": "eslint src scripts docusaurus.config.ts --ext .ts,.tsx,.js,.mjs --fix"
```

**Prettier Commands:**
```json
"format": "prettier --write \"src/**/*.{ts,tsx,css,json,md}\" \"scripts/**/*.{js,ts,mjs}\" \"docusaurus.config.ts\" \"*.{ts,js,json,md}\"",
"format:check": "prettier --check \"src/**/*.{ts,tsx,css,json,md}\" \"scripts/**/*.{js,ts,mjs}\" \"docusaurus.config.ts\" \"*.{ts,js,json,md}\"",
```

**Changes:**
- ✅ ESLint --ext now includes `.mjs`
- ✅ Prettier globs now include `scripts/**/*.mjs`
- ✅ All ES modules in scripts/ are validated

### Files Now Linted & Formatted

| File | Type | Status |
|------|------|--------|
| `scripts/generate-icons.js` | CommonJS | ✅ Linted & formatted |
| `scripts/generate-content-registry.mjs` | ES Module | ✅ Linted & formatted |
| `scripts/generate-icons.sh` | Shell script | ❌ Excluded |

## Why This Matters

### Problem It Solves

**Before:**
```bash
npm run lint  # Didn't check .mjs files
# Result: generate-content-registry.mjs had undetected issues
```

**After:**
```bash
npm run lint  # Checks .mjs files now
# Result: All scripts validated for quality
```

### Benefits

✅ **Consistency** - All Node.js scripts follow same rules  
✅ **Bug Prevention** - Linting catches issues early  
✅ **Code Quality** - Formatting ensures consistency  
✅ **CI Safety** - No more script bugs in CI-only files  
✅ **Future-Proof** - Easy to add more .mjs scripts  

## ESLint Configuration

The existing ESLint config already supports .mjs because:

1. **`sourceType: 'module'`** - Configured for ES modules
2. **`node: true`** - Node.js environment enabled
3. **No parser restrictions** - @typescript-eslint/parser handles .mjs

So only the `--ext` flag needed updating to tell ESLint to check .mjs files.

## Prettier Configuration

Prettier handles .mjs automatically in glob patterns:
- `scripts/**/*.mjs` matches all .mjs files in scripts/
- No additional config needed
- Works alongside .js and .ts

## Usage

### Lint All Scripts

```bash
npm run lint
```

Validates:
- ✅ src/ (React/TypeScript)
- ✅ scripts/ (all .js, .ts, .mjs)
- ✅ docusaurus.config.ts
- ✅ lib/ (included via src/)

### Format All Scripts

```bash
npm run format
```

Formats:
- ✅ src/**/*.{ts,tsx,css,json,md}
- ✅ scripts/**/*.{js,ts,mjs}
- ✅ docusaurus.config.ts
- ✅ Root config/docs files

### Check Before Commit

```bash
npm run lint
npm run format:check
npm run typecheck
npm run test:run
```

## ESLint Rules Applied to .mjs

.mjs files get same rules as other JavaScript:

- ✅ ESLint recommended rules
- ✅ No unused variables (except _prefixed)
- ✅ No explicit any (warn only)
- ✅ Console warnings allowed (but not logs)
- ✅ Prettier formatting enforced

### Node.js Specifics

Because `node: true` is set, .mjs files can use:

✅ `require()` - CommonJS requires
✅ `import` - ES module imports  
✅ `console` - Console API
✅ `process` - Process object
✅ `fs`, `path` - Node built-ins
✅ `__dirname`, `__filename` - Module scope

### React Rules Disabled

React rules don't apply to .mjs (no JSX):

- ESLint skips React checks for .mjs
- No error about react-in-jsx-scope
- No prop-types warnings

## Prettier Formatting Style

.mjs files follow same Prettier config (.prettierrc.json):

```json
{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "arrowParens": "always"
}
```

## File Examples

### generate-content-registry.mjs

```javascript
#!/usr/bin/env node
/**
 * Content Registry Generator
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// ...
```

**Linting Coverage:**
- ✅ Imports are checked
- ✅ Variable usage validated
- ✅ Formatting enforced
- ✅ No console.log issues

## CI Integration

### CI Checks

The CI pipeline now includes .mjs validation:

```bash
npm run lint        # ← Checks .mjs files
npm run format:check # ← Verifies .mjs formatting
```

### Failure Scenarios

**Linting fails:**
```
src/... error
scripts/generate-content-registry.mjs error: unused variable
```

**Formatting fails:**
```
format:check failed
scripts/generate-content-registry.mjs
  Line 5: Expected semicolon
```

**Fix locally:**
```bash
npm run lint:fix
npm run format
git add .
git push
```

## Documentation Update

**LINTING_GUIDELINES.md** updated with:
- ✅ .mjs listed in file coverage
- ✅ generate-content-registry.mjs documented
- ✅ Scripts section now includes .mjs
- ✅ Summary table shows .mjs support

## Common Issues

### ".mjs is not recognized"

**Old ESLint version:**
```bash
npm install
npm run lint
```

Should work after clean install.

### Prettier doesn't format .mjs

**Check glob pattern:**
```bash
npm run format -- --check scripts/generate-content-registry.mjs
```

Should be included now.

### Want to add more .mjs files?

Just add to scripts/ directory - they're automatically picked up:

```bash
scripts/my-new-tool.mjs  # ← Automatically linted & formatted
```

No config changes needed!

## Summary

| Feature | Status | Details |
|---------|--------|---------|
| ESLint support | ✅ Active | --ext includes .mjs |
| Prettier support | ✅ Active | Glob includes *.mjs |
| generate-content-registry.mjs | ✅ Covered | Linted & formatted |
| Node.js APIs | ✅ Available | fs, process, require, etc |
| React rules | ❌ Disabled | N/A for scripts |
| CI validation | ✅ Enabled | Both lint and format checked |

---

**Last Updated:** August 27, 2026  
**Status:** Active  
**Coverage:** All .mjs files in scripts/
