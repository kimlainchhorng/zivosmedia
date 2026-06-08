# ZIVO Platform Relationships

Status: Draft for owner review
Date: 2026-06-07

## Purpose

Define how platforms work together before implementation.

## Zivo Travel <-> Zivo Driver

### Business Flow

1. Travel booking identifies a need for driver service.
2. Zivo Travel creates a driver job request.
3. Zivo Driver receives the job request.
4. Driver accepts or rejects the job.
5. Driver status syncs back to Travel.
6. Customer sees driver status in the travel booking.
7. Zivo Admin sees the full booking plus driver job.
8. ZivoChat can create customer-driver-support chat.

### Required Shared IDs

- `zivosmedia_user_id`
- `travel_booking_id`
- `driver_job_id`
- `customer_id` or local app user ID
- `handoff_id` where login/handoff is involved
- `chat_thread_id` when chat exists
- `payment_id` or Stripe object ID when payment exists

### Admin Visibility

Admin should show:

- Booking status
- Driver job status
- Assigned driver
- Customer identity link
- Driver identity link
- Payment status
- Chat/support thread
- Webhook history
- Audit log events

## Zivo Business <-> ZivoSoftware

### Business Flow

1. Business profile owns software subscriptions.
2. Business can request or activate software.
3. ZivoSoftware manages product catalog, subscriptions, activation, and compliance.
4. Zivo Admin controls software subscription visibility and support actions.
5. ZivoChat supports setup/help.
6. ZivoPay handles billing, invoices, refunds, and subscription payments.

### Required Shared IDs

- `zivosmedia_user_id`
- `business_id`
- `software_product_id`
- `software_subscription_id`
- `invoice_id`
- `payment_id`
- `chat_thread_id`

## Zivo Employees <-> Zivo Business/Admin

### Business Flow

1. Business owns employee/staff records.
2. Employees can be invited or linked through Zivosmedia identity.
3. Admin can view staff status, role, business, and audit activity.
4. Employee permissions should affect only the related business unless Admin grants broader roles.

### Required Shared IDs

- `zivosmedia_user_id`
- `business_id`
- `employee_id`
- `admin_actor_id` for privileged actions

## ZivoChat <-> All Apps

Chat must work across every app.

Every chat thread should include:

- `app_key`
- `source_platform`
- `zivosmedia_user_id`
- related record IDs, such as booking, driver job, business, subscription, invoice, payment, or support ticket
- participants
- status
- audit metadata

ZivoChat should support:

- Customer-support chat
- Customer-driver-support chat
- Business setup chat
- Software subscription help
- Payment/refund support
- Admin escalation

## ZivoPay <-> All Apps

Payment must connect to:

- `zivosmedia_user_id`
- `source_platform`
- related booking, driver job, business, software subscription, invoice, or chat support ticket

Payment should support:

- Travel checkout
- Driver payouts
- Business payouts
- Business/software billing
- Subscription invoices
- Refunds
- Disputes
- Payment support chat
- Admin payment audit logs

Payment provider support:

- Stripe first
- PayPal after shared model is stable
- Square after shared model is stable

All providers must use a common adapter pattern.
