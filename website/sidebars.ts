import type { SidebarsConfig } from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  gettingStartedSidebar: [
    {
      type: 'category',
      label: 'Getting Started',
      items: [
        'getting-started/what-is-soroban',
        'getting-started/environment-setup',
        'getting-started/first-contract',
        'getting-started/deploy-to-testnet',
      ],
    },
  ],

  conceptsSidebar: [
    {
      type: 'category',
      label: 'Core Concepts',
      items: [
        'concepts/authentication',
        'concepts/storage-patterns',
        'concepts/events-logging',
        'concepts/error-handling',
        'concepts/custom-types',
      ],
    },
  ],

  patternsSidebar: [
    {
      type: 'category',
      label: 'Pattern Library',
      items: [
        {
          type: 'category',
          label: 'Token Standards',
          items: [
            'patterns/tokens/basic-token',
            'patterns/tokens/token-wrapper',
            'patterns/tokens/multi-token-vault',
          ],
        },
        {
          type: 'category',
          label: 'DeFi Patterns',
          items: [
            'patterns/defi/escrow-contract',
            'patterns/defi/timelock-vault',
            'patterns/defi/atomic-swap',
            'patterns/defi/liquidity-pool',
          ],
        },
        {
          type: 'category',
          label: 'Governance',
          items: [
            'patterns/governance/simple-voting',
            'patterns/governance/weighted-dao',
            'patterns/governance/proposal-system',
          ],
        },
        {
          type: 'category',
          label: 'Advanced Patterns',
          items: [
            'patterns/advanced/cross-contract-calls',
            'patterns/advanced/upgradeable-contracts',
            'patterns/advanced/oracle-integration',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
