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
