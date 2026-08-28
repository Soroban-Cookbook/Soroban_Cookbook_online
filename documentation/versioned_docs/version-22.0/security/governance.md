---
title: Governance Security
sidebar_position: 2
description: Security considerations for decentralized governance contracts in Soroban — voting systems, proposal mechanisms, and attack mitigation.
---

Governance systems enable decentralized decision-making, but they introduce unique attack vectors that must be carefully mitigated. This guide covers critical security considerations for Soroban governance contracts.

---

## 1. Core Governance Concepts

A typical governance system includes:

- **Voting Power:** Determined by token holdings or staking
- **Proposals:** On-chain actions that can be executed
- **Quorum:** Minimum participation required for a proposal to pass
- **Timelock:** Delay between proposal approval and execution
- **Execution:** The process of applying approved changes

---

## 2. Common Governance Attack Vectors

### 2.1 Flash Loan Votes

**What it is:** An attacker borrows a large number of tokens for a single transaction, uses them to vote on a proposal, then returns them before the transaction completes. This allows an attacker to manipulate voting outcomes without holding long-term stake.

**Soroban Context:** Flash loans are possible on Stellar, so governance contracts must consider this risk.

**Mitigation Strategies:**

- **Time-Locked Voting Power:** Require tokens to be locked for a minimum period (e.g., 7 days) before they can be used to vote.
- **Snapshot-Based Voting:** Use historical balances (snapshots) instead of current balances to determine voting power. See [Token Pattern Security Audit — Snapshots](/docs/security/token-audit#29-snapshot-balances-governance--dividends) for snapshot hardening.
- **Voting Delay:** Add a delay between proposal creation and the start of voting to give stakeholders time to react.
- **Staking-Based Voting:** Only allow staked tokens (with unstaking delays) to vote.

### 2.2 Quorum Manipulation

**What it is:** Attackers exploit low quorum requirements or use sybil attacks to push through malicious proposals with minimal support.

**Mitigation Strategies:**

- **Set Appropriate Quorum:** Quorum should be high enough to prevent capture but low enough to allow legitimate proposals to pass.
- **Dynamic Quorum:** Adjust quorum based on total votes cast or token supply.
- **Minimum Vote Requirements:** Require both a quorum and a minimum approval percentage (e.g., 51% of votes cast).

### 2.3 Timelock Bypass

**What it is:** An attacker finds a way to execute a proposal immediately after it passes, without respecting the timelock delay.

**Mitigation Strategies:**

- **Hardcoded Timelock:** Enforce timelock delays in on-chain code, not just in off-chain processes.
- **Timelock Controller:** Use a separate timelock contract that only allows execution after the delay has passed.
- **Multi-Sig Timelock:** Require multiple signatures to execute proposals after the timelock.

### 2.4 Proposal Bricking

**What it is:** An attacker submits a proposal that, if executed, would break the governance system (e.g., changing the admin to a dead address, setting quorum to 100%).

**Mitigation Strategies:**

- **Proposal Validation:** Validate proposals before they can be submitted to ensure they don't contain malicious parameters.
- **Guardian Role:** Have a trusted guardian (or multi-sig) that can pause the system in case of emergency.
- **Timelock with Cancel Functionality:** Allow proposals to be canceled during the timelock period if issues are discovered.

### 2.5 Low Turnout Attacks

**What it is:** Attackers exploit low voter participation to pass proposals with a small number of votes.

**Mitigation Strategies:**

- **Incentivize Voting:** Offer rewards for voting (e.g., token emissions, airdrops).
- **Quorum Adjustment:** Automatically adjust quorum based on historical participation rates.

---

## 3. Mitigation Checklist for Governance Contracts

Use this checklist before deploying a governance system:

- [ ] **Voting Power:** Voting power is not manipulable via flash loans (snapshots or staking required).
- [ ] **Quorum:** Quorum is set appropriately and cannot be easily manipulated.
- [ ] **Timelock:** A hardcoded timelock delay is enforced between proposal approval and execution.
- [ ] **Proposal Validation:** All proposals are validated before submission to prevent malicious parameters.
- [ ] **Emergency Pause:** A pause mechanism or guardian role exists to stop the system in case of attack.
- [ ] **Access Control:** Sensitive functions (changing parameters, canceling proposals) have proper authorization checks.
- [ ] **Events:** All governance actions (proposal creation, voting, execution, cancellation) emit detailed events.

---

## 4. Secure Governance Implementation Patterns

### Pattern 1: Snapshot Voting

Use historical balances taken at a specific block instead of current balances to prevent flash loan manipulation.

### Pattern 2: Timelock Controller

Use a separate timelock contract that queues and executes proposals after a delay.

### Pattern 3: Multi-Sig + Timelock

Combine a multi-signature wallet with a timelock for critical governance actions.

---

## Related links

- [Security Fundamentals](/docs/security/fundamentals) — general contract security baseline
- [Proposal Lifecycle pattern](/docs/patterns/proposal-lifecycle) — DAO state machine example
- [Token Pattern Security Audit](/docs/security/token-audit) — snapshot and voting-power hardening
