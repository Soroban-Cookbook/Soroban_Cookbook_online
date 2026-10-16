# Examples Origin Index

This file records, for every example crate under `examples/`, whether the
contract is original to the Soroban Cookbook or adapted from a named public
source. It is the single canonical place for provenance notes; per-crate
READMEs, the root `NOTICE` file (once added), and package metadata should agree
with it.

## Format

One table row per crate (every directory under `examples/` that contains a
`Cargo.toml`), sorted alphabetically by crate directory name.

| Column | Values |
| ------ | ------ |
| Crate | Crate directory name under `examples/`, as a link to its README |
| Status | `original` — written for this repository; `adapted` — derived from a named public source; `unreviewed` — provenance not yet verified by a maintainer |
| Source | For `adapted`: source name and URL. Otherwise `—` |
| Last reviewed | `YYYY-MM-DD` date a maintainer last verified the row. `—` while `unreviewed` |

Only mark a crate `adapted` once a maintainer has verified the source. Do not
fill in a source from guesswork; leave the row `unreviewed` instead.

Example row:

| Crate | Status | Source | Last reviewed |
| ----- | ------ | ------ | ------------- |
| [`example-crate`](example-crate/README.md) | adapted | [Upstream Project](https://github.com/org/upstream-project) | 2026-01-31 |

## Index

| Crate | Status | Source | Last reviewed |
| ----- | ------ | ------ | ------------- |
| [`access-control`](access-control/README.md) | unreviewed | — | — |
| [`airdrop-bitmap`](airdrop-bitmap/README.md) | unreviewed | — | — |
| [`authorization`](authorization/README.md) | unreviewed | — | — |
| [`balance-snapshot`](balance-snapshot/README.md) | unreviewed | — | — |
| [`batch-ops`](batch-ops/README.md) | unreviewed | — | — |
| [`constant-product-amm`](constant-product-amm/README.md) | unreviewed | — | — |
| [`constructor-init`](constructor-init/README.md) | unreviewed | — | — |
| [`contract-factory`](contract-factory/README.md) | unreviewed | — | — |
| [`counter`](counter/README.md) | unreviewed | — | — |
| [`cross-contract`](cross-contract/README.md) | unreviewed | — | — |
| [`crowdfund`](crowdfund/README.md) | unreviewed | — | — |
| [`custom-account`](custom-account/README.md) | unreviewed | — | — |
| [`custom-types`](custom-types/README.md) | unreviewed | — | — |
| [`dutch-auction`](dutch-auction/README.md) | unreviewed | — | — |
| [`emergency-stop`](emergency-stop/README.md) | unreviewed | — | — |
| [`error-handling`](error-handling/README.md) | unreviewed | — | — |
| [`escrow-basic`](escrow-basic/README.md) | unreviewed | — | — |
| [`escrow-multiparty`](escrow-multiparty/README.md) | unreviewed | — | — |
| [`events-catalog`](events-catalog/README.md) | unreviewed | — | — |
| [`faucet`](faucet/README.md) | unreviewed | — | — |
| [`flash-loan`](flash-loan/README.md) | unreviewed | — | — |
| [`governor`](governor/README.md) | unreviewed | — | — |
| [`hello-world`](hello-world/README.md) | unreviewed | — | — |
| [`htlc-swap`](htlc-swap/README.md) | unreviewed | — | — |
| [`lending`](lending/README.md) | unreviewed | — | — |
| [`marketplace`](marketplace/README.md) | unreviewed | — | — |
| [`merkle-proof`](merkle-proof/README.md) | unreviewed | — | — |
| [`multi-token-vault`](multi-token-vault/README.md) | original | — | 2026-10-16 |
| [`multisig-timelock-upgrade`](multisig-timelock-upgrade/README.md) | unreviewed | — | — |
| [`multisig-wallet`](multisig-wallet/README.md) | unreviewed | — | — |
| [`nft`](nft/README.md) | unreviewed | — | — |
| [`oracle-consumer`](oracle-consumer/README.md) | unreviewed | — | — |
| [`pagination`](pagination/README.md) | unreviewed | — | — |
| [`pausable-token`](pausable-token/README.md) | unreviewed | — | — |
| [`payment-splitter`](payment-splitter/README.md) | unreviewed | — | — |
| [`price-oracle`](price-oracle/README.md) | unreviewed | — | — |
| [`pull-payment`](pull-payment/README.md) | unreviewed | — | — |
| [`rate-limit`](rate-limit/README.md) | unreviewed | — | — |
| [`reentrancy-guard`](reentrancy-guard/README.md) | unreviewed | — | — |
| [`refundable-deposit`](refundable-deposit/README.md) | unreviewed | — | — |
| [`registry`](registry/README.md) | unreviewed | — | — |
| [`royalty-splitter`](royalty-splitter/README.md) | unreviewed | — | — |
| [`sac-client`](sac-client/README.md) | unreviewed | — | — |
| [`simple-dao`](simple-dao/README.md) | unreviewed | — | — |
| [`simple-voting`](simple-voting/README.md) | unreviewed | — | — |
| [`soulbound-token`](soulbound-token/README.md) | unreviewed | — | — |
| [`staking`](staking/README.md) | unreviewed | — | — |
| [`storage-kinds`](storage-kinds/README.md) | unreviewed | — | — |
| [`storage-ttl`](storage-ttl/README.md) | unreviewed | — | — |
| [`stream-payment`](stream-payment/README.md) | unreviewed | — | — |
| [`timelock-vault`](timelock-vault/README.md) | unreviewed | — | — |
| [`tiny-contract`](tiny-contract/README.md) | unreviewed | — | — |
| [`token-snapshot`](token-snapshot/README.md) | unreviewed | — | — |
| [`token-transfer`](token-transfer/README.md) | unreviewed | — | — |
| [`token-vesting`](token-vesting/README.md) | unreviewed | — | — |
| [`token-wrapper`](token-wrapper/README.md) | unreviewed | — | — |
| [`ttl-bumper`](ttl-bumper/README.md) | unreviewed | — | — |
| [`twap-helper`](twap-helper/README.md) | unreviewed | — | — |
| [`upgradeable`](upgradeable/README.md) | unreviewed | — | — |
