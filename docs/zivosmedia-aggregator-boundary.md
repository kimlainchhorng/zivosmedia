# ZivosMedia aggregator boundary

Date: 2026-06-06

ZivosMedia remains the all-in-one product, identity authority, public discovery surface, and cross-domain aggregation layer. It should stop being the owner of every vertical's operational data as Travel, Software, Driver, and Admin become dedicated platforms.

## ZivosMedia owns
- **Identity and auth:** one ZIVO account, cross-domain SSO, auth handoff, session refresh, user profile authority, and account recovery.
- **Public discovery:** feeds, public business cards, profiles, listings, creator/social surfaces, search, public maps, and share-safe vertical summaries.
- **All-in-one aggregation:** customer-facing dashboards that combine travel, driver, software/business, chat, notifications, and payments into one user experience.
- **Central payments hub for now:** Stripe customer identity, wallet, checkout, refunds, payouts, and reconciliation stay central until split accounting is designed.
- **Shared platform services:** maps/geocoding, media upload/proxying, notification fanout, analytics, remote config, security/CSP reporting, and exchange-rate services.
- **Read-only cross-domain APIs:** Edge Functions on the main project that read from dedicated projects and return normalized summary data to ZivosMedia clients.

## ZivosMedia should not own long term
- Travel operational state: flight search/booking state, hotel inventory and reservations, bus bookings, rental-car reservations, partner workflows, and travel provider webhooks.
- Driver operational state: driver onboarding records, availability, location heartbeats, ride/trip lifecycle, dispatch, and driver-only earnings workflows.
- Software/business owner state: owner dashboards, store/business CRUD, vertical-specific bookings, auto-repair jobs, restaurant/cafe operations, salon/service schedules, and merchant tooling.
- Global staff operations: moderation queues, customer support consoles, payout/refund staff tools, cross-product incident response, and internal audit views.

## Bridge contract
Dedicated projects should publish only summary-shaped data back to ZivosMedia. The ZivosMedia app should consume these through server-side bridges, not direct browser service-role access.

| Source domain | ZivosMedia should receive | ZivosMedia should not receive |
|---|---|---|
| `zivostravel.com` | Search cards, itinerary summaries, booking status labels, public hotel/business cards | Provider secrets, raw booking lifecycle tables, payment provider webhooks |
| `zivosoftware.com` | Public business profiles, ratings, promotions, available services, shareable booking summaries | Owner dashboards, private customer lists, staff-only workflow state |
| `zivodriver.com` | Driver public status only when needed, trip summary cards, notification events | Live raw location feeds, driver PII, dispatch mutation APIs |
| `Zivo-Admin` | Staff decisions that affect user-visible state, audit summaries | Browser-exposed service-role access, product service clients in frontend code |

## Implementation order
1. Keep auth on the main Supabase project and introduce explicit dual clients: `authClient` for `slirphzzwcogdbkeicff`, domain `dataClient` for the current host.
2. Use `supabase/functions/zivo-domain-summary` as the first ZivosMedia aggregation bridge. It validates the main ZIVO JWT, then calls configured per-domain summary RPCs with that same user token.
3. Move global admin screens to Zivo Admin before moving risky write paths, starting with Driver staff tools.
4. Split Travel first by bus booking, then rental car, hotels/resorts, flights, and finally travel checkout/payment flows.
5. Split Software first by auto repair because the dedicated Software project already has `ar_*` tables, then broaden into store/business verticals.
6. Leave payments central until reconciliation, payout ownership, tax reporting, and refunds are explicitly modeled per domain.

## Current audit
The generated file `docs/zivosmedia-domain-ownership-audit.md` maps candidate files and backend object references by domain category. Use it as the first pass when selecting files to move or wrap behind bridge APIs.

## Summary RPC contract
Each dedicated domain exposes a default summary RPC. The main bridge can override the RPC names with env vars if a domain needs a different function later:

| Domain | Env var | Expected RPC shape |
|---|---|---|
| Driver | `ZIVO_DRIVER_SUMMARY_RPC=zivo_driver_share_summary` | accepts `p_user_id uuid`, `p_limit int`; returns share-safe driver/trip cards only |
| Travel | `ZIVO_TRAVEL_SUMMARY_RPC=zivo_travel_share_summary` | accepts `p_user_id uuid`, `p_limit int`; returns share-safe project/catalog readiness now, itinerary/booking status cards later |
| Software | `ZIVO_SOFTWARE_SUMMARY_RPC=zivo_software_share_summary` | accepts `p_user_id uuid`, `p_limit int`; returns share-safe business/profile/service cards only |

The bridge defaults to the RPC names above. It returns `missing_publishable_key` until the corresponding domain publishable key is present.
