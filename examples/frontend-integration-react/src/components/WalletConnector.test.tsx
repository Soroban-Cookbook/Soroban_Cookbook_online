// SPDX-License-Identifier: MIT
// Tests for WalletConnector component
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WalletConnector } from '../components/WalletConnector';
import { WalletProvider } from '../contexts/WalletContext';
import * as freighter from '@stellar/freighter-api';

function renderWithProvider(ui: React.ReactElement) {
  return render(<WalletProvider>{ui}</WalletProvider>);
}

describe('WalletConnector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: extension installed, not yet connected
    vi.mocked(freighter.isConnected).mockResolvedValue({ isConnected: true });
  });

  it('renders install prompt when Freighter is not detected', async () => {
    vi.mocked(freighter.isConnected).mockResolvedValueOnce({ isConnected: false });

    renderWithProvider(<WalletConnector />);

    // Wait for async isConnected check
    const heading = await screen.findByRole('heading', {
      name: /freighter not detected/i,
    });
    expect(heading).toBeInTheDocument();
  });

  it('renders connect button when Freighter is installed', async () => {
    vi.mocked(freighter.isConnected).mockResolvedValueOnce({ isConnected: true });

    renderWithProvider(<WalletConnector />);

    // Accessible name comes from aria-label ("Connect Freighter wallet")
    const button = await screen.findByRole('button', {
      name: /connect freighter wallet/i,
    });
    expect(button).toBeInTheDocument();
    expect(button).not.toBeDisabled();
  });

  it('shows loading state while connecting', async () => {
    vi.mocked(freighter.isConnected).mockResolvedValueOnce({ isConnected: true });
    // requestAccess never resolves to keep the loading state
    vi.mocked(freighter.requestAccess).mockReturnValueOnce(new Promise(() => {}));

    renderWithProvider(<WalletConnector />);

    const button = await screen.findByRole('button', {
      name: /connect freighter wallet/i,
    });
    fireEvent.click(button);

    // Button label switches to loading text (aria-label stays constant)
    await vi.waitFor(() => {
      expect(button).toHaveTextContent(/connecting/i);
    });
    expect(button).toBeDisabled();
  });

  it('shows connected state with truncated public key after successful connection', async () => {
    vi.mocked(freighter.isConnected).mockResolvedValueOnce({ isConnected: true });
    vi.mocked(freighter.requestAccess).mockResolvedValueOnce({
      address: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    } as Awaited<ReturnType<typeof freighter.requestAccess>>);
    vi.mocked(freighter.getNetwork).mockResolvedValueOnce({
      network: 'TESTNET',
      networkPassphrase: 'Test SDF Network ; September 2015',
    } as Awaited<ReturnType<typeof freighter.getNetwork>>);

    renderWithProvider(<WalletConnector />);

    const connectBtn = await screen.findByRole('button', {
      name: /connect freighter wallet/i,
    });
    fireEvent.click(connectBtn);

    const heading = await screen.findByRole('heading', { name: /wallet connected/i });
    expect(heading).toBeInTheDocument();

    const disconnectBtn = screen.getByRole('button', { name: /disconnect/i });
    expect(disconnectBtn).toBeInTheDocument();
  });

  it('disconnect button clears connection state', async () => {
    vi.mocked(freighter.isConnected).mockResolvedValueOnce({ isConnected: true });
    vi.mocked(freighter.requestAccess).mockResolvedValueOnce({
      address: 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN',
    } as Awaited<ReturnType<typeof freighter.requestAccess>>);
    vi.mocked(freighter.getNetwork).mockResolvedValueOnce({
      network: 'TESTNET',
      networkPassphrase: 'Test SDF Network ; September 2015',
    } as Awaited<ReturnType<typeof freighter.getNetwork>>);

    renderWithProvider(<WalletConnector />);
    const connectBtn = await screen.findByRole('button', {
      name: /connect freighter wallet/i,
    });
    fireEvent.click(connectBtn);

    const disconnectBtn = await screen.findByRole('button', { name: /disconnect/i });
    fireEvent.click(disconnectBtn);

    // Should return to the "Connect Wallet" state
    expect(
      await screen.findByRole('button', { name: /connect freighter wallet/i }),
    ).toBeInTheDocument();
  });
});
