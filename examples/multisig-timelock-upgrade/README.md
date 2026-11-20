# Multisig Timelock Upgrade

A multisignature governor for upgradeable proxy contracts. An upgrade can only
be executed once a threshold of registered owners has approved it **and** the
proposed timelock delay has elapsed since the proposal was created.

## What it demonstrates

- Owner sets with a required-signature threshold
- Upgrade proposals that require owner approval
- A mandatory delay between proposal and execution

## Build

```bash
stellar contract build --manifest-path examples/multisig-timelock-upgrade/Cargo.toml
```

## Test

```bash
cargo test --manifest-path examples/multisig-timelock-upgrade/Cargo.toml
```

## Origin

This example's metadata references the
[CosmWasm cw-plus](https://github.com/CosmWasm/cw-plus) repository
(`repository` field in `Cargo.toml`) as its upstream source.

## License

Distributed under the **MIT** license (see the repository root `LICENSE`),
matching the repository's license policy for example crates.