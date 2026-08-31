# CI/CD Pipeline Documentation

This document describes the automated CI/CD pipeline for the Soroban Cookbook project.

## Overview

The CI/CD pipeline ensures code quality, consistency, and reliable deployments through automated checks and deployments. The pipeline is implemented using GitHub Actions and consists of two main workflows:

1. **CI (Continuous Integration)** - Runs on pull requests and pushes to validate code quality
2. **CD (Continuous Deployment)** - Deploys documentation to GitHub Pages after CI passes

## CI Workflow (`ci.yml`)

The CI workflow runs automatically on:
- Pull requests to `main` branch
- Pushes to `main` branch
- Manual trigger via `workflow_dispatch`

### Jobs

#### 1. Lint & Format (`lint-format`)
Validates code formatting and linting standards.

**Steps:**
- Checkout code
- Setup Bun package manager
- Cache Bun dependencies
- Install dependencies with frozen lockfile
- Check formatting with Prettier
- Lint with ESLint (max warnings: 0)

**Failure Conditions:**
- Code doesn't match Prettier formatting
- ESLint finds any linting issues

**Local Equivalent:**
```bash
cd documentation
bun install --frozen-lockfile
bun run format:check
bun run lint
```

#### 2. TypeScript Check (`typecheck`)
Validates TypeScript compilation without errors.

**Steps:**
- Checkout code
- Setup Bun
- Cache Bun dependencies
- Install dependencies
- Run TypeScript compiler

**Failure Conditions:**
- TypeScript compilation errors

**Local Equivalent:**
```bash
cd documentation
bun install --frozen-lockfile
bun run typecheck
```

#### 3. Build Documentation (`build-docs`)
Builds the Docusaurus documentation site.

**Steps:**
- Checkout code
- Setup Bun
- Cache Bun dependencies
- Cache build output
- Install dependencies
- Build documentation
- Verify build artifact (check for build/ directory and index.html)
- Upload build artifact for 5 days

**Failure Conditions:**
- Build fails
- Build directory not created
- index.html not found in build

**Local Equivalent:**
```bash
cd documentation
bun install --frozen-lockfile
bun run build
```

#### 4. Validate Deployment (`validate-deployment`)
Validates deployment configuration and workflow syntax.

**Steps:**
- Checkout code
- Setup Bun
- Check bun.lock exists
- Cache Bun dependencies
- Install dependencies
- Validate workflow syntax (checks for required GitHub Actions)

**Failure Conditions:**
- bun.lock missing
- Required GitHub Actions missing from deploy workflow

#### 5. Test Code Examples (`test-examples`)
Validates that all Rust code examples compile and pass their tests.

**Steps:**
- Checkout code
- Install Rust stable
- Cache Cargo registry
- Check every example crate has a README
- Run example tests

**Failure Conditions:**
- Any example crate is missing a README
- Any example test fails (`cargo test`)

#### 6. CI Summary (`summary`)
Aggregates results from all CI jobs and reports overall status.

**Runs After:** All other jobs (lint-format, typecheck, build-docs, validate-deployment, test-examples)

**Failure Conditions:**
- Any upstream job fails

## CD Workflow (`deploy.yml`)

The CD workflow runs automatically on:
- Pushes to `main` branch
- Manual trigger via `workflow_dispatch`

### Jobs

#### 1. Build (`build`)
Builds the documentation site for deployment.

**Steps:**
- Checkout code
- Setup Bun
- Cache Bun dependencies
- Install dependencies
- Build documentation
- Upload artifact to GitHub Pages

#### 2. Deploy (`deploy`)
Deploys the built documentation to GitHub Pages.

**Steps:**
- Configure GitHub Pages environment
- Deploy artifact to GitHub Pages
- Output deployment summary with URL

**Environment:** `github-pages`

**Output:** Deployment URL available in workflow run details (`page_url` job output)

#### 3. Deploy Status Notification (`notify`)
Notifies the team of deploy success or failure via Slack and/or Discord.

**Runs After:** `build` and `deploy` (always runs, including when either job fails)

**Steps:**
- Determine overall outcome from `needs.build.result` / `needs.deploy.result`
- Send Slack notification when `SLACK_WEBHOOK_URL` is configured
- Send Discord notification when `DISCORD_WEBHOOK_URL` is configured
- Log a setup hint when neither webhook secret is present

**Secrets (optional):** `SLACK_WEBHOOK_URL`, `DISCORD_WEBHOOK_URL` — see [DEPLOYMENT.md](DEPLOYMENT.md) → Deploy Status Notifications

## Caching Strategy

The pipeline implements multi-level caching to optimize runtime:

### Bun Dependencies Cache
- **Key:** `bun-${{ hashFiles('documentation/bun.lock') }}`
- **Path:** `~/.bun/install/cache`
- **Restore Keys:** `bun-` (fallback to any previous cache)
- **Impact:** Reduces dependency installation time by ~60-80%

### Build Output Cache
- **Key:** `build-${{ github.sha }}`
- **Path:** `documentation/build`
- **Restore Keys:** `build-` (fallback to any previous build)
- **Impact:** Allows reuse of build artifacts across jobs

## Concurrency Control

### CI Workflow
- **Group:** `ci-${{ github.ref }}`
- **Behavior:** Cancels in-progress runs when new commits are pushed
- **Purpose:** Prevents resource waste on outdated checks

### CD Workflow
- **Group:** `pages`
- **Behavior:** Does not cancel in-progress deployments
- **Purpose:** Ensures deployments complete without interruption

## Permissions

### CI Workflow
- `contents: read` - Read repository contents
- `checks: write` - Write check results
- `pull-requests: write` - Write PR comments

### CD Workflow
- `contents: read` - Read repository contents
- `pages: write` - Write to GitHub Pages
- `id-token: write` - OIDC token for GitHub Pages

## Local Development

### Running Checks Locally

Before pushing, run these commands to catch issues early:

```bash
cd documentation

# Install dependencies
bun install --frozen-lockfile

# Format check
bun run format:check

# Lint check
bun run lint

# TypeScript check
bun run typecheck

# Build check
bun run build
```

### Auto-fixing Issues

```bash
# Fix formatting
bun run format

# Fix linting issues (where possible)
bun run lint:fix
```

### Full CI Simulation

```bash
cd documentation
bun install --frozen-lockfile
bun run format:check && \
bun run lint && \
bun run typecheck && \
bun run build
```

## Branch Protection Rules

To enforce CI checks, configure branch protection on `main`:

1. Go to **Settings → Branches**
2. Add rule for `main` branch
3. Enable "Require status checks to pass before merging"
4. Select required checks:
   - `CI / Lint & Format`
   - `CI / TypeScript Check`
   - `CI / Build Documentation`
   - `CI / Validate Deployment`
   - `CI / Test Code Examples`
   - `CI / CI Summary`

## Troubleshooting

### CI Fails: Lint & Format

**Error:** `Prettier check failed`

**Solution:**
```bash
cd documentation
bun run format
git add .
git commit -m "style: format code"
```

**Error:** `ESLint found issues`

**Solution:**
```bash
cd documentation
bun run lint:fix
git add .
git commit -m "style: fix linting issues"
```

### CI Fails: TypeScript Check

**Error:** `Type errors found`

**Solution:**
1. Review the error messages in the workflow logs
2. Fix type issues in the source code
3. Run `bun run typecheck` locally to verify
4. Commit and push

### CI Fails: Build Documentation

**Error:** `Build failed`

**Solution:**
1. Check workflow logs for specific error
2. Run `bun run build` locally to reproduce
3. Fix the issue (usually broken links or syntax errors)
4. Verify with `bun run build` locally
5. Commit and push

### CD Fails: Deployment

**Error:** `Pages is not enabled`

**Solution:**
1. Go to **Settings → Pages**
2. Set **Source** to "GitHub Actions"
3. Retry deployment

**Error:** `Insufficient permissions`

**Solution:**
1. Go to **Settings → Actions → General**
2. Set **Workflow permissions** to "Read and write permissions"
3. Retry deployment

## Performance Metrics

Typical workflow runtimes (with caching):

| Job | Time |
|-----|------|
| Lint & Format | ~30-45s |
| TypeScript Check | ~30-45s |
| Build Documentation | ~1-2m |
| Validate Deployment | ~30-45s |
| **Total CI** | **~3-4m** |
| **CD Build** | **~1-2m** |
| **CD Deploy** | **~30-60s** |

First run (without cache) may take 2-3x longer.

## Future Improvements

- [ ] Add PR preview deployments
- [ ] Add Lighthouse performance audits
- [x] Add deployment notifications
- [ ] Add automated rollback on deployment failure
- [ ] Add security scanning (SAST/dependency checks)
- [ ] Add artifact retention policies
- [ ] Add deployment approval gates for production

## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment configuration guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [GitHub Actions Documentation](https://docs.github.com/en/actions)



<!-- ## Related Documentation

- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment configuration guide
- [CONTRIBUTING.md](CONTRIBUTING.md) - Contribution guidelines
- [GitHub Actions Documentation](https://docs.github.com/en/actions) -->
