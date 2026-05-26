UPDATE public.lodge_rooms
SET weekend_rate_cents = ROUND(base_rate_cents * 1.18),
    weekly_discount_pct = 10,
    monthly_discount_pct = 20,
    updated_at = now()
WHERE store_id = '7322b460-2c23-4d3d-bdc5-55a31cc65fab';