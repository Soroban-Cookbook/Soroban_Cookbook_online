---
title: Bytes, BytesN, and Hashes
description: Choose the right Soroban byte type and convert hashes without length or encoding errors.
---

# Bytes, BytesN, and Hashes

Soroban represents binary data with byte types, not hexadecimal strings. Choosing the right type
helps catch length mistakes early and avoids confusing a digest with the data it was computed from.

## Choose a type

| Type | What it represents | Typical use |
| --- | --- | --- |
| `Bytes` | A variable-length sequence of bytes | Preimages, serialized data, and identifiers with variable length |
| `BytesN<N>` | A sequence of exactly `N` bytes | Fixed-width digests, public keys, and signatures |
| `crypto::Hash<N>` | A fixed-width value produced by a Soroban cryptographic host function | The result of `env.crypto().sha256(...)` or another supported hash function |

`Hash<N>` is a semantic wrapper around `BytesN<N>`. It is returned by cryptographic host functions
and can be converted into `BytesN<N>` or `Bytes`. At contract boundaries, a hash is represented as
`BytesN<N>`; receiving a `BytesN<N>` does not prove that it was produced by a cryptographic
function. Use `BytesN<N>` for caller-supplied digests and do not rely on `Hash<N>` as a stored
provenance marker.

## Conversion table

| From | To | Conversion | What to watch for |
| --- | --- | --- | --- |
| `[u8; N]` | `Bytes` | `Bytes::from_array(&env, &array)` | Length is `N`, but the resulting type is variable-length. |
| `[u8; N]` | `BytesN<N>` | `BytesN::from_array(&env, &array)` | The array's size must match the const generic. |
| `BytesN<N>` | `Bytes` | `.into()` | Infallible; the bytes are preserved, but the fixed-size type information is lost. |
| `Bytes` | `BytesN<N>` | `.try_into()` | Returns an error unless the byte length is exactly `N`. |
| `Hash<N>` | `BytesN<N>` or `Bytes` | `.into()` | Infallible conversion of the hash output; it does not hash the value again. |
| `Hash<N>` | `[u8; N]` | `.into()` | Infallible fixed-size array conversion. |

For example, SHA-256 returns `Hash<32>`. Keep that type where possible, or explicitly convert it
when an API expects bytes:

```rust
use soroban_sdk::{crypto::Hash, Bytes, BytesN, Env};

fn digest_as_bytes(env: &Env, preimage: &Bytes) -> Bytes {
    let digest: Hash<32> = env.crypto().sha256(preimage);
    let fixed_digest: BytesN<32> = digest.into();
    fixed_digest.into()
}
```

To accept a variable-length value and require a 32-byte digest, use the checked conversion:

```rust
let digest: BytesN<32> = supplied_bytes
    .try_into()
    .map_err(|_| Error::InvalidPreimage)?;
```

Handle the conversion error as normal input validation. Avoid `unwrap()` or `expect()` on bytes
supplied by a caller: the wrong length would turn ordinary invalid input into a panic.

## Hex strings are not bytes

Hexadecimal is a text representation of bytes. For example, a 32-byte digest is shown as 64 hex
characters (or 66 characters with a `0x` prefix). The text `"deadbeef"` is eight UTF-8 bytes; it is
not the four bytes `0xde, 0xad, 0xbe, 0xef`.

Decode hex in the client or other off-contract code, then pass the decoded binary bytes to Soroban.
Reject invalid hex and check the decoded byte length before constructing a `BytesN<N>`. Strip a
`0x` prefix only if the input format allows it. Do not pass hex text directly to `Bytes::from_slice`
when the contract expects the decoded digest.

## HTLC hashlock example

The [HTLC swap example](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/blob/main/examples/htlc-swap/src/lib.rs)
hashes the preimage and compares the result with the stored hashlock:

```rust
let preimage_hash: Bytes = env.crypto().sha256(&preimage).into();
if preimage_hash != swap.hashlock {
    return Err(Error::InvalidPreimage);
}
```

The hash function returns a 32-byte `Hash<32>`; the example converts it to `Bytes` because
`Swap.hashlock` is declared as `Bytes`. A fixed-width representation such as `BytesN<32>` can make
the hashlock's expected length explicit. When accepting a hashlock as `Bytes`, validate that its
length is 32 bytes before storing it. The swap identifier is a separate value: the example hashes
the hashlock again to derive `swap_id`.

See the [HTLC pattern](../patterns/htlc-swap.mdx) and [custom types](../patterns/custom-types.mdx)
for related examples.
