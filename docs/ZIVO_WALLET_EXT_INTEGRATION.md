# ZIVO Wallet cross-app payment integration (media → wallet)

Zivosmedia can route money through **ZIVO Wallet** (the ecosystem ledger of
record) via the wallet's cross-application payment ingress, `/api/wallet/ext/*`
(ZIVO-wallet repo, PR #59). This repo now ships the matching client.

## Pieces in this repo

- `supabase/functions/_shared/zivoWalletExt.ts` — signed HTTP client speaking
  the wallet's contract exactly (HMAC-SHA256 over `media.{timestamp}.{rawBody}`,
  headers `X-Zivo-Product` / `X-Zivo-Timestamp` / `X-Zivo-Signature`, integer
  minor-unit amounts, idempotency keys matching `^[A-Za-z0-9:_.-]{8,160}$`).
- `supabase/functions/zivo-wallet-ext/index.ts` — internal-only edge function
  proxy (wrapped in `withSecurity`). Callers must present the project
  **service-role key** as the bearer token; browser sessions are rejected.
  Actions: `health`, `request`, `confirm`, `refund`.

## Configuration (Supabase edge function secrets, MAIN project `slirphzzwcogdbkeicff`)

| Secret | Meaning |
| --- | --- |
| `ZIVO_WALLET_BASE_URL` | Wallet origin, e.g. `https://zivowallet.com` |
| `ZIVO_WALLET_SIGNING_SECRET` | ≥32 chars; must equal the wallet's `WALLET_EXT_SIGNING_SECRET__MEDIA` |

Fail-closed: with either secret unset the client returns
`wallet_ext_not_configured` (503) and never sends a request. The internal
ZivoPay/coin wallet is unaffected — this is an additional, opt-in rail.

## Wallet-side prerequisites (ZIVO-wallet repo / deployment)

1. `WALLET_EXT_INGRESS_ENABLED=true` (default OFF — every ext route 503s until set).
2. `WALLET_EXT_SIGNING_SECRET__MEDIA` set to the same value as above.
3. An audited identity link (`wallet_external_identity_links`) mapping each
   zivosmedia user id (`payerExternalUserId`) to a wallet user. Payments for
   unlinked users are rejected by design.

## Call flow (end to end)

1. `request` — create a `pending` payment obligation:
   `{ idempotencyKey, payerExternalUserId?, payeeWalletId, amount: { amountMinor, currency }, reference: { type, id } }`
   (`sourceProduct`/`reference.product` are pinned to `media` by the client).
2. `confirm` — after this app's own provider (Stripe/PayPal/Square) captured
   the funds: `{ idempotencyKey, provider, providerEventId }`. Idempotent per
   `(payment, providerEventId)` — a duplicate never re-credits.
3. `refund` — `{ idempotencyKey, refundIdempotencyKey, provider, reason? }`.
