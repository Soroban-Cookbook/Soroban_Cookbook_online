// SPDX-License-Identifier: MIT
// Tests for ContractInteraction component
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ContractInteraction } from '../components/ContractInteraction';
import { WalletProvider } from '../contexts/WalletContext';
import * as counterService from '../services/counterService';

vi.mock('../services/counterService', () => ({
  readCounterValue: vi.fn().mockResolvedValue(0),
  incrementCounter: vi.fn(),
  resetCounter: vi.fn(),
  getContractId: vi.fn().mockReturnValue(''),
  getRpcUrl: vi.fn().mockReturnValue('https://soroban-testnet.stellar.org'),
}));

function renderWithProvider(ui: React.ReactElement) {
  return render(<WalletProvider>{ui}</WalletProvider>);
}

describe('ContractInteraction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(counterService.getRpcUrl).mockReturnValue(
      'https://soroban-testnet.stellar.org',
    );
    vi.mocked(counterService.readCounterValue).mockResolvedValue(0);
    vi.mocked(counterService.getContractId).mockReturnValue('');
  });

  it('renders the Counter Contract heading', async () => {
    renderWithProvider(<ContractInteraction />);
    expect(await screen.findByRole('heading', { name: /counter contract/i })).toBeInTheDocument();
  });

  it('displays RPC URL', async () => {
    renderWithProvider(<ContractInteraction />);
    expect(await screen.findByText(/soroban-testnet\.stellar\.org/i)).toBeInTheDocument();
  });

  it('shows missing contract ID warning when VITE_CONTRACT_ID is empty', async () => {
    renderWithProvider(<ContractInteraction />);
    // Query the warning alert specifically — VITE_CONTRACT_ID also appears in the metadata row
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent(/VITE_CONTRACT_ID/);
  });

  it('shows counter value fetched on mount', async () => {
    vi.mocked(counterService.readCounterValue).mockResolvedValueOnce(42);
    vi.mocked(counterService.getContractId).mockReturnValue(
      'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    );
    renderWithProvider(<ContractInteraction />);
    expect(await screen.findByText('42')).toBeInTheDocument();
  });

  it('increment button is disabled when wallet is not connected', async () => {
    vi.mocked(counterService.getContractId).mockReturnValue(
      'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    );
    renderWithProvider(<ContractInteraction />);
    // Accessible name comes from aria-label ("Increment counter")
    const incrementBtn = await screen.findByRole('button', { name: /increment counter/i });
    expect(incrementBtn).toBeDisabled();
  });

  it('reset button is disabled when wallet is not connected', async () => {
    vi.mocked(counterService.getContractId).mockReturnValue(
      'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAD2KM',
    );
    renderWithProvider(<ContractInteraction />);
    // Accessible name comes from aria-label ("Reset counter to zero")
    const resetBtn = await screen.findByRole('button', {
      name: /reset counter to zero/i,
    });
    expect(resetBtn).toBeDisabled();
  });

  it('shows hint text when wallet is not connected', async () => {
    renderWithProvider(<ContractInteraction />);
    expect(await screen.findByText(/connect your wallet/i)).toBeInTheDocument();
  });
});
