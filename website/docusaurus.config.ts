import { themes as prismThemes } from 'prism-react-renderer';
import type { Config } from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Soroban Cookbook',
  tagline: 'A comprehensive guide to building smart contracts on Stellar with Soroban',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://soroban-cookbook.dev',
  baseUrl: '/',

  organizationName: 'Soroban-Cookbook',
  projectName: 'Soroban-Cookbook-',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/Soroban-Cookbook/Soroban-Cookbook-/tree/main/',
          routeBasePath: '/',
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  plugins: [],

  themeConfig: {
    image: 'img/soroban-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Soroban Cookbook',
      logo: {
        alt: 'Soroban Logo',
        src: 'img/soroban-logo.svg',
        srcDark: 'img/soroban-logo-dark.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'gettingStartedSidebar',
          position: 'left',
          label: 'Getting Started',
        },
        {
          type: 'docSidebar',
          sidebarId: 'patternsSidebar',
          position: 'left',
          label: 'Patterns',
        },
        {
          type: 'docSidebar',
          sidebarId: 'conceptsSidebar',
          position: 'left',
          label: 'Core Concepts',
        },
        {
          to: '/playground',
          label: 'Playground',
          position: 'left',
        },
        {
          type: 'search',
          position: 'right',
        },
        {
          href: 'https://github.com/Soroban-Cookbook/Soroban-Cookbook-',
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
              label: 'Getting Started',
              to: '/getting-started/what-is-soroban',
            },
            {
              label: 'Core Concepts',
              to: '/concepts/authentication',
            },
            {
              label: 'Pattern Library',
              to: '/patterns',
            },
          ],
        },
        {
          title: 'Community',
          items: [
            {
              label: 'Stellar Discord',
              href: 'https://discord.gg/stellardev',
            },
            {
              label: 'GitHub Discussions',
              href: 'https://github.com/Soroban-Cookbook/Soroban-Cookbook-/discussions',
            },
            {
              label: 'Stack Overflow',
              href: 'https://stackoverflow.com/questions/tagged/soroban',
            },
          ],
        },
        {
          title: 'Resources',
          items: [
            {
              label: 'Soroban Docs',
              href: 'https://developers.stellar.org/docs/smart-contracts',
            },
            {
              label: 'Stellar Developer Portal',
              href: 'https://developers.stellar.org/',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/Soroban-Cookbook/Soroban-Cookbook-',
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
    algolia: {
      appId: 'YOUR_APP_ID',
      apiKey: 'YOUR_SEARCH_API_KEY',
      indexName: 'soroban-cookbook',
      contextualSearch: true,
      searchParameters: {},
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
