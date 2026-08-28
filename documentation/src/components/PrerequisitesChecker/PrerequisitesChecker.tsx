import React, { useEffect, useState } from 'react';
import clsx from 'clsx';
import styles from './PrerequisitesChecker.module.css';

export interface PrerequisiteItem {
  id: string;
  name: string;
  description: string;
  verifyCommand?: string;
  guideUrl?: string;
  optional?: boolean;
}

export const DEFAULT_PREREQUISITES: PrerequisiteItem[] = [
  {
    id: 'rust',
    name: 'Rust (stable)',
    description: 'Rust compiler and Cargo package manager for smart contract development. This cookbook has no rust-toolchain.toml; CI uses stable.',
    verifyCommand: 'rustc --version && cargo --version',
    guideUrl: '/docs/getting-started/setup#1-install-rust',
  },
  {
    id: 'stellar-cli',
    name: 'Stellar CLI',
    description: 'Command-line tool to build, simulate, and deploy Soroban contracts (`stellar`). Replaces the older `soroban` binary name.',
    verifyCommand: 'stellar --version',
    guideUrl: '/docs/getting-started/setup#2-install-stellar-cli',
  },
  {
    id: 'wasm-target',
    name: 'WASM Target (wasm32-unknown-unknown)',
    description: 'WebAssembly target used by this repository examples, CI, and scripts/test-examples.sh.',
    verifyCommand: 'rustup target list --installed',
    guideUrl: '/docs/getting-started/setup#3-add-the-wasm-target-required',
  },
  {
    id: 'git',
    name: 'Git',
    description: 'Version control system for cloning boilerplate and tracking code.',
    verifyCommand: 'git --version',
    optional: true,
  },
  {
    id: 'code-editor',
    name: 'Code Editor (VS Code / rust-analyzer)',
    description: 'Editor configured with rust-analyzer. Link examples/Cargo.toml when opening this repository.',
    optional: true,
  },
];

const STORAGE_KEY = 'soroban_prerequisites_checked_v1';

export interface PrerequisitesCheckerProps {
  prerequisites?: PrerequisiteItem[];
  className?: string;
  title?: string;
  description?: string;
}

export function PrerequisitesChecker({
  prerequisites = DEFAULT_PREREQUISITES,
  className,
  title = 'Prerequisites Readiness Checker',
  description = 'Verify that your local environment is configured with all required tools before building Soroban smart contracts.',
}: PrerequisitesCheckerProps) {
  const [checkedIds, setCheckedIds] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setCheckedIds(JSON.parse(stored));
      }
    } catch {
      // Ignore localStorage errors (e.g. privacy mode / SSR)
    }
  }, []);

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // Ignore localStorage errors
      }
      return next;
    });
  };

  const copyCommand = (id: string, command: string) => {
    if (!command) return;
    navigator.clipboard.writeText(command).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const requiredItems = prerequisites.filter((item) => !item.optional);
  const requiredCompletedCount = requiredItems.filter((item) => checkedIds[item.id]).length;
  const totalCompletedCount = prerequisites.filter((item) => checkedIds[item.id]).length;
  const isReady = requiredCompletedCount === requiredItems.length;

  const progressPercent = Math.round((requiredCompletedCount / (requiredItems.length || 1)) * 100);

  return (
    <div className={clsx(styles.container, className)} data-testid="prerequisites-checker">
      <div className={styles.header}>
        <div className={styles.titleRow}>
          <h3 className={styles.title}>{title}</h3>
          <span className={clsx(styles.badge, isReady ? styles.badgeReady : styles.badgePending)}>
            {isReady
              ? '✓ Ready for Development'
              : `${requiredCompletedCount}/${requiredItems.length} Required Ready`}
          </span>
        </div>
        <p className={styles.description}>{description}</p>
      </div>

      <div className={styles.progressContainer}>
        <div className={styles.progressBar}>
          <div
            className={clsx(styles.progressFill, isReady && styles.progressFillReady)}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className={styles.progressStats}>
          <span>{progressPercent}% Prerequisites Confirmed</span>
          <span>
            {totalCompletedCount} of {prerequisites.length} total items checked
          </span>
        </div>
      </div>

      <ul className={styles.list} aria-label="Prerequisites checklist">
        {prerequisites.map((item) => {
          const isChecked = !!checkedIds[item.id];
          return (
            <li
              key={item.id}
              className={clsx(styles.item, isChecked && styles.itemChecked)}
              data-testid={`prereq-item-${item.id}`}>
              <div className={styles.itemHeader}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleCheck(item.id)}
                    className={styles.checkbox}
                    aria-describedby={`desc-${item.id}`}
                  />
                  <span className={styles.itemName}>
                    {item.name}
                    {item.optional && <span className={styles.optionalTag}>Optional</span>}
                  </span>
                </label>
              </div>

              <p id={`desc-${item.id}`} className={styles.itemDescription}>
                {item.description}
              </p>

              <div className={styles.actionsRow}>
                {item.verifyCommand && (
                  <div className={styles.commandBox}>
                    <code className={styles.commandCode}>{item.verifyCommand}</code>
                    <button
                      type="button"
                      className={styles.copyBtn}
                      onClick={() => copyCommand(item.id, item.verifyCommand!)}
                      title="Copy verification command"
                      aria-label={`Copy command for ${item.name}`}>
                      {copiedId === item.id ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                )}

                {item.guideUrl && (
                  <a href={item.guideUrl} className={styles.guideLink}>
                    Guide →
                  </a>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
