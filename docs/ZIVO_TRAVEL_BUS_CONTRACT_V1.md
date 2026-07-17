# ZIVO Travel — Bus Booking Ownership & Shared Contract (v1)

**Status:** v1 (2026-07-17). Companion doc lives in the `zivostravel` repo at the same
path. Change the version and add a changelog entry whenever a field, status, or error
code changes; both repos must move together.

**Scope:** the one production customer journey for the **bus** vertical:

```
search → select → passenger/customer details → price confirmation →
authenticated booking intent → payment handoff → payment confirmation →
confirmed booking → receipt → My Trips → notification → cancellation/refund request
```

Two systems participate:

- **Zivosmedia** (`zivosmedia` repo, Supabase project `slirphzzwcogdbkeicff`) — the central
  authority. Owns identity, checkout, wallet, payment, and the authoritative bus booking
  record. Hosts the live bus engine (`BusBookingPage`, `BusTicketsPage`,
  `BusOperatorConsole`) plus the `bus_*` schema, the bus RPCs, and the Stripe payment
  Edge Functions.
- **Zivo Travel** (`zivostravel` repo, Supabase project `xbllvmpomorawkcrtbcq`) — the
  dedicated customer travel product. Owns the customer-facing browse/search/review
  experience and a **staged** booking-intent bridge. `dedicatedBackendEnabled=false`;
  it currently deep-links live checkout/payment back to the authority.

---

## 1. Ownership matrix (single-writer authority)

Each authoritative record has **exactly one writing system**. The other system may read
(via API/RPC) and may hold a **derived, non-authoritative** copy for UX, but must never
write the authoritative row.

| Concern | Authoritative owner | Authoritative store | Non-authoritative mirror |
|---|---|---|---|
| Customer authentication / identity | **Zivosmedia** | `auth.users` @ `slirphzzwcogdbkeicff` | Travel holds only a verified access token; never mints identity |
| Booking **intent** (pre-payment draft) | **Zivosmedia** (`bus_bookings` status=`hold`) | `public.bus_bookings` @ authority | Travel `zivo_travel_booking_intents` = staging/telemetry only (guest, `user_id=null`) |
| **Confirmed** booking | **Zivosmedia** (`bus_bookings` status=`confirmed`) | `public.bus_bookings` | Travel reads status via API; never sets `confirmed` |
| **Pricing** (subtotal/fees/total) | **Zivosmedia** | `bus_trips.price_cents` + `create_bus_booking` server compute | Travel shows an estimate; server value wins |
| Payment **creation** | **Zivosmedia** | `create-bus-payment-intent` (Stripe) | Travel never creates a PaymentIntent |
| Payment **confirmation** | **Zivosmedia** | `capture-bus-payment` (operator capture) **or** `stripe-bus-webhook` (provider event) | Travel never confirms from a browser redirect |
| **Webhook** processing | **Zivosmedia** | `stripe-bus-webhook` + `bus_stripe_webhook_events` | n/a |
| **Wallet** transaction | **Zivosmedia** (ZIVO Wallet / ZivoPay) | wallet ledger @ authority | Travel deep-links to wallet UI |
| **Refund** / reversal | **Zivosmedia** | `capture-bus-payment` (refund mode) + Stripe | Travel **requests** a refund/cancel; does not execute it |
| **Receipt** | **Zivosmedia** (source of truth) | `bus_bookings` + `ar-receipts-helper` | Travel renders a receipt view from the authoritative record |
| **Notification** | **Zivosmedia** | `send-transactional-email`, web push, in-app | Travel shows in-app status; never claims delivery |
| **Audit log** | Each system logs its own writes | authority: payment/webhook logs; travel: booking-intent + request logs | correlation ID links the two |

**Cross-writing rule (enforced):** the same authoritative booking or payment row is
**never** written independently in both databases. The travel booking-intent row is a
**distinct, non-authoritative** record (`zivo_travel_booking_intents`, always
`user_id=null`, status pinned to `pending_checkout`) that references the journey by
`booking_reference` and hands the customer to the authority for the real booking. Sync
happens only through explicit, identified events (below), keyed by stable IDs.

---

## 2. Stable identifiers

| ID | Format | Minted by | Meaning |
|---|---|---|---|
| `booking_reference` (authority) | `ZB` + 6 uppercase hex | `create_bus_booking` | The authoritative bus booking (`bus_bookings.booking_ref`) |
| `booking_reference` (travel intent) | `ztb_` + 12 lowercase hex | travel Worker | A travel-side booking-intent draft (`zivo_travel_booking_intents`) |
| `user_id` | UUID | Zivosmedia auth | Verified authority user subject; bound server-side, never trusted from client |
| `idempotency_key` | `^[A-Za-z0-9_-]{16,160}$` | client (Web Crypto) | Dedupe token for a checkout/booking/cancel attempt |
| `correlation_id` / `request_id` | UUID | first hop | Ties one customer action across both systems' logs |
| `stripe_payment_intent_id` | `pi_…` | Stripe | Links `bus_bookings` ↔ payment ↔ webhook |
| `provider_event_id` | Stripe event `evt_…` | Stripe | Webhook idempotency key (`bus_stripe_webhook_events.stripe_event_id`) |

---

## 3. Data contract (bus booking)

Every API boundary validates against this shape and **rejects** malformed/unexpected
data. See `zivostravel/src/contract/bookingContract.ts` for the executable schema.

```jsonc
{
  "version": "1",
  "correlationId": "uuid",                 // required, echoed in logs both sides
  "bookingReference": "ZB1A2B3C | ztb_...",// authority ref once created; travel ref while draft
  "userId": "uuid | null",                 // authority subject; null only for anon browse
  "productType": "bus",                     // enum: bus | flight | hotel | rental_car (this contract: bus)
  "itinerary": {
    "origin": "string(1..120)",
    "destination": "string(1..120)",
    "departDate": "YYYY-MM-DD",
    "departTime": "string",
    "arriveTime": "string | null",
    "operator": "string",
    "seats": ["3A", "3B"]                   // seat code ^[1-9][0-9]*[A-D]$, max 6
  },
  "passengers": [                           // >=1, length == passengerCount
    { "name": "string(1..120)", "phone": "string | null", "seat": "3A | null" }
  ],
  "passengerCount": 2,                      // int 1..6
  "amount": { "subtotalCents": 3600, "feeCents": 0, "taxCents": 0, "discountCents": 0, "totalCents": 3600 },
  "currency": "usd",                        // ISO 4217 lowercase; supported: usd, khr, thb
  "bookingStatus": "hold",                  // see §4
  "paymentStatus": "pending",               // see §4
  "paymentProvider": "stripe",              // enum: stripe (bus). paypal/aba_payway reserved.
  "idempotencyKey": "zivo_travel_....",
  "checkoutSuccessUrl": "https://.../booking/success?reference=...",
  "checkoutCancelUrl": "https://.../booking/cancel?reference=...",
  "createdAt": "ISO8601",
  "updatedAt": "ISO8601"
}
```

**Amount invariants (server-enforced):** every `*Cents` is a non-negative integer;
`totalCents = max(0, subtotalCents + feeCents + taxCents - discountCents)`; `totalCents`
must be `>= 50` before a live charge (Stripe minimum). The browser-submitted amount is
**never** trusted — the authority recomputes from `bus_trips.price_cents × seatCount`
minus validated promo inside `create_bus_booking`, and the PaymentIntent reads
`bus_bookings.amount_cents` from the DB.

---

## 4. Lifecycle state machines

**Booking status** (`bus_bookings.status`):

```
hold ──confirm──▶ confirmed ──complete──▶ (completed*)
  │                    │
  └──cancel──▶ cancelled ◀──cancel/refund──┘
```
`*completed` is derived (trip departed / boarded); not a distinct persisted value in v1.
Allowed transitions: `hold→confirmed`, `hold→cancelled`, `confirmed→cancelled`. Backward
or skipped transitions (e.g. `cancelled→confirmed`, `confirmed→hold`) are **rejected**.

**Payment status** (`bus_bookings.payment_status`) — v1 adds `voided`:

```
pending ─▶ authorized ─▶ captured ─▶ refunded
   │            │
   ├─▶ failed   └─▶ voided        (voided = authorization cancelled before capture)
```
Allowed: `pending→authorized`, `pending→failed`, `authorized→captured`,
`authorized→voided`, `authorized→failed`, `captured→refunded`. Idempotent replays of the
current state are no-ops (return ok).

**Booking-intent status** (travel `zivo_travel_booking_intents.status`): `draft →
pending_checkout → checkout_handoff → paid | cancelled | expired`. The travel intent is
**never** shown as "Confirmed" to the customer unless the authority reports a `confirmed`
booking; a merely-persisted intent reads "Draft".

---

## 5. Synchronization events (the only cross-system writes)

| Event | Emitter → Consumer | Keyed by | Effect |
|---|---|---|---|
| `booking.intent.created` | Travel Worker → (log) | `booking_reference` (ztb_), `idempotency_key` | Records a non-authoritative draft; hands off to authority checkout |
| `booking.created` | Authority `create_bus_booking` | `booking_reference` (ZB), `user_id` | Authoritative `hold` created |
| `payment.authorized` | `create-bus-payment-intent` / webhook | `stripe_payment_intent_id` | `payment_status=authorized` |
| `payment.captured` | `capture-bus-payment` / webhook | `stripe_payment_intent_id`, `provider_event_id` | `status=confirmed`, `payment_status=captured` |
| `payment.failed` | webhook | `provider_event_id` | `payment_status=failed` |
| `payment.voided` | `capture-bus-payment` (refund of uncaptured auth) / webhook | `stripe_payment_intent_id` | `status=cancelled`, `payment_status=voided` |
| `payment.refunded` | `capture-bus-payment` (refund of capture) / webhook | `provider_event_id` | `status=cancelled`, `payment_status=refunded` |
| `booking.cancel_requested` | Travel Worker → authority queue | `booking_reference`, `idempotency_key` | Customer refund/cancel request recorded for operator/authority action |

---

## 6. Error codes (stable, both boundaries)

| Code | HTTP | Meaning |
|---|---|---|
| `authentication_required` | 401 | No bearer token on a live-booking action |
| `invalid_authority_session` | 401 | Bearer token failed verification against the authority |
| `valid_idempotency_key_required` | 400 | Missing/malformed `idempotency-key` header |
| `booking_authority_not_configured` | 503 | Server-side persistence credential absent |
| `identity_authority_not_configured` | 503 | Authority verification credential absent |
| `forbidden_not_owner` | 403 | Caller is not the booking's owner (`customer_id`/`user_id` mismatch) |
| `booking_not_found` | 404 | Unknown reference |
| `invalid_booking_payload` | 422 | Failed contract schema validation |
| `invalid_state_transition` | 409 | Disallowed status/payment transition |
| `seat_taken` / `invalid_seats` / `duplicate_seats` | 409/422 | Seat validation (from `create_bus_booking`) |
| `promo_invalid` / `promo_exhausted` / `promo_min_fare` | 409 | Promo validation |
| `amount_too_low` | 400 | `totalCents < 50` for a live charge |

---

## 7. Payment safety rules (non-negotiable)

1. Secret keys (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, service-role keys) are
   server/edge-only — never in the browser bundle or `VITE_*`.
2. PaymentIntents are created server-side (`create-bus-payment-intent`), amount from DB.
3. Webhooks (`stripe-bus-webhook`) verify the Stripe signature before any state change and
   are idempotent via `bus_stripe_webhook_events UNIQUE(stripe_event_id)`.
4. A booking is **never** marked `confirmed` from a browser success redirect — only from
   `capture-bus-payment` (authenticated operator) or a verified `stripe-bus-webhook` event.
5. Amount/currency/`booking_reference`/customer are matched against the provider event.
6. No full card numbers or CVCs are stored; payment data is redacted from logs.
7. All non-production verification runs against Stripe **test mode** only.

---

## 8. Changelog

- **v1 (2026-07-17):** initial shared contract. Adds `voided` to bus payment status;
  defines `stripe-bus-webhook` as the provider-event confirmation/reconciliation path
  (companion to interim operator capture); defines the travel-side authenticated,
  idempotent `booking.cancel_requested` handoff.
