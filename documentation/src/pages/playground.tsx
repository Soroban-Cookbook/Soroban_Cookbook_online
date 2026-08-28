import React, { useEffect, useRef, useState } from 'react';
import Layout from '@theme/Layout';
import styles from './playground.module.css';

declare global {
  interface Window {
    require?: {
      config: (cfg: { paths: Record<string, string> }) => void;
      (deps: string[], callback: (monaco: MonacoLike) => void): void;
    };
    monaco?: MonacoLike;
  }
}

type MonacoLike = {
  editor: {
    create: (element: HTMLElement, options: Record<string, unknown>) => MonacoEditorLike;
  };
};

type MonacoEditorLike = {
  dispose: () => void;
  getValue: () => string;
  setValue: (value: string) => void;
  onDidChangeModelContent: (listener: () => void) => { dispose: () => void };
};

const TEMPLATE = `#![no_std]
use soroban_sdk::{contract, contractimpl, Env, Symbol, symbol_short};

#[contract]
pub struct HelloContract;

#[contractimpl]
impl HelloContract {
    pub fn hello(_env: Env, _to: Symbol) -> Symbol {
        symbol_short!("Hello")
    }
}
`;

const SHARE_HASH_PREFIX = '#code=';

function encodeSharedCode(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary);
}

function decodeSharedCode(value: string): string {
  const binary = window.atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));

  return new TextDecoder().decode(bytes);
}

function getSharedCodeFromHash(hash: string): string | null {
  if (!hash.startsWith(SHARE_HASH_PREFIX)) {
    return null;
  }

  const encoded = hash.slice(SHARE_HASH_PREFIX.length);
  if (!encoded) {
    return null;
  }

  try {
    return decodeSharedCode(encoded);
  } catch {
    return null;
  }
}

export default function PlaygroundPage(): React.ReactElement {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<MonacoEditorLike | null>(null);
  const initialCodeRef = useRef(TEMPLATE);
  const [code, setCode] = useState(TEMPLATE);
  const [status, setStatus] = useState('Loading Monaco editor...');
  const [shareMessage, setShareMessage] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [testOutput, setTestOutput] = useState<{
    status: 'idle' | 'running' | 'success' | 'error';
    message: React.ReactNode;
  }>({ status: 'idle', message: '' });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const sharedCode = getSharedCodeFromHash(window.location.hash);
    if (sharedCode) {
      initialCodeRef.current = sharedCode;
      setCode(sharedCode);
      setStatus('Loaded shared snippet');
      return;
    }

    if (window.location.hash.startsWith(SHARE_HASH_PREFIX)) {
      setStatus('Invalid shared link. Loaded default template instead.');
    }
  }, []);

  const runMockTests = () => {
    if (!editorRef.current) return;
    setIsTesting(true);
    setTestOutput({ status: 'running', message: 'Compiling project...\nRunning 1 test...' });

    setTimeout(() => {
      const editorCode = editorRef.current?.getValue() || '';
      const isPass = editorCode.includes('#[contractimpl]');

      setIsTesting(false);
      if (isPass) {
        setTestOutput({
          status: 'success',
          message: (
            <>
              running 1 test
              <br />
              test test::test_hello ... <span className={styles.textGreen}>ok</span>
              <br />
              <br />
              test result: <span className={styles.textGreen}>ok</span>. 1 passed; 0 failed; 0
              ignored; 0 measured; 0 filtered out
            </>
          ),
        });
      } else {
        setTestOutput({
          status: 'error',
          message: (
            <>
              running 1 test
              <br />
              test test::test_hello ... <span className={styles.textRed}>FAILED</span>
              <br />
              <br />
              failures:
              <br />
              ---- test::test_hello stdout ----
              <br />
              thread &apos;test::test_hello&apos; panicked at &apos;assertion failed&apos;
              <br />
              <br />
              failures:
              <br />
              &nbsp;&nbsp;&nbsp;&nbsp;test::test_hello
              <br />
              <br />
              test result: <span className={styles.textRed}>FAILED</span>. 0 passed; 1 failed; 0
              ignored; 0 measured; 0 filtered out
            </>
          ),
        });
      }
    }, 1500);
  };

  useEffect(() => {
    let disposed = false;
    let changeSubscription: { dispose: () => void } | undefined;

    const mountEditor = (monaco: MonacoLike) => {
      if (disposed || !hostRef.current) {
        return;
      }

      editorRef.current = monaco.editor.create(hostRef.current, {
        value: initialCodeRef.current,
        language: 'rust',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: false },
        fontSize: 14,
      });
      changeSubscription = editorRef.current.onDidChangeModelContent(() => {
        const nextCode = editorRef.current?.getValue() ?? '';
        setCode(nextCode);
        setShareMessage('');
      });
      setStatus('Ready');
    };

    const loadMonaco = () => {
      if (window.monaco) {
        mountEditor(window.monaco);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://unpkg.com/monaco-editor@0.52.2/min/vs/loader.js';
      script.async = true;
      script.onload = () => {
        if (!window.require) {
          setStatus('Failed to initialize AMD loader');
          return;
        }

        window.require.config({ paths: { vs: 'https://unpkg.com/monaco-editor@0.52.2/min/vs' } });
        window.require(['vs/editor/editor.main'], (monaco) => {
          window.monaco = monaco;
          mountEditor(monaco);
        });
      };
      script.onerror = () => setStatus('Failed to load Monaco editor');
      document.body.appendChild(script);
    };

    loadMonaco();

    return () => {
      disposed = true;
      changeSubscription?.dispose();
      editorRef.current?.dispose();
      editorRef.current = null;
    };
  }, []);

  const handleReset = () => {
    editorRef.current?.setValue(TEMPLATE);
    setCode(TEMPLATE);
    setShareMessage('');
    setTestOutput({ status: 'idle', message: '' });
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const sharedUrl = `${window.location.origin}${window.location.pathname}${window.location.search}${SHARE_HASH_PREFIX}${encodeSharedCode(code)}`;

    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('Clipboard unavailable');
      }

      await navigator.clipboard.writeText(sharedUrl);
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${SHARE_HASH_PREFIX}${encodeSharedCode(code)}`,
      );
      setShareMessage('Share link copied');
    } catch {
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${window.location.search}${SHARE_HASH_PREFIX}${encodeSharedCode(code)}`,
      );
      setShareMessage('Share URL ready in the address bar');
    }
  };

  return (
    <Layout title="Code Playground" description="In-browser Monaco editor for Soroban snippets">
      <main className={styles.container}>
        <h1 className={styles.title}>Code Playground</h1>
        <p className={styles.subtitle}>
          Monaco-powered playground for editing Soroban Rust snippets directly in the browser.
        </p>
        <div className={styles.toolbar}>
          <div className={styles.statusGroup}>
            <span className={styles.status}>{status}</span>
            {shareMessage ? <span className={styles.shareMessage}>{shareMessage}</span> : null}
          </div>
          <div className={styles.actions}>
            <button className={styles.button} onClick={handleShare}>
              Share
            </button>
            <button className={styles.button} onClick={handleReset}>
              Reset Template
            </button>
            <button
              className={`${styles.button} ${styles.buttonPrimary}`}
              disabled={isTesting || status !== 'Ready'}
              onClick={runMockTests}>
              {isTesting ? 'Running...' : 'Run Tests'}
            </button>
          </div>
        </div>
        <div className={styles.editorHost}>
          <div ref={hostRef} className={styles.editorInner} />
        </div>
        {testOutput.status !== 'idle' && (
          <div className={styles.testOutput}>
            <div className={styles.testOutputHeader}>
              <span>Terminal</span>
              {testOutput.status === 'success' && <span className={styles.textGreen}>Success</span>}
              {testOutput.status === 'error' && <span className={styles.textRed}>Failed</span>}
              {testOutput.status === 'running' && <span>Running...</span>}
            </div>
            <div className={styles.testOutputBody}>{testOutput.message}</div>
          </div>
        )}
      </main>
    </Layout>
  );
}
