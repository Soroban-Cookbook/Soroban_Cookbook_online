// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

/**
 * ecosystemData.ts
 *
 * Structured data for the Soroban ecosystem map.
 *
 * MAINTENANCE GUIDE
 * -----------------
 * 1. To add an entry: append to the relevant category's `items` array.
 * 2. To update a link: change the `url` field and bump `lastVerified`.
 * 3. To mark a project inactive: set `status: "inactive"` — do not delete.
 * 4. To remove a dead project: set `status: "removed"` and add a note.
 * 5. Bump `ECOSYSTEM_DATA_VERSION` whenever categories or items change.
 * 6. Set `lastUpdated` to today's date (ISO 8601) after editing.
 *
 * Status values:
 *   "active"   — verified and maintained
 *   "beta"     — publicly accessible but pre-stable
 *   "inactive" — appears abandoned or unreachable; keep for historical record
 *   "proposed" — planned but not yet shipped; links may be absent
 */

export type ProjectStatus = 'active' | 'beta' | 'inactive' | 'proposed';

export interface EcosystemEntry {
  /** Short identifier used for filtering and linking (slug style) */
  id: string;
  /** Display name */
  name: string;
  /** One-sentence description. Be factual; avoid superlatives. */
  description: string;
  /** Primary URL — must be a real, verified URL (or empty string for proposed entries) */
  url: string;
  /** Optional secondary URL (e.g. GitHub, docs) */
  docsUrl?: string;
  /** Whether this is the Soroban Cookbook itself */
  isCookbook?: boolean;
  /** Current project status */
  status: ProjectStatus;
  /** ISO 8601 date the URL and description were last verified */
  lastVerified: string;
  /** Free-form tags for additional filtering */
  tags?: string[];
}

export interface EcosystemCategory {
  id: string;
  label: string;
  /** Short description shown above the category's entry grid */
  description: string;
  /** Icon name (emoji used as fallback icon) */
  icon: string;
  items: EcosystemEntry[];
}

export const ECOSYSTEM_DATA_VERSION = '1.1.0';

/**
 * Last date the complete dataset was reviewed.
 * Update whenever entries are added, corrected, or marked inactive.
 */
export const ECOSYSTEM_LAST_UPDATED = '2026-10-21';

export const ECOSYSTEM_CATEGORIES: EcosystemCategory[] = [
  // ── Developer Tooling ──────────────────────────────────────────────────
  {
    id: 'tooling',
    label: 'Developer Tooling',
    description:
      'CLIs, SDKs, testing frameworks, and build tools for writing and deploying Soroban contracts.',
    icon: '🛠️',
    items: [
      {
        id: 'stellar-cli',
        name: 'Stellar CLI',
        description:
          'Official command-line tool for building, deploying, and invoking Soroban smart contracts.',
        url: 'https://github.com/stellar/stellar-cli',
        docsUrl: 'https://developers.stellar.org/docs/tools/cli',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'cli', 'deploy'],
      },
      {
        id: 'stellar-sdk-js',
        name: '@stellar/stellar-sdk (JS/TS)',
        description:
          'Official JavaScript/TypeScript SDK for building transactions, interacting with Soroban RPC, and signing with Freighter.',
        url: 'https://github.com/stellar/js-stellar-sdk',
        docsUrl: 'https://stellar.github.io/js-stellar-sdk/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'sdk', 'typescript', 'javascript'],
      },
      {
        id: 'soroban-sdk-rs',
        name: 'soroban-sdk (Rust)',
        description:
          'Official Rust SDK for writing Soroban smart contracts, including test utilities and contract macros.',
        url: 'https://github.com/stellar/rs-soroban-sdk',
        docsUrl: 'https://docs.rs/soroban-sdk',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'sdk', 'rust'],
      },
      {
        id: 'soroban-env-rs',
        name: 'soroban-env-host (Rust)',
        description:
          'Host environment for executing Soroban contracts — used internally by the Stellar Core and the Soroban SDK test harness.',
        url: 'https://github.com/stellar/rs-soroban-env',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'runtime', 'rust'],
      },
      {
        id: 'stellar-sdk-python',
        name: 'py-stellar-base (Python)',
        description:
          'Python SDK for Stellar and Soroban with XDR serialisation, transaction building, and RPC support.',
        url: 'https://github.com/StellarCN/py-stellar-base',
        docsUrl: 'https://stellar-base.readthedocs.io/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['sdk', 'python'],
      },
      {
        id: 'soroban-react',
        name: 'soroban-react',
        description:
          'React hooks library for connecting wallets and calling Soroban contracts from React applications.',
        url: 'https://github.com/paltalabs/soroban-react',
        status: 'beta',
        lastVerified: '2026-10-21',
        tags: ['sdk', 'react', 'hooks'],
      },
      {
        id: 'soroban-cookbook-example',
        name: 'Soroban Cookbook (this project)',
        description:
          'Educational repository of working, tested Soroban smart contract patterns, organised by use-case. Includes a React frontend integration example.',
        url: 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online',
        docsUrl: 'https://soroban-cookbook.github.io/Soroban_Cookbook_online/',
        isCookbook: true,
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['education', 'examples', 'patterns', 'react'],
      },
    ],
  },

  // ── Wallets ────────────────────────────────────────────────────────────
  {
    id: 'wallets',
    label: 'Wallets',
    description:
      'Browser extensions and mobile wallets that support signing Soroban transactions.',
    icon: '👛',
    items: [
      {
        id: 'freighter',
        name: 'Freighter',
        description:
          'Official SDF-maintained browser extension wallet for Stellar and Soroban. Supports transaction signing without exposing private keys to dapps.',
        url: 'https://www.freighter.app/',
        docsUrl: 'https://docs.freighter.app/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'browser-extension', 'signing'],
      },
      {
        id: 'lobstr',
        name: 'LOBSTR',
        description:
          'Mobile and web wallet for Stellar with Soroban transaction support.',
        url: 'https://lobstr.co/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['mobile', 'web'],
      },
      {
        id: 'xbull',
        name: 'xBull Wallet',
        description:
          'Browser extension wallet with hardware wallet support and Soroban contract interaction.',
        url: 'https://xbull.app/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['browser-extension', 'hardware-wallet'],
      },
      {
        id: 'rabet',
        name: 'Rabet',
        description:
          'Browser extension wallet for Stellar and Soroban with support for multiple accounts.',
        url: 'https://rabet.io/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['browser-extension'],
      },
    ],
  },

  // ── Infrastructure & RPC ──────────────────────────────────────────────
  {
    id: 'infrastructure',
    label: 'Infrastructure & RPC',
    description:
      'RPC providers, explorers, indexers, and network access services for Soroban dapps.',
    icon: '🏗️',
    items: [
      {
        id: 'stellar-rpc',
        name: 'Stellar RPC (SDF public)',
        description:
          'SDF-operated public Soroban RPC endpoint for Testnet development. No API key required for low-volume usage.',
        url: 'https://soroban-testnet.stellar.org',
        docsUrl: 'https://developers.stellar.org/docs/data/rpc',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'rpc', 'testnet'],
      },
      {
        id: 'horizon',
        name: 'Stellar Horizon',
        description:
          'HTTP API gateway for the Stellar network, providing ledger data, transaction history, and account info alongside Soroban RPC.',
        url: 'https://developers.stellar.org/docs/data/horizon',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'api', 'indexer'],
      },
      {
        id: 'stellar-expert',
        name: 'Stellar Expert',
        description:
          'Block explorer for Stellar and Soroban with contract inspection, transaction history, and account analytics.',
        url: 'https://stellar.expert/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['explorer', 'analytics'],
      },
      {
        id: 'stellar-laboratory',
        name: 'Stellar Laboratory',
        description:
          'Interactive browser-based tool for building, signing, and submitting Stellar and Soroban transactions.',
        url: 'https://laboratory.stellar.org/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'devtools', 'testing'],
      },
      {
        id: 'subquery',
        name: 'SubQuery (Stellar indexer)',
        description:
          'Decentralised indexing protocol with support for indexing Stellar and Soroban event data into custom GraphQL APIs.',
        url: 'https://subquery.network/',
        status: 'beta',
        lastVerified: '2026-10-21',
        tags: ['indexer', 'graphql'],
      },
    ],
  },

  // ── Protocols & DeFi ──────────────────────────────────────────────────
  {
    id: 'protocols',
    label: 'Protocols & DeFi',
    description:
      'On-chain protocols built with Soroban contracts, including DEXes, lending, stablecoins, and bridges.',
    icon: '⚙️',
    items: [
      {
        id: 'soroswap',
        name: 'Soroswap',
        description:
          'Automated market maker (AMM) DEX built on Soroban, implementing constant-product liquidity pools.',
        url: 'https://soroswap.finance/',
        docsUrl: 'https://docs.soroswap.finance/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['dex', 'amm', 'defi'],
      },
      {
        id: 'blend',
        name: 'Blend Protocol',
        description:
          'Lending and borrowing protocol on Soroban with isolated risk pools and backstop modules.',
        url: 'https://blend.capital/',
        docsUrl: 'https://docs.blend.capital/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['lending', 'defi'],
      },
      {
        id: 'phoenix',
        name: 'Phoenix Protocol',
        description:
          'DeFi protocol on Soroban providing a multihop DEX and liquidity incentives.',
        url: 'https://phoenix-hub.io/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['dex', 'defi', 'liquidity'],
      },
      {
        id: 'comet',
        name: 'Comet',
        description:
          'Balancer-style weighted AMM pools for Soroban with multi-token liquidity.',
        url: 'https://github.com/CometDEX/comet-contracts-v1',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['dex', 'amm', 'defi'],
      },
    ],
  },

  // ── Learning Resources ────────────────────────────────────────────────
  {
    id: 'learning',
    label: 'Learning Resources',
    description:
      'Official documentation, tutorials, videos, and courses for learning Soroban development.',
    icon: '📚',
    items: [
      {
        id: 'soroban-cookbook',
        name: 'Soroban Cookbook',
        description:
          'Comprehensive collection of annotated, tested smart contract patterns for Soroban developers — the site you are on right now.',
        url: 'https://soroban-cookbook.github.io/Soroban_Cookbook_online/',
        docsUrl: 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online',
        isCookbook: true,
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['patterns', 'education', 'examples'],
      },
      {
        id: 'stellar-docs',
        name: 'Stellar Developer Docs',
        description:
          'Official documentation from the Stellar Development Foundation covering Soroban concepts, guides, and API references.',
        url: 'https://developers.stellar.org/docs/smart-contracts',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['official', 'documentation'],
      },
      {
        id: 'soroban-by-example',
        name: 'Soroban by Example',
        description:
          'Short, focused Soroban contract examples inspired by the "X by Example" format. Upstream GitHub repository is archived; the site remains readable.',
        url: 'https://www.sorobanexamples.xyz/',
        docsUrl: 'https://github.com/daccred/soroban-by-example',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['examples', 'education'],
      },
      {
        id: 'stellar-quest',
        name: 'Stellar Quest',
        description:
          'Interactive coding challenges for learning Stellar and Soroban by completing on-chain tasks.',
        url: 'https://quest.stellar.org/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['interactive', 'challenges', 'education'],
      },
    ],
  },

  // ── Community ─────────────────────────────────────────────────────────
  {
    id: 'community',
    label: 'Community',
    description:
      'Forums, chat servers, and community organisations where Soroban developers share knowledge.',
    icon: '🤝',
    items: [
      {
        id: 'stellar-discord',
        name: 'Stellar Dev Discord',
        description:
          'Primary chat community for Stellar and Soroban developers. The #soroban channel is the main hub for contract development questions.',
        url: 'https://discord.gg/stellardev',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['chat', 'official'],
      },
      {
        id: 'stellar-developers',
        name: 'Stellar Developers Forum',
        description:
          'Official discussion forum for Stellar ecosystem technical topics, proposals, and announcements.',
        url: 'https://developers.stellar.org/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['forum', 'official'],
      },
      {
        id: 'scf',
        name: 'Stellar Community Fund (SCF)',
        description:
          'Grant programme funding projects that build on the Stellar network, including Soroban dapps and tooling.',
        url: 'https://communityfund.stellar.org/',
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['grants', 'funding'],
      },
      {
        id: 'cookbook-issues',
        name: 'Soroban Cookbook Issues',
        description:
          'GitHub issue tracker for the Soroban Cookbook — report bugs, request patterns, and claim open tasks. GitHub Discussions are not currently enabled on the repository.',
        url: 'https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/issues',
        isCookbook: true,
        status: 'active',
        lastVerified: '2026-10-21',
        tags: ['forum', 'cookbook'],
      },
    ],
  },
];

/** Flat list of all entries across all categories — useful for global search. */
export const ALL_ECOSYSTEM_ENTRIES: (EcosystemEntry & { categoryId: string })[] =
  ECOSYSTEM_CATEGORIES.flatMap((cat) =>
    cat.items.map((item) => ({ ...item, categoryId: cat.id })),
  );
