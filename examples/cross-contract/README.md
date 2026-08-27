# Cross-Contract Invocation Example

This example demonstrates safe cross-contract invocation patterns in Soroban, including:

- **Caller Contract** - A vault that manages user funds by calling an external token contract
- **Callee Contract** - A simple token contract that the vault interacts with
- **Error Handling** - Using `try_*` methods to gracefully handle callee failures
- **Security Patterns** - Reentrancy protection, auth validation, and defensive coding
- **Comprehensive Tests** - Coverage of both success and failure scenarios

## Contracts

### Token Contract (`token.rs`)
A minimal token implementation that demonstrates:
- Transfer functionality with authorization
- Balance tracking  
- Error conditions (insufficient balance, unauthorized access)

### Vault Contract (`vault.rs`)
A vault that demonstrates cross-contract calls:
- Deposits tokens by calling the token contract
- Withdrawals with fallback mechanisms
- Emergency recovery using `try_*` methods
- Proper state management before external calls

## Key Learning Points

1. **Typed Clients**: Using SDK-generated clients for compile-time safety
2. **Error Recovery**: Using `try_*` methods to handle callee failures
3. **State Management**: Completing storage updates before cross-contract calls
4. **Authorization Flow**: Properly propagating `require_auth` calls
5. **Testing Strategy**: Testing both success and failure paths

## Testing

The example includes comprehensive tests covering:
- Successful cross-contract flows
- Error propagation and recovery
- Authorization requirements
- Budget consumption patterns
- Reentrancy protection

Run tests with:
```bash
cargo test
```

## Related Documentation

- [Cross-Contract Invocation Concept](../../documentation/docs/concepts/cross-contract-invocation.md)
- [Error Handling Patterns](../error-handling/)
- [Authorization Examples](../authorization/)