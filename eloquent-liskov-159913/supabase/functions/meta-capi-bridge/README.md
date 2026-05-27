# Meta CAPI Bridge (ZiVo)

This Edge Function receives DB webhook payloads for completed sales and forwards them to Meta Conversions API.

## Required Secrets

Set these Supabase secrets before deploy:

- `META_PIXEL_ID`
- `META_ACCESS_TOKEN`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

Optional:

- `META_TEST_EVENT_CODE` (recommended for initial validation in Meta Events Manager)

## Deploy

```bash
supabase functions deploy meta-capi-bridge
supabase db push
```

## Event Mapping

All mapped actions are sent as `Purchase` with `custom_data.content_category`:

- Ride (`trips`) -> `Travel`
- Food (`food_orders`) -> `Food & Beverage`
- Flight/Hotel/Travel bookings -> `Travel`
- Shopping/Store/Marketplace orders -> `Retail`
- Transactions table -> inferred from linked IDs/metadata

## Deduplication

`event_id` is the source row `id` (transaction/order/booking UUID) to avoid duplicate counting.
