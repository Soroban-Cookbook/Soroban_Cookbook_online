import type { ReactNode } from 'react';
import React from 'react';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import { FeatureCard, PatternCard, ActionCard } from '@site/src/components/cards';
import { Icon } from '@site/src/components/UI/Icon';
import {
  Zap,
  Shield,
  Palette,
  Accessibility,
  Rocket,
  Heart,
  Waves,
  Package,
  BookOpen,
  Code,
  Clock,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const _features = [
  {
    icon: <Icon icon={Zap} size="lg" ariaLabel="Fast" />,
    title: 'Fast Performance',
    description: 'Optimized rendering pipeline with zero layout shifts on page load.',
    accent: '#6366f1',
  },
  {
    icon: <Icon icon={Shield} size="lg" ariaLabel="Secure" />,
    title: 'Secure by Default',
    description: 'End-to-end encryption and hardened auth flows out of the box.',
    accent: '#10b981',
  },
  {
    icon: <Icon icon={Palette} size="lg" ariaLabel="Themeable" />,
    title: 'Fully Themeable',
    description: 'Dark and light mode support with CSS custom properties throughout.',
    accent: '#f59e0b',
  },
  {
    icon: <Icon icon={Accessibility} size="lg" ariaLabel="Accessible" />,
    title: 'Accessible',
    description: 'WCAG 2.1 AA compliant with keyboard navigation and ARIA labels.',
    accent: '#ec4899',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const _stats = [
  {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: <Icon icon={Rocket} size="lg" ariaLabel="Deploys" />,
    stat: '12k',
    label: 'Total deploys',
    title: 'Deployments',
  },
  {
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    icon: <Icon icon={Heart} size="lg" ariaLabel="Uptime" />,
    stat: '98%',
    label: 'Uptime SLA',
    title: 'Reliability',
  },
  {
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: <Icon icon={Waves} size="lg" ariaLabel="Latency" />,
    stat: '3.2ms',
    label: 'Avg latency',
    title: 'Performance',
  },
  {
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    icon: <Icon icon={Package} size="lg" ariaLabel="Components" />,
    stat: '240+',
    label: 'Components',
    title: 'Library',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SOROBAN PATTERN CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const patterns = [
  {
    contractName: 'hello_world',
    tag: '#storage',
    description:
      'A minimal contract demonstrating persistent storage and simple state management on Stellar.',
    code: `#[contractimpl]
impl HelloContract {
  pub fn hello(env: Env, to: String) -> Vec<String> {
    vec![&env, String::from_str(&env, "Hello"), to]
  }
}`,
    icon: <Icon icon={BookOpen} size="sm" ariaLabel="Storage" />,
  },
  {
    contractName: 'token_contract',
    tag: '#token',
    description:
      'Implements the Soroban token interface with mint, burn, and transfer capabilities.',
    code: `pub fn transfer(
  env: Env,
  from: Address,
  to: Address,
  amount: i128,
) {
  from.require_auth();
  move_token(&env, &from, &to, amount);
}`,
    icon: <Icon icon={Code} size="sm" ariaLabel="Token" />,
  },
  {
    contractName: 'timelock',
    tag: '#timelock',
    description:
      'Lock funds until a future ledger sequence — useful for vesting and escrow patterns.',
    code: `pub fn claim(env: Env, claimant: Address) {
  claimant.require_auth();
  let unlock_time: u64 = env.storage()
    .instance().get(&DataKey::UnlockTime).unwrap();
  assert!(env.ledger().timestamp() >= unlock_time);
  // release funds...
}`,
    icon: <Icon icon={Clock} size="sm" ariaLabel="Timelock" />,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACTION CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const actions = [
  {
    variant: 'default' as const,
    icon: <Icon icon={BookOpen} size="sm" ariaLabel="Docs" />,
    title: 'Get Started',
    description: 'Explore the full component library and integrate cards into your project.',
    cta: 'View docs',
    ctaHref: '/docs/intro',
  },
  {
    variant: 'success' as const,
    icon: <Icon icon={CheckCircle} size="sm" ariaLabel="Ready" />,
    title: 'Deploy Ready',
    description: 'Your build passed all checks and is ready to ship to production.',
    cta: 'Deploy now',
    ctaHref: '#',
  },
  {
    variant: 'warning' as const,
    icon: <Icon icon={AlertTriangle} size="sm" ariaLabel="Update" />,
    title: 'Update Available',
    description: 'A new version with security patches is available for your project.',
    cta: 'Update',
    ctaHref: '#',
  },
  {
    variant: 'danger' as const,
    icon: <Icon icon={AlertTriangle} size="sm" ariaLabel="Danger" />,
    title: 'Danger Zone',
    description: 'This action is irreversible. Please make sure you understand the impact.',
    cta: 'Proceed',
    ctaHref: '#',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({ label, description }: { label: string; description?: string }) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionLabel}>{label}</h2>
      {description && <p className={styles.sectionDescription}>{description}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE LIST DATA
// ─────────────────────────────────────────────────────────────────────────────
const FeatureList = [
  {
    icon: <Icon icon={BookOpen} size="lg" ariaLabel="Smart Contracts" />,
    title: 'Smart Contracts',
    description:
      "Build secure, efficient smart contracts on Stellar using Soroban's " +
      'Rust-based SDK. Deploy and invoke contracts with confidence.',
    accent: '#6366f1',
    href: '/docs/getting-started/first-contract',
  },
  {
    icon: <Icon icon={Zap} size="lg" ariaLabel="Quick Setup" />,
    title: 'Quick Setup',
    description:
      'Get up and running in minutes with the Soroban CLI and Rust ' +
      'toolchain. From installation to your first deployment.',
    accent: '#10b981',
    href: '/docs/getting-started/setup',
  },
  {
    icon: <Icon icon={Code} size="lg" ariaLabel="Core Concepts" />,
    title: 'Core Concepts',
    description:
      'Understand the fundamentals of Soroban — from contract lifecycle and ' +
      'storage to authentication and cross-contract calls.',
    accent: '#8b5cf6',
    href: '/docs/concepts/overview',
  },
  {
    icon: <Icon icon={Package} size="lg" ariaLabel="Reusable Patterns" />,
    title: 'Reusable Patterns',
    description:
      'Leverage battle-tested design patterns for token contracts, access ' +
      'control, upgradability, and more.',
    accent: '#f59e0b',
    href: '/docs/patterns/overview',
  },
  {
    icon: <Icon icon={Shield} size="lg" ariaLabel="Rust-Powered" />,
    title: 'Rust-Powered',
    description:
      "Harness Rust's memory safety and performance. Soroban contracts compile " +
      'to WebAssembly for fast, predictable execution.',
    accent: '#ef4444',
    href: '/docs/getting-started/setup',
  },
  {
    icon: <Icon icon={Rocket} size="lg" ariaLabel="Stellar Network" />,
    title: 'Stellar Network',
    description:
      "Tap into Stellar's global financial network. Build DeFi apps, issue " +
      'assets, and interact with the ecosystem natively.',
    accent: '#0ea5e9',
    href: '/docs/concepts/overview',
  },
];

export default function HomepageFeatures(): ReactNode {
  return (
    <section className={styles.features}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionLabel}>
            Why Soroban Cookbook?
          </Heading>
          <p className={styles.sectionDescription}>
            Everything you need to build smart contracts on Stellar
          </p>
        </div>
        <div className={styles.gridThree}>
          {FeatureList.map((feature) => (
            <FeatureCard key={feature.title} {...feature} />
          ))}
        </div>

        {/* ── Soroban Pattern Cards ───────────────────────────────────────── */}
        <SectionHeader
          label="Contract patterns"
          description="Expand any card to see working Soroban contract code examples."
        />
        <div className={styles.gridThree}>
          {patterns.map((p) => (
            <PatternCard key={p.contractName} {...p} />
          ))}
        </div>

        {/* ── Action Cards ────────────────────────────────────────────────── */}
        <SectionHeader label="Take action" />
        <div className={styles.gridFour}>
          {actions.map((a) => (
            <ActionCard key={a.title} {...a} />
          ))}
        </div>
      </div>
    </section>
  );
}
