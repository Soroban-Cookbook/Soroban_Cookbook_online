// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

/**
 * WalletContext
 *
 * Manages Freighter wallet connection state for the application.
 * Provides:
 *   - isConnected: whether the user has approved this origin
 *   - publicKey: the active Stellar public key (G...)
 *   - network: 'TESTNET' | 'MAINNET' | 'UNKNOWN'
 *   - connect(): request wallet access
 *   - disconnect(): clear local connection state
 *   - status / statusMessage: loading / error / idle / success feedback
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  checkFreighterInstalled,
  requestWalletAccess,
  getActiveNetwork,
  type WalletNetwork,
} from '../services/freighterService';

export type WalletStatus = 'idle' | 'loading' | 'error' | 'connected';

interface WalletState {
  isConnected: boolean;
  publicKey: string | null;
  network: WalletNetwork;
  status: WalletStatus;
  statusMessage: string | null;
  isFreighterInstalled: boolean | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  clearStatus: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [network, setNetwork] = useState<WalletNetwork>('UNKNOWN');
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isFreighterInstalled, setIsFreighterInstalled] = useState<boolean | null>(null);

  // Check if Freighter is installed on mount.
  // We do not auto-connect; the user must click "Connect Wallet".
  useEffect(() => {
    checkFreighterInstalled()
      .then((installed) => setIsFreighterInstalled(installed))
      .catch(() => setIsFreighterInstalled(false));
  }, []);

  const connect = useCallback(async () => {
    setStatus('loading');
    setStatusMessage(null);

    try {
      const { address, error: accessError } = await requestWalletAccess();
      if (accessError || !address) {
        throw new Error(accessError ?? 'Wallet access was not granted.');
      }

      const activeNetwork = await getActiveNetwork();
      setPublicKey(address);
      setNetwork(activeNetwork);
      setIsConnected(true);
      setStatus('connected');
      setStatusMessage(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error connecting wallet.';
      setStatus('error');
      setStatusMessage(message);
      setIsConnected(false);
      setPublicKey(null);
      setNetwork('UNKNOWN');
    }
  }, []);

  const disconnect = useCallback(() => {
    // Freighter does not expose a programmatic revoke-access API as of v4.
    // We clear local state only; the user can revoke in the extension UI.
    setIsConnected(false);
    setPublicKey(null);
    setNetwork('UNKNOWN');
    setStatus('idle');
    setStatusMessage(null);
  }, []);

  const clearStatus = useCallback(() => {
    setStatusMessage(null);
    if (status !== 'connected') setStatus('idle');
  }, [status]);

  return (
    <WalletContext.Provider
      value={{
        isConnected,
        publicKey,
        network,
        status,
        statusMessage,
        isFreighterInstalled,
        connect,
        disconnect,
        clearStatus,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
}

/** Hook that asserts WalletContext has been provided. */
export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error('useWallet must be used inside <WalletProvider>');
  }
  return ctx;
}
