// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

import { WalletProvider } from './contexts/WalletContext';
import { WalletConnector } from './components/WalletConnector';
import { ContractInteraction } from './components/ContractInteraction';
import { NetworkBadge } from './components/NetworkBadge';
import { StatusAlert } from './components/StatusAlert';

/**
 * Root application component.
 *
 * Architecture:
 *   WalletProvider  – manages connection state, public key, and network
 *   WalletConnector – connect / disconnect UI
 *   NetworkBadge    – shows the active Stellar network
 *   ContractInteraction – increment / get / reset the Counter contract
 */
export default function App() {
  return (
    <WalletProvider>
      <div className="app-container">
        <header className="app-header">
          <h1 className="app-title">
            <span className="title-soroban">Soroban</span>{' '}
            <span className="title-counter">Counter</span>
          </h1>
          <p className="app-subtitle">
            A minimal React + Freighter wallet integration for the Soroban Cookbook{' '}
            <code>counter</code> contract.
          </p>
          <NetworkBadge />
        </header>

        <main className="app-main">
          <StatusAlert />
          <WalletConnector />
          <ContractInteraction />
        </main>

        <footer className="app-footer">
          <p>
            Source:{' '}
            <a
              href="https://github.com/Soroban-Cookbook/Soroban_Cookbook_online"
              target="_blank"
              rel="noopener noreferrer"
            >
              Soroban Cookbook
            </a>{' '}
            · Network: Stellar Testnet · SDK: @stellar/stellar-sdk + @stellar/freighter-api
          </p>
        </footer>
      </div>
    </WalletProvider>
  );
}
