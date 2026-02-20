import type { ReactNode } from 'react';
import clsx from 'clsx';
import Heading from '@theme/Heading';
import styles from './styles.module.css';
import {
  FeatureCard,
  GradientCard,
  PatternCard,
  ActionCard,
} from '@site/src/components/cards';

type FeatureItem = {
  title: string;
  Svg: React.ComponentType<React.ComponentProps<'svg'>>;
  description: ReactNode;
};

const FeatureList: FeatureItem[] = [
  {
    title: 'Easy to Use',
    Svg: require('@site/static/img/undraw_docusaurus_mountain.svg').default,
    description: (
      <>
        Docusaurus was designed from the ground up to be easily installed and
        used to get your website up and running quickly.
      </>
    ),
  },
  {
    title: 'Focus on What Matters',
    Svg: require('@site/static/img/undraw_docusaurus_tree.svg').default,
    description: (
      <>
        Docusaurus lets you focus on your docs, and we&apos;ll do the chores. Go
        ahead and move your docs into the <code>docs</code> directory.
      </>
    ),
  },
  {
    title: 'Powered by React',
    Svg: require('@site/static/img/undraw_docusaurus_react.svg').default,
    description: (
      <>
        Extend or customize your website layout by reusing React. Docusaurus can
        be extended while reusing the same header and footer.
      </>
    ),
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} role="img" />
      </div>
      <div className="text--center padding-horiz--md">
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: '⚡',
    title: 'Fast Performance',
    description: 'Optimized rendering pipeline with zero layout shifts on page load.',
    accent: '#6366f1',
  },
  {
    icon: '🔒',
    title: 'Secure by Default',
    description: 'End-to-end encryption and hardened auth flows out of the box.',
    accent: '#10b981',
  },
  {
    icon: '🎨',
    title: 'Fully Themeable',
    description: 'Dark and light mode support with CSS custom properties throughout.',
    accent: '#f59e0b',
  },
  {
    icon: '♿',
    title: 'Accessible',
    description: 'WCAG 2.1 AA compliant with keyboard navigation and ARIA labels.',
    accent: '#ec4899',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const stats = [
  {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    icon: '🚀',
    stat: '12k',
    label: 'Total deploys',
    title: 'Deployments',
  },
  {
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    icon: '💖',
    stat: '98%',
    label: 'Uptime SLA',
    title: 'Reliability',
  },
  {
    gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    icon: '🌊',
    stat: '3.2ms',
    label: 'Avg latency',
    title: 'Performance',
  },
  {
    gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    icon: '📦',
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
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ACTION CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const actions = [
  {
    variant: 'default' as const,
    title: 'Get Started',
    description: 'Explore the full component library and integrate cards into your project.',
    cta: 'View docs',
    ctaHref: '/docs/intro',
  },
  {
    variant: 'success' as const,
    title: 'Deploy Ready',
    description: 'Your build passed all checks and is ready to ship to production.',
    cta: 'Deploy now',
    ctaHref: '#',
  },
  {
    variant: 'warning' as const,
    title: 'Update Available',
    description: 'A new version with security patches is available for your project.',
    cta: 'Update',
    ctaHref: '#',
  },
  {
    variant: 'danger' as const,
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
// MAIN EXPORT
// ─────────────────────────────────────────────────────────────────────────────
export default function HomepageFeatures(): ReactNode {
  return (
    <>
      <section className={styles.features}>
        <div className="container">
          <div className="row">
            {FeatureList.map((props, idx) => (
              <Feature key={idx} {...props} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature Cards ───────────────────────────────────────────────── */}
      <section className={styles.section} aria-label="Features">
        <div className="container">
          <SectionHeader
            label="Why choose us?"
            description="Everything you need to ship fast, stay secure, and scale."
          />
          <div className={styles.gridFour}>
            {features.map((f) => (
              <FeatureCard key={f.title} {...f} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Gradient Stat Cards ─────────────────────────────────────────── */}
      <section className={styles.section} aria-label="Key stats">
        <div className="container">
          <SectionHeader label="By the numbers" />
          <div className={styles.gridFour}>
            {stats.map((s) => (
              <GradientCard key={s.title} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Soroban Pattern Cards ───────────────────────────────────────── */}
      <section className={styles.section} aria-label="Soroban contract patterns">
        <div className="container">
          <SectionHeader
            label="Contract patterns"
            description="Expand any card to see working Soroban contract code examples."
          />
          <div className={styles.gridThree}>
            {patterns.map((p) => (
              <PatternCard key={p.contractName} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* ── Action Cards ────────────────────────────────────────────────── */}
      <section className={styles.section} aria-label="Actions">
        <div className="container">
          <SectionHeader label="Take action" />
          <div className={styles.gridFour}>
            {actions.map((a) => (
              <ActionCard key={a.title} {...a} />
            ))}
          </div>
        </div>
      </section>
    </>
  );
}