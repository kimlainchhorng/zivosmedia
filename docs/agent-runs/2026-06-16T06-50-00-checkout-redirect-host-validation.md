# zivosmedia pass 2 — server-returned payment-redirect host-validation

**Date:** 2026-06-16
**Scope:** zivosmedia only
**Class:** Server (edge-function)-returned payment URL handed straight to a navigation
sink (`window.location.href` / Capacitor `Browser.open`) with no host validation —
the highest-value phishing target in a billing flow.
**Status:** Done. Gate green: `npm run type-check` (tsc exit 0) + `npm run build` (✓ built).
Six files changed (one was the shared `softwareCheckout.ts`, mirrored from zivosoftware).
**Advisors:** DeepSeek (MCP) confirmed the finding class, the `*.stripe.com` host scope for
Connect, the absence of a hostname-parse bypass, and that throwing (→ existing error toast)
is the right UX. Manual file + edge-function-source verification was the primary basis.

## Baseline
`npm run type-check` = 0 errors and `npm run build` = success before the call-site edits
(softwareCheckout.ts central guard had already landed earlier this pass). The repo already
ships a rich `src/lib/urlSafety.ts` allowlist module — this pass *activates* it at the
redirect sinks that were skipping it, rather than introducing new policy.

## Finding — payment redirects skip the existing urlSafety allowlist
The app already has `isAllowedCheckoutUrl()` (allowlist: checkout/pay/billing.stripe.com) but
several server-returned payment redirects never call it. Each invokes an edge function and
then navigates to `data.url` directly. A compromised or buggy edge response could bounce the
user/owner to a look-alike billing page; `noopener`/native-browser do not mitigate phishing.

Authoritative returned host confirmed from each edge function's source before guarding (so a
too-narrow allowlist can't block a **real** live-Stripe payment):
- `unlock-media-checkout` → `checkout.sessions.create` → **checkout.stripe.com**
- `subscribe-to-tier` → `checkout.sessions.create` → **checkout.stripe.com**
- `create-ads-wallet-topup` → `checkout.sessions.create` → **checkout.stripe.com**
- `connect-onboard` → `accountLinks.create` → **connect.stripe.com** (NOT in the checkout list)

## Fix (minimal, additive — validate before every navigate)
1. `src/lib/urlSafety.ts` — add `isAllowedStripeConnectUrl()` (`https` + `*.stripe.com`) for the
   Connect account-link host, which the checkout allowlist intentionally doesn't cover. Broad
   `*.stripe.com` (every host Stripe-controlled) avoids a false-positive blocking a live
   onboarding redirect; matches the zivodriver/zivosoftware pass-2 decision.
2. `src/components/chat/ChatMessageBubble.tsx` — `if (!isAllowedCheckoutUrl(data.url)) throw …`
   right after the existing `if (!data?.url) throw`; the existing catch already toasts
   "Payment failed to start" / "Unlock failed" — no UI change.
3. `src/components/creator/CreatorTiersSubscribe.tsx` — same `isAllowedCheckoutUrl` throw inside
   `if (data?.url)`; existing catch toasts `e.message`.
4. `src/components/admin/AdsStudioWalletGuard.tsx` — guard the top-up URL; on reject, reuse the
   file's `toast.error(...) + return` idiom instead of throwing.
5. `src/components/admin/store/salon/SalonPaymentUsSection.tsx` — gate the `connect-onboard`
   redirect on `isAllowedStripeConnectUrl`; an invalid URL falls through to the existing
   "Stripe didn't return an onboarding URL. Try again." branch.
6. `src/lib/software/softwareCheckout.ts` — central `isStripeHostedUrl` (`*.stripe.com`) guard
   before `createSoftwareCheckoutUrl` returns (mirror of the zivosoftware pass-2 fix; this file
   is shared between the two repos).

## Advisor reconciliation (DeepSeek, verified against the files)
1. **`*.stripe.com` for Connect is correct, not pinned `connect.stripe.com`** — blocking a real
   onboarding redirect (false positive, live account) is costlier than accepting another
   Stripe-owned subdomain; an attacker controlling the edge fn still can't serve a non-Stripe
   host. Real defense-in-depth.
2. **No hostname-parse bypass** — `new URL(raw).hostname` strips userinfo(`@`), backslashes, and
   protocol-relative `//`; `endsWith('.stripe.com')` rejects `stripe.com.evil.com`,
   `notstripe.com`, `evilstripe.com`; `https`-only rejects `//evil.com`. (Punycode/IDN lookalikes
   are a non-issue here — Stripe hosts and our backend are pure ASCII.)
3. **Throwing → existing toast is right UX** and legitimate defense-in-depth (stale/backdoored
   edge fn, supply-chain mutation), not theater.

## Deliberately NOT guarded this pass (live-key false-positive risk)
Mixed-PSP sinks where the returned host is **not** a single confirmed Stripe host —
`TipSheet.tsx`, `LodgingEmbeddedCheckout.tsx`, `GroceryCheckoutDrawer.tsx` (PayPal `approve_url`
/ Square / ABA / card branches). Guarding these needs a per-PSP allowlist verified against each
provider's live host; left as a documented follow-up rather than risk blocking a real payment.

## Files changed
- `src/lib/urlSafety.ts` — add `isAllowedStripeConnectUrl`.
- `src/components/chat/ChatMessageBubble.tsx` — guard `unlock-media-checkout` url.
- `src/components/creator/CreatorTiersSubscribe.tsx` — guard `subscribe-to-tier` url.
- `src/components/admin/AdsStudioWalletGuard.tsx` — guard `create-ads-wallet-topup` url.
- `src/components/admin/store/salon/SalonPaymentUsSection.tsx` — guard `connect-onboard` url.
- `src/lib/software/softwareCheckout.ts` — central `isStripeHostedUrl` guard (shared w/ zivosoftware).

## Verification
- `npm run type-check` = tsc exit 0; `npm run build` = ✓ built.
- `git diff --stat` confirms only these 6 files (50 insertions, 3 deletions). The large
  car-rental / autorepair / hooks cluster of modified files is concurrent peer-agent work —
  not touched here.

## Notes
- No commit/push/deploy (owner deploys; live Stripe pk_live key). Local changes only.
