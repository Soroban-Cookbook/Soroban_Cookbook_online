// SPDX-License-Identifier: MIT
// Unit tests for freighterService.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as freighter from '@stellar/freighter-api';
import {
  checkFreighterInstalled,
  requestWalletAccess,
  getActiveNetwork,
} from '../services/freighterService';

describe('freighterService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkFreighterInstalled', () => {
    it('returns true when extension reports connected', async () => {
      vi.mocked(freighter.isConnected).mockResolvedValueOnce({ isConnected: true });
      expect(await checkFreighterInstalled()).toBe(true);
    });

    it('returns false when extension reports not connected', async () => {
      vi.mocked(freighter.isConnected).mockResolvedValueOnce({ isConnected: false });
      expect(await checkFreighterInstalled()).toBe(false);
    });

    it('returns false on unexpected error', async () => {
      vi.mocked(freighter.isConnected).mockRejectedValueOnce(new Error('Extension crash'));
      expect(await checkFreighterInstalled()).toBe(false);
    });
  });

  describe('requestWalletAccess', () => {
    it('returns address on successful access', async () => {
      vi.mocked(freighter.requestAccess).mockResolvedValueOnce({
        address: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
      } as Awaited<ReturnType<typeof freighter.requestAccess>>);

      const result = await requestWalletAccess();
      expect(result.address).toBe('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN');
      expect(result.error).toBeNull();
    });

    it('returns error when user denies access', async () => {
      vi.mocked(freighter.requestAccess).mockResolvedValueOnce({
        error: 'User rejected',
      } as Awaited<ReturnType<typeof freighter.requestAccess>>);

      const result = await requestWalletAccess();
      expect(result.address).toBeNull();
      expect(result.error).toBe('User rejected');
    });

    it('returns error on exception', async () => {
      vi.mocked(freighter.requestAccess).mockRejectedValueOnce(new Error('Extension error'));

      const result = await requestWalletAccess();
      expect(result.address).toBeNull();
      expect(result.error).toBe('Extension error');
    });
  });

  describe('getActiveNetwork', () => {
    it('identifies TESTNET from passphrase', async () => {
      vi.mocked(freighter.getNetwork).mockResolvedValueOnce({
        network: 'TESTNET',
        networkPassphrase: 'Test SDF Network ; September 2015',
      } as Awaited<ReturnType<typeof freighter.getNetwork>>);

      expect(await getActiveNetwork()).toBe('TESTNET');
    });

    it('identifies MAINNET from passphrase', async () => {
      vi.mocked(freighter.getNetwork).mockResolvedValueOnce({
        network: 'MAINNET',
        networkPassphrase: 'Public Global Stellar Network ; September 2015',
      } as Awaited<ReturnType<typeof freighter.getNetwork>>);

      expect(await getActiveNetwork()).toBe('MAINNET');
    });

    it('returns UNKNOWN for unrecognised passphrase', async () => {
      vi.mocked(freighter.getNetwork).mockResolvedValueOnce({
        network: 'FUTURENET',
        networkPassphrase: 'Some custom network',
      } as Awaited<ReturnType<typeof freighter.getNetwork>>);

      expect(await getActiveNetwork()).toBe('UNKNOWN');
    });

    it('returns UNKNOWN on error', async () => {
      vi.mocked(freighter.getNetwork).mockRejectedValueOnce(new Error('oops'));
      expect(await getActiveNetwork()).toBe('UNKNOWN');
    });
  });
});
