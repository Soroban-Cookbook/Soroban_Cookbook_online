// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

import { useWallet } from '../contexts/WalletContext';

export function StatusAlert() {
  const { status, statusMessage, clearStatus } = useWallet();

  if (status !== 'error' || !statusMessage) return null;

  return (
    <div className="alert alert--error" role="alert" aria-live="assertive">
      <strong>Wallet error: </strong>
      {statusMessage}
      <button
        className="alert__close"
        onClick={clearStatus}
        aria-label="Dismiss error"
      >
        ×
      </button>
    </div>
  );
}
