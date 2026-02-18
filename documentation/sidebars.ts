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
      ],
    },
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/overview',
      ],
    },
    {
      type: 'category',
      label: 'Patterns',
      items: [
        'patterns/overview',
      ],
    },
  ],
};

export default sidebars;
