---
title: Unaudited Example Notice Policy
description: When pattern and security pages must show the shared unaudited / not-for-production notice, what it says, and where it goes.
sidebar_position: 3
---

# Unaudited Example Notice Policy

Contract code in the Soroban Cookbook is teaching material. It is tested, but it
has not been independently audited. Readers copy it, so every page that ships
contract code must say so in the same words and in the same place.

## When the notice is required

Add the notice to any page under `docs/patterns/` or `docs/security/` that
contains one or more of:

- A `rust` code fence with a `#[contract]` or `#[contractimpl]` block.
- A `<CodeSnippet>` or `src=` fence pulled from a crate under `examples/`.
- A link inviting the reader to deploy or copy a crate under `examples/`.

Pages with only `rust illustrative` fragments (see
[Marking blocks as illustrative](./add-tested-example.md#marking-blocks-as-illustrative))
and no full contract do not need it.

## Placement

Place the notice once per page, **directly above the first contract code
block** (or the first link to an example crate, whichever comes first). Do not
bury it after the code or in a closing "Security considerations" section.

## Required wording

Use the shared component. It is registered globally in MDX, so no import is
needed:

```mdx
<UnauditedExampleNotice />
```

It renders a warning callout titled **Unaudited example — not for production**
with this text:

> The contract code on this page is unaudited teaching material. Do not deploy
> it with real funds or privileges without an independent security review, and
> tests for your own authorization model, reentrancy exposure, and storage TTL
> plan.

Do not paraphrase the wording in a hand-written `:::warning` or
`<PatternCallout>`. If a page needs to call out extra, pattern-specific risks,
pass them as children so they appear inside the same notice:

```mdx
<UnauditedExampleNotice>

The liquidation path trusts a single oracle price; see the gaps listed below.

</UnauditedExampleNotice>
```

## What the notice expects of readers

The notice points readers at three areas every example leaves to them. Pages
should not claim to have covered these for production use:

- **Authorization** — the example's `require_auth` checks fit its own role
  model, not the reader's. See [Authorization](../concepts/authorization.md).
- **Reentrancy** — cross-contract calls in the example are not a guarantee of
  safe call ordering in a larger system. See
  [Security Fundamentals](../security/fundamentals.md).
- **Storage TTL** — examples bump TTLs with fixed values chosen for tests, not
  for a production rent budget. See
  [Storage TTL and State Archival](../concepts/storage-ttl.md).

## Checklist for pattern authors

- [ ] The page uses `<UnauditedExampleNotice />` if it meets a condition above
- [ ] The notice sits directly above the first contract code block
- [ ] Any page-specific warnings are passed as children, not a second callout
