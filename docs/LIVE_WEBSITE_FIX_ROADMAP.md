# ZIVO Live Website — Fix Roadmap

**Date:** 2026-06-08 · **Scope:** planning only — no fixes applied in this audit.
Sequenced per the supplied prioritization rule. Each step notes type (deploy/DNS vs UI), owner, and guardrails.

## Guardrails (apply to every fix PR)
- No auth, payment, or Supabase-migration changes without explicit approval.
- No secrets or `.env` committed — env vars go in the host dashboard.
- No direct pushes to `main`; one focused PR per step.

## Phase 0 — Stop the bleeding (P0 infra/deploy)

| Step | Domain | Action | Type | Owner |
|------|--------|--------|------|-------|
| 0.1 | zivoadmin.com | Create/point DNS; serve a real admin login or "access restricted" page. | DNS/infra | infra + Zivo-Admin |
| 0.2 | zivodriver.com | Locate PR #2's deployment; re-point/republish domain to the Driver build. | Deploy | zivodriver owner |
| 0.3 | zivoschat.com | Set `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY` in host; re-publish. | Config/deploy | ZIVO-CHAT owner |

## Phase 1 — Wrong content in the repo we own (zivosmedia)

| Step | Page | Action | Type | Owner |
|------|------|--------|------|-------|
| 1.1 | `/hotels` | Route `/hotels` to a real Hotels landing (or redirect/port from the working `zivostravel.com/hotels`) instead of the Rides Cambodia geo-gate. | UI/routing | zivosmedia |
| 1.2 | `/travel/checkout` | Wrap the checkout route in `TravelCartProvider` (or guard the hook) so direct nav/refresh doesn't crash. No payment-logic change. | UI/routing | zivosmedia |
| 1.3 | `/flights` `/hotels` `/cars` | Investigate the `emrld.ltd` script injection source; remove if unauthorized. Security triage first, then fix. | Security | zivosmedia + security |
| 1.4 | logged-out roots/feed | Silence the 401 resource noise when unauthenticated. | UI/polish | zivosmedia |

## Phase 2 — Domain-specific landings (deploy + build)

| Step | Domain | Action | Type | Owner |
|------|--------|--------|------|-------|
| 2.1 | zivobusiness.com | Build/point a Business landing (profile creation, software connection, billing concept) instead of the generic feed. | Deploy + UI | confirm repo |
| 2.2 | zivoemployee.com | Build/point an Employee landing (scheduling/payroll/time-clock/training). | Deploy + UI | confirm repo |
| 2.3 | zivosoftware.com | Already correct; add "Continue with Zivosmedia" + ZivoChat in Phase 3. | UI/polish | confirm repo |
| 2.4 | zivoschat.com | Already correct; promote shared-account copy to the literal CTA in Phase 3. | UI/polish | ZIVO-CHAT |

## Phase 3 — Cross-domain identity & navigation foundation

| Step | Scope | Action |
|------|-------|--------|
| 3.1 | all domains | Add the unified **"Continue with Zivosmedia"** SSO CTA. |
| 3.2 | all domains | Add a consistent **ZivoChat support** entry. |
| 3.3 | all domains | Add a cross-product **app switcher** (the 8-app grid). |
| 3.4 | zivoadmin.com | Stand up the **Zivo Admin platform registry** (now that DNS resolves). |
| 3.5 | zivosmedia.com | Solidify the **Zivosmedia identity foundation** that 3.1–3.4 depend on. |

## Repo-ownership confirmation needed before Phase 0/2
`zivodriver`, `ZIVO-CHAT`, `zivosoftware`, `Zivo-Admin` repos all returned **404** via the GitHub connector. Business/Employee repo identity is unknown (they serve the zivosmedia super-app). Confirm names/access or create repos before implementation in those areas. `zivosmedia` and `zivostravel` are confirmed accessible.

---

## Recommended next PR (after this audit)

**Title:** `fix(zivosmedia): route /hotels to a real Hotels landing + guard /travel/checkout provider`

**Why this one first:** It is the highest-impact work that lives entirely in the **one repo we can already access and modify** (`zivosmedia`), needs no DNS, no new repo, no secrets, and no payment/auth changes. It clears two confirmed defects (the flagged `/hotels` P0 and the checkout crash) plus triages the `emrld.ltd` security item — all in scope, all verifiable with the same Playwright harness used here.

**Scope:**
1. `/hotels` → render a Hotels landing (reuse/port the working zivostravel hotels surface, or redirect) instead of the Rides Cambodia geo-gate.
2. `/travel/checkout` → ensure it mounts within `TravelCartProvider` (routing/provider fix only).
3. Open a security ticket for the `emrld.ltd` injected script (no code change until source is identified).

**Out of scope (separate tracks):** DNS for zivoadmin, redeploy of zivodriver, zivoschat env vars, and the cross-domain SSO/app-switcher foundation — these need infra access and repo-ownership confirmation first.
