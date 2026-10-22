# Soroban Counter — React Integration Example

**Issue #956 · Soroban Cookbook**

A minimal, working React application that demonstrates how a frontend connects a
[Freighter](https://www.freighter.app/) wallet and interacts with the Soroban
Cookbook [`counter`](../counter/) smart contract on Stellar Testnet.

## What this example covers

| Feature | Implementation |
|---|---|
| Freighter install detection | `freighterService.ts` → `checkFreighterInstalled` |
| Wallet connection (requestAccess) | `freighterService.ts` → `requestWalletAccess` |
| Network verification | Warns when Freighter is not on Testnet |
| Read contract state | Simulated `get()` call — no signing / fees |
| Write transaction (increment) | Build → simulate → Freighter sign → submit |
| Write transaction (reset) | Same flow, no return value |
| Error handling | Denied access, wrong network, missing config, failed tx |
| Environment config | `.env.example` with all required variables |
| Unit tests | Vitest + Testing Library, all services mocked |

### Vue example — deferred

A parallel Vue example is **deferred**. Maintaining two framework examples at
the same quality bar (tests, README accuracy, dependency pinning) is not
worth the duplication while the React example is still settling. The service
layer (`freighterService.ts`, `counterService.ts`) is framework-agnostic and
can be reused; a Vue port should only be started when a maintainer can keep
its tests and docs in lockstep with this example.

## Prerequisites

- **Node.js ≥ 20** (or Bun ≥ 1.1)
- **Freighter browser extension** — [Chrome](https://chrome.google.com/webstore/detail/freighter/bcacfldlkkdogcmkkibnjlakofdplcbk) | [Firefox](https://addons.mozilla.org/en-US/firefox/addon/freighter-stellar-wallet/)
  - Set to **Test Net** inside the extension
  - Fund the account via [Friendbot](https://laboratory.stellar.org/#account-creator?network=test)
- A **deployed counter contract** on Testnet (see [deploy guide](../../documentation/docs/getting-started/deploy-testnet.md))

## 1 — Install dependencies

```bash
cd examples/frontend-integration-react
npm install
```

## 2 — Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in:

```
VITE_CONTRACT_ID=<your-deployed-counter-contract-address>
```

The `VITE_STELLAR_RPC_URL` defaults to the SDF public Testnet endpoint which
requires no API key for development. See
[api-security.md](../../documentation/docs/getting-started/api-security.md) for
production RPC configuration.

## 3 — Deploy the counter contract (if not already done)

```bash
cd examples/counter

# Build the WASM
stellar contract build

# Fund a test account (first time only)
stellar keys generate --global alice --network testnet --fund

# Deploy
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/counter.wasm \
  --source alice \
  --network testnet
```

Copy the output contract address into `VITE_CONTRACT_ID` in your `.env`.

## 4 — Start the development server

```bash
cd examples/frontend-integration-react
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in the browser where
Freighter is installed.

## 5 — Use the app

1. Click **Connect Wallet** — Freighter will show a permission dialog.
2. Approve the connection.
3. Verify the **Testnet** badge appears (switch Freighter to Test Net if needed).
4. Click **Increment** — Freighter will ask you to sign the transaction.
5. After confirmation, the counter value updates.
6. Click **Reset to 0** to send the reset transaction.

## Running tests

Unit tests mock all network calls so no running wallet or RPC is needed.

```bash
npm test              # run once
npm run test:watch    # watch mode
npm run test:ui       # Vitest browser UI
```

Test files:

| File | Covers |
|---|---|
| `src/services/freighterService.test.ts` | Freighter service — install check, access, network |
| `src/components/WalletConnector.test.tsx` | Connect/disconnect UI states |
| `src/components/ContractInteraction.test.tsx` | Counter display, disabled states, warnings |

## Project structure

```
frontend-integration-react/
├── src/
│   ├── components/
│   │   ├── WalletConnector.tsx       # Connect / disconnect UI
│   │   ├── ContractInteraction.tsx   # Counter read/write UI
│   │   ├── NetworkBadge.tsx          # Shows active network
│   │   └── StatusAlert.tsx           # Global wallet error alert
│   ├── contexts/
│   │   └── WalletContext.tsx         # Wallet state (React context)
│   ├── services/
│   │   ├── freighterService.ts       # @stellar/freighter-api wrapper
│   │   └── counterService.ts         # Counter contract interactions
│   ├── test/
│   │   └── setup.ts                  # Vitest global mocks
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── .env.example                       # Environment variable template
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── README.md
```

## Contract interface

This example targets the `counter` contract at `examples/counter/src/lib.rs`.

```
increment() -> u32   // increment by 1, return new value
get()       -> u32   // read current value (read-only simulation)
reset()     -> ()    // set counter to 0
```

No other methods are invoked. The contract must be deployed before write
operations work.

## Security notes

- **Never put a private key in `.env`** — all signing is done through Freighter.
- The app never reads your secret key; it only calls `signTransaction` which
  keeps the key inside the browser extension.
- Do not change `VITE_NETWORK_PASSPHRASE` unless targeting a non-Testnet network.
- This example is for **Testnet only**. Mainnet transactions use real funds.

## Verification status

| Check | Status |
|---|---|
| Unit tests (mocked Freighter + RPC) | Written; run with `npm test` |
| TypeScript typecheck | `npm run typecheck` |
| Production build | `npm run build` |
| Live Freighter + Testnet end-to-end | **Requires a browser with Freighter installed, a funded Testnet account, and a deployed counter contract** — not executable in headless CI without those credentials. Follow §4–§5 above to verify manually. |

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `@stellar/freighter-api` | 4.1.0 | Wallet connection + signing |
| `@stellar/stellar-sdk` | 13.1.0 | Transaction building + RPC |
| `buffer` | 6.0.3 | Browser polyfill required by stellar-sdk |
| `react` / `react-dom` | 19.0.0 | UI framework |
| `vite` | 6.0.5 | Build tool |
| `vitest` | 2.1.8 | Unit testing |

## Origin

Original work for the Soroban Cookbook. No third-party source code adapted.
See [examples/ORIGIN.md](../ORIGIN.md) for the project-wide origin record.

## License

MIT — see [LICENSE](../../LICENSE).
