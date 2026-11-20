# Single-Range Concentrated Liquidity Pool

> **Educational example only — not production software. Do not deploy with real
> funds.** This intentionally simplified contract is a starting point for
> understanding concentrated-liquidity math on Soroban, not a Uniswap v3
> implementation or a secure AMM.

## License and origin

This is an original Soroban Cookbook example, licensed under the
[MIT License](../../LICENSE) — Copyright (c) 2026 Soroban Cookbook.

This example holds one fixed price range, accepts liquidity contributions and
withdrawals, and swaps in either direction while the resulting price stays
inside that range. It has no tick bitmap, multiple positions, fee accounting,
oracle, reward distribution, or governance. Swaps charge no fee.

## Model

Prices are represented as the square root of token B per token A, scaled by
`1_000_000`. For liquidity `L`, current square-root price `P`, and range
`[P_low, P_high]`, the educational model uses:

- Token A amount: `L * (P_high - P) * scale / (P * P_high)`
- Token B amount: `L * (P - P_low) / scale`

The contract rounds deposit amounts up and withdrawal/swap outputs down. A
swap that would move the price outside the one configured range is rejected;
the contract does not cross a boundary or activate another range.

## Important limitations

- **Not audited, not production-ready, and unsafe for real assets.**
- No fee, oracle, TWAP, tick crossing, multi-position accounting, or
  rebalancing.
- No deposit slippage bounds or protection against adverse price movement
  between a user's quote and execution.
- Integer arithmetic and simplified accounting are for instruction and
  invariant demonstrations, not financial use.
- This contract does not model all token behaviors or adversarial conditions.

Read the source and tests before adapting it. The separate
[`constant-product-amm`](../constant-product-amm/) example demonstrates a
different, non-concentrated pool model.

## Build and test

```bash
stellar contract build --manifest-path examples/single-range-clmm/Cargo.toml
./scripts/test-examples.sh single-range-clmm
```
