# PR Roadmap

## PR 1: Documentation and Inventory

Repo: `kimlainchhorng/zivosmedia`.
Branch: `docs/zivo-master-plan`.
Type: documentation only.
Goal: create ZIVO master docs, repo inventory, platform relationships, payment architecture, security checklist, roadmap, and open questions.

## PR 2: Zivosmedia Identity Foundation

Repo: `kimlainchhorng/zivosmedia`.
Branch: `feature/zivosmedia-identity-foundation`.
Goal: create Zivosmedia identity/account-linking foundation and Continue with Zivosmedia flow.

Do not start until owner approves PR 2.

## PR 3: Zivo Admin Platform Registry

Repo: `kimlainchhorng/Zivo-Admin`.
Branch: `feature/platform-registry`.
Goal: create platform registry for all 8 domains, repos, Supabase refs, health status, and admin dashboard foundation.

Blocked until repo access is confirmed.

## PR 4: Travel Driver Integration Contract

Repos:

- `kimlainchhorng/zivostravel`.
- `kimlainchhorng/zivodriver`.

Goal: create Travel/Driver integration contract:

- `travel_booking_id`.
- `driver_job_id`.
- request driver from travel.
- driver accept/reject.
- driver status update.
- `chat_thread_id` placeholder.
- `payment_order_id` placeholder.

Blocked until `kimlainchhorng/zivodriver` access is confirmed.

## Later Payment PRs

Implement one shared ZivoPay abstraction with provider adapters:

1. Stripe adapter first.
2. PayPal adapter second.
3. Square adapter third.

Driver payouts and business payouts require provider marketplace setup and owner approval before live mode.
