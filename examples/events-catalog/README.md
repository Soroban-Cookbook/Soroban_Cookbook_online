# Events Catalog

This example demonstrates a Soroban contract that emits stable, indexer-friendly events using clear topic names and compact payloads.

## What it shows

- Stable first topics such as `profile_set` and `profile_status`
- Event data that contains only the values an indexer needs
- Tests that assert the exact emitted event payload via `env.events().all()`

## Contract behavior

- `set_profile(account, name, role)` stores a profile and emits a `profile_set` event
- `set_status(account, active)` updates the active flag and emits a `profile_status` event
- `get_profile(account)` returns the stored profile metadata

## Example event

```rust
env.events().publish(
    (Symbol::new(&env, "profile_set"), account.clone()),
    (name.clone(), role.clone(), true),
);
```

This pattern keeps the event type in the first topic and the human-readable payload in the data tuple, making it easy for indexers to filter and process.

## Test command

```bash
cargo test --package events-catalog
```
