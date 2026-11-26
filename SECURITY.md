# Security

This document covers the security posture of the Soroban Cookbook documentation
site and the steps needed to harden it at both the application and infrastructure
levels.

## XSS Prevention

### Application layer (already in place)

| Control | Location | Notes |
|---|---|---|
| No `dangerouslySetInnerHTML` | All components | Confirmed by grep audit (issue #233). |
| No `innerHTML` / `eval` | All components | Confirmed by grep audit. |
| Controlled email input | `NewsletterSignup` | React controlled component; value never injected into DOM. |
| Email regex validation | `NewsletterSignup` | Validates before any fetch. |
| `sanitizeUrl()` on all dynamic `href` values | `PatternPreview` | Blocks `javascript:`, `data:`, `vbscript:` schemes. |
| `sanitizeUrl()` on `window.location.href` | `PatternPreview` | Same guard as above. |
| HTTPS-only newsletter endpoint | `NewsletterSignup` | `isHttpsUrl()` rejects non-HTTPS values at runtime. |
| `rel="noopener noreferrer"` on `target="_blank"` | `Testimonials` | Prevents reverse tab-nabbing. |
| `<meta http-equiv="Content-Security-Policy">` | `docusaurus.config.ts` | Client-side CSP. |

### CSP limitations of meta delivery

A `<meta http-equiv="Content-Security-Policy">` tag cannot enforce:

- `frame-ancestors` (must be an HTTP response header)
- `sandbox`
- `report-uri` / `report-to`

These must be set at the HTTP server or CDN layer.

## Required server-level HTTP headers

### Vercel (vercel.json)

```json
{
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "X-Frame-Options", "value": "DENY" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" },
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self' 'sha256-O8zYuOjyuzUZDv3fub7DKfAs5TEd1dG+fz+hCSCFmQA=' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.dicebear.com https://www.googletagmanager.com https://www.google-analytics.com https://c.clarity.ms https://c.bing.com; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms https://c.bing.com https://*.algolia.net https://*.algolianet.com https://api.sorobancookbook.org; form-action 'self'; object-src 'none'; base-uri 'self'; worker-src 'self'; frame-ancestors 'none'" }
      ]
    }
  ]
}
```

### Netlify (public/_headers)
/*

X-Frame-Options: DENY

X-Content-Type-Options: nosniff

Referrer-Policy: strict-origin-when-cross-origin

Content-Security-Policy: default-src 'self'; script-src 'self' 'sha256-O8zYuOjyuzUZDv3fub7DKfAs5TEd1dG+fz+hCSCFmQA=' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.dicebear.com https://www.googletagmanager.com https://www.google-analytics.com https://c.clarity.ms https://c.bing.com; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com https://*.google-analytics.com https://www.googletagmanager.com https://*.clarity.ms https://c.bing.com https://*.algolia.net https://*.algolianet.com https://api.sorobancookbook.org; form-action 'self'; object-src 'none'; base-uri 'self'; worker-src 'self'; frame-ancestors 'none'
## Newsletter endpoint

The `NEWSLETTER_ENDPOINT` env var must be an `https://` URL. Set it at build time:

```bash
NEWSLETTER_ENDPOINT=https://your-api.example.com/subscribe pnpm build
```

### Rate limiting (issue #351)

The static site has **no in-repo API**. Operators who set `NEWSLETTER_ENDPOINT` must
enforce rate limits at the gateway (Cloudflare, API Gateway, Formspree, etc.).

**Abuse scenario (documented):** An attacker scripts rapid `POST` requests with
random emails. Without gateway limits this can fill a mailing list or exhaust
provider quotas.

| Layer | Control |
|-------|---------|
| Client | `NewsletterSignup` enforces a 3s submit cooldown, ignores in-flight double submits, and surfaces HTTP **429** as “Too many requests…”. |
| Gateway (required when endpoint is live) | Cap e.g. **5 requests / IP / minute** on the subscribe path; return **429** with `Retry-After`. |
| Provider | Prefer vendors with built-in bot / rate protection. |

Client cooldown alone is not a security boundary — always configure the gateway.

## Reporting a vulnerability

**Please do not open a public issue for security vulnerabilities.**

Report security issues privately through [GitHub Security Advisories](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/security/advisories/new). This keeps the details confidential until a fix is in place and prevents potential exploitation before affected users can update.

### What to include

Provide as much of the following as you can:

- A clear description of the vulnerability and its potential impact.
- The file(s), URL(s), or component(s) affected.
- Steps to reproduce or a proof-of-concept (screenshots or a minimal script).
- The version or commit SHA where the issue was observed.
- Any suggested mitigations, if you have them.

### Response timeline

| Milestone | Target |
|---|---|
| Acknowledgement | Within **48 hours** of receipt |
| Initial triage and severity assessment | Within **7 days** |
| Fix or mitigation shipped | Within **90 days** (critical issues prioritised faster) |
| Public disclosure | After the fix is released, coordinated with the reporter |

If you have not received an acknowledgement within 48 hours, please follow up by opening a **[blank security advisory draft](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/security/advisories/new)** with a note that you are following up on an earlier report.

### Coordinated disclosure

We follow a **90-day coordinated disclosure policy**. We ask that you:

1. Give us the full 90 days to investigate and ship a fix before publishing details publicly.
2. Avoid accessing or modifying data that does not belong to you during research.
3. Act in good faith — do not perform denial-of-service attacks, spam, or social engineering.

We will credit reporters in the security advisory by default. If you prefer to remain anonymous, let us know in your report.

### Scope

This policy covers:

- The documentation site at <https://soroban-cookbook.com> and any preview deployments.
- Source code in this repository, including smart contract examples.
- CI/CD pipelines and configuration files in `.github/workflows/`.

It does **not** cover third-party services (Vercel, GitHub itself, Stellar network), which have their own disclosure channels.
