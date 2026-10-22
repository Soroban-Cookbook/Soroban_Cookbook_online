// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

/**
 * freighterService.ts
 *
 * Thin wrapper around @stellar/freighter-api that:
 *   - Provides a stable interface for the rest of the app
 *   - Normalises network names
 *   - Never throws; errors are returned in-band so callers can handle them
 *     without try/catch boilerplate
 *
 * Freighter docs: https://docs.freighter.app/
 * Package:        @stellar/freighter-api ^4.x
 */

import {
  isConnected,
  requestAccess,
  getAddress,
  getNetwork,
} from '@stellar/freighter-api';

export type WalletNetwork = 'TESTNET' | 'MAINNET' | 'UNKNOWN';

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Returns true when the Freighter extension is installed and responsive.
 * Does NOT request any permissions.
 */
export async function checkFreighterInstalled(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Pops up the Freighter permission dialog and returns the approved address.
 * Must be called from a user gesture (button click) or the browser may suppress
 * the popup.
 *
 * Returns { address, error } so callers can handle denial without try/catch.
 */
export async function requestWalletAccess(): Promise<{
  address: string | null;
  error: string | null;
}> {
  try {
    const result = await requestAccess();
    if (result.error) {
      return { address: null, error: result.error };
    }
    // requestAccess returns the address directly in the result object
    const addr = (result as { address?: string }).address ?? null;
    if (!addr) {
      // Fallback: retrieve address separately after access is granted
      const addrResult = await getAddress();
      if (addrResult.error || !addrResult.address) {
        return { address: null, error: addrResult.error ?? 'Could not retrieve address.' };
      }
      return { address: addrResult.address, error: null };
    }
    return { address: addr, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown Freighter error.';
    return { address: null, error: message };
  }
}

/**
 * Reads the currently active network from Freighter.
 * Returns a normalised WalletNetwork value.
 */
export async function getActiveNetwork(): Promise<WalletNetwork> {
  try {
    const result = await getNetwork();
    if (result.error) return 'UNKNOWN';
    const passphrase = result.networkPassphrase ?? '';
    if (passphrase.includes('Test SDF Network') || passphrase.includes('TESTNET')) {
      return 'TESTNET';
    }
    if (passphrase.includes('Public Global Stellar Network')) {
      return 'MAINNET';
    }
    return 'UNKNOWN';
  } catch {
    return 'UNKNOWN';
  }
}

/**
 * Returns the currently active Stellar public key without requesting
 * permissions. Returns null if access has not been granted.
 */
export async function getPublicKey(): Promise<string | null> {
  try {
    const result = await getAddress();
    if (result.error || !result.address) return null;
    return result.address;
  } catch {
    return null;
  }
}
