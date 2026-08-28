# Community Moderation Plan — Soroban Cookbook

Phase 7 written guidelines for moderating Soroban Cookbook community channels.
Companion to the [Code of Conduct](./CODE_OF_CONDUCT.md) and
[Contributing guide](./CONTRIBUTING.md).

**Objective:** Moderators have a clear policy, response ladder, and escalation
path so community spaces stay welcoming and productive.

**Live site:** [https://soroban-cookbook.dev](https://soroban-cookbook.dev)  
**Repo:** [Soroban-Cookbook/Soroban_Cookbook_online](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online)

---

## Scope (channels in scope)

| Channel | Primary use | Moderation focus |
| --- | --- | --- |
| **GitHub Issues / PRs** | Bugs, features, docs PRs, Wave work | Tone, spam, off-topic, CoC violations in comments |
| **GitHub Discussions** | Q&A, announcements, ideas | Duplicate spam, harassment, unsolicited promotion |
| **Discord** ([invite](https://discord.gg/YNBu3jKEF)) | Real-time help, AMA, community chat | Toxicity, NSFW, scams, doxxing, spam bots |
| **Official social accounts** | Launch posts, tips (see [`SOCIAL_MEDIA.md`](./SOCIAL_MEDIA.md) when present) | Reply moderation; report abuse to platform + escalate internally |

Private maintainer / Wave coordination chats are out of scope for public
moderation logs, but CoC standards still apply to anyone acting as a
representative of the project.

---

## Roles

| Role | Who | Responsibilities |
| --- | --- | --- |
| **Community member** | Anyone participating | Follow the CoC; report issues in good faith |
| **Moderator** | Trusted community leaders (maintainers + designated Discord/GitHub mods) | First response, warnings, mutes/timeouts, content removal, triage |
| **Maintainer / admin** | Repo owners and project leads | Escalations, bans, policy changes, public statements |
| **Security contact** | Via GitHub Security Advisories | Vulnerability reports only — see [`SECURITY.md`](./SECURITY.md) |

Moderators act under the Enforcement Responsibilities in
[`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md). When in doubt, prefer a private
warning and document the decision over a public pile-on.

---

## Standards (quick reference)

Enforce the full CoC. Channel-specific examples:

**Encouraged**

- Helpful, respectful answers (including “I don’t know — try X”)
- Constructive PR / issue review focused on the work, not the person
- Pointing newcomers to Getting Started and `CONTRIBUTING.md`

**Not allowed**

- Harassment, hate, threats, or sexualized content
- Doxxing or sharing private contact info without consent
- Scams, phishing, wallet-drain links, or unpaid “DM me for alpha”
- Sustained spam, brigading, or derailing support threads
- Impersonating maintainers, Stellar, or other projects

Security reports belong in **GitHub Security Advisories**, not public issues or
Discord.

---

## Reporting

Anyone can report a concern.

| Situation | How to report |
| --- | --- |
| Public CoC issue (GitHub) | Flag the comment / open a private maintainer contact via GitHub, or email maintainers if published on the org profile |
| Discord | Use Discord’s report flow **and** ping/DM a listed moderator; do not pile on in-channel |
| Urgent safety / illegal content | Platform report first (GitHub / Discord Trust & Safety), then notify a maintainer |
| Security vulnerability | [GitHub Security Advisories](https://github.com/Soroban-Cookbook/Soroban_Cookbook_online/security/advisories) — see `SECURITY.md` |

Reporters should include: link or screenshot, approximate time (UTC), channel,
handles involved, and whether they need confidentiality. Moderators **must**
respect reporter privacy (CoC Enforcement section).

---

## Escalation path

Use the lowest effective step. Move up when severity is high, the person is a
repeat offender, or the first responder is conflicted.

```text
1. Observe / triage
      │  Gather links, classify severity (see ladder below)
      ▼
2. First-line action (Moderator)
      │  Hide/delete content, warn, timeout/mute, lock thread
      ▼
3. Document
      │  Short private note: who / what / action / links
      ▼
4. Escalate to Maintainer / admin
      │  Needed for bans, public statements, cross-channel bans,
      │  or when the accused is a moderator/maintainer
      ▼
5. Platform / legal
         GitHub/Discord Trust & Safety; law enforcement only if
         required by local law or imminent harm
```

### Conflict of interest

If the report involves a moderator or maintainer, hand off immediately to
another maintainer who is not involved. Do not moderate your own dispute.

### Cross-channel escalation

A temporary or permanent ban on one channel (e.g. Discord) should be reviewed
for the same action on GitHub (block / restrict interactions) when the behavior
is serious or repeated. Maintainers own that decision (step 4).

---

## Response ladder (aligned with CoC)

Map channel tools to the CoC Community Impact Guidelines:

| Level | CoC step | Typical Discord action | Typical GitHub action | Target first response |
| --- | --- | --- | --- | --- |
| **L1** | Correction | Friendly redirect or delete + private note | Hide comment; ask to edit | Within **24h** |
| **L2** | Warning | Formal warning + short timeout | Warning comment + restrict if needed | Within **12h** |
| **L3** | Temporary ban | Timeout / kick / temp ban | Temporary interaction limit / block | Within **4h** for active harm |
| **L4** | Permanent ban | Ban + notify maintainers | Block; close abusive threads | ASAP; maintainer confirmation |

Severe single incidents (threats, doxxing, malware/scam links) may skip to
**L3/L4**. Always record the reason privately so appeals are fair.

---

## Moderator runbook (day-to-day)

1. **Triage** — Is it spam, CoC, support derail, or security?
2. **Contain** — Remove harmful content; mute bots; lock runaway threads.
3. **Communicate** — Prefer private messages for warnings; keep public notes
   factual and short (“Removed for CoC — see CODE_OF_CONDUCT.md”).
4. **Document** — One private log line for L2+ (date, channel, action, links).
5. **Escalate** — Use the path above when unsure or when L3/L4 is needed.
6. **Follow up** — Confirm the reporter that the report was received (without
   sharing confidential details about the other party).

### Do / don’t

| Do | Don’t |
| --- | --- |
| Act consistently with this doc and the CoC | Publicly shame or pile on |
| Assume good intent on first mild offense | Ignore scam / phishing links |
| Ask another mod when unsure | Share reporter identity without consent |
| Point people to docs and Discussions for support | Argue policy in heated threads — lock and take offline |

---

## Appeals

People who receive L2+ actions may appeal once by contacting a **different**
maintainer than the one who issued the action, within **14 days**, with new
context if available. Maintainers’ appeal decisions are final for the project
spaces we control.

---

## Policy ownership

- **Review cadence:** At least every major Phase / launch, or when channels
  change (new Discord, new social accounts).
- **Changes:** Propose edits via PR to this file; maintainers merge.
- **Source of behavioral standards:** [`CODE_OF_CONDUCT.md`](./CODE_OF_CONDUCT.md)
  wins if this runbook and the CoC ever disagree; update this file to match.

---

## Verification checklist (issue #365)

- [x] Written moderation guidelines exist (`COMMUNITY.md`)
- [x] Escalation path documented (triage → mod → maintainer → platform)
- [x] Response ladder mapped to CoC Correction / Warning / Temp / Permanent ban
- [x] Reporting paths listed for GitHub, Discord, and security
- [x] Cross-linked from `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md`

---

*Phase 7 · Community Moderation Plan · Original roadmap issue #277 · Closes #365*
