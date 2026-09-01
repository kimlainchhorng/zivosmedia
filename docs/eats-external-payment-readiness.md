# Eats external payment readiness

## Release status

New Eats ordering is release-disabled in the current mobile candidate. Menus
remain browseable, but `VITE_EATS_ORDERING_ENABLED` must stay `false` until the
server-owned order, wallet, and payment-status functions are deployed together
with their reviewed migrations and every active restaurant has a verified
dispatch origin. The customer UI and order hook both fail closed while this
gate is off.

PayPal and Square are release-disabled in the customer UI and in the Edge
Function payment authority. Changing environment flags alone cannot enable
either provider.

After ordering itself is deliberately enabled, the supported payment paths are
Stripe card, ZIVO Wallet, and cash on delivery. PayPal and Square remain
separately disabled.

## Required before PayPal or Square can be enabled

- Implement a durable merchant payout ledger and retryable merchant settlement
  for the provider. Collecting customer money without a corresponding merchant
  settlement path is not allowed.
- Preserve exact provider payment and refund IDs, amount, currency, status, and
  generation-specific idempotency keys through settlement, cancellation, and
  webhook recovery.
- For PayPal, implement read-only reconciliation of manual or dashboard refunds
  to the exact refund transaction records. A capture-state webhook is not exact
  refund evidence by itself.
- Configure the production provider mode, credentials, exact signed webhook
  destination, and webhook verification secret.
- Pass sandbox concurrency, partial-refund, failed-refund, duplicate-webhook,
  stale-event, merchant-payout, and cancellation-recovery tests.
- Complete a reviewed live smoke with a dedicated low-value test order and
  verify customer refund, merchant settlement, ledger, notification, and retry
  evidence before changing either source capability or environment flag.

Refund and webhook reconciliation for any historical payment must remain
available when new-charge creation is disabled.
