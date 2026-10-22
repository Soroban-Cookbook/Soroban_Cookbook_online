// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

import { useWallet } from '../contexts/WalletContext';

function truncateKey(key: string): string {
  return `${key.slice(0, 6)}…${key.slice(-4)}`;
}

export function WalletConnector() {
  const { isConnected, publicKey, status, connect, disconnect, isFreighterInstalled } =
    useWallet();

  if (isFreighterInstalled === false) {
    return (
      <div className="wallet-card wallet-card--warning" role="alert">
        <h2 className="wallet-card__title">Freighter Not Detected</h2>
        <p>
          This example requires the{' '}
          <a
            href="https://www.freighter.app/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Freighter browser extension
          </a>{' '}
          to sign transactions. Install it, reload this page, and switch to{' '}
          <strong>Test Net</strong> inside the extension.
        </p>
        <a
          href="https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn--primary"
        >
          Install Freighter
        </a>
      </div>
    );
  }

  if (isConnected && publicKey) {
    return (
      <div className="wallet-card wallet-card--connected">
        <div className="wallet-card__header">
          <span className="wallet-dot wallet-dot--green" aria-hidden="true" />
          <h2 className="wallet-card__title">Wallet Connected</h2>
        </div>
        <p className="wallet-card__address" title={publicKey}>
          <span className="address-label">Public Key: </span>
          <code>{truncateKey(publicKey)}</code>
        </p>
        <button
          className="btn btn--secondary"
          onClick={disconnect}
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="wallet-card">
      <h2 className="wallet-card__title">Connect Your Wallet</h2>
      <p>
        Connect Freighter to sign transactions on <strong>Stellar Testnet</strong>.
        Make sure the extension is set to <em>Test Net</em> before connecting.
      </p>
      <button
        className="btn btn--primary"
        onClick={connect}
        disabled={status === 'loading'}
        aria-busy={status === 'loading'}
        aria-label="Connect Freighter wallet"
      >
        {status === 'loading' ? 'Connecting…' : 'Connect Wallet'}
      </button>
    </div>
  );
}
