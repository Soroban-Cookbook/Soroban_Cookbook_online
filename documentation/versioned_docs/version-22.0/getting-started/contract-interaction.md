---
time: 20
sidebar_position: 6
title: Contract Interaction Tutorial
description: How to interact with deployed Soroban contracts from CLI and app contexts.
image: /img/soroban-social-card.png
---

## Overview

This tutorial shows how to interact with a deployed Soroban contract from both the command line and application contexts. It covers read-only and state-changing calls, argument encoding, frontend integration patterns, and common error cases with fixes.

## Prerequisites

- Soroban CLI installed ([setup guide](/docs/getting-started/setup))
- A funded testnet account configured in Soroban CLI
- A deployed contract ID available in your environment
- A contract interface such as:

```text
get_count() -> i32         # read-only
increment() -> i32         # state-changing
set_count(value: i32)      # state-changing
```

## CLI interaction

### Configure environment variables

```bash
export CONTRACT_ID=YOUR_CONTRACT_ID
export SOURCE_ACCOUNT=my-testnet-account
export NETWORK=testnet
```

### Inspect the deployed contract

Use contract inspection to confirm the available functions and parameter names.

```bash
soroban contract inspect \
  --id "$CONTRACT_ID" \
  --network "$NETWORK"
```

Expected metadata output includes the contract functions and their arguments.

### Read-only call

Read-only functions are safe to invoke from CLI and verify the current contract state.

```bash
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- get_count
```

Expected output:

```text
0
```

### State-changing call

Write interactions modify contract state. This example increments a counter.

```bash
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- increment
```

Expected output:

```text
1
```

### Verify state persisted

Call the read-only function again to confirm the update.

```bash
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- get_count
```

Expected output:

```text
1
```

## Argument encoding

The Soroban CLI uses contract metadata to encode arguments automatically. After the function name, pass each parameter using its exact contract parameter name.

Examples:

```bash
# Pass an integer value by name
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- set_count --value 42

# Pass a string or symbol parameter by name
soroban contract invoke \
  --id "$CONTRACT_ID" \
  --source "$SOURCE_ACCOUNT" \
  --network "$NETWORK" \
  -- set_message --message "Hello Soroban"
```

For address values, use the public key string from the target account. If the contract expects an asset, supply the asset code and issuer in the supported CLI format.

## App integration patterns

### Pattern 1: Backend wrapper for contract invocation

A secure app should keep signing and network credentials on the server. The frontend calls a backend endpoint, and the backend invokes the Soroban CLI or a contract API.

#### Node backend example

```js
import express from 'express';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const app = express();
app.use(express.json());

function buildArgs(contractId, source, network, fn, params) {
  const argPairs = Object.entries(params || {}).flatMap(([name, value]) => [
    `--${name}`,
    String(value),
  ]);
  return [
    'contract',
    'invoke',
    '--id',
    contractId,
    '--source',
    source,
    '--network',
    network,
    '--',
    fn,
    ...argPairs,
  ];
}

app.post('/api/contract/invoke', async (req, res) => {
  try {
    const { contractId, fn, params } = req.body;
    if (!contractId || !fn) {
      return res.status(400).json({ error: 'contractId and fn are required' });
    }

    const args = buildArgs(contractId, 'my-testnet-account', 'testnet', fn, params);
    const { stdout, stderr } = await execFileAsync('soroban', args);

    if (stderr) {
      return res.status(500).json({ error: stderr.trim() });
    }

    return res.json({ result: stdout.trim() });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

app.listen(3000, () => {
  console.log('Contract API listening on http://localhost:3000');
});
```

### Pattern 2: Frontend request to a secure backend

Keep secret keys out of the browser. The frontend sends simple requests and displays the contract result.

```js
async function invokeContract(fn, params) {
  const response = await fetch('/api/contract/invoke', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contractId: 'YOUR_CONTRACT_ID',
      fn,
      params,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Contract invocation failed');
  }

  return response.json();
}

// Example usage in a React component
const result = await invokeContract('get_count');
console.log('Current count:', result.result);
```

### Browser-friendly read-only pattern

For UI screens, make read-only contract queries from the frontend but still proxy them through a server so secrets remain protected.

```js
const response = await fetch('/api/contract/invoke', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    contractId: 'YOUR_CONTRACT_ID',
    fn: 'get_count',
  }),
});
```

## Common error cases and fixes

### 1. `Account not found`

- Problem: The source account is not configured or funded.
- Fix: Verify the account exists with `soroban keys list` and fund it on testnet.

### 2. `Function not found`

- Problem: The function name or argument name does not match contract metadata.
- Fix: Run `soroban contract inspect --id "$CONTRACT_ID" --network "$NETWORK"` and use the exact function and parameter names.

### 3. `Argument decoding failed`

- Problem: The CLI could not parse the provided argument type.
- Fix: Use contract metadata names and provide values in the expected format, for example `--value 42` for integers or `--message "Hello"` for strings.

### 4. `Insufficient balance` or gas failure

- Problem: Not enough XLM is available for the invocation fee.
- Fix: Fund the account again using friendbot or transfer additional testnet XLM.

### 5. Backend invocation errors

- Problem: `child_process` returns stderr or the backend cannot parse CLI output.
- Fix: Capture both `stdout` and `stderr`, return plain JSON from the backend, and validate request payloads before invoking the CLI.

### 6. Browser request failure

- Problem: The frontend sees an HTTP error from the backend.
- Fix: Check network logs, ensure the backend endpoint is reachable, and confirm `Content-Type: application/json` is set on requests.

## Best practices

- Use CLI inspection before calling a function to confirm the contract API.
- Keep signing keys and network credentials on the server, not in browser code.
- Prefer read-only contract calls for UI state values.
- Always validate function names and parameter names against contract metadata.

## Related resources

- [Pattern Library](/docs/patterns/overview) — reusable contract patterns
- [Deploy to testnet](/docs/getting-started/deploy-testnet)
- [First contract tutorial](/docs/getting-started/first-contract)
- [Error handling patterns](/docs/patterns/error-recovery)
