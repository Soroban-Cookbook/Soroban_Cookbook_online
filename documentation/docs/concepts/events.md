---
sidebar_position: 7
title: Events
description: Emit and track contract events for observability, debugging, and off-chain indexing in Soroban smart contracts.
---

# Events

Events provide a reliable audit trail of what happened in your contract and help indexers and UIs react to on-chain activity.

## Why Emit Events

- Improve observability and debugging
- Enable off-chain indexing and analytics
- Support front-end updates after state changes

## Event Design Guidelines

1. Use stable, predictable event topics.
2. Include only the data consumers need.
3. Emit events after successful state transitions.
4. Keep naming consistent across related actions.

## Recommended Event Types

- Creation and initialization
- State update and transfer actions
- Access control changes
- Error or rejection signals when appropriate

## Querying events: RPC vs Horizon

Contract events published with `env.events().publish` are retrieved through **Soroban RPC** (`getEvents`), not Horizon's classic operation feeds. Use Horizon for classic payments/operations. See **[RPC and Horizon](./rpc-and-horizon.md)** for a full decision table.

:::caution Key handling and network risk
Before you run any command that touches keys, wallets, RPC, or a network deployment:

- **Never commit or paste secret keys or seed phrases.** Keep them out of source control, shell history, logs, and chat. Prefer named identities (e.g. `stellar keys` / `soroban keys`) or a wallet extension so raw secrets stay out of your commands.
- **Know which network you are on.** Testnet and futurenet are for experimentation; mainnet moves real funds. Treat every deploy, invoke, and event query as potentially irreversible and verify the network and identity before submitting.
- **RPC and public endpoints are not a substitute for careful ops.** They can be rate-limited, lag, or be unavailable, and they do not protect your keys. Confirm results independently and keep your own records.

See the getting-started security guidance (API security and deploy-mainnet pages) for the canonical checklist, but do not rely on those links alone.
:::
## Example crate

See the dedicated [Events Catalog example](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/events-catalog) for a contract that uses stable event topics like `profile_set` and `profile_status`, with data payloads designed for indexers and UI listeners.

## Next

- [RPC and Horizon](./rpc-and-horizon.md)
- [Storage Patterns](./storage.md)
- [Authorization](./authorization.md)
- [SEP-41 Token Standard](./sep-41-token-standard.md)
- [Event Emission Audit](./event-emission-audit.md)
