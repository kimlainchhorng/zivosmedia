# ZIVO Cross-Domain Navigation Status

**Date:** 2026-06-08 · **Scope:** audit only.
How the 8 products link to each other and share identity today.

## 1. Identity / SSO ("Continue with Zivosmedia")

| Domain | Literal "Continue with Zivosmedia" CTA | Shared-account concept present | Notes |
|--------|----------------------------------------|--------------------------------|-------|
| zivosmedia.com | ❌ | n/a (is the identity provider) | Standard Log in / Sign up. |
| zivobusiness.com | ❌ | ❌ | Generic super-app auth. |
| zivodriver.com | ❌ | ❌ | Generic super-app auth. |
| zivoemployee.com | ❌ | ❌ | Generic super-app auth. |
| zivoschat.com | ❌ | ✅ "Use your ZIVO Media account." | Closest to the SSO model. |
| zivosoftware.com | ❌ | ❌ | Own Log in / Sign up. |
| zivostravel.com | ❌ | ⚠️ "continue in Zivos Media chat" (support only) | Has a "Live bridge → zivosmedia" data handoff. |
| zivoadmin.com | — | — | DNS fail. |

**Finding:** The literal **"Continue with Zivosmedia"** unified-SSO button exists on **0 / 8** domains. Only zivoschat.com expresses the shared-identity idea in copy. This is the single most consistent cross-domain gap (**P1**).

## 2. App switcher / cross-product links (the 8-app grid)

| Domain | Cross-domain app switcher? | What exists instead |
|--------|----------------------------|---------------------|
| zivosmedia.com | ❌ | Internal service nav (Feed, Reels, Flights, Hotels, Cars, Delivery, Shopping) — all same-origin routes. |
| zivobusiness.com | ❌ | Same internal super-app nav. |
| zivodriver.com | ❌ | Same internal super-app nav. |
| zivoemployee.com | ❌ | Same internal super-app nav. |
| zivoschat.com | ❌ | Chat sign-in only. |
| zivosoftware.com | ❌ | Software / Workflow / Business Page / Security (own internal nav). |
| zivostravel.com | ❌ | Flights / Hotels / Cars / Bus / Trips / Wallet / Support (own internal nav) + zivosmedia data bridge. |
| zivoadmin.com | — | DNS fail. |

**Finding:** No domain exposes a cross-product **app switcher** linking to the other 7 ZIVO domains. Each app is an island; the only inter-app link discovered is zivostravel's data "bridge" back to zivosmedia (not a user-facing switcher). (**P2**, foundation for the Admin platform registry / Zivosmedia identity work.)

## 3. ZivoChat support entry

| Domain | ZivoChat support visible | Notes |
|--------|--------------------------|-------|
| zivosmedia.com | ❌ | `/support/new` is a ticket form, not ZivoChat. |
| zivobusiness.com | ❌ | — |
| zivodriver.com | ❌ | — |
| zivoemployee.com | ❌ | — |
| zivoschat.com | ✅ | The chat product itself. |
| zivosoftware.com | ❌ | — |
| zivostravel.com | ⚠️ | Support page says "continue in Zivos Media chat" but no embedded entry. |
| zivoadmin.com | — | DNS fail. |

**Finding:** A consistent **ZivoChat support entry** is present on only 1 / 8 domains. (**P1**.)

## 4. Product-to-product workflow connections

| Expected connection | Status |
|---------------------|--------|
| Travel → Driver (pickup/transfer) | ⚠️ zivostravel `/cars` mentions driver/pickup; no explicit Travel→Driver workflow link. |
| Business ↔ Software | ✅ conceptually shared (zivosmedia `/business` == zivosoftware `/business` Software workspace). |
| Travel → Zivosmedia (data/identity) | ✅ zivostravel has a "Live bridge → zivosmedia" handoff. |
| Chat → Zivosmedia (identity) | ✅ zivoschat "Use your ZIVO Media account". |
| Everything → unified SSO | ❌ no shared "Continue with Zivosmedia". |

## 5. Summary

- **Strongest cross-domain link today:** zivostravel ↔ zivosmedia (data bridge) and zivoschat → ZIVO Media account.
- **Biggest gaps:** unified SSO CTA (0/8), app switcher (0/8), consistent ZivoChat support (1/8).
- These three gaps are the natural scope of the later "Zivosmedia identity foundation" and "Zivo Admin platform registry" work — but only **after** the P0 deploy/DNS/wrong-content fixes land.
