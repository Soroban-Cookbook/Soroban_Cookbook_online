import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

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
        'getting-started/first-contract',
        'getting-started/deploy-testnet',
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/overview',
        'concepts/storage',
        'concepts/authorization',
        'concepts/events',
      ],
    },
    {
      type: 'category',
      label: 'Patterns',
      items: [
        'patterns/overview',
      ],
    },
    {
      type: 'category',
      label: 'Components',
      items: [
        'components/buttons',
        'components/testimonials',
      ],
    },
    {
      type: 'category',
      label: 'Responsive',
      items: [
        'responsive/breakpoints',
      ],
    },
  ],
};

export default sidebars;
