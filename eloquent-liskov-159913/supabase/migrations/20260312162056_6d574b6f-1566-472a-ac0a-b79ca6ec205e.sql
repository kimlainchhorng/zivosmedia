ALTER TABLE public.shopping_orders
ADD COLUMN IF NOT EXISTS final_total numeric DEFAULT 0;