import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

/** Optional GA4 measurement ID — enables page views + custom events when set. */
const gtagMeasurementId = process.env.GTAG_MEASUREMENT_ID || process.env.GOOGLE_ANALYTICS_ID || '';

const config: Config = {
  title: 'Soroban Cookbook',
  tagline: 'A comprehensive guide to building smart contracts on Stellar with Soroban',
  favicon: 'img/logo.svg',

  url: process.env.SITE_URL || 'https://soroban-cookbook.dev',
  baseUrl: process.env.BASE_URL || '/',

  organizationName: 'Soroban-Cookbook',
  projectName: 'Soroban_Cookbook_online',

  customFields: {
    // POST endpoint accepting JSON `{ "email": string }`.
    // Set via env at build time for real integrations.
    newsletterEndpoint: process.env.NEWSLETTER_ENDPOINT ?? '',
    /** Soroban Cookbook Discord invite link. Set DISCORD_INVITE_URL at build time once the server is created. */
    discordInviteUrl: process.env.DISCORD_INVITE_URL ?? '',
/**
     * Sentry DSN for error monitoring (issue #136).
     * Set SENTRY_DSN in your CI/CD environment or .env.local.
     * When absent, Sentry is not initialised (safe for local dev).
     */
    sentryDsn: process.env.SENTRY_DSN ?? '',
    // Both are consent-gated — see ConsentBanner / src/utils/analytics.ts.
    // Unset by default, so no analytics script ever loads until an operator
    // opts in by setting the secret. See DEPLOYMENT.md → Analytics.
    /** GA4 measurement ID (e.g. "G-XXXXXXX") for conversion funnel tracking. */
    gaMeasurementId: process.env.GA_MEASUREMENT_ID ?? process.env.GTAG_MEASUREMENT_ID ?? process.env.GOOGLE_ANALYTICS_ID ?? '',
    /** Microsoft Clarity project ID for heatmaps/session replay. */
    clarityProjectId: process.env.CLARITY_PROJECT_ID ?? '',
  },

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  // Theme initialization script to prevent flash of incorrect theme
  scripts: [
    {
      src: '/js/themeInit.js',
      async: false,
    },
  ],

  // Meta tags for theme color + social previews (see CONTRIBUTING — SEO & social metadata)
  headTags: [
    // Content Security Policy
    {
      tagName: 'meta',
      attributes: {
        'http-equiv': 'Content-Security-Policy',
        content: [
          "default-src 'self'",
"script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com https://www.clarity.ms",
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: https:",
          "font-src 'self' data:",
          "connect-src 'self' https:",
          "frame-src 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self' https:",
          "worker-src 'self'",
        ].join('; '),
      },
    },
    {
      tagName: 'meta',
      attributes: {
        name: 'theme-color',
        content: '#1e1e2e',
      },
    },
    // Content-Security-Policy fallback for hosts that cannot set custom HTTP
    // response headers (e.g. GitHub Pages). Hosts that can set real headers
    // (Vercel via vercel.json, Netlify/Cloudflare Pages via static/_headers)
    // should rely on those instead — a header-based CSP also covers
    // `frame-ancestors`, which browsers ignore when delivered via <meta>.
    // See DEPLOYMENT.md → Security Headers for the full policy rationale.
    {
      tagName: 'meta',
      attributes: {
        'http-equiv': 'Content-Security-Policy',
        content:
          "default-src 'self'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.clarity.ms; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://api.dicebear.com; font-src 'self' data:; connect-src 'self' https:; form-action 'self' https:; object-src 'none'; base-uri 'self'; worker-src 'self'",
      },
    },
    // Preload the Inter variable font (latin woff2) — critical for above-the-fold text.
    // The href must match the path emitted by @fontsource-variable/inter after build.
    {
      tagName: 'link',
      attributes: {
        rel: 'preload',
        href: '/assets/fonts/inter-latin-wght-normal.woff2',
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
    },
    // Preload JetBrains Mono for code blocks.
    {
      tagName: 'link',
      attributes: {
        rel: 'preload',
        href: '/assets/fonts/jetbrains-mono-latin-wght-normal.woff2',
        as: 'font',
        type: 'font/woff2',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:type',
        content: 'website',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:site_name',
        content: 'Soroban Cookbook',
      },
    },
    // Open Graph image size tags (og:image, twitter:card, and twitter:image are automatically injected by Docusaurus from themeConfig.image)
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image:width',
        content: '1200',
      },
    },
    {
      tagName: 'meta',
      attributes: {
        property: 'og:image:height',
        content: '630',
      },
    },
  ],

  // ─── Search Analytics Client Module (issue #329) ──────────────────────────
  // Loads on every page to observe the search input and fire onQuery /
  // onResult analytics events via src/utils/searchAnalytics.ts.
  clientModules: [require.resolve('./src/clientModules/searchAnalyticsModule.ts')],
  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        language: ['en'],
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
        indexDocs: true,
        indexPages: true,
        indexBlog: false,
        // ── Phase 5: Code Snippet & API Search (issue #333) ───────────────────
        // docsRouteBasePath must match preset-classic docs.routeBasePath so the
        // search index covers all documentation pages (including code blocks).
        docsRouteBasePath: '/docs',
        // Index code inside fenced code blocks — the plugin strips Markdown
        // formatting but preserves code block text by default; this comment
        // documents that behaviour so future maintainers don't accidentally
        // disable it by adding `removeDefaultStemmer: true` without testing.
        // searchBarShortcutHint shows keyboard shortcut in the search bar.
        searchBarShortcutHint: true,
        // Make all search contexts available even when no context is selected,
        // so a top-level search also surfaces results from nested doc sections.
        useAllContextsWithNoSearchContext: true,
        searchResultLimits: 8,
        searchResultContextMaxLength: 50,
      },
    ],
    // ─── Progressive Web App (PWA) ───────────────────────────────────────────────
    // Enables offline support, service worker, and installable manifest.
    [
      '@docusaurus/plugin-pwa',
      {
        debug: false,
        offlineModeActivationStrategies: [
          'appInstalled',
          'standalone',
          'queryString',
        ],
        pwaHead: [
          {
            tagName: 'link',
            rel: 'icon',
            href: '/img/pwa-icon-192x192.png',
          },
          {
            tagName: 'link',
            rel: 'manifest',
            href: '/manifest.json',
          },
          {
            tagName: 'meta',
            name: 'theme-color',
            content: '#1e1e2e',
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-capable',
            content: 'yes',
          },
          {
            tagName: 'meta',
            name: 'apple-mobile-web-app-status-bar-style',
            content: 'black-translucent',
          },
          {
            tagName: 'link',
            rel: 'apple-touch-icon',
            href: '/img/pwa-icon-192x192.png',
          },
          {
            tagName: 'link',
            rel: 'mask-icon',
            href: '/img/logo.svg',
            color: '#3ECC5F',
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileImage',
            content: '/img/pwa-icon-192x192.png',
          },
          {
            tagName: 'meta',
            name: 'msapplication-TileColor',
            content: '#1e1e2e',
          },
        ],
      },
    ],
    // ─── 301 Redirects ────────────────────────────────────────────────────────
    // Maps old/removed paths → current canonical paths so bookmarks and
    // external links continue to resolve after pages are renamed or moved.
    // Add new entries here whenever a doc is renamed or relocated.
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          // website/ → documentation/ directory rename (legacy root paths)
          {
            from: '/docs/intro',
            to: '/docs/concepts/introduction',
          },
          // Getting Started renames
          {
            from: '/docs/setup',
            to: '/docs/getting-started/setup',
          },
          {
            from: '/docs/getting-started/installation',
            to: '/docs/getting-started/setup',
          },
          {
            from: '/docs/getting-started/setup-macos',
            to: '/docs/getting-started/setup',
          },
          {
            from: '/docs/first-contract',
            to: '/docs/getting-started/first-contract',
          },
          {
            from: '/docs/getting-started/build',
            to: '/docs/getting-started/building-and-compilation',
          },
          {
            from: '/docs/getting-started/deploy',
            to: '/docs/getting-started/deploy-testnet',
          },
          {
            from: '/docs/getting-started/interaction',
            to: '/docs/getting-started/contract-interaction',
          },
          // Concepts renames
          {
            from: '/docs/concepts',
            to: '/docs/concepts/introduction',
          },
          {
            from: '/docs/concepts/intro',
            to: '/docs/concepts/introduction',
          },
          {
            from: '/docs/concepts/gas',
            to: '/docs/concepts/gas-and-resources',
          },
          {
            from: '/docs/concepts/cross-contract',
            to: '/docs/concepts/cross-contract-invocation',
          },
          // Patterns renames
          {
            from: '/docs/patterns',
            to: '/docs/patterns/overview',
          },
          {
            from: '/docs/patterns/types',
            to: '/docs/patterns/custom-types',
          },
          {
            from: '/docs/patterns/auth',
            to: '/docs/patterns/authorization',
          },
          {
            from: '/docs/patterns/upgrades',
            to: '/docs/patterns/lifecycle-upgrades',
          },
          {
            from: '/docs/patterns/optimization',
            to: '/docs/patterns/optimization-playbook',
          },
          // Contributing renames
          {
            from: '/docs/contributing/guide',
            to: '/docs/contributing',
          },
          {
            from: '/docs/contributing/tested-example',
            to: '/docs/contributing/add-tested-example',
          },
          // Legacy tutorial paths from initial Docusaurus scaffold
          {
            from: '/docs/tutorial-basics/create-a-document',
            to: '/docs/getting-started/first-contract',
          },
          {
            from: '/docs/tutorial-basics/deploy-your-site',
            to: '/docs/getting-started/deploy-testnet',
          },
        ],
      },
    ],
  ],

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          routeBasePath: '/docs',
          editUrl:
            'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/documentation/',
          // Docs versioning: the latest cut version (e.g. "22.0") is served at the
          // site root; in-progress edits to docs/ live at /docs/next/ until the next
          // version is cut. See docs/contributing/versioning-strategy.md.
          includeCurrentVersion: true,
          versions: {
            current: {
              label: 'Next 🚧',
              badge: true,
            },
          },
        },
        blog: false,
        theme: {
          customCss: [
            './src/css/fonts.css',
            './src/css/design-tokens.css',
            './src/css/breakpoints.css',
            './src/css/badges-tags.css',
            './src/css/custom.css',
            './src/css/search-experience.css',
          ],
        },
        ...(gtagMeasurementId
          ? {
              gtag: {
                trackingID: gtagMeasurementId,
                anonymizeIP: true,
              },
            }
          : {}),
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/soroban-social-card.png',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Soroban Cookbook',
      logo: {
        alt: 'Soroban Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          type: 'docsVersionDropdown',
          position: 'right',
        },
        {
          href: process.env.DISCORD_INVITE_URL ?? 'https://discord.gg/YNBu3jKEF',
          label: 'Discord',
          position: 'right',
        },
        {
          href: 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Learn',
          items: [
            {
              label: 'Documentation',
              to: '/',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Soroban Cookbook Discord',
              href: process.env.DISCORD_INVITE_URL ?? 'https://discord.gg/YNBu3jKEF',
            },
            {
              label: 'Stellar Discord',
              href: 'https://discord.gg/YNBu3jKEF',
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/soroban',
            },
            {
              label: 'Code of Conduct',
              href: 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/CODE_OF_CONDUCT.md',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Soroban Docs',
              href: 'https://developers.stellar.org/docs/build/smart-contracts',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online',
            },
            {
              label: 'Privacy Policy',
              to: '/privacy',
            },
            {
              html: '<button type="button" class="footer__link-item" style="background:none;border:none;padding:0;color:inherit;cursor:pointer;font:inherit;text-align:left" onclick="window.dispatchEvent(new CustomEvent(\'soroban-open-consent\'))">Cookie settings</button>',
            },
          ],
        },
      ],
      copyright: `Built by the community • Powered by Stellar • MIT License • © ${new Date().getFullYear()}`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.vsDark,
      additionalLanguages: ['rust', 'toml', 'bash'],
    },
    mermaid: {
      theme: {
        light: 'neutral',
        dark: 'dark',
      },
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
