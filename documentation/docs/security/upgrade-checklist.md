---
title: WASM Upgrade Verification Checklist
description: Printable security checklist for verifying reproducible WASM builds and upgrade artifacts before signing an upgrade transaction.
---

# WASM Upgrade Verification Checklist

Use this checklist before every mainnet upgrade. Complete every item and record the results. Do not proceed with the upgrade if any item fails.

:::warning Learner Safety & Production Warning

The example contracts and pattern material this checklist is used with are **unaudited** and provided strictly for educational purposes. Nothing on this page has been through an independent security review. **Do not use this material in production, and do not deploy the linked example crates with real funds or protocol-owned assets.**

Completing this checklist does not make an upgrade safe. The checklist verifies that the artifact you are shipping is the artifact you reviewed — it does not review the contract logic, the migration code, or the admin-key handling. An audit is still required.

:::

:::info Reentrancy & Storage Limits

- **Reentrancy**: Soroban's host does not allow a contract to be re-entered while it is already executing, so the classic single-contract reentrancy loop cannot occur. It does **not** remove reentrancy risk in an upgrade path: if the admin is a multisig or timelock **contract**, the `upgrade` call is a cross-contract invocation, and any state the upgrade reads must be validated and written **before** the outgoing call (checks-effects-interactions). Treat a deferred storage write across an admin contract call as a finding.
- **Storage TTL / data expiry**: Instance storage (admin address, current Wasm hash, version counters, migration flags) shares its TTL with the contract instance. When it expires, the instance is archived and `upgrade`, `version`, and every other call fail until the entry is restored. `persistent()` entries behave the same way and are restorable; `temporary()` entries are **permanently deleted** on expiry with no archive. Neither the linked examples nor the commands below bump TTLs for you — add `extend_ttl` calls and a rent policy before a long-lived deployment.

:::

---

## Before Building

- [ ] Correct repository commit/tag checked out
- [ ] Correct Rust toolchain version (`rustup show`)
- [ ] Correct Stellar CLI version (`stellar --version`)
- [ ] Clean working tree (`git status` shows no uncommitted changes)
- [ ] Dependencies verified (`cargo audit` returns no high-severity findings)
- [ ] All tests pass (`cargo test`)

---

## Reproducible Build

- [ ] Build from the expected source (match commit hash)
- [ ] Build succeeds without warnings (`RUSTFLAGS="-D warnings" cargo build --release`)
- [ ] WASM target installed (`rustup target list | grep wasm32-unknown-unknown`)
- [ ] Build artifact produced (`ls target/wasm32-unknown-unknown/release/*.wasm`)
- [ ] Build repeated independently by a second reviewer (if possible)

Record the build environment:

```
Date: _______________
Machine: _______________
OS: _______________
Rust version: _______________
Stellar CLI version: _______________
Git commit: _______________
```

---

## WASM Inspection

- [ ] WASM file inspected (`stellar contract inspect --wasm <path>`)
- [ ] Contract name matches expected name
- [ ] Exported functions match expected interface
- [ ] No unexpected imports or dependencies

Record inspection output:

```
Contract name: _______________
Exported functions: _______________
```

---

## SHA-256 Verification

- [ ] SHA-256 hash generated from the built artifact

```bash
sha256sum target/wasm32-unknown-unknown/release/my_contract.optimized.wasm
```

- [ ] Hash recorded in release notes

Record the hash:

```
Built WASM SHA-256: _______________
```

- [ ] Proposed upgrade WASM hashed (if provided externally)

```bash
sha256sum proposed_upgrade.wasm
```

Record the proposed hash:

```
Proposed WASM SHA-256: _______________
```

- [ ] Hashes match exactly (compare character by character)

```
[ ] Built hash == Proposed hash
```

If the hashes do not match, **do not proceed**. Investigate the discrepancy.

---

## Upgrade Authorization

- [ ] Correct network selected (`stellar network ls`)
- [ ] Correct contract address targeted
- [ ] Correct administrator/governance address
- [ ] Correct signer/account used for the upgrade transaction
- [ ] Signer authorization independently verified by a second party
- [ ] Multi-sig requirements met (if applicable)
- [ ] Timelock elapsed (if applicable)

Record the authorization details:

```
Network: _______________
Contract address: _______________
Admin address: _______________
Signer address: _______________
Multi-sig threshold: _______________
```

---

## Transaction Verification

- [ ] Upgrade transaction simulated on testnet first
- [ ] Simulation succeeds without errors
- [ ] Gas consumption is within expected budget
- [ ] Transaction reviewed by a second party
- [ ] All arguments are correct (new WASM hash, etc.)

```bash
# Simulate the upgrade
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_KEY> \
  --network testnet \
  --sim-only \
  -- upgrade --new_wasm_hash <NEW_HASH>
```

---

## Final Review

- [ ] Proposed WASM matches expected artifact
- [ ] No unexpected source changes since the last audit
- [ ] Upgrade transaction reviewed and approved
- [ ] Correct signer approved the transaction
- [ ] Rollback procedure documented (hash of previous WASM)
- [ ] Emergency pause mechanism tested (if applicable)
- [ ] Confirmed the upgrade contract and admin contract have been independently audited (if any of the material here was used as a starting point)

Record the previous WASM hash for rollback:

```
Previous WASM SHA-256: _______________
```

---

## Post-Upgrade Verification

After the upgrade transaction confirms on mainnet:

- [ ] Contract responds to read-only calls
- [ ] Basic functionality works (smoke test)
- [ ] Events are emitted correctly
- [ ] Storage invariants are preserved
- [ ] No unexpected errors in transaction logs
- [ ] Instance storage TTL confirmed above the archive threshold (`extend_ttl` is in place for a long-lived contract)
- [ ] No data the contract still needs was stored in `temporary()` storage, which is permanently deleted on expiry

```bash
# Verify the contract is operational
stellar contract invoke \
  --id <CONTRACT_ID> \
  --network mainnet \
  -- <read_only_function>
```

---

## Emergency Rollback

If the upgrade introduces a critical bug:

1. **Immediately pause** the contract (if pause mechanism exists)
2. **Document the issue** and notify stakeholders
3. **Prepare a rollback** by uploading the previous WASM

```bash
# Upload the previous stable WASM
stellar contract upload \
  --wasm path/to/previous_stable.wasm \
  --source <ADMIN_KEY> \
  --network mainnet

# Invoke the upgrade with the previous hash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_KEY> \
  --network mainnet \
  -- upgrade --new_wasm_hash <PREVIOUS_HASH>
```

4. **Verify the rollback** succeeded
5. **Communicate** the incident and resolution to users

---

## Checklist Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Builder | | | |
| Reviewer | | | |
| Security Reviewer | | | |
| Deployer | | | |

**Do not proceed with the upgrade until all checkboxes are completed and all sign-offs are obtained.**

> ## ⚠️ Unaudited — not for production
>
> The contracts, snippets, and checklists on this page are teaching material. They have **not** been audited, and they are **not** safe to deploy with real funds without an independent review of your specific deployment, threat model, and storage patterns.
>
> Before any mainnet deployment, run the page's checklist against your own contract (not just the example), commission or perform a security review, and confirm the on-chain storage TTL / data-expiry settings match your expected access patterns — Soroban persistent entries can be made temporary via `FootprintVersion`, and a contract that assumes permanent storage will silently break if any key is bumped to a `Temporary` or `Persistent` entry with a TTL.
