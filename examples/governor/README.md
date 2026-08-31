# Governor Pattern

A comprehensive governance framework implementing the Governor + Timelock pattern commonly used in DAOs.

## Overview

This example demonstrates a split architecture for on-chain governance:

- **Governor Contract** - Manages proposals, voting, and governance parameters
- **Timelock Contract** - Handles execution delays for time-locked transactions

## Features

- Proposal creation with configurable parameters
- Voting with For/Against/Abstain options
- Quorum and approval threshold enforcement
- Timelock delay before execution
- Proposal cancellation by proposer or admin
- Full governance lifecycle: Pending → Active → Succeeded → Queued → Executed

## Governance Parameters

| Parameter | Description |
|-----------|-------------|
| `voting_period` | Duration of voting in ledger sequences |
| `voting_delay` | Delay before voting starts after proposal creation |
| `quorum` | Minimum votes required for proposal to pass |
| `approval_threshold_bps` | Percentage of votes needed (basis points, 5000 = 50%) |
| `timelock_delay` | Time delay between queuing and execution |

## Usage

```rust
// Initialize governor
governor.initialize(
    &admin,
    &7200,  // voting_period
    &100,   // voting_delay
    &3,     // quorum
    &1,     // proposal_threshold
    &5000,  // approval_threshold_bps (50%)
    &3600,  // timelock_delay (1 hour)
);

// Create proposal
let id = governor.propose(
    &proposer,
    &description,
    &targets,
    &values,
    &calldatas,
    &signatures,
);

// Cast vote
governor.cast_vote(&voter, &id, &Vote::For);

// Queue succeeded proposal
governor.queue(&id);

// Execute after timelock
governor.execute(&id);
```

## Proposal States

1. **Pending** - Voting has not started yet
2. **Active** - Voting is in progress
3. **Defeated** - Did not meet quorum or approval threshold
4. **Succeeded** - Passed voting, ready to queue
5. **Queued** - Waiting for timelock delay
6. **Executable** - Timelock has elapsed, ready to execute
7. **Executed** - Actions have been executed
8. **Canceled** - Proposal was canceled

## Testing

```bash
cargo test -p governor
```
