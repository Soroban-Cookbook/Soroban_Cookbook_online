import React from 'react';
import Link from '@docusaurus/Link';
import clsx from 'clsx';

interface FeatureCard {
  title: string;
  description: string;
  icon: string;
  link: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

const features: FeatureCard[] = [
  {
    title: 'Getting Started',
    description: 'Set up your environment and deploy your first contract in 30 minutes',
    icon: '🎯',
    link: '/getting-started/what-is-soroban',
    difficulty: 'beginner',
  },
  {
    title: 'Core Concepts',
    description: 'Master authentication, storage, events, and error handling',
    icon: '📚',
    link: '/concepts/authentication',
    difficulty: 'beginner',
  },
  {
    title: 'Token Standards',
    description: 'Build fungible tokens, wrappers, and multi-token vaults',
    icon: '🪙',
    link: '/patterns/tokens/basic-token',
    difficulty: 'intermediate',
  },
  {
    title: 'DeFi Patterns',
    description: 'Escrow, timelocks, atomic swaps, and liquidity pools',
    icon: '💱',
    link: '/patterns/defi/escrow-contract',
    difficulty: 'intermediate',
  },
  {
    title: 'Governance',
    description: 'Voting systems, DAOs, and proposal mechanisms',
    icon: '🗳️',
    link: '/patterns/governance/simple-voting',
    difficulty: 'advanced',
  },
  {
    title: 'Advanced Patterns',
    description: 'Cross-contract calls, upgrades, and oracle integration',
    icon: '⚡',
    link: '/patterns/advanced/cross-contract-calls',
    difficulty: 'advanced',
  },
];

const difficultyBadges = {
  beginner: 'badge-beginner',
  intermediate: 'badge-intermediate',
  advanced: 'badge-advanced',
};

export default function FeatureCards(): JSX.Element {
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-12">
          What You'll Find Here
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Link
              key={feature.title}
              to={feature.link}
              className={clsx(
                'block p-6 rounded-lg border-2 border-gray-200 dark:border-gray-700',
                'hover:border-primary dark:hover:border-primary',
                'hover:shadow-lg transition-all duration-200',
                'no-underline group'
              )}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <div className="flex items-center gap-2 mb-2">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                  {feature.title}
                </h3>
                {feature.difficulty && (
                  <span className={difficultyBadges[feature.difficulty]}>
                    {feature.difficulty}
                  </span>
                )}
              </div>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
