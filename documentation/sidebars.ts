import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

/**
 * Soroban Cookbook Sidebar Configuration
 * Creating a structured learning path for Soroban development
 */
const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/setup',
        'getting-started/setup-linux',
        'getting-started/setup-windows',
        'getting-started/setup-macos',
        'getting-started/development-tools',
        'getting-started/first-contract',
        'getting-started/building-and-compilation',
        'getting-started/browser-server-compilation',
        'getting-started/contract-testing',
        'getting-started/local-testing-and-simulation',
        'getting-started/deploy-testnet',
        'getting-started/deploy-mainnet',
        'getting-started/contract-interaction',
        'getting-started/debugging',
        'contributing',
        'contributing/add-tested-example',
        'contributing/analytics-events',
        'contributing/versioning-strategy',
      ],
    },
    {
      type: 'category',
      label: 'Migrations',
      items: [
        'migrations/index',
        'migrations/baseline-22-0',
        'migrations/template',
        'contributing/offline-behavior',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/introduction',
        'concepts/overview',
        'concepts/best-practices',
        'concepts/error-handling',
        'concepts/storage',
        'concepts/authorization',
        'concepts/events',
        'concepts/time-and-scheduling',
        'concepts/gas-and-resources',
        'concepts/cross-contract-invocation',
        'concepts/randomness',
      ],
    },
    {
      type: 'category',
      label: 'Patterns',
      items: [
        'patterns/overview',
        'patterns/hello-world',
        'patterns/basic-token',
        'patterns/token-snapshot',
        'patterns/custom-types',
        'patterns/token-standards',
        'patterns/authorization',
        'patterns/error-handling',
        'patterns/error-recovery',
        'patterns/escrow-multiparty',
        'patterns/multi-token-vault',
        'patterns/optimization-playbook',
        'patterns/lifecycle-upgrades',
        'patterns/proposal-lifecycle',
        'patterns/reentrancy-guard',
        'patterns/streaming-payments',
        'patterns/contract-registry',
      ],
    },
    {
      type: 'category',
      label: 'Security',
      items: ['security/fundamentals', 'security/governance', 'security/defi-patterns', 'security/upgrade-checklist'],
    },
    {
      type: 'category',
      label: 'Design System',
      items: [
        'design-system/buttons',
        'design-system/typography',
        'design-system/badges-tags',
        'design-system/empty-states',
      ],
    },
    {
      type: 'category',
      label: 'Components',
      items: ['components/buttons', 'components/testimonials'],
    },
    {
      type: 'category',
      label: 'Responsive',
      items: ['responsive/breakpoints'],
    },
    {
      type: 'category',
      label: 'Security Audit',
      items: ['security/code-audit'],
    },
    {
      type: 'category',
      label: 'Planning',
      items: [
        'planning/ab-testing',
        'planning/code-playground',
        'planning/video-tutorial-getting-started',
        'planning/video-tutorial-first-contract',
      ],
    },
    {
      type: 'category',
      label: 'Legal',
      items: [
        'legal/privacy',
      ],
    },
  ],
};

export default sidebars;
