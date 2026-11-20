---
time: 10
sidebar_position: 6.5
title: Stellar Networks
description: One table of the four Stellar networks — local/standalone, testnet, futurenet, and mainnet — with RPC URLs, friendbot, network passphrases, and when to use each.
image: /img/soroban-social-card.png
---

# Stellar Networks

Soroban contracts run on the same four Stellar networks you deploy to. Each
network has a unique **network passphrase** that is hashed into every signature:
a transaction signed for one network is **invalid on every other network**. Getting
the passphrase (or RPC URL) wrong is the most common deploy failure, so keep
this table handy.

| Network | When to use it | RPC URL | Network passphrase | Friendbot / faucet |
| ------- | -------------- | ------- | ------------------ | ------------------ |
| **Local** (`stellar container` / Docker) | Fast, offline iteration; deterministic tests; no fees | `http://localhost:8000/rpc` | `Standalone Network ; February 2017` | `http://localhost:8000/friendbot` |
| **Testnet** | Stable, shared development and validation | `https://soroban-testnet.stellar.org` | `Test SDF Network ; September 2015` | `https://friendbot.stellar.org` |
| **Futurenet** | Bleeding-edge protocol features before they reach testnet | `https://rpc-futurenet.stellar.org` | `Test SDF Future Network ; October 2022` | `https://friendbot-futurenet.stellar.org` |
| **Mainnet** | Production — real XLM, permanent, no resets | Provider-specific (bring your own RPC) | `Public Global Stellar Network ; September 2015` | None |

---

## Quick choice guide

- **Iterating on code or CI?** Use **local**. It is instant, free, and completely
  isolated — ideal for unit tests and reproducible runs.
- **Prototyping against a shared network?** Use **testnet**. It mirrors mainnet
  behavior, stays up continuously, and funds accounts free via Friendbot.
- **Testing the latest protocol/SDK features?** Use **futurenet**. It tracks
  unreleased network upgrades, resets unpredictably, and should not be treated
  as stable.
- **Shipping real value?** Use **mainnet**. There is no Friendbot — you acquire
  XLM and bring your own trusted RPC endpoint. See
  [Deploy to Mainnet](/docs/getting-started/deploy-mainnet).

> **Passphrase errors.** If a transaction fails with `bad auth` or `unknown
> network passphrase`, you signed for the wrong network — check the passphrase
> in your SDK or `stellar network` configuration against the table above.

---

## Local / standalone

A local (standalone) network runs entirely on your machine with everything
listening on port `8000`. The fastest way to start one is the Stellar CLI:

```bash
stellar container start
```

Or with Docker directly:

```bash
docker run -i -p 8000:8000 stellar/quickstart --local
```

Then configure the network in the Stellar CLI:

```bash
stellar network add --global local \
  --rpc-url http://localhost:8000/rpc \
  --network-passphrase "Standalone Network ; February 2017"
```

Fund an account with the local Friendbot:

```bash
curl "http://localhost:8000/friendbot?addr=$(stellar keys address alice)"
```

A standalone network closes a ledger about every second, so deployments and
invocations are effectively instant. State is wiped when you stop the container
— [Local Testing and Simulation](/docs/getting-started/local-testing-and-simulation)
covers the full offline workflow.

---

## Testnet

The main public development network. It is reset a few times a year (announced
in advance) so anything you deploy may later disappear — treat it as
throwaway.

```bash
stellar network add --global testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"
```

Fund an account:

```bash
stellar keys fund alice --network testnet
# or
curl "https://friendbot.stellar.org?addr=$(stellar keys address alice)"
```

Full deployment steps: [Deploy to Testnet](/docs/getting-started/deploy-testnet).

---

## Futurenet

Futurenet runs protocol features that have not yet shipped to testnet or
mainnet, making it the place to try brand-new SDK and network capabilities.
It resets **as needed, without notice**, so it is unsuitable for anything that
must persist.

```bash
stellar network add --global futurenet \
  --rpc-url https://rpc-futurenet.stellar.org \
  --network-passphrase "Test SDF Future Network ; October 2022"
```

Fund an account:

```bash
curl "https://friendbot-futurenet.stellar.org?addr=$(stellar keys address alice)"
```

---

## Mainnet

The production network. Deployments are permanent, state is valuable, and there
is **no Friendbot** — accounts are funded with real XLM you purchase and send
in. Stellar does not publish a public mainnet RPC for production use; configure
your own node or a trusted provider's endpoint:

```bash
stellar network add --global mainnet \
  --rpc-url <your-trusted-mainnet-rpc-url> \
  --network-passphrase "Public Global Stellar Network ; September 2015"
```

See [Deploy to Mainnet](/docs/getting-started/deploy-mainnet) for the full
risk-aware workflow.

---

## Verifying your network configuration

Confirm what the CLI resolves for a name:

```bash
stellar network ls
```

If the RPC URL or passphrase ever looks wrong, remove and re-add the network or
edit the entry directly. When in doubt, check the network's health:

```bash
curl -X POST "<rpc-url>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"getHealth"}'
```

A healthy RPC returns `{"status":"healthy"}`.

---

## Next steps

- [Deploy to Testnet](/docs/getting-started/deploy-testnet) — put a contract on the shared test network
- [Deploy to Mainnet](/docs/getting-started/deploy-mainnet) — risk-aware production deployment
- [Local Testing and Simulation](/docs/getting-started/local-testing-and-simulation) — iterate without any network
- [Stellar network documentation](https://developers.stellar.org/docs/networks) — official comparison and passphrases