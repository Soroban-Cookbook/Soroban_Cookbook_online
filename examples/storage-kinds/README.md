# Storage kinds

This example writes the same contract through Soroban's three storage APIs:

- **Instance** stores a small, contract-wide configuration value.
- **Persistent** stores a user/record value that must survive between calls.
- **Temporary** stores an expiring value that can safely be regenerated.

Every entry has a time-to-live (TTL). Persistent and instance entries can be
archived and restored when touched after expiry; temporary entries are deleted
once their TTL expires. Extending a TTL is the contract's rent decision, so
the example exposes one method for extending each kind. Run the tests to see
the different expiry behavior.
