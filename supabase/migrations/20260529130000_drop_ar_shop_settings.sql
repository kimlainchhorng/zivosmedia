-- Remove ar_shop_settings: the auto-repair default tax rate is sourced from the
-- existing Auto Repair Settings (store_profiles.ar_settings.tax_rate) instead,
-- so this dedicated table (added in 20260529120000) is redundant. It was never
-- populated. The per-invoice tax_rate column and the payment-status trigger fix
-- from that migration are kept.
DROP TABLE IF EXISTS public.ar_shop_settings;
