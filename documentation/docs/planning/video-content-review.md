---
title: Video Content Review Checklist
description: Phase 6 review checklist for video tutorial content accuracy and quality
sidebar_label: Video Content Review
---

# Video Content Review Checklist

**Issue:** #347  
**Phase:** 6  
**Review Date:** August 28, 2026  
**Reviewer:** Content Accuracy Team

## Overview

This checklist ensures all video tutorial content matches current Soroban SDK version, CLI commands, and best practices before publication.

---

## Video 1: Getting Started with Soroban

### Script Accuracy

| Item                                                | Status     | Notes              |
| --------------------------------------------------- | ---------- | ------------------ |
| Rust installation command (`curl --proto '=https'`) | ☐ Verified | Current as of 2026 |
| `cargo install --locked soroban-cli`                | ☐ Verified |                    |
| `soroban --version` output format                   | ☐ Verified |                    |
| `rustup target add wasm32-unknown-unknown`          | ☐ Verified |                    |
| `soroban contract init` command                     | ☐ Verified |                    |
| `soroban contract build` output                     | ☐ Verified |                    |

### Visual Aids

| Item                                      | Status     | Notes |
| ----------------------------------------- | ---------- | ----- |
| Terminal recording resolution (1920x1080) | ☐ Verified |       |
| Font readability (Fira Code 16pt+)        | ☐ Verified |       |
| VS Code extension names current           | ☐ Verified |       |
| URLs in end screen working                | ☐ Verified |       |

### Content Quality

| Item                                | Status     | Notes |
| ----------------------------------- | ---------- | ----- |
| Narration matches on-screen actions | ☐ Verified |       |
| Pacing appropriate for beginners    | ☐ Verified |       |
| No jargon without explanation       | ☐ Verified |       |
| Calls-to-action clear               | ☐ Verified |       |

---

## Video 2: Your First Soroban Contract

### Script Accuracy

| Item                                                   | Status     | Notes           |
| ------------------------------------------------------ | ---------- | --------------- |
| `soroban contract init my-counter`                     | ☐ Verified |                 |
| Cargo.toml dependencies (`soroban-sdk = "22"`)         | ☐ Verified | SDK v22 current |
| `#![no_std]` explanation correct                       | ☐ Verified |                 |
| `#[contract]` and `#[contractimpl]` macros             | ☐ Verified |                 |
| Storage API (`env.storage().instance()`)               | ☐ Verified |                 |
| `unwrap_or(0)` usage                                   | ☐ Verified |                 |
| Test structure (`Env::default()`, `register_contract`) | ☐ Verified |                 |
| `cargo test` output format                             | ☐ Verified |                 |
| `soroban contract build` output                        | ☐ Verified |                 |
| `soroban keys generate --global`                       | ☐ Verified |                 |
| `soroban keys fund` (friendbot)                        | ☐ Verified |                 |
| `soroban contract deploy` flags                        | ☐ Verified |                 |
| `soroban contract invoke` syntax                       | ☐ Verified |                 |

### Visual Aids

| Item                               | Status     | Notes                         |
| ---------------------------------- | ---------- | ----------------------------- |
| Storage types table accurate       | ☐ Verified | instance/persistent/temporary |
| Code annotations match actual code | ☐ Verified |                               |
| Deploy pipeline diagram correct    | ☐ Verified |                               |
| Contract ID highlighting           | ☐ Verified |                               |
| End screen links working           | ☐ Verified |                               |

### Content Quality

| Item                                 | Status     | Notes |
| ------------------------------------ | ---------- | ----- |
| Code typing speed watchable          | ☐ Verified |       |
| Technical concepts explained clearly | ☐ Verified |       |
| Common pitfalls addressed            | ☐ Verified |       |
| Encouraging tone maintained          | ☐ Verified |       |

---

## Cross-Video Consistency

| Item                                   | Status     | Notes |
| -------------------------------------- | ---------- | ----- |
| SDK version consistent across videos   | ☐ Verified |       |
| CLI command syntax consistent          | ☐ Verified |       |
| Visual style consistent                | ☐ Verified |       |
| Prerequisites clearly stated           | ☐ Verified |       |
| Follow-up content referenced correctly | ☐ Verified |       |

---

## Technical Environment

| Item                               | Status     | Notes |
| ---------------------------------- | ---------- | ----- |
| Soroban SDK version tested against | ☐ Verified | v22.x |
| Soroban CLI version tested against | ☐ Verified |       |
| Rust version tested against        | ☐ Verified |       |
| Testnet availability confirmed     | ☐ Verified |       |
| All commands executed successfully | ☐ Verified |       |

---

## Sign-Off

| Reviewer | Role           | Date | Status     |
| -------- | -------------- | ---- | ---------- |
|          | Content Lead   |      | ☐ Approved |
|          | Technical Lead |      | ☐ Approved |
|          | QA Lead        |      | ☐ Approved |

---

## Issue Tracking

If problems found during review:

1. Log issue with timestamp in video
2. Note the exact command/output that differs
3. Create fix PR with corrected content
4. Re-review affected section after fix

---

## Related Resources

- [Video Tutorial: Getting Started](./video-tutorial-getting-started)
- [Video Tutorial: First Contract](./video-tutorial-first-contract)
