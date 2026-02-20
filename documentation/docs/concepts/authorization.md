# Authorization

Authorization in Soroban ensures only expected identities can execute sensitive contract actions.

## Typical Access Patterns

- Owner/admin-only functions
- Role-based permissions for operators
- User-signed operations for account-scoped actions

## Best Practices

1. Validate caller identity before mutating state.
2. Keep privileged surfaces small and explicit.
3. Emit events for sensitive operations.
4. Add tests for unauthorized access attempts.

## Common Protected Operations

- Setting admins or governance parameters
- Mint/burn operations in token-like contracts
- Upgrading contract logic or config

## Next

- [Storage Patterns](./storage.md)
- [Events](./events.md)
