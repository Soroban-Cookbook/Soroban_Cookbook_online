---
sidebar_position: 7
title: Events
description: Emit and track contract events for observability, debugging, and off-chain indexing in Soroban smart contracts.
---

# Events

title: Events
description: Emitting and consuming events for observability and off-chain indexing.
sidebar_position: 6
---

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

## Next

- [Storage Patterns](./storage.md)
- [Authorization](./authorization.md)
- [Event Emission Audit](./event-emission-audit.md)
