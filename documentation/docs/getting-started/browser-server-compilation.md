---
title: Browser & Server-Side Compilation Spike
description: Feasibility evaluation, architectural design, and constraint analysis for browser-based and server-side compilation of Soroban smart contracts.
sidebar_position: 15
---

# Browser & Server-Side Soroban Compilation

This document provides a technical evaluation and architecture spike for compiling Soroban smart contracts outside of a traditional CLI development environment — specifically evaluating **in-browser compilation** vs. **server-side remote compilation APIs**.

---

## 1. Executive Summary

| Approach | Feasibility | Primary Constraints | Recommendation |
| :--- | :--- | :--- | :--- |
| **Pure In-Browser (WASM `rustc`)** | ⚠️ Low / Experimental | 100MB+ compiler WASM payload, ~1GB+ browser RAM requirement, no filesystem / cargo registry access. | **Not recommended** for production Web IDEs due to resource overhead. |
| **Server-Side Remote Build API** | ✅ High / Production-Ready | Needs containerized sandbox isolation, rate limiting, and compilation caching. | **Recommended approach**. Provides fast, reliable WASM compilation via isolated workers. |
| **Hybrid (Local Web Worker AST + Server Build)** | ✅ High | Syntax checking in browser Web Worker, full compilation on remote build server. | **Optimal UX**. Gives instant editor feedback with reliable server build outputs. |

---

## 2. In-Browser Compilation Evaluation

Compiling Soroban contracts directly inside a web browser requires executing the Rust compiler (`rustc`) and LLVM target backend as WebAssembly (`wasm32-unknown-unknown`).

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Browser / Web Worker                            │
│                                                                        │
│  Source (.rs) ──► [ rustc.wasm ] ──► [ LLVM Backend ] ──► Raw WASM     │
│                         │                                              │
│               Needs 100MB+ WASM asset                                  │
│               Needs 1GB+ browser RAM                                   │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Technical Challenges & Constraints

1. **Compiler Binary Size**:
   - Compiling `rustc` to WebAssembly results in a initial download footprint exceeding **100 MB** (uncompressed).
   - Fetching and parsing this bundle introduces unacceptable initial load latencies for web users.

2. **Memory & Performance Overhead**:
   - Rust compilation relies heavily on LLVM optimizations and macro expansions (e.g. `#[contract]` and `#[contractimpl]` macros from `soroban-sdk`).
   - Browser WebAssembly instances are constrained by memory limits (typically 2GB or 4GB max per tab), leading to out-of-memory crashes on mobile or constrained devices during full LLVM codegen passes.

3. **Cargo Dependency Resolution**:
   - Soroban contracts depend on `soroban-sdk` and standard crates (`core`, `alloc`).
   - In-browser compilation lacks access to local filesystem paths and cargo registry crates (`crates.io`) without virtualizing full network/filesystem layers (e.g., OPFS or MEMFS).

4. **WASM Optimization (`wasm-opt`)**:
   - Soroban binaries require `wasm-opt` pass to strip unused symbols and shrink binary footprint below network ledger limits.
   - Running binaryen/`wasm-opt` in JS/WASM adds additional processing delay in the browser main thread or worker.

---

## 3. Server-Side Remote Build Architecture

A server-side build API provides an isolated microservice that receives Rust source code (or standard contract templates like `examples/hello-world`), compiles it using `stellar contract build`, optimizes the resulting WASM, and returns the compiled bytecode and ABI metadata.

```
┌──────────────┐          POST /api/compile           ┌────────────────────────┐
│              │ ───────────────────────────────────► │  Build API Gateway     │
│   Web App /  │                                      └───────────┬────────────┘
│   Cookbook   │                                                  │
│              │ ◄─────────────────────────────────── ┌───────────▼────────────┐
│              │      { wasm: "...", abi: [...] }     │ Containerized Worker   │
└──────────────┘                                      │ (Docker / gVisor)      │
                                                      │  - cargo build         │
                                                      │  - stellar optimize    │
                                                      └────────────────────────┘
```

### System Architecture & Workflow

1. **API Gateway / Ingestion**:
   - Accepts payload containing `src/lib.rs` and optional `Cargo.toml`.
   - Computes a deterministic SHA-256 hash of the input payload to check against an **Artifact Cache**.

2. **Cache Lookup**:
   - If SHA-256 matches an existing build, return cached WASM and ABI metadata immediately (< 50ms response).

3. **Isolated Compilation Sandbox**:
   - Spawns an isolated container (e.g., Docker, AWS Firecracker, or gVisor sandbox).
   - Executes:
     ```bash
     cargo build --target wasm32-unknown-unknown --release
     stellar contract optimize --wasm target/wasm32-unknown-unknown/release/contract.wasm
     ```

4. **Response Payload**:
   - Returns base64-encoded optimized WASM binary.
   - Returns JSON spec containing contract functions, types, and error definitions.

---

## 4. Security & Resource Limits

To safely run a remote compilation service open to the web, the following constraints must be enforced:

- **Compilation Timeout**: Hard limit of **30 seconds** per compilation task.
- **Memory Allocation**: Max **2 GB RAM** per worker container instance.
- **Network Isolation**: Disable outbound network access inside compilation containers to prevent SSRF and unauthorized network requests.
- **Rate Limiting**: Limit requests to **10 builds/minute per IP address**.
- **Container Ephemerality**: Destroy worker containers after each build pass to prevent state contamination between users.

---

## 5. Reference Implementation (Client API Interface)

The client service below illustrates how frontends interact with a remote compilation backend service:

```typescript
export interface CompilationRequest {
  contractName: string;
  sourceCode: string;
  sorobanSdkVersion?: string;
}

export interface CompilationResponse {
  success: boolean;
  wasmBase64?: string;
  hash?: string;
  abi?: Record<string, unknown>;
  buildLogs?: string;
  error?: string;
}

export async function compileContractRemote(
  req: CompilationRequest,
  apiEndpoint = 'https://api.sorobancookbook.org/v1/compile'
): Promise<CompilationResponse> {
  const response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const errorText = await response.text();
    return { success: false, error: `Compilation service error: ${errorText}` };
  }

  return response.json();
}
```

---

## Related Links

- [Building & Compilation Guide](./building-and-compilation.md) — CLI build pipeline instructions
- [Local Testing & Simulation](./local-testing-and-simulation.md) — Local contract testing workflows
- [Hello World Example](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/tree/main/examples/hello-world) — Target contract template
