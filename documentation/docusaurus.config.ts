import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
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
          routeBasePath: '/docs',
          editUrl: 'https://github.com/Soroban-Cookbook/Soroban-Cookbook-/tree/main/documentation/',
        },
        blog: false,
        theme: {
          customCss: ['./src/css/custom.css', './src/css/breakpoints.css'],
        },
      } satisfies Preset.Options,
    ],
  ],

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
              label: 'Documentation',
              to: '/',
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
  } satisfies Preset.ThemeConfig,
};

export default config;
