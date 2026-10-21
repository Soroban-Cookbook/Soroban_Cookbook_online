// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook
import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import {
  readCounterValue,
  incrementCounter,
  resetCounter,
  getContractId,
  getRpcUrl,
} from '../services/counterService';

type ActionStatus = 'idle' | 'loading' | 'error' | 'success';

export function ContractInteraction() {
  const { isConnected, publicKey, network } = useWallet();

  const [counterValue, setCounterValue] = useState<number | null>(null);
  const [actionStatus, setActionStatus] = useState<ActionStatus>('idle');
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const contractId = getContractId();
  const rpcUrl = getRpcUrl();

  const fetchValue = useCallback(async () => {
    if (!contractId) return;
    try {
      const value = await readCounterValue();
      setCounterValue(value);
    } catch {
      // Non-blocking — counter display just shows "–" on failure
    }
  }, [contractId]);

  useEffect(() => {
    fetchValue();
  }, [fetchValue]);

  async function handleIncrement() {
    if (!publicKey) return;
    setActionStatus('loading');
    setActionMessage(null);
    try {
      const newValue = await incrementCounter(publicKey);
      setCounterValue(newValue);
      setActionStatus('success');
      setActionMessage(`Counter incremented → ${newValue}`);
    } catch (err) {
      setActionStatus('error');
      setActionMessage(err instanceof Error ? err.message : 'Unknown error during increment.');
    }
  }

  async function handleReset() {
    if (!publicKey) return;
    setActionStatus('loading');
    setActionMessage(null);
    try {
      await resetCounter(publicKey);
      setCounterValue(0);
      setActionStatus('success');
      setActionMessage('Counter reset to 0.');
    } catch (err) {
      setActionStatus('error');
      setActionMessage(err instanceof Error ? err.message : 'Unknown error during reset.');
    }
  }

  const isTestnet = network === 'TESTNET';
  const wrongNetwork = isConnected && !isTestnet;

  return (
    <section className="contract-section" aria-labelledby="contract-section-title">
      <h2 id="contract-section-title" className="section-title">
        Counter Contract
      </h2>

      {/* Contract metadata */}
      <div className="contract-meta">
        <p>
          <span className="meta-label">Contract ID: </span>
          <code className="meta-value">
            {contractId || <em>Not configured — set VITE_CONTRACT_ID in .env</em>}
          </code>
        </p>
        <p>
          <span className="meta-label">RPC: </span>
          <code className="meta-value">{rpcUrl}</code>
        </p>
      </div>

      {/* Current value */}
      <div className="counter-display" aria-live="polite" aria-atomic="true">
        <span className="counter-label">Current value</span>
        <span className="counter-value">
          {counterValue !== null ? counterValue : '–'}
        </span>
        <button
          className="btn btn--ghost btn--small"
          onClick={fetchValue}
          aria-label="Refresh counter value"
          title="Refresh"
        >
          ↻
        </button>
      </div>

      {/* Network mismatch warning */}
      {wrongNetwork && (
        <div className="alert alert--warning" role="alert">
          Switch Freighter to <strong>Test Net</strong> before sending transactions.
        </div>
      )}

      {/* Missing contract id */}
      {!contractId && (
        <div className="alert alert--warning" role="alert">
          <strong>VITE_CONTRACT_ID</strong> is not set. Copy <code>.env.example</code> to{' '}
          <code>.env</code> and add your deployed counter contract address to enable
          write operations.
        </div>
      )}

      {/* Action feedback */}
      {actionMessage && (
        <div
          className={`alert alert--${actionStatus === 'error' ? 'error' : 'success'}`}
          role="alert"
          aria-live="assertive"
        >
          {actionMessage}
        </div>
      )}

      {/* Actions */}
      <div className="contract-actions">
        <button
          className="btn btn--primary"
          onClick={handleIncrement}
          disabled={!isConnected || !contractId || actionStatus === 'loading' || wrongNetwork}
          aria-label="Increment counter"
        >
          {actionStatus === 'loading' ? 'Waiting for signature…' : 'Increment'}
        </button>

        <button
          className="btn btn--danger"
          onClick={handleReset}
          disabled={!isConnected || !contractId || actionStatus === 'loading' || wrongNetwork}
          aria-label="Reset counter to zero"
        >
          Reset to 0
        </button>
      </div>

      {!isConnected && (
        <p className="hint">Connect your wallet above to send transactions.</p>
      )}
    </section>
  );
}
