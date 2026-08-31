# Payment Splitter Example

This example demonstrates a simple payment splitter contract that distributes incoming tokens among a list of payees based on predefined shares in Basis Points (BPS).

## Overview

The `payment-splitter` contract allows you to:
- Initialize the contract with a specific token, an admin address, and a list of payees with their respective shares (summing to 10000 BPS, which equals 100%).
- Anyone can call the `split` function to distribute the current token balance of the contract to the payees according to their shares.
- The `admin` can use the `withdraw` function to handle any edge cases or unauthorized withdrawals.

## Dust Policy
Due to integer division (`balance * share / 10000`), a small amount of "dust" may remain in the contract. This dust is deliberately left in the contract and will be included in the total balance during the next `split` operation. 

## Structure
- `init`: Sets the token, admin, and payee shares. Ensures that total shares equal 10000.
- `split`: Distributes the entire contract's token balance to the configured payees.
- `withdraw`: Requires admin authorization and can be used to move tokens to a specified address.

## Tests
Includes unauthorized withdraw tests, and validates that shares correctly sum to 10000 BPS.
