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

This example is original to the Soroban Cookbook repository. No upstream
source is claimed; the `repository` field in `Cargo.toml` points at this
repository.

## License

Distributed under the **MIT** license (see the repository root `LICENSE`),
matching the repository's license policy for example crates.