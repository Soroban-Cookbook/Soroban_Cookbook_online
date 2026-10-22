// SPDX-License-Identifier: MIT
// Copyright (c) 2026 Soroban Cookbook

/**
 * counterService.ts
 *
 * Builds, simulates, signs, and submits transactions for the Soroban Cookbook
 * `counter` contract.
 *
 * Contract methods (from examples/counter/src/lib.rs):
 *   - increment() -> u32   — increments by 1, returns new value
 *   - get()       -> u32   — returns current value without state change
 *   - reset()     -> ()    — resets counter to 0
 *
 * Transaction flow:
 *   1. Build XDR transaction with stellar-sdk
 *   2. Simulate via RPC to obtain the correct resource fee footprint
 *   3. Assemble the simulated transaction
 *   4. Pass XDR to Freighter for signing (keeps secret keys out of the page)
 *   5. Submit the signed XDR to RPC
 */

import {
  Networks,
  TransactionBuilder,
  Transaction,
  Account,
  Contract,
  rpc as StellarRpc,
  BASE_FEE,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

// ── Configuration ─────────────────────────────────────────────────────────
// All values are provided via environment variables.
// See .env.example for the full list.

const RPC_URL =
  import.meta.env.VITE_STELLAR_RPC_URL ?? 'https://soroban-testnet.stellar.org';

const CONTRACT_ID = import.meta.env.VITE_CONTRACT_ID ?? '';
const NETWORK_PASSPHRASE = import.meta.env.VITE_NETWORK_PASSPHRASE ?? Networks.TESTNET;

// ── RPC server ────────────────────────────────────────────────────────────

function getServer(): StellarRpc.Server {
  return new StellarRpc.Server(RPC_URL, { allowHttp: RPC_URL.startsWith('http://') });
}

// ── Helpers ───────────────────────────────────────────────────────────────

function assertContractId(): void {
  if (!CONTRACT_ID) {
    throw new Error(
      'VITE_CONTRACT_ID is not set. Copy .env.example to .env and fill in the contract address.',
    );
  }
}

/**
 * Simulate a transaction and assemble it with correct fees / footprint.
 * Throws a descriptive error if simulation fails.
 */
async function simulateAndAssemble(
  tx: Transaction,
): Promise<TransactionBuilder> {
  const server = getServer();
  const simResult = await server.simulateTransaction(tx);

  if (StellarRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }

  return StellarRpc.assembleTransaction(tx, simResult);
}

/**
 * Sign an assembled transaction with Freighter and submit it to RPC.
 * Returns the confirmed ledger entry once the transaction is accepted.
 */
async function signAndSubmit(
  assembled: TransactionBuilder,
  publicKey: string,
): Promise<StellarRpc.Api.GetSuccessfulTransactionResponse> {
  const server = getServer();
  const xdrString = assembled.build().toXDR();

  const signResult = await signTransaction(xdrString, {
    address: publicKey,
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  if (signResult.error) {
    throw new Error(`Freighter signing failed: ${signResult.error}`);
  }

  // signTransaction returns either { signedTxXdr } or { result: xdr }
  const signedXdr =
    (signResult as { signedTxXdr?: string }).signedTxXdr ??
    (signResult as { result?: string }).result;

  if (!signedXdr) {
    throw new Error('Freighter did not return a signed transaction. User may have rejected.');
  }

  const response = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE),
  );

  if (response.status === 'ERROR') {
    throw new Error(`Transaction rejected: ${response.errorResult?.result().toString()}`);
  }

  // Poll for confirmation
  const hash = response.hash;
  let attempts = 0;
  const MAX_ATTEMPTS = 30;

  while (attempts < MAX_ATTEMPTS) {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const status = await server.getTransaction(hash);

    if (status.status === StellarRpc.Api.GetTransactionStatus.SUCCESS) {
      return status as StellarRpc.Api.GetSuccessfulTransactionResponse;
    }
    if (status.status === StellarRpc.Api.GetTransactionStatus.FAILED) {
      throw new Error('Transaction failed on-chain.');
    }

    attempts++;
  }

  throw new Error(`Transaction ${hash} was not confirmed after ${MAX_ATTEMPTS} seconds.`);
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * Read the current counter value without a transaction.
 * Uses simulateTransaction (no signing or fees required).
 */
export async function readCounterValue(): Promise<number> {
  assertContractId();
  const server = getServer();

  // Build a "dummy" account for simulation — no real account needed for reads
  const dummyAccount = new Account('GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN', '0');
  const contract = new Contract(CONTRACT_ID);

  const tx = new TransactionBuilder(dummyAccount, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('get'))
    .setTimeout(30)
    .build();

  const simResult = await server.simulateTransaction(tx);

  if (StellarRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Read simulation failed: ${simResult.error}`);
  }

  const successSim = simResult as StellarRpc.Api.SimulateTransactionSuccessResponse;
  const returnValue = successSim.result?.retval;

  if (!returnValue) {
    throw new Error('Contract did not return a value for get().');
  }

  // The counter contract returns u32
  return returnValue.u32();
}

/**
 * Call increment() — increments the counter and returns the new value.
 * Requires a connected wallet (publicKey).
 */
export async function incrementCounter(publicKey: string): Promise<number> {
  assertContractId();
  const server = getServer();

  const accountData = await server.getAccount(publicKey);
  const account = new Account(accountData.accountId(), accountData.sequenceNumber());

  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('increment'))
    .setTimeout(30)
    .build();

  const assembled = await simulateAndAssemble(tx);
  const confirmed = await signAndSubmit(assembled, publicKey);

  // Extract return value from the confirmed transaction
  const meta = confirmed.resultMetaXdr;
  const operations = meta.v3().sorobanMeta()?.returnValue();
  if (!operations) {
    throw new Error('Could not read return value from transaction result.');
  }

  return operations.u32();
}

/**
 * Call reset() — resets the counter to 0.
 * Returns void; caller should re-read the value after.
 */
export async function resetCounter(publicKey: string): Promise<void> {
  assertContractId();
  const server = getServer();

  const accountData = await server.getAccount(publicKey);
  const account = new Account(accountData.accountId(), accountData.sequenceNumber());

  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call('reset'))
    .setTimeout(30)
    .build();

  const assembled = await simulateAndAssemble(tx);
  await signAndSubmit(assembled, publicKey);
}

/** Returns the configured RPC URL (useful for debug display). */
export function getRpcUrl(): string {
  return RPC_URL;
}

/** Returns the configured contract ID (useful for debug display). */
export function getContractId(): string {
  return CONTRACT_ID;
}
