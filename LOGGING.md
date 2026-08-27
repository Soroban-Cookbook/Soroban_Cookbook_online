# Logging & Log Aggregation

How CI/CD logs for this project are produced, retained, searched, and optionally
forwarded to a central platform. Implemented by
[`.github/workflows/log-aggregation.yml`](./.github/workflows/log-aggregation.yml).

Related: [DEPLOYMENT.md → Alert System](./DEPLOYMENT.md#alert-system) covers
*notification* (something broke, tell a human). This document covers *retention
and search* (something broke, find out why).

---

## What produces logs

| Source | Where it lands | Notes |
| --- | --- | --- |
| GitHub Actions workflow runs | Actions tab, per run | Primary source. Every job step's stdout/stderr. |
| Archived run logs | Workflow artifact `run-logs-<run_id>` | Created by the Log Aggregation workflow, downloadable as a zip. |
| Datadog (optional) | Datadog Log Explorer | Only when `DATADOG_API_KEY` is configured. Cross-run search. |
| Deploy summaries | Run's job summary | Human-readable deploy URL/commit, written by `deploy.yml`. |

This is a **static documentation site** — there is no application server, so
there are no runtime request logs, database logs, or backend error logs to
aggregate. Client-side errors surface through the browser console (guarded in CI
by `bun run test:console`) and Web Vitals reporting, not through a log pipeline.

---

## Retention policy

| Log type | Retention | Set by | Rationale |
| --- | --- | --- | --- |
| GitHub Actions run logs | **90 days** | GitHub default (fixed on the free tier) | GitHub's own retention for workflow logs; not configurable per-repo on free plans. |
| Archived log artifacts | **30 days** | `LOG_RETENTION_DAYS` in `log-aggregation.yml` | Covers a normal debugging window. Artifacts count against repo storage quota, so this is deliberately shorter than GitHub's 90 days. |
| Datadog forwarded logs | **Per Datadog plan** (commonly 15 days on entry tiers) | Datadog retention settings | Configured in Datadog, not in this repo. |
| Workflow artifacts (build output) | 90 days | GitHub default | Unchanged by this workflow. |

**Changing retention:** edit `LOG_RETENTION_DAYS` in
[`.github/workflows/log-aggregation.yml`](./.github/workflows/log-aggregation.yml)
and update the table above in the same commit. GitHub caps artifact retention at
90 days for public repositories.

---

## How it works

The Log Aggregation workflow triggers on `workflow_run` completion for **CI** and
**CD - Deploy to GitHub Pages** (any conclusion — success, failure, or cancelled,
because a green run's logs are what you diff against when a later one breaks).

1. **Resolve target run** — uses the triggering run's ID, or a `run_id` you pass
   via manual dispatch, or falls back to the most recent CD run.
2. **Download run logs** — pulls the run's log bundle from the GitHub API,
   retrying briefly because logs are not immediately available the instant a run
   reports completion.
3. **Archive** — uploads the extracted per-job log files as the artifact
   `run-logs-<run_id>`.
4. **Forward to Datadog** — only if `DATADOG_API_KEY` is set. Sends one request
   per job log, tagged with repo, run ID, workflow, branch, conclusion, and job
   name. Failures here emit a warning and never fail the workflow — log shipping
   must not mask the pipeline's real result.

---

## Finding the logs for a deploy

### Option 1 — GitHub UI (no setup required)

1. Go to **Actions → CD - Deploy to GitHub Pages**.
2. Click the run for the commit you care about.
3. Expand the failing step to read its output inline.

### Option 2 — Archived artifact (searchable offline)

```bash
# List recent deploy runs and pick a run ID
gh run list --workflow 'CD - Deploy to GitHub Pages' --limit 10

# Download that run's archived logs
gh run download --name "run-logs-<RUN_ID>" --dir ./deploy-logs

# Search across every job in the run
grep -rn "error" ./deploy-logs
```

### Option 3 — GitHub CLI, straight to the terminal

```bash
gh run view <RUN_ID> --log            # full log
gh run view <RUN_ID> --log-failed     # only the failed steps
```

### Option 4 — Datadog (cross-run search)

Once forwarding is enabled, search in the Datadog Log Explorer:

```
service:soroban-cookbook-ci
service:soroban-cookbook-ci workflow:"CD - Deploy to GitHub Pages"
service:soroban-cookbook-ci conclusion:failure branch:main
service:soroban-cookbook-ci run_id:1234567890
```

Available tags: `repo`, `run_id`, `workflow`, `branch`, `conclusion`, `job`.

---

## Enabling Datadog forwarding (optional)

Forwarding is off until a key exists — the repo works fine without it.

1. In Datadog, go to **Organization Settings → API Keys** and create a key.
2. In GitHub, go to **Settings → Secrets and variables → Actions → Secrets**.
3. Add a secret named `DATADOG_API_KEY` with that value.
4. If your org is not on the US1 site, add a **variable** (not a secret) named
   `DATADOG_SITE` — e.g. `datadoghq.eu`, `us3.datadoghq.com`, `ap1.datadoghq.com`.
5. Verify: **Actions → Log Aggregation → Run workflow**. The run summary reports
   `Datadog forwarding: enabled`, and logs appear in the Log Explorer under
   `service:soroban-cookbook-ci` within a minute or two.

To disable, delete the `DATADOG_API_KEY` secret. Archiving continues regardless.

### Using CloudWatch instead

The forwarding step is a single `curl` to an HTTP intake. To target AWS
CloudWatch Logs instead of Datadog, replace that step with:

1. `aws-actions/configure-aws-credentials` using an OIDC role (avoid long-lived
   AWS keys in secrets).
2. `aws logs put-log-events --log-group-name /github/soroban-cookbook --log-stream-name <run_id>`.

Keep the "never fail the workflow on a shipping error" behavior — the deploy
result must not depend on the logging sink being reachable.

---

## Security notes

- `DATADOG_API_KEY` is read only via `${{ secrets.DATADOG_API_KEY }}` and is
  never echoed. GitHub masks registered secrets in log output.
- The workflow requests the minimum permissions it needs: `contents: read` and
  `actions: read`.
- **Workflow logs are public on a public repository.** Anything printed by a CI
  step is world-readable and gets copied into the archive and into Datadog. Never
  `echo` a secret in a workflow step — see
  [DEPLOYMENT.md → Environment Variables](./DEPLOYMENT.md#environment-variables)
  for how build-time configuration is handled.
