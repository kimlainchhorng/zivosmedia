# ZivoChat Flow

## Role

ZivoChat is the shared communication layer for ZIVO. It should support customer, driver, business, support, and admin conversations across platforms.

## Thread Contract

Every payment-related or workflow-related chat thread should include:

- `chat_thread_id`.
- `source_platform`.
- `app_key`.
- `zivosmedia_user_id`.
- `local_user_id`.
- related IDs.
- participants.
- status.
- priority.
- `assigned_admin_id`.

## Related IDs

Thread metadata can reference:

- `payment_id`.
- `payment_order_id`.
- `invoice_id`.
- `subscription_id`.
- `travel_booking_id`.
- `driver_job_id`.
- `business_id`.
- `software_product_id`.
- support ticket ID.

## Supported Use Cases

- payment support ticket.
- refund request.
- failed payment help.
- software subscription support.
- travel payment issue.
- travel booking support.
- driver payout support.
- business billing question.
- setup support for software.

## Admin Visibility

Zivo Admin should be able to search and filter chat threads by platform, user, business, booking, driver job, payment, priority, status, and assigned admin.

## Open Question

Confirm the ZivoChat Supabase project and repository access before implementation begins.
