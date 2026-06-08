# Platform Relationships

## Hub and Spokes

Zivosmedia is the central identity and payment hub. Each product app owns its local product workflow but references Zivosmedia for shared identity and payment context.

## Zivosmedia

Responsibilities:

- central identity hub.
- `zivosmedia_user_id` standard.
- Continue with Zivosmedia flow.
- account linking.
- auth audit logs.
- payment identity hub.
- shared payment history.

## Zivo Admin

Responsibilities:

- platform registry for all 8 domains.
- GitHub repo mapping.
- Supabase project mapping.
- app health status.
- user search.
- payment dashboard.
- chat dashboard.
- travel/driver dashboard.
- business/software dashboard.
- audit logs.

## Zivo Travel and Zivo Driver

Travel booking can create a driver job when pickup, transfer, tour transport, delivery, or local mobility is needed. Driver job status should sync back to the travel booking so the customer can see driver assignment and job state.

## ZivoSoftware and Zivo Business

A business profile owns software subscriptions. ZivoSoftware lists business software products. Zivo Business shows active subscriptions, invoices, and setup/support status.

## ZivoChat

ZivoChat is the shared communication layer. Chat threads can connect customers, drivers, businesses, support agents, and admins around the same related records.

## ZivoPay

ZivoPay is the shared payment layer. Payment requests from any app should use shared provider adapters and shared records rather than separate app-specific payment implementations.
