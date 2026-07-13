-- Add share token for customer-facing estimate approval
ALTER TABLE public.ar_estimates
  ADD COLUMN IF NOT EXISTS share_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS customer_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_responded_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_ar_estimates_share_token ON public.ar_estimates(share_token) WHERE share_token IS NOT NULL;

-- Public read policy for estimates by share token (no auth required)
CREATE POLICY "Public estimate view by token"
  ON public.ar_estimates FOR SELECT
  USING (share_token IS NOT NULL);

-- Public update policy for customer approval/decline by token
CREATE POLICY "Customer can approve or decline estimate by token"
  ON public.ar_estimates FOR UPDATE
  USING (share_token IS NOT NULL)
  WITH CHECK (share_token IS NOT NULL);
