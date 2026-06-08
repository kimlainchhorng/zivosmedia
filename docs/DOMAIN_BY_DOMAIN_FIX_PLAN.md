# Domain-by-Domain Fix Plan

**Date:** 2026-06-08 · Audit only. Synthesizes the live website audit + this readiness pass into per-domain actions. Deployment topology: one zivosmedia build + worker serves all hosts via app-side hostname detection (`src/App.tsx`); `admin.zivosmedia.com` is a separate Zivo-Admin app; travel has a (incomplete) dedicated Supabase backend.

| Domain | Live state | Root cause | Action | PR(s) |
|--------|-----------|------------|--------|-------|
| **zivosmedia.com** | Loads; `/hotels` fixed in repo (PR#66) but verify live; `/travel/checkout` fixed in HEAD, live stale | Deploy lag; missing cross-app UX | Deploy HEAD; add Continue-with-Zivosmedia, app switcher, ZivoChat entry | 1, 8, 9, 10 |
| **zivobusiness.com** | Generic feed | `ZivoBusinessHome.tsx` is WIP/undeployed | Finish + commit + build + host-route + deploy business landing | 6 |
| **zivodriver.com** | Generic feed | Driver landing WIP/undeployed (`ZivoDriverHome.tsx`, routed `App.tsx:1682`) | Commit + build + deploy; verify host binding | 4 |
| **zivoemployee.com** | Generic feed | `ZivoEmployeeHome.tsx` WIP/undeployed | Finish + deploy employee landing | 7 |
| **zivoschat.com** | Chat login, but env warning | Built without `VITE_SUPABASE_URL`/`_PUBLISHABLE_KEY` | Set env in host + re-publish; add Continue-with-Zivosmedia copy→CTA | 5, 10 |
| **zivosoftware.com** | Correct software landing | Missing cross-app UX | Add Continue-with-Zivosmedia + ZivoChat + Business cross-link | 8, 10, 23 |
| **zivostravel.com** | Best-built; `/hotels` correct | Missing literal Continue-with-Zivosmedia + ZivoChat button; Travel→Driver not surfaced | SSO pilot + ZivoChat entry + Travel→Driver flow | 12, 10, 24 |
| **zivoadmin.com / admin.zivosmedia.com** | DNS NXDOMAIN (down) | No DNS/host; separate Zivo-Admin repo | DNS + access-restricted landing/runbook; start platform registry | 3, 11 |

## Cross-domain (apply to all hosts once landings exist)
- Continue with Zivosmedia (PR 8/12) · App switcher (PR 9) · ZivoChat support entry (PR 10/13) · per-domain SEO/schema (PR 18) · cookie-banner/safe-area cleanup (PR 29).

## Guardrails
Deploy-only or docs-only where possible; no auth/payment/migration/secret changes; confirm repo ownership for driver/chat/admin/software/business (most GitHub repos returned 404 in session) before targeting them.
