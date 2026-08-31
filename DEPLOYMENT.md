# Deployment Guide

This document provides comprehensive information about deploying the Soroban Cookbook documentation.

## GitHub Pages Deployment

### Overview

The documentation is automatically deployed to GitHub Pages on every push to the `main` branch via GitHub Actions. The workflow is defined in `.github/workflows/deploy.yml`.

### Prerequisites

Before the workflow can successfully deploy, ensure the following repository settings are configured:

#### 1. Enable GitHub Pages

1. Navigate to your repository settings
2. Go to **Settings → Pages**
3. Under "Build and deployment":
   - Set **Source** to "GitHub Actions"
   - This allows the workflow to deploy built artifacts

#### 2. Configure Workflow Permissions

1. Go to **Settings → Actions → General**
2. Under "Workflow permissions":
   - Select "Read and write permissions"
   - Enable "Allow GitHub Actions to create and approve pull requests"
3. This grants the workflow necessary permissions to deploy

#### 3. Set Up Branch Protection (Recommended)

1. Go to **Settings → Branches**
2. Add a rule for the `main` branch:
   - Require status checks to pass before merging
   - Select the "build" job from the deploy workflow
   - This ensures only successful builds are merged

### Workflow Details

**Trigger Events:**

- Push to `main` branch
- Manual trigger via "Run workflow" button in Actions tab

**Build Process:**

1. Checkout code
2. Setup Bun
3. Install dependencies using `bun install --frozen-lockfile`
4. Build documentation with `bun run build`
5. Upload build artifact to GitHub Pages

**Deployment Process:**

1. Configure GitHub Pages environment
2. Deploy artifact to GitHub Pages
3. Deployment URL available in workflow run details

### Monitoring Deployments

1. Go to **Actions** tab in your repository
2. Select the "Deploy to GitHub Pages" workflow
3. View recent runs and their status
4. Click on a run to see detailed logs

### Troubleshooting

#### Workflow Fails with "Pages is not enabled"

**Solution:** Ensure GitHub Pages source is set to "GitHub Actions" in repository settings.

#### Deployment Skipped

**Solution:** Check that:

- You're pushing to the `main` branch
- Workflow permissions are set to "Read and write"
- No branch protection rules are blocking the deployment

#### Build Fails

**Solution:** Check the workflow logs for specific errors:

1. Go to Actions tab
2. Click on the failed run
3. Expand the "Build website" step to see error details

Common issues:

- Missing dependencies: Run `bun install --frozen-lockfile` locally to verify
- TypeScript errors: Run `bun run typecheck` locally
- Build errors: Run `bun run build` locally to reproduce

#### Artifact Upload Fails

**Solution:** Verify that:

- The build directory exists at `documentation/build`
- Build completed successfully (check previous step logs)
- Sufficient storage quota available

### Manual Deployment

To manually trigger a deployment:

1. Go to **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the branch (usually `main`)
5. Click "Run workflow"

### Rollback

GitHub Pages automatically serves the latest deployment. To quickly rollback to a previous version:

#### Option 1: Revert Commit (Recommended)

This creates an audit trail of all deployments:

1. Identify the problematic commit SHA
2. Create a revert commit on `main`:
   ```bash
   git revert <commit-sha>
   git push origin main
   ```
3. The "Deploy to GitHub Pages" workflow automatically triggers
4. Wait for workflow to complete (~3-5 minutes)
5. The live site now serves the previous working version

**Advantages:**
- Git history shows exactly what was reverted and when
- Automatic CI/CD pipeline handles deployment
- Safe: no force-push operations

#### Option 2: Manual Rollback via GitHub Actions

If you need to rollback without committing a revert:

1. Go to **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
4. Select the branch (`main`)
5. Select a previous git commit from the dropdown
6. Click "Run workflow"

This deploys the selected commit's state without creating a revert commit.

#### Option 3: GitHub Pages Branch Rollback

If the issue persists after revert, you can manually rollback the GitHub Pages deployment:

1. Navigate to **Settings → Pages**
2. Under "Build and deployment", the currently deployed commit is shown
3. Previous deployments are available through GitHub's deployment history
4. Select a previous deployment to activate it (if available)

#### Staging Verification Before Production

This repository features an automated **staging deployment** pipeline configured within `.github/workflows/deploy.yml` that isolates staging builds to avoid any overwrites to the live production site.

##### Split-Deployment Architecture

Because GitHub Pages only supports a single active custom domain/deployment per repository, deploying staging to the same Pages target directly would overwrite your production environment. To solve this, our deployment pipeline uses a **split-deployment strategy**:

1. **Production Deployment (`main` branch)**:
   - Deploys automatically on merge to `main`.
   - Uses the native `actions/deploy-pages` to deploy the static assets directly to GitHub Pages.
   - Tied to the `github-pages` environment at `https://soroban-cookbook.dev`.

2. **Staging Deployment (`staging` branch)**:
   - Deploys automatically on push/merge to `staging`.
   - Generates the build with `SITE_URL` dynamically set to `https://staging.soroban-cookbook.dev`.
   - Pushes the compiled static directory to a dedicated **`gh-pages-staging`** branch using `peaceiris/actions-gh-pages`.
   - This ensures staging remains safely isolated. Your custom domain provider (or external hosting platforms such as Vercel, Netlify, or Cloudflare Pages) can then be pointed to read from the `gh-pages-staging` branch to serve the staging site at `https://staging.soroban-cookbook.dev` without ever affecting your live site!

##### Step-by-Step Staging and Production Release Process

To test and release a new feature:
1. Create a pull request targeting the `staging` branch to test integration.
2. Push or merge changes to the `staging` branch.
3. The CD pipeline will trigger and automatically push the new staging build to the `gh-pages-staging` branch.
4. Verify that the staging site at `https://staging.soroban-cookbook.dev` behaves correctly.
5. Once verified, create a pull request from `staging` to `main`.
6. Merging to `main` will automatically build and deploy to the production environment (`github-pages`) at `https://soroban-cookbook.dev`.

**Note:** This repository uses GitHub Pages for hosting, which tracks deployments. Each successful workflow run creates a deployment artifact that can be restored if needed.

## Local Development

### Building Locally

```bash
cd documentation
bun install
bun run build
```

The built site will be in `documentation/build/`.

### Serving Locally

```bash
cd documentation
bun run serve
```

Visit `http://localhost:3000` to view the built site.

### Development Server

```bash
cd documentation
bun start
```

This starts a live-reload development server at `http://localhost:3000`.

## Environment Variables

Deployment does not require any environment variables to succeed — the build falls back to safe defaults (an inert newsletter form, a hidden Discord link) if none are set. Two optional variables enable real integrations:

| Variable | Used by | Purpose |
|---|---|---|
| `NEWSLETTER_ENDPOINT` | `documentation/docusaurus.config.ts` → `customFields.newsletterEndpoint` | POST endpoint the newsletter signup form submits `{ "email": string }` to. |
| `DISCORD_INVITE_URL` | `documentation/docusaurus.config.ts` → `customFields.discordInviteUrl` | Discord invite link surfaced in the UI once the server exists. |
| `GA_MEASUREMENT_ID` | `documentation/docusaurus.config.ts` → `customFields.gaMeasurementId` | GA4 measurement ID (`G-XXXXXXX`) for conversion funnel tracking. See [Analytics](#analytics). |
| `CLARITY_PROJECT_ID` | `documentation/docusaurus.config.ts` → `customFields.clarityProjectId` | Microsoft Clarity project ID for heatmaps. See [Analytics](#analytics). |

**These values are never hardcoded in source.** They are read from `process.env` at build time (see the `customFields` block in `docusaurus.config.ts`) and are wired into the production build via `.github/workflows/deploy.yml`, which sources them from **GitHub Repository Secrets**:

```yaml
- name: Build website
  run: bun run build
  env:
    NEWSLETTER_ENDPOINT: ${{ secrets.NEWSLETTER_ENDPOINT }}
    DISCORD_INVITE_URL: ${{ secrets.DISCORD_INVITE_URL }}
```

### Setting up the secrets

1. Go to **Settings → Secrets and variables → Actions → Secrets** tab.
2. Click **New repository secret**.
3. Add `NEWSLETTER_ENDPOINT` (and/or `DISCORD_INVITE_URL`) with the real value.
4. Re-run the deploy workflow (push to `main` or trigger manually) — no code changes required.

### Important: these are not confidential at runtime

Because this is a fully static site, any value baked in via `customFields` ends up readable in the published JavaScript bundle — a visitor's browser has to receive it to use it. Storing them as GitHub Secrets controls **who can set or change the value** (write access to repo secrets) and **keeps it out of git history and pull request diffs**; it does not make the value secret from website visitors. Treat these as build-time configuration, not authentication credentials — never put real API keys, passwords, or signing keys into `customFields` or any other value that reaches the client bundle.

This repo follows the same secrets-only pattern for actual credentials: `.github/workflows/alerts.yml` and `.github/workflows/deploy.yml` read `SLACK_WEBHOOK_URL` / `DISCORD_WEBHOOK_URL` exclusively via `${{ secrets.* }}` (see [Deploy Status Notifications](#deploy-status-notifications) and [Alert System](#alert-system) below) and never hardcode them. There are no `.env` files committed to this repository — `.gitignore` excludes `.env*` so local secrets never reach version control.

## Analytics

Two optional, **consent-gated** analytics integrations ship with the site:

| Tool | Purpose | Enabled by |
| --- | --- | --- |
| Google Analytics 4 | Conversion funnel: landing → docs → GitHub | `GA_MEASUREMENT_ID` |
| Microsoft Clarity | Heatmaps and session replay (click/scroll behavior) | `CLARITY_PROJECT_ID` |

Both are **off by default**. With neither variable set, no third-party script is
ever requested and the consent banner does not render.

### Privacy model

No analytics script loads until the visitor explicitly clicks **Accept** on the
consent banner. Specifically:

- The banner renders only when at least one of the two IDs is configured.
- The choice is stored in `localStorage` under `sc-analytics-consent`.
- Declining stores `denied` and loads nothing; the banner does not reappear.
- GA4 is configured with `anonymize_ip: true`.
- Consent is checked again on every page load — nothing is injected on the
  strength of a build-time flag alone.

Implementation: [`src/utils/cookieConsent.ts`](./documentation/src/utils/cookieConsent.ts)
(consent state), [`src/utils/analytics.ts`](./documentation/src/utils/analytics.ts)
(script loaders and event helpers),
[`src/components/CookieConsent/`](./documentation/src/components/CookieConsent/) (UI),
[`src/components/FunnelTracker/`](./documentation/src/components/FunnelTracker/)
(route and outbound-click steps), all mounted from
[`src/theme/Root.tsx`](./documentation/src/theme/Root.tsx).

Full data-handling practices are documented in the
[Privacy Policy](/docs/legal/privacy) (GDPR-compliant), linked from the consent
banner and footer.

### Setup

1. Create a GA4 property (**Admin → Data Streams → Web**) and copy its
   measurement ID (`G-XXXXXXX`), and/or create a Clarity project and copy its
   project ID.
2. Add them as **repository secrets** named `GA_MEASUREMENT_ID` and
   `CLARITY_PROJECT_ID` (**Settings → Secrets and variables → Actions**).
3. Add them to the `env:` block of the "Build website" step in
   `.github/workflows/deploy.yml` — as with the other build-time values, these
   end up readable in the client bundle, so treat them as configuration, not
   credentials (see [the note above](#important-these-are-not-confidential-at-runtime)).
4. Redeploy.

### Conversion funnel (GA4)

The site emits four ordered events. Build the funnel exploration in GA4 from
these, in this order:

| Step | Event name | Fired when |
| --- | --- | --- |
| 1 | `funnel_landing_view` | Homepage viewed |
| 2 | `funnel_cta_click` | A homepage hero CTA is clicked (`cta_id`: `hero_get_started`, `hero_view_patterns`) |
| 3 | `funnel_docs_view` | Any `/docs` page viewed |
| 4 | `funnel_github_click` | Any outbound `github.com` link clicked |

In GA4: **Explore → Funnel exploration**, add each event as a step in order,
then apply `cta_id` or `page_path` as a breakdown dimension.

### Other tracked events

Beyond the funnel, the site emits:

| Event | Parameters | Purpose |
| --- | --- | --- |
| `search` | `search_term`, `search_results` | Site search. GA4's reserved name, so terms appear in the built-in Search Terms report. |
| `search_no_results` | `search_term` | Zero-result queries — each is a documentation gap. |
| `doc_feedback` | `page_path`, `helpful` (`yes`/`no`) | "Was this page helpful?" vote. |
| `doc_feedback_detail` | `page_path` | Reader clicked through to write detailed feedback. |
| `experiment_exposure` | `experiment_id`, `variant` | A/B variant was rendered. |

Custom parameters need registering as GA4 custom dimensions before they can be
reported on, and registration is not retroactive — see
[ANALYTICS_DASHBOARD.md → Required custom dimensions](./ANALYTICS_DASHBOARD.md#required-custom-dimensions).

### Dashboard and experiments

- **[ANALYTICS_DASHBOARD.md](./ANALYTICS_DASHBOARD.md)** — the metric catalog,
  how to build the Looker Studio dashboard, and the weekly popular-pages report.
- **[A/B testing plan](./documentation/docs/planning/ab-testing.md)** — the
  approval process and plan template required before enabling any experiment.

**Verifying:** open the site with the browser devtools Network tab filtered to
`google-analytics` or `clarity`, accept the consent banner, and click a hero
CTA. You should see the collect request fire. In GA4, **Reports → Realtime**
shows the events within ~30 seconds. Note that ad blockers suppress both tools —
test in a clean profile.

### CSP

Both scripts require their origins in `script-src`. This is already applied, and
must stay in sync across all three places the policy is defined (see
[Security Headers](#security-headers)):

```
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms
```

## Logging

CI/CD logs are archived and optionally forwarded to a central platform by
`.github/workflows/log-aggregation.yml`. Retention policy, search recipes, and
Datadog/CloudWatch setup live in **[LOGGING.md](./LOGGING.md)**.

## Press Kit

Brand assets, boilerplate copy, fast facts, and screenshots for media and
ecosystem partners live in **[PRESS_KIT.md](./PRESS_KIT.md)**. Screenshots are
regenerated from a real build with `bun run press:screenshots`.

## Performance Considerations

- Build time: ~2-3 minutes (depends on content size)
- Artifact size: ~5-10 MB (typical for Docusaurus sites)
- Deployment time: ~1-2 minutes

## Security

### Content Security Policy (CSP)

The documentation site is protected by a strict Content-Security-Policy that prevents XSS and injection attacks.

**CSP Implementation:**
- Meta tag added to all pages via Docusaurus configuration (`documentation/docusaurus.config.ts`)
- Static `_headers` file provided for edge deployment compatibility
- Additional security headers configured for defense-in-depth

**Key Directives:**
- `default-src 'self'`: All content from same origin
- `script-src 'self' 'wasm-unsafe-eval'`: Scripts from same origin (wasm needed for Docusaurus)
- `style-src 'self' 'unsafe-inline'`: Styles from same origin with inline support (required for theming)
- `frame-ancestors 'none'`: Prevents clickjacking
- Other headers: `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`

See [SECURITY.md](./SECURITY.md) for detailed CSP documentation and testing instructions.

### Workflow Security

- Workflow uses `actions/checkout@v4` (latest stable)
- Permissions are minimal: `contents: read`, `pages: write`, `id-token: write`
- No secrets required for GitHub Pages deployment
- All code is built from the repository source

### Security Headers

The site ships a production-grade HTTP security baseline:

| Header | Value | Purpose |
|---|---|---|
| `X-Frame-Options` | `DENY` | Blocks the site from being framed (clickjacking). |
| `X-Content-Type-Options` | `nosniff` | Stops browsers from MIME-sniffing responses. |
| `X-XSS-Protection` | `1; mode=block` | Legacy reflected-XSS filter for older browsers. |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | Forces HTTPS for one year, including subdomains. |
| `Content-Security-Policy` | see below | Restricts which origins scripts, styles, fonts, images, and connections may load from. |

```
default-src 'self';
script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms;
style-src 'self' 'unsafe-inline';
img-src 'self' data: https://api.dicebear.com;
font-src 'self' data:;
connect-src 'self' https:;
form-action 'self' https:;
object-src 'none';
base-uri 'self';
frame-ancestors 'none';
```

`script-src`/`style-src` need `'unsafe-inline'` because Docusaurus emits a few inline boilerplate scripts (theme detection, base-URL warning banner) and inline `style="..."` attributes that vary per build and can't be pinned to a static hash. `script-src` also allowlists `www.googletagmanager.com` and `www.clarity.ms` for the optional, consent-gated analytics described under [Analytics](#analytics) — neither host is contacted unless an operator configures the IDs *and* the visitor accepts the consent banner. `img-src` allowlists `api.dicebear.com`, which generates the testimonial avatar images on the homepage. `connect-src`/`form-action` allow `https:` generally because the newsletter form posts to an operator-configured endpoint (`NEWSLETTER_ENDPOINT`, see [Environment Variables](#environment-variables)) that isn't known at policy-authoring time.

**Where this is defined (three places, kept in sync):**

1. **`vercel.json`** (repo root) — a `headers` block. This is the only mechanism that's actually enforced when this project is deployed via Vercel, because Vercel's edge network honors custom response headers.
2. **`documentation/static/_headers`** — the Netlify/Cloudflare Pages `_headers` file convention. Docusaurus copies everything under `static/` into the build root, so this lands at `build/_headers`. Honored automatically if this site is ever hosted on Netlify or Cloudflare Pages; harmless (ignored) elsewhere.
3. **`documentation/docusaurus.config.ts`** → `headTags` — a `<meta http-equiv="Content-Security-Policy">` tag baked into every page's `<head>`. This is the **only** mechanism that works on plain GitHub Pages, because GitHub Pages serves static files with no way to attach custom HTTP response headers (no edge functions, no header config). A caveat: the `<meta>` form of CSP cannot carry `frame-ancestors` — browsers silently ignore that directive outside a real HTTP header — and meta tags cannot express `X-Frame-Options`, `X-Content-Type-Options`, `Strict-Transport-Security`, or `X-XSS-Protection` at all (these are HTTP-header-only). **If you need those four headers enforced on a custom domain backed by GitHub Pages, put a CDN in front of it** (e.g. a Cloudflare proxy with a Transform Rule / Response Header Rule adding them) — there is no static-file-only way to add them on GitHub Pages itself.

**Verification methods:**

```bash
# Inspect headers actually returned by the live site (works for Vercel/Netlify/CDN-fronted deployments):
curl -sI https://soroban-cookbook.dev | grep -iE 'x-frame-options|x-content-type-options|x-xss-protection|strict-transport-security|content-security-policy'

# Confirm the CSP <meta> tag is present in the built HTML (works for any host, including plain GitHub Pages):
grep -o '<meta http-equiv="Content-Security-Policy"[^>]*>' documentation/build/index.html

# Browser-based audit:
# https://securityheaders.com — paste the deployed URL for a graded report.
```

This repo's `documentation/e2e/smoke-console.spec.ts` Playwright suite (`bun run test:console`, also run in CI as the `e2e-console` job) loads the homepage, docs pages, search, and the 404 page with a real Chromium instance and fails the build if the browser logs any CSP violation — so any future change that introduces a new third-party script, font, image host, or inline style that the policy doesn't already allow will be caught automatically rather than silently breaking in production.

## Deploy Status Notifications

Deployment success and failure alerts are sent directly from `.github/workflows/deploy.yml` via the `notify` job (`Deploy Status Notification`). The job always runs after `build` and `deploy` (`if: always()`), so the team is notified whether the pipeline succeeds or fails.

| Outcome | Channels | Payload includes |
|---|---|---|
| Build + deploy both succeed | Slack and/or Discord | Branch, commit, actor, site URL, Actions run URL |
| Build or deploy fails / is skipped | Slack and/or Discord | Branch, commit, actor, build/deploy job results, Actions run URL |

Webhooks are optional. If neither secret is set, the notify job logs a setup hint and exits successfully so deployments are never blocked by missing notification config.

### Setup

#### Slack (`SLACK_WEBHOOK_URL`)

Uses the same Incoming Webhook as the [Alert System](#alert-system) below. If you already configured `SLACK_WEBHOOK_URL` for `alerts.yml`, deploy status notifications reuse it automatically.

#### Discord (`DISCORD_WEBHOOK_URL`)

1. In Discord: **Server Settings → Integrations → Webhooks → New Webhook**.
2. Choose the target channel (e.g. `#deployments`), then copy the webhook URL.
3. Go to **GitHub → Settings → Secrets and variables → Actions**.
4. Click **New repository secret**.
5. Name: `DISCORD_WEBHOOK_URL` — Value: the Discord webhook URL.

#### Verify

1. Trigger a deploy (`push` to `main` or **Actions → CD - Deploy to GitHub Pages → Run workflow**).
2. When the run finishes, confirm a success or failure message appears in Slack and/or Discord.

## Alert System

Alerting for CI/CD workflow conclusions and site uptime is handled by `.github/workflows/alerts.yml` (complements the in-workflow deploy notifications above). The workflow covers:

| Trigger | Job | What fires |
|---|---|---|
| CI or CD workflow fails on `main` | `notify-failure` | Slack message with workflow name, branch, commit, actor, and run URL |
| CI or CD workflow recovers on `main` | `notify-recovery` | Slack recovery message |
| Schedule (every 30 min) | `uptime-check` | HTTP probe against the live site; Slack alert if non-2xx/3xx |
| Manual `workflow_dispatch` with `test_alert=true` | `test-alert` | Sends a test Slack message to verify the integration |

### Setup

#### 1. Create a Slack Incoming Webhook

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → **Create New App** → **From scratch**.
2. Name it `Soroban Cookbook Alerts`, pick your workspace.
3. Under **Features** → **Incoming Webhooks**, toggle **Activate Incoming Webhooks** on.
4. Click **Add New Webhook to Workspace**, select the target channel (e.g. `#soroban-alerts`), and click **Allow**.
5. Copy the webhook URL (format: `https://hooks.slack.com/services/…`).

#### 2. Add the secret to GitHub

1. Go to **Settings → Secrets and variables → Actions**.
2. Click **New repository secret**.
3. Name: `SLACK_WEBHOOK_URL` — Value: the URL copied above.

#### 3. (Optional) Override the monitored URL

The uptime probe defaults to `https://soroban-cookbook.dev`. To change it without editing the workflow:

1. Go to **Settings → Secrets and variables → Actions → Variables** tab.
2. Add a variable named `SITE_URL` with the target URL as the value.

#### 4. Verify the integration

1. Go to **Actions** → **Alert System** → **Run workflow**.
2. Set **test_alert** to `true` and click **Run workflow**.
3. A test message should appear in your Slack channel within seconds.

### On-Call Rotation

This project is community-maintained. There is no formal PagerDuty rotation. The Slack channel configured above serves as the incident notification channel. Triage follows this process:

1. **Slack alert fires** → anyone with repository access investigates the linked Actions run.
2. **Build failure** → check the failed job logs; common causes are dependency updates or broken Rust examples.
3. **Site downtime** → check GitHub Pages status at [githubstatus.com](https://www.githubstatus.com) first. If Pages is healthy, check the last deployment run.
4. **Escalation** → open a GitHub issue tagged `incident` and post in [Stellar Discord](https://discord.gg/stellardev) `#soroban-dev`.

If you want to set up a formal PagerDuty integration, replace the `slackapi/slack-github-action` steps with calls to the [PagerDuty Events API v2](https://developer.pagerduty.com/api-reference/YXBpOjI3NDgyNjU-pager-duty-v2-events-api) using a `PAGERDUTY_INTEGRATION_KEY` secret.

### Alert Channels Reference

| Channel | Purpose | Configured via |
|---|---|---|
| Slack `#soroban-alerts` | Deploy status, CI failures, recoveries, downtime | `SLACK_WEBHOOK_URL` secret |
| Discord webhook channel | Deploy success / failure status | `DISCORD_WEBHOOK_URL` secret |
| GitHub Actions email | Default GitHub notification for workflow failures | GitHub account notification settings |

---

## Future Improvements

- [ ] Add build caching to speed up deployments
- [ ] Add performance metrics collection
- [ ] Implement preview deployments for pull requests
- [ ] Add automated lighthouse audits
- [x] Set up deployment notifications

## Support

For issues or questions:

1. Check the troubleshooting section above
2. Review workflow logs in the Actions tab
3. Open an issue on GitHub with workflow logs attached
4. Join the [Stellar Discord](https://discord.gg/stellardev) for community support
