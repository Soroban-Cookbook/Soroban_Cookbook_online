---
time: 25
sidebar_position: 13
title: Wallet Integration Guide
description: Connect Freighter wallet to sign Soroban transactions from a dapp, including network setup, access requests, transaction signing, and common errors.
image: /img/soroban-social-card.png
---

## Overview

This guide covers integrating [Freighter](https://www.freighter.app/) — the browser extension wallet maintained by the Stellar Development Foundation — into a JavaScript or TypeScript dapp so users can sign Soroban transactions without exposing their private keys to your application. It covers installing the library, adding the Testnet network, requesting wallet access, signing a transaction, and handling the errors most commonly encountered during development.

:::info Only use official wallets
Only direct users to install Freighter from the [Chrome Web Store](https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk) or [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/freighter-stellar-wallet/). Never link to third-party redistributions of wallet software.
:::

## Prerequisites

- Node.js 18 or later
- A JavaScript or TypeScript frontend (framework-agnostic; React examples are shown)
- A deployed Soroban contract on Testnet ([deploy guide](/docs/getting-started/deploy-testnet))
- Freighter browser extension installed and set up with at least one account

## Install the library

`@stellar/freighter-api` is the official client library published by the Stellar Development Foundation. It communicates with the Freighter extension over a browser message channel — it does not make any network requests itself.

```bash
npm install @stellar/freighter-api @stellar/stellar-sdk
```

> **Pinned versions:** Always pin exact versions in production. At the time of writing, `@stellar/freighter-api` is `^3.0.0` and `@stellar/stellar-sdk` is `^12.0.0`. Check [npm](https://www.npmjs.com/package/@stellar/freighter-api) for the latest releases.

## Step 1 — Add the Testnet network in Freighter

Before your dapp can submit Testnet transactions, the user must have Testnet selected inside Freighter.

1. Open the Freighter extension and click the network name in the top-left dropdown.
2. Select **Test Net**.
3. If the account has no Testnet funds, Freighter will offer to fund it via Friendbot. Accept, or fund it manually at [https://laboratory.stellar.org/#account-creator?network=test](https://laboratory.stellar.org/#account-creator?network=test).

Your dapp should also verify the active network at runtime (see [Check connected network](#check-connected-network) below).

## Step 2 — Check whether Freighter is installed

```ts
import { isConnected } from '@stellar/freighter-api';

async function checkFreighter(): Promise<boolean> {
  const { isConnected: connected } = await isConnected();
  return connected;
}
```

`isConnected` resolves to `{ isConnected: boolean }`. It returns `false` when the extension is not installed or has been disabled — it does not prompt the user.

## Step 3 — Request wallet access

Calling `requestAccess` pops up the Freighter permission dialog. The user must explicitly approve your origin before your dapp can read their public key or request signatures.

```ts
import { requestAccess } from '@stellar/freighter-api';

async function connectWallet(): Promise<string> {
  const { address, error } = await requestAccess();

  if (error) {
    throw new Error(`Wallet access denied: ${error}`);
  }

  // address is the user's Stellar public key (G...)
  return address;
}
```

Call this function in response to a user gesture (button click). Browsers may silently swallow the permission dialog if it is triggered outside a user event.

## Step 4 — Read the active account and network

After access is granted, retrieve the active public key and verify the network before building any transaction.

```ts
import { getAddress, getNetwork } from '@stellar/freighter-api';
import { Networks } from '@stellar/stellar-sdk';

async function getWalletState(): Promise<{ publicKey: string; isTestnet: boolean }> {
  const { address, error: addrError } = await getAddress();
  if (addrError) throw new Error(addrError);

  const { network, networkPassphrase, error: netError } = await getNetwork();
  if (netError) throw new Error(netError);

  const isTestnet = networkPassphrase === Networks.TESTNET;

  return { publicKey: address, isTestnet };
}
```

### Check connected network

Always guard against the user being on the wrong network before building a transaction. Submitting a Testnet-signed transaction to Mainnet (or vice versa) will fail at the RPC level.

```ts
import { getNetwork } from '@stellar/freighter-api';
import { Networks } from '@stellar/stellar-sdk';

async function assertTestnet(): Promise<void> {
  const { networkPassphrase } = await getNetwork();
  if (networkPassphrase !== Networks.TESTNET) {
    throw new Error('Switch Freighter to Test Net before continuing.');
  }
}
```

## Step 5 — Build and sign a transaction

Signing never sends the transaction. Your dapp builds the XDR, Freighter signs it, and then your dapp submits it to the RPC.

```ts
import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
  nativeToScVal,
  xdr,
} from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = 'YOUR_CONTRACT_ID'; // deployed contract address

async function incrementCounter(userPublicKey: string): Promise<string> {
  const server = new SorobanRpc.Server(RPC_URL);
  const account = await server.getAccount(userPublicKey);

  // Build the contract invocation transaction
  const contract = new Contract(CONTRACT_ID);
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(contract.call('increment'))
    .setTimeout(30)
    .build();

  // Simulate to get the resource footprint (required for Soroban)
  const simResult = await server.simulateTransaction(tx);
  if (SorobanRpc.Api.isSimulationError(simResult)) {
    throw new Error(`Simulation failed: ${simResult.error}`);
  }
  const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();

  // Ask Freighter to sign — this opens the extension popup
  const { signedTxXdr, error } = await signTransaction(preparedTx.toXDR(), {
    networkPassphrase: Networks.TESTNET,
  });

  if (error) {
    throw new Error(`Signing failed: ${error}`);
  }

  // Submit the signed transaction
  const result = await server.sendTransaction(
    TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET),
  );

  if (result.status === 'ERROR') {
    throw new Error(`Submission failed: ${result.errorResult?.toXDR()}`);
  }

  return result.hash;
}
```

### What happens during signing

1. `signTransaction` serialises the prepared XDR and forwards it to the Freighter extension.
2. Freighter displays a human-readable transaction breakdown to the user.
3. On approval, Freighter returns `{ signedTxXdr, signerAddress }`.
4. On rejection or timeout, it returns `{ error }`.

## Step 6 — Poll for transaction confirmation

`sendTransaction` is fire-and-forget. Poll `getTransaction` to confirm the ledger result.

```ts
import { SorobanRpc } from '@stellar/stellar-sdk';

async function waitForConfirmation(
  server: SorobanRpc.Server,
  txHash: string,
  maxAttempts = 10,
): Promise<SorobanRpc.Api.GetTransactionResponse> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await server.getTransaction(txHash);

    if (response.status !== SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
      return response;
    }

    // Ledger closes roughly every 5 seconds on Testnet
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`Transaction ${txHash} not confirmed after ${maxAttempts} attempts`);
}
```

## Putting it together — minimal React example

```tsx
import React, { useState } from 'react';
import { isConnected, requestAccess, getNetwork, signTransaction } from '@stellar/freighter-api';
import {
  Contract,
  Networks,
  SorobanRpc,
  TransactionBuilder,
  BASE_FEE,
} from '@stellar/stellar-sdk';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const CONTRACT_ID = 'YOUR_CONTRACT_ID';

export function CounterButton() {
  const [status, setStatus] = useState<string>('');
  const [publicKey, setPublicKey] = useState<string>('');

  async function handleConnect() {
    const { isConnected: installed } = await isConnected();
    if (!installed) {
      setStatus('Freighter is not installed. Install it from freighter.app.');
      return;
    }

    const { address, error } = await requestAccess();
    if (error) {
      setStatus(`Connection rejected: ${error}`);
      return;
    }

    const { networkPassphrase } = await getNetwork();
    if (networkPassphrase !== Networks.TESTNET) {
      setStatus('Switch Freighter to Test Net and try again.');
      return;
    }

    setPublicKey(address);
    setStatus(`Connected: ${address.slice(0, 6)}…${address.slice(-4)}`);
  }

  async function handleIncrement() {
    if (!publicKey) {
      setStatus('Connect your wallet first.');
      return;
    }

    try {
      setStatus('Building transaction…');
      const server = new SorobanRpc.Server(RPC_URL);
      const account = await server.getAccount(publicKey);

      const contract = new Contract(CONTRACT_ID);
      const tx = new TransactionBuilder(account, {
        fee: BASE_FEE,
        networkPassphrase: Networks.TESTNET,
      })
        .addOperation(contract.call('increment'))
        .setTimeout(30)
        .build();

      const simResult = await server.simulateTransaction(tx);
      if (SorobanRpc.Api.isSimulationError(simResult)) {
        throw new Error(simResult.error);
      }
      const preparedTx = SorobanRpc.assembleTransaction(tx, simResult).build();

      setStatus('Waiting for Freighter approval…');
      const { signedTxXdr, error } = await signTransaction(preparedTx.toXDR(), {
        networkPassphrase: Networks.TESTNET,
      });

      if (error) throw new Error(error);

      setStatus('Submitting…');
      const result = await server.sendTransaction(
        TransactionBuilder.fromXDR(signedTxXdr, Networks.TESTNET),
      );

      setStatus(`Submitted! Hash: ${result.hash.slice(0, 12)}…`);
    } catch (err: unknown) {
      setStatus(`Error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div>
      <button onClick={handleConnect} disabled={!!publicKey}>
        {publicKey ? 'Wallet connected' : 'Connect Freighter'}
      </button>
      <button onClick={handleIncrement} disabled={!publicKey}>
        Increment counter
      </button>
      {status && <p>{status}</p>}
    </div>
  );
}
```

## Signing authorization entries

For multi-party authorization flows where your contract uses `require_auth` on an address other than the transaction source, sign the authorization entry separately.

```ts
import { signAuthEntry } from '@stellar/freighter-api';
import { xdr, authorizeEntry } from '@stellar/stellar-sdk';

// preimageXdr is the XDR of a HashIdPreimageSorobanAuthorization
async function signAuthorizationEntry(preimageXdr: string): Promise<Buffer> {
  const { signedAuthEntry, error } = await signAuthEntry(preimageXdr, {
    networkPassphrase: Networks.TESTNET,
  });

  if (error) {
    throw new Error(`Authorization entry signing failed: ${error}`);
  }

  return Buffer.from(signedAuthEntry, 'base64');
}
```

See [Authorization concepts](/docs/concepts/authorization) for the full multi-party workflow.

## Common errors and fixes

### `Freighter is not installed`

- Cause: The extension is not present or is disabled.
- Fix: Gate all wallet calls behind `isConnected()`. Show a friendly prompt that links to the official install page ([freighter.app](https://www.freighter.app/)).

### `User declined access`

- Cause: The user dismissed the Freighter permission dialog.
- Fix: Do not retry automatically. Show a UI message and let the user reconnect when ready.

### `User declined signing`

- Cause: The user rejected the transaction in the Freighter popup.
- Fix: Surface the rejection clearly in the UI. Do not retry without user intent.

### `Wrong network`

- Cause: Freighter is set to a different network than the one your RPC endpoint serves.
- Fix: Call `getNetwork()` before building any transaction and compare `networkPassphrase` against `Networks.TESTNET` (or `Networks.PUBLIC`). Prompt the user to switch networks.

### `Simulation failed: ...`

- Cause: The contract function reverted during simulation — commonly a logic error, wrong arguments, or missing authorization.
- Fix: Check the simulation error message. Run the same invocation via `soroban contract invoke` on the CLI to see the raw error output.

### `Transaction not confirmed after N attempts`

- Cause: The transaction was not included in a ledger within the polling window. This can happen during Testnet congestion or if `sendTransaction` returned `DUPLICATE` or `TRY_AGAIN_LATER`.
- Fix: Check `result.status` from `sendTransaction`. For `TRY_AGAIN_LATER`, retry the submit. For `DUPLICATE`, the transaction may already be confirmed — poll `getTransaction` with the original hash.

### `Account not found on RPC`

- Cause: The public key returned by Freighter has never received a minimum-balance funding transaction on the selected network.
- Fix: Fund the account on Testnet via [Friendbot](https://friendbot.stellar.org/?addr=YOUR_PUBLIC_KEY) or in [Stellar Lab](https://laboratory.stellar.org/#account-creator?network=test).

## Multi-wallet support (optional)

If you want to support wallets beyond Freighter, the community-maintained [`@creit.tech/stellar-wallets-kit`](https://www.npmjs.com/package/@creit.tech/stellar-wallets-kit) provides a unified API across Freighter, xBull, Albedo, and others with a single connection interface.

```bash
npm install @creit.tech/stellar-wallets-kit
```

```ts
import { StellarWalletsKit, WalletNetwork, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';

const kit = new StellarWalletsKit({
  network: WalletNetwork.TESTNET,
  selectedWalletId: FREIGHTER_ID,
});

await kit.openModal({ onWalletSelected: (option) => kit.setWallet(option.id) });
const { address } = await kit.getAddress();
```

Using the kit is not required. The `@stellar/freighter-api` approach shown in this guide is sufficient for Freighter-only dapps.

## Testnet verification steps

Use these steps to verify your integration before targeting Mainnet.

1. Set Freighter to **Test Net**.
2. Fund your Testnet account via Friendbot if needed.
3. Call `isConnected()` — confirm it returns `true`.
4. Call `requestAccess()` — approve in Freighter — confirm the returned address starts with `G`.
5. Call `getNetwork()` — confirm `networkPassphrase === Networks.TESTNET`.
6. Build and simulate a transaction against your deployed Testnet contract.
7. Call `signTransaction()` — approve in Freighter — confirm `signedTxXdr` is a non-empty string.
8. Submit via `server.sendTransaction()` — confirm the hash is returned.
9. Poll `getTransaction()` — confirm `status === 'SUCCESS'`.

## Related resources

- [Contract interaction tutorial](/docs/getting-started/contract-interaction) — CLI and backend invocation patterns
- [Deploy to testnet](/docs/getting-started/deploy-testnet)
- [Authorization concepts](/docs/concepts/authorization) — `require_auth` and multi-party signing
- [Stellar Docs — Freighter guides](https://developers.stellar.org/docs/build/guides/freighter) — official SDF documentation
- [Freighter API source](https://github.com/stellar/freighter) — GitHub repository
