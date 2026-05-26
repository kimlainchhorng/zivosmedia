# Super App Add-ons Rollout

This document describes the full add-on systems that connect social reels with commerce, operations, and reporting.

## Systems Included

1. Meta Data Bridge (CAPI)
2. Social-to-Sale Loop
3. Driver/Truck Mode + Inventory ERP + Offline Sync
4. Employee GPS Clock + Payroll + Merchant ROI

## Database Migration

Apply migration:
- `supabase/migrations/20260406091500_super_app_architecture.sql`

Adds:
- `social_reel_links`
- `warehouse_inventory`
- `truck_inventory`
- `truck_sales`
- `truck_sale_items`
- `truck_offline_sales_queue`
- `employee_clock_logs`
- `store_payroll_configs`
- `merchant_ad_spend`
- `meta_conversion_events`

Also adds:
- purchase conversion triggers (rides, food_orders, store_orders, truck_sales)
- complete registration trigger (profiles insert)
- inventory deduction trigger on truck sales completion
- RPCs:
  - `get_employee_payroll_summary`
  - `get_merchant_roi`

## Edge Functions

### Meta CAPI handler
- Path: `supabase/functions/meta-conversion-handler/index.ts`
- Config: `supabase/config.toml` -> `[functions.meta-conversion-handler] verify_jwt = false`

Required secrets:
- `META_ACCESS_TOKEN`
- Optional: `META_PIXEL_ID` (defaults to `2304266847061310`)

## Frontend Add-ons

### Social Commerce
- `src/pages/StoreMapPage.tsx`
  - Merchant can choose product and tap `Create Reel`
  - Reel link includes checkout path + map coordinates
  - `Buy Now` button tracks `InitiateCheckout`

- `src/components/social/CreatePostModal.tsx`
  - Persists reel commerce links in `social_reel_links`

- `src/pages/ReelsFeedPage.tsx`
  - Loads reel commerce metadata
  - Shows `Buy Now` button in feed and full-screen reels
  - Tracks `InitiateCheckout` to Meta handler

- `src/services/metaConversion.ts`
  - Shared client utility for Meta conversion events

### Truck/Employee/Payroll
- `src/pages/app/shop/ShopEmployeesPage.tsx`
  - Driver/Truck Mode
  - GPS clock-in/out logging
  - On-truck inventory visibility
  - Sell from truck
  - Offline queue and manual sync

- `src/pages/app/shop/ShopPayrollPage.tsx`
  - Base Pay + Commission formula config
  - Employee payout breakdown
  - Merchant ROI summary

- `src/pages/app/AppMore.tsx`
  - Adds quick paths for Store Owners:
    - Driver / Truck Mode
    - Payroll + ROI

## Validation Checklist

1. Data Bridge
- Complete a ride/food/store/truck sale and confirm a row in `meta_conversion_events`
- Confirm dispatch status transitions to `dispatched` when `pg_net` is available

2. Social-to-Sale
- From Store Map, select product and tap `Create Reel`
- Publish reel, then verify `social_reel_links` row exists
- Open reel and tap `Buy Now`, verify checkout opens

3. Truck ERP + Offline
- Go offline, sell from truck, confirm queued locally
- Go online and sync, confirm `truck_sales` + `truck_sale_items` inserted
- Verify `truck_inventory` and `warehouse_inventory` deducted when sale is completed

4. Payroll + ROI
- Save payroll config
- Verify `get_employee_payroll_summary` returns calculated totals
- Insert ad spend and verify `get_merchant_roi` values in dashboard

## Notes

- If Supabase CLI returns unauthorized, refresh `SUPABASE_ACCESS_TOKEN` and rerun migration/function deploy.
- Existing project build may still fail from unrelated dependency resolution issues outside these add-ons.
