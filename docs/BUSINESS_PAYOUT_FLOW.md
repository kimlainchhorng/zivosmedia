# Business Payout Flow

## Goal

ZIVO must support business payouts when marketplace or partner workflows require businesses to receive money from ZIVO-managed transactions.

## Required Links

- `business_id`.
- owner `zivosmedia_user_id`.
- source platform.
- related order/subscription/invoice record.
- provider connected account ID.
- provider payout/transfer ID.
- payout status.
- audit logs.

## Example Use Cases

- marketplace sales.
- service revenue share.
- travel agency partner payout.
- business service provider payout.
- software marketplace partner payout.
- manual admin-approved settlement.

## Flow

1. Customer pays ZIVO through shared ZivoPay.
2. Business earns a payable amount after service/order conditions are satisfied.
3. Platform fee and business earning are calculated.
4. Payout becomes eligible after completion, refund/dispute checks, and admin/system rules.
5. Provider adapter sends payout or transfer.
6. Zivo Admin records payout status and audit logs.
7. Business dashboard shows payout status and history.

## Statuses

- not_ready.
- eligible.
- payout_pending.
- paid.
- failed.
- held.
- cancelled.

## Safety

Business payouts require owner approval, marketplace payout provider setup, tax/compliance review, and sandbox verification before live use.
