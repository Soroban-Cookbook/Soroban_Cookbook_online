// SPDX-License-Identifier: MIT
// Vitest global test setup for the React integration example
import '@testing-library/jest-dom';

// Mock @stellar/freighter-api so unit tests never touch the real browser extension.
// Individual tests can override these stubs via vi.mocked().mockReturnValueOnce().
vi.mock('@stellar/freighter-api', () => ({
  isConnected: vi.fn().mockResolvedValue({ isConnected: false }),
  requestAccess: vi.fn().mockResolvedValue({ error: 'Not mocked' }),
  getAddress: vi.fn().mockResolvedValue({ address: null, error: 'Not mocked' }),
  getNetwork: vi.fn().mockResolvedValue({ networkPassphrase: '', error: null }),
  signTransaction: vi.fn().mockResolvedValue({ signedTxXdr: null, error: 'Not mocked' }),
}));

// Mock @stellar/stellar-sdk RPC to avoid network calls in unit tests.
vi.mock('@stellar/stellar-sdk', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@stellar/stellar-sdk')>();
  return {
    ...actual,
    rpc: {
      ...actual.rpc,
      Server: vi.fn().mockImplementation(() => ({
        simulateTransaction: vi.fn(),
        sendTransaction: vi.fn(),
        getTransaction: vi.fn(),
        getAccount: vi.fn(),
      })),
    },
  };
});
