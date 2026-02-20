# Deploy to Testnet

After building your Soroban contract, deploy it to Stellar testnet for validation in a live network environment.

## Prerequisites

- Soroban CLI installed
- A funded testnet account
- Built WASM artifact from your contract

## Typical Flow

1. Build your contract:

```bash
soroban contract build
```

2. Configure your identity/network in Soroban CLI.
3. Upload WASM and deploy contract.
4. Invoke a read/write method to verify behavior.

## Verification Checklist

- Contract deployed successfully and returned contract ID
- Basic methods execute without authorization errors
- State changes persist across calls
- Emitted events can be observed in tooling

## Next

- [Your First Contract](./first-contract.md)
- [Core Concepts Overview](../concepts/overview.md)
