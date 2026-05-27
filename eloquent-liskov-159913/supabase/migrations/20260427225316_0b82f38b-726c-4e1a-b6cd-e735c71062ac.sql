WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY base_rate_cents ASC, name ASC) - 1 AS rn
  FROM public.lodge_rooms
  WHERE store_id = '7322b460-2c23-4d3d-bdc5-55a31cc65fab'
)
UPDATE public.lodge_rooms lr
SET sort_order = ranked.rn, updated_at = now()
FROM ranked
WHERE lr.id = ranked.id;