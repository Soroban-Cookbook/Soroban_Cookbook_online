---
title: Security Fundamentals
sidebar_position: 1
description: Essential security practices for Soroban smart contracts — threat modeling, secure coding patterns, and protecting funds from vulnerabilities.
---

Building on Stellar requires a security-first mindset. Unlike traditional web applications, smart contract vulnerabilities often lead to immediate and irreversible loss of funds.

This guide provides a practical foundation for securing your Soroban smart contracts.

---

## 1. Threat Model Basics

To secure a contract, you must first understand what you are protecting and who you are protecting it from.

### Assets at Risk

- **XLM & Tokens:** Native and SAC-compatible tokens held by the contract.
- **Contract State:** Configuration, balances, and critical business logic parameters.
- **User Funds:** Tokens deposited into the contract or allowances granted to it.

### Potential Attackers

- **Malicious Users:** Individuals attempting to exploit logic flaws for profit.
- **Malicious Contracts:** Contracts that interact with yours to trigger unexpected states (e.g., via callbacks).
- **Validators & Front-runners:** Actors who observe your transactions in the mempool and attempt to execute theirs first to capture value (MEV).

### Attack Surfaces

- **Public Functions:** Any function not protected by `require_auth` is a potential entry point for anyone.
- **External Calls:** Interactions with other contracts can introduce reentrancy or unexpected data.
- **Contract Upgrades:** If the upgrade logic is flawed, an attacker could replace your code with malicious logic.

---

## 2. High-Risk Vulnerability Classes

### Unauthorized Access

**What it is:** Allowing sensitive functions to be executed by the wrong identity.
**Prevention:** Always use `address.require_auth()` to validate the caller.

```rust
// ❌ BAD: No authorization check
pub fn withdraw(env: Env, to: Address, amount: i128) {
    let balance = get_balance(&env);
    move_funds(&env, to, amount);
}

// ✅ GOOD: Proper authorization
pub fn withdraw(env: Env, owner: Address, to: Address, amount: i128) {
    owner.require_auth();
    // Logic continues knowing 'owner' confirmed the call
    move_funds(&env, to, amount);
}
```

### Reentrancy & Cross-Contract Calls

**What it is:** An external contract call that "re-enters" your contract before the first execution is finished, often to exploit inconsistent state.
**Soroban Context:** Soroban has built-in protections against some forms of reentrancy, but logic that spans multiple contract calls or depends on external contract state can still be vulnerable.
**Prevention:** Follow the **Checks-Effects-Interactions** pattern. Update all internal state _before_ calling external contracts.

### Integer Overflow / Underflow

**What it is:** Arithmetic operations exceeding the maximum or minimum value of a type.
**Prevention:** Always use `checked_` arithmetic methods or specialized types that handle overflow.

```rust
// ❌ BAD: Unsafe arithmetic (will panic in debug, wrap in release)
let total = balance + deposit;

// ✅ GOOD: Safe arithmetic
let total = balance.checked_add(deposit).expect("Overflow");
```

### State Inconsistency

**What it is:** Leaving the contract in a "partial" state if a multi-step operation fails midway.
**Prevention:** Use atomic operations and ensure that if one part of a state transition fails, the entire transaction reverts.

### Input Validation

**What it is:** Trusting user-provided data without checking its validity.
**Prevention:**

- Validate `Address` parameters aren't the zero address if applicable.
- Check that amounts are positive and within expected bounds.
- Sanitize any data used to calculate internal state.

### Denial of Service (DoS)

**What it is:** Making a contract unusable by exhausting its resources (CPU, Memory, Storage).
**Soroban Context:** Unbounded loops or excessive storage growth can make transactions too expensive to execute (hitting gas limits).
**Prevention:** Avoid `for` loops over user-generated lists; use pagination or fixed-size structures. Use `Temporary` storage for data that doesn't need to persist indefinitely.

### Precision & Rounding Errors

**What it is:** Loss of value during division or complex financial calculations.
**Prevention:**

- **Multiply before dividing** to maintain precision.
- Use high-precision types (e.g., `i128`).
- Be explicit about rounding (round down for user outputs, round up for protocol fees).

---

## 3. Mitigation Checklist

Use this checklist before every deployment:

- [ ] **Authorization:** All sensitive functions use `require_auth()`.
- [ ] **Arithmetic:** All math uses `checked_*` methods; no risk of overflow/underflow.
- [ ] **State Changes:** Internal state is updated _before_ any external contract calls.
- [ ] **Input Sanitization:** All user inputs (amounts, addresses, metadata) are validated.
- [ ] **Storage Limits:** No unbounded loops or storage growth that could cause DoS.
- [ ] **Events:** Sensitive operations (admin changes, large transfers) emit descriptive events.
- [ ] **Error Handling:** Errors are explicit (using `Result` and custom error enums).

For token contracts (mint, transfer, allowances, vaults, wrappers), complete the dedicated [Token Pattern Security Audit](/docs/security/token-audit) checklist before deployment.

---

## 4. Secure Development Workflow

1.  **Threat Modeling:** Identify assets and entry points during the design phase.
2.  **Implementation:** Use safe patterns (Checks-Effects-Interactions).
3.  **Unit Testing:** Test edge cases (max/min values, zero amounts, unauthorized calls).
4.  **Integration Testing:** Test interactions between multiple contracts.
5.  **Self-Audit:** Review code against the [Mitigation Checklist](#3-mitigation-checklist).
6.  **Peer Review:** Have another developer review the logic and security assumptions.

---

## Related links

- [Authorization](/docs/concepts/authorization) — access control patterns for sensitive functions
- [Token Pattern Security Audit](/docs/security/token-audit) — token-specific audit checklist
- [Governance Security](/docs/security/governance) — voting and timelock risks
- [Cross-Contract Invocation](/docs/concepts/cross-contract-invocation) — safe external call patterns
