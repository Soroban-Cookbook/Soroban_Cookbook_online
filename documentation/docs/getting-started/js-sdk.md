# JavaScript/TypeScript SDK Quick Start

This guide provides build/sign/submit snippets for interacting with Soroban
contracts using the official `stellar-sdk` (JavaScript/TypeScript).

## Prerequisites

```bash
npm install stellar-sdk
# or: yarn add stellar-sdk
```

## Full Example: Hello World

```javascript
// index.js
const { Account, Keypair, Networks, Server, TransactionBuilder } = require("stellar-sdk");
const { Contract } = require("stellar-sdk"); // v12+ may not export Contract directly; use the lower-level API

// 1. Setup
const horizon = new Server("https://horizon.stellar.org");

// Funded keypair (use testnet friendbot or your own funded account)
const senderKeypair = Keypair.random(); // In production, load from secret seed
const senderAccount = await horizon.loadAccount(senderKeypair.publicKey());

// 2. Contract configuration
const contractId = "GBY...your-upgradeable-contract-id";
const contract = new Contract(contractId, "default");

// Or with explicit WASM hash (v2 upgrade)
// const contract = new Contract(contractId, "v2_wasm_hash");

// 3. Function invocation: set_value(42)
// The contract's `set_value` takes a single i32 argument
const setTx = new TransactionBuilder(senderAccount, {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .setTimeout(30)
  .addOperation(Contract.createFunctionCallOp("set_value", [42]))
  .build();

// 4. Sign and submit
setTx.sign(senderKeypair);
const setTxHash = await horizon.submitTransaction(setTx);
console.log("set_value tx submitted:", setTxHash);

// 5. Read value back
const response = await horizon.transactions()
  .forTransaction(setTxHash)
  .call();
console.log("Transaction posted successfully!");
```

## Upgrade Flow (v1 → v2)

```javascript
// After uploading v2 WASM to Horizon and getting its hash:
// const newWasmHash = "new_hash_here";

// 1. Fund and load the admin account that can upgrade
const adminKeypair = Keypair.fromSecret("SA...admin-secret");
const adminAccount = await horizon.loadAccount(adminKeypair.publicKey());

// 2. Build upgrade transaction
const upgradeTx = new TransactionBuilder(adminAccount, {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .setTimeout(30)
  .addOperation(Contract.createFunctionCallOp("upgrade", [new Uint8Array(32).fill(0)])) // v2 wasm hash as BytesN<32>
  .build();

// 3. Sign and submit
upgradeTx.sign(adminKeypair);
await horizon.submitTransaction(upgradeTx);

// 4. Interact with upgraded contract
// The same contract ID now runs v2 code:
const upgradedTx = new TransactionBuilder(adminAccount, {
  fee: "100",
  networkPassphrase: Networks.TESTNET,
})
  .setTimeout(30)
  .addOperation(Contract.createFunctionCallOp("set_value", [999]))
  .build();

upgradedTx.sign(adminKeypair);
await horizon.submitTransaction(upgradedTx);
```

## Notes

- `Contract.createFunctionCallOp(functionName, args)` constructs the inner
  operation. `args` must match the contract's parameter types.
- WASM hash is a 32-byte value; pass as `Uint8Array(32)` or a 64-char hex string
  depending on SDK version.
- The `upgrade` function in the contract example has an admin auth guard —
  only the registered admin can call it.
- Node test scripts are skipped in CI without network; use the test harness
  (`cargo test`) for unit logic verification.
---
time: 15
sidebar_position: 10
title: JavaScript SDK
description: Call Stellar RPC from a website with @stellar/stellar-sdk and Freighter signing
---

# JavaScript SDK

Use [`@stellar/stellar-sdk`](https://developers.stellar.org/docs/tools/sdks) in the browser to talk to RPC. Signing stays in [Freighter](https://developers.stellar.org/docs/build/guides/freighter/prompt-to-sign-tx). Read [API Security](./api-security.md) before you copy a secret or a provider token into frontend code.

## Install

```bash
npm install @stellar/stellar-sdk @stellar/freighter-api
```

## Connect to RPC

SDF public Testnet is enough for local dapp work. Mainnet has no public SDF RPC — see [API Security](./api-security.md) for dedicated endpoints and the allowlist.

```javascript
import { Networks, TransactionBuilder, rpc } from '@stellar/stellar-sdk';
import { signTransaction } from '@stellar/freighter-api';

const RPC_URL = 'https://soroban-testnet.stellar.org';
const server = new rpc.Server(RPC_URL);
```

Pass `{ allowHttp: true }` only for `http://localhost`. Do not use it in production.

## Sign with Freighter, then submit

The page builds the transaction. Freighter signs. The page submits. The bundle never contains a secret key.

```javascript
async function submitWithFreighter(tx) {
  const signed = await signTransaction(tx.toXDR(), {
    networkPassphrase: Networks.TESTNET,
  });

  return server.sendTransaction(
    TransactionBuilder.fromXDR(signed.signedTxXdr, Networks.TESTNET),
  );
}
```

Simulate with `server.simulateTransaction(tx)` before you prompt the wallet. Failed simulations should never reach Freighter.

## Next

- [API Security](./api-security.md) — CORS, RPC allowlists, public vs dedicated, secrets
- [Contract interaction](./contract-interaction.md) — CLI and backend-wrapper flows
- [Development tools](./development-tools.md) — Freighter and explorers
