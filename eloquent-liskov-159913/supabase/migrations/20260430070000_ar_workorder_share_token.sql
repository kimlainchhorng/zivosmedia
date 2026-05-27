-- Customer-facing repair status tracking for work orders
ALTER TABLE public.ar_work_orders
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS eta_date date,
  ADD COLUMN IF NOT EXISTS ready_message text;

CREATE INDEX IF NOT EXISTS idx_ar_work_orders_share_token
  ON public.ar_work_orders(share_token) WHERE share_token IS NOT NULL;

-- Public read by share token (no auth required)
CREATE POLICY "Public repair status view by token"
  ON public.ar_work_orders FOR SELECT
  USING (share_token IS NOT NULL);
