# Linting & Formatting Guidelines

## Overview

This project uses ESLint and Prettier to maintain code quality and consistency across TypeScript, JavaScript, and configuration files.

## Scope

### Files Linted (ESLint)

**Included:**
- `src/` - React components and TypeScript files (*.ts, *.tsx)
- `scripts/` - Build and utility scripts (*.js, *.ts, *.mjs)
- `docusaurus.config.ts` - Main Docusaurus configuration
- `lib/` - Library modules (*.ts)

**Excluded:**
- `node_modules/`
- `build/`
- `.docusaurus/`
- Config files with standard naming (`*.config.js` - except docusaurus.config.ts)

### Files Formatted (Prettier)

**Included:**
- `src/**/*.{ts,tsx,css,json,md}`
- `scripts/**/*.{js,ts,mjs}`
- `docusaurus.config.ts`
- Root-level config/docs files: `*.{ts,js,json,md}`

**Excluded:**
- `node_modules/`
- `build/`
- `.docusaurus/`
- Shell scripts (*.sh)
- Compiled/minified files (*.min.js, *.min.css)
- Package locks

## Scripts

### Check Code Quality

```bash
# Check ESLint issues (no fixes)
npm run lint

# Fix ESLint issues automatically
npm run lint:fix

# Check Prettier formatting
npm run format:check

# Apply Prettier formatting
npm run format
```

### CI/CD Integration

```bash
# All checks (used in CI)
npm run lint && npm run format:check
```

## Configuration

### ESLint (.eslintrc.js)

**Environment:**
- Browser APIs (document, window, etc.)
- ES2021 features
- Node.js APIs

**Extends:**
- `eslint:recommended`
- `plugin:react/recommended`
- `plugin:react-hooks/recommended`
- `plugin:@typescript-eslint/recommended`
- `plugin:prettier/recommended`

**Rules:**
- React in JSX scope: OFF (React 19 doesn't require import)
- Prop types: OFF (using TypeScript)
- Unused vars: WARN (ignores underscore-prefixed)
- Explicit any: WARN
- Console: WARN (allows console.warn, console.error)
- Prettier formatting: ERROR
- React hooks: STRICT (rules of hooks)

### Prettier (.prettierrc.json)

- Semi-colons: ON
- Trailing commas: ALL
- Single quotes: YES
- Print width: 100
- Tab width: 2 spaces
- Arrow function parens: ALWAYS
- Line endings: LF

### Prettier Ignore (.prettierignore)

Excludes:
- Node modules and build artifacts
- Minified files
- Shell scripts (.sh)
- Lock files

## File Coverage

### src/
- ✅ All React components linted and formatted
- ✅ TypeScript files checked for types
- ✅ CSS modules included in formatting

### scripts/
- ✅ generate-icons.js - Linted and formatted
- ✅ generate-content-registry.mjs - Linted and formatted (.mjs support)
- ✅ generate-icons.sh - Excluded (shell script)

### Configuration Files
- ✅ docusaurus.config.ts - Linted and formatted
- ✅ vitest.config.ts - Linted and formatted
- ✅ eslint.config.js - Excluded (standard ignores)

### lib/
- ✅ recommendations/tracker.ts - Linted and formatted
- ✅ recommendations/tracker.test.ts - Linted and formatted

## Before Committing

Run the full check:

```bash
npm run typecheck  # TypeScript validation
npm run lint       # ESLint validation
npm run format     # Format all files
npm run test:run   # Run tests
```

## Exceptions & Special Cases

### Shell Scripts
Shell scripts (*.sh) are NOT formatted by Prettier as they have different formatting standards.

**Why excluded:**
- Different syntax rules
- Indentation conventions differ
- Easier to maintain with native shell formatting

### Node-only Scripts
Scripts in `scripts/` may use Node.js APIs not available in browser:
- `require()` for imports
- `process` object
- File system (`fs`) module

**ESLint Handling:**
- `node: true` environment enables Node.js globals
- No React rules applied to scripts

### Config Files
- `docusaurus.config.ts` - Included (main app config)
- `vitest.config.ts` - Included (test config)
- `*.config.js` patterns - Excluded (e.g., eslint.config.js, optimize-images.js)

**Why some excluded:**
- May use Node.js-only code
- Compatibility with different environments
- Standard build tool config naming

## Adding New Files

When adding new files:

1. **TypeScript/JavaScript in `src/`**
   - Automatically linted and formatted
   - Must pass ESLint and Prettier

2. **Scripts in `scripts/`**
   - Automatically linted and formatted
   - Must pass ESLint (Node.js rules apply)

3. **Configuration files**
   - Must be explicitly included in package.json scripts
   - Use consistent naming

4. **Shell scripts (.sh)**
   - Excluded from Prettier
   - Consider ESLint for any embedded JS

## Troubleshooting

### "ESLint Errors" on Build

```bash
npm run lint:fix  # Auto-fix what can be fixed
npm run lint      # Check remaining issues
```

### Formatting Conflicts

Prettier and ESLint may conflict. If you see:

```bash
npm run format    # Run Prettier first
npm run lint:fix  # Then ESLint
```

### Missing Files in Linting

Check `package.json` scripts - the glob patterns must include your file path.

Example adding `utils/helpers.ts`:
- ✅ Already covered by `src/**/*.ts`

Example adding `new-script.js`:
- Add to lint script: `scripts/**/*.{js,ts}`

### TypeScript Errors

Separate from linting:

```bash
npm run typecheck  # Run TypeScript compiler
```

Not all ESLint rules catch type errors.

## Pre-commit Hook (Optional)

To enforce linting on commits, add to `.git/hooks/pre-commit`:

```bash
#!/bin/bash
npm run lint && npm run format:check
```

Then:
```bash
chmod +x .git/hooks/pre-commit
```

## CI/CD Integration

The repository CI should run:

```bash
npm run typecheck     # Type checking
npm run lint          # Linting
npm run format:check  # Formatting (no modifications)
npm run test:run      # Tests
```

All must pass before merge.

## Summary

| File Pattern | Lint | Format | Notes |
|--------------|------|--------|-------|
| src/**/*.ts* | ✅ | ✅ | React components |
| scripts/**/*.js | ✅ | ✅ | Build scripts |
| scripts/**/*.mjs | ✅ | ✅ | ES modules |
| docusaurus.config.ts | ✅ | ✅ | App config |
| *.sh | ❌ | ❌ | Shell scripts |
| *.config.js | ❌ | ❌ | Config pattern |
| node_modules/ | ❌ | ❌ | Dependencies |
| build/, dist/ | ❌ | ❌ | Generated |

---

**Last Updated:** August 27, 2026  
**Status:** Active  
**Coverage:** Complete scope defined
