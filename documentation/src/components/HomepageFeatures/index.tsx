import type { ReactNode } from "react";
import clsx from "clsx";
import Heading from "@theme/Heading";
import styles from "./styles.module.css";
import {
  FeatureCard,
  GradientCard,
  PatternCard,
  ActionCard,
} from "@site/src/components/cards";

type FeatureItem = {
  title: string;
  icon: string;
  description: ReactNode;
  link: string;
};

const FeatureList: FeatureItem[] = [
  {
    title: "Smart Contracts",
    icon: "\u{1F4DC}",
    description: (
      <>
        Build secure, efficient smart contracts on Stellar using Soroban's
        Rust-based SDK. Deploy and invoke contracts with confidence.
      </>
    ),
    link: "/getting-started/first-contract",
  },
  {
    title: "Quick Setup",
    icon: "\u{26A1}",
    description: (
      <>
        Get up and running in minutes with the Soroban CLI and Rust toolchain.
        From installation to your first deployment, we've got you covered.
      </>
    ),
    link: "/getting-started/setup",
  },
  {
    title: "Core Concepts",
    icon: "\u{1F9E0}",
    description: (
      <>
        Understand the fundamentals of Soroban — from contract lifecycle and
        storage to authentication and cross-contract calls.
      </>
    ),
    link: "/concepts/overview",
  },
  {
    title: "Reusable Patterns",
    icon: "\u{1F504}",
    description: (
      <>
        Leverage battle-tested design patterns for token contracts, access
        control, upgradability, and more.
      </>
    ),
    link: "/patterns/overview",
  },
  {
    title: "Rust-Powered",
    icon: "\u{1F980}",
    description: (
      <>
        Harness Rust's memory safety and performance. Soroban contracts compile
        to WebAssembly for fast, predictable execution.
      </>
    ),
    link: "/getting-started/setup",
  },
  {
    title: "Stellar Network",
    icon: "\u{1F310}",
    description: (
      <>
        Tap into Stellar's global financial network. Build DeFi apps, issue
        assets, and interact with the Stellar ecosystem natively.
      </>
    ),
    link: "/concepts/overview",
  },
];

function Feature({ title, Svg, description }: FeatureItem) {
  return (
    <div className={clsx("col col--4")}>
      <Link to={link} className={styles.featureCardLink}>
        <div className={styles.featureCard}>
          <div className={styles.featureIcon}>{icon}</div>
          <Heading as="h3" className={styles.featureTitle}>
            {title}
          </Heading>
          <p className={styles.featureDescription}>{description}</p>
          <span className={styles.featureLearnMore}>Learn more &rarr;</span>
        </div>
      </Link>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FEATURE CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: "⚡",
    title: "Fast Performance",
    description:
      "Optimized rendering pipeline with zero layout shifts on page load.",
    accent: "#6366f1",
  },
  {
    icon: "🔒",
    title: "Secure by Default",
    description:
      "End-to-end encryption and hardened auth flows out of the box.",
    accent: "#10b981",
  },
  {
    icon: "🎨",
    title: "Fully Themeable",
    description:
      "Dark and light mode support with CSS custom properties throughout.",
    accent: "#f59e0b",
  },
  {
    icon: "♿",
    title: "Accessible",
    description:
      "WCAG 2.1 AA compliant with keyboard navigation and ARIA labels.",
    accent: "#ec4899",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GRADIENT CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const stats = [
  {
    gradient: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    icon: "🚀",
    stat: "12k",
    label: "Total deploys",
    title: "Deployments",
  },
  {
    gradient: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
    icon: "💖",
    stat: "98%",
    label: "Uptime SLA",
    title: "Reliability",
  },
  {
    gradient: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
    icon: "🌊",
    stat: "3.2ms",
    label: "Avg latency",
    title: "Performance",
  },
  {
    gradient: "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
    icon: "📦",
    stat: "240+",
    label: "Components",
    title: "Library",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SOROBAN PATTERN CARDS DATA
// ─────────────────────────────────────────────────────────────────────────────
const patterns = [
  {
    contractName: "hello_world",
    tag: "#storage",
    description:
      "A minimal contract demonstrating persistent storage and simple state management on Stellar.",
    code: `#[contractimpl]
impl HelloContract {
  pub fn hello(env: Env, to: String) -> Vec<String> {
    vec![&env, String::from_str(&env, "Hello"), to]
  }
}`,
  },
  {
    contractName: "token_contract",
    tag: "#token",
    description:
      "Implements the Soroban token interface with mint, burn, and transfer capabilities.",
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
    contractName: "timelock",
    tag: "#timelock",
    description:
      "Lock funds until a future ledger sequence — useful for vesting and escrow patterns.",
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
    variant: "default" as const,
    title: "Get Started",
    description:
      "Explore the full component library and integrate cards into your project.",
    cta: "View docs",
    ctaHref: "/docs/intro",
  },
  {
    variant: "success" as const,
    title: "Deploy Ready",
    description:
      "Your build passed all checks and is ready to ship to production.",
    cta: "Deploy now",
    ctaHref: "#",
  },
  {
    variant: "warning" as const,
    title: "Update Available",
    description:
      "A new version with security patches is available for your project.",
    cta: "Update",
    ctaHref: "#",
  },
  {
    variant: "danger" as const,
    title: "Danger Zone",
    description:
      "This action is irreversible. Please make sure you understand the impact.",
    cta: "Proceed",
    ctaHref: "#",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SECTION HEADER
// ─────────────────────────────────────────────────────────────────────────────
function SectionHeader({
  label,
  description,
}: {
  label: string;
  description?: string;
}) {
  return (
    <div className={styles.sectionHeader}>
      <h2 className={styles.sectionLabel}>{label}</h2>
      {description && (
        <p className={styles.sectionDescription}>{description}</p>
      )}
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
      <section
        className={styles.section}
        aria-label="Soroban contract patterns"
      >
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
