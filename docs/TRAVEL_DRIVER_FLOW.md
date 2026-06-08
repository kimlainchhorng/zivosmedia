# Travel Driver Flow

## Goal

Zivo Travel and Zivo Driver should share a clear contract for travel bookings that need driver jobs.

## Core IDs

- `travel_booking_id`.
- `driver_job_id`.
- `zivosmedia_user_id`.
- `payment_order_id` placeholder.
- `chat_thread_id` placeholder.

## Flow

1. Customer creates a travel booking in Zivo Travel.
2. Zivo Travel decides whether a driver job is needed.
3. Zivo Travel creates a driver job request with `travel_booking_id`.
4. Zivo Driver receives the job request.
5. Driver accepts or rejects.
6. Driver assignment and status sync back to Zivo Travel.
7. Customer sees driver status in the travel booking.
8. Payment connects to both the travel booking and driver job.
9. Driver payout becomes eligible only after the job is completed and policy checks pass.
10. Chat thread can connect customer, driver, support, and admin.

## Driver Status Examples

- requested.
- assigned.
- accepted.
- rejected.
- en_route.
- arrived.
- in_progress.
- completed.
- cancelled.
- disputed.

## Admin Visibility

Zivo Admin should see:

- travel booking status.
- driver job status.
- customer payment status.
- refund status.
- driver payout status.
- related chat/support thread.
- audit logs.

## Recommended First Safe PR

After identity and admin registry work, create a Travel/Driver integration contract across `zivostravel` and `zivodriver` once the driver repo is accessible.
