// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

import { useWallet } from '../contexts/WalletContext';

export function NetworkBadge() {
  const { network, isConnected } = useWallet();
  if (!isConnected) return null;

  const label =
    network === 'TESTNET'
      ? 'Testnet'
      : network === 'MAINNET'
        ? 'Mainnet'
        : 'Unknown Network';

  const modifier =
    network === 'TESTNET'
      ? 'testnet'
      : network === 'MAINNET'
        ? 'mainnet'
        : 'unknown';

  return (
    <span className={`network-badge network-badge--${modifier}`} aria-label={`Connected to ${label}`}>
      {label}
    </span>
  );
}
