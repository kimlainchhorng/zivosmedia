# ZIVO Review — Shared Profile & Privacy (prototype notes)

**Scope:** documentation + presentation-only prototype for external review. No real
identity, auth, RLS, or Supabase behavior is changed. Fictional data only.

## Current reality (not yet unified — stated honestly)

ZIVO Media and ZIVO Chat are **separate applications in separate repositories**, each
with its own auth and Supabase project. They are **cross-linked**, not merged. This
review does **not** claim a single unified identity system exists today; it prototypes
the intended shared-profile *experience* and documents the privacy rules it must honor.

| Concern | Intended behavior | Status |
|---|---|---|
| One ZIVO profile identity | A single ZIVO account presents one profile across Media and Chat | **Prototype only** — apps are separate today; a shared identity provider is required |
| Profile → Chat navigation | Opening "Message" on a Media profile continues the thread in ZIVO Chat | Cross-link exists; unified session hand-off is future work |
| Privacy-aware profile fields | Only fields the viewer is allowed to see are shown; sensitive fields gated | Prototyped in `/review/snapshot/media?path=/media/profile` & `…/privacy` |
| Blocked-user consistency | A block in one surface applies everywhere the identity is shown | **Must be enforced server-side**; prototyped as a consistent blocked state in both apps |
| Report / mute behavior | Report and mute are explicit, reversible-by-support, and never silently reveal the reporter | Prototyped (`…/media/report`, `…/media/muted-user`, `…/chat/reported-user`) |
| Phone-number hiding | A phone number is **never** shown to another user; contact is relayed | Prototyped everywhere (profiles, contacts) — no number rendered |
| Message-request state | Messages from non-connections land in a filtered request state, not the inbox | Prototyped (`…/media/privacy` message requests) |
| Private-account state | A private account hides posts from non-approved followers | Prototyped (`…/media/other-profile` private variant) |

## Privacy rules honored by the review surface

- No real profile, conversation, contact, **phone number**, media, token, or credential
  is rendered — all data is fictional.
- Every control is inert: nothing follows, blocks, reports, mutes, messages, uploads,
  calls, or changes privacy.
- Blocked/muted/reported states render as **read-only** with disabled reversal controls.
- Cross-app entity cards use **opaque fixture IDs**, and note that the real app requires
  authentication and that a blocked-user state prevents access.

## Recommendation for Claude Run 1 (deployment owner)

Before any unified-identity claim ships: implement a shared identity provider with a
single source of truth for block/mute/report, enforce it in **RLS** (not just UI), and
verify blocked-user consistency across Media, Chat, and the wallet with automated tests.
