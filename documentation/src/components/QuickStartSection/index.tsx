import React, { useState, useRef, useEffect } from 'react';
import Link from '@docusaurus/Link';
import { useColorMode } from '@docusaurus/theme-common';
import { Highlight, themes as prismThemes } from 'prism-react-renderer';
import accessibleGithubPrismTheme from '@site/src/theme/prismAccessibleGithub';
import { trackCopyCode } from '@site/src/utils/analytics';
import styles from './styles.module.css';

const SNIPPET = `#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, symbol_short};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    pub fn hello(env: Env, to: Symbol) -> Symbol {
        symbol_short!("Hello")
    }
}`;

type CopyState = 'idle' | 'success' | 'error';

const labelMap: Record<CopyState, string> = {
  idle: 'Copy',
  success: 'Copied!',
  error: 'Failed',
};

const ariaLabelMap: Record<CopyState, string> = {
  idle: 'Copy code',
  success: 'Code copied',
  error: 'Copy failed',
};

function CopyButton({ text }: { text: string }) {
  const [copyState, setCopyState] = useState<CopyState>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const handleClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState('success');
      trackCopyCode({ language: 'rust', section: 'quick_start' });
    } catch {
      setCopyState('error');
    }
    timerRef.current = setTimeout(() => {
      setCopyState('idle');
    }, 2000);
  };

  const isDisabled = copyState === 'success' || copyState === 'error';

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      aria-label={ariaLabelMap[copyState]}
      className={styles.copyButton}>
      {labelMap[copyState]}
    </button>
  );
}

export default function QuickStartSection() {
  const { colorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  // The stock github theme fails WCAG AA on its own code background; use the
  // contrast-corrected variant the docs prism config also uses.
  const selectedTheme = isDark ? prismThemes.vsDark : accessibleGithubPrismTheme;

  return (
    <section className={styles.section}>
      <h2>Quick Start</h2>
      <Highlight theme={selectedTheme} code={SNIPPET} language="rust">
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre className={`${className} ${styles.codeBlock}`} style={style}>
            <code>
              {tokens.map((line, i) => (
                <div key={i} {...getLineProps({ line })}>
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </div>
              ))}
            </code>
          </pre>
        )}
      </Highlight>
      <CopyButton text={SNIPPET} />
      <Link href="/docs/getting-started/setup" className={styles.ctaLink}>
        Read the full setup guide →
      </Link>
    </section>
  );
}
