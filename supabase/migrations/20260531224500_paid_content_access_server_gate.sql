-- Paid content access proves a user has unlocked gated content. Clients may
-- read their own access rows, but inserts must come from wallet/payment
-- functions after charge or balance validation.

DROP POLICY IF EXISTS "pca_ins" ON public.paid_content_access;

COMMENT ON TABLE public.paid_content_access
IS 'Paid content access rows are written by trusted wallet/payment flows only; clients read their own access rows via RLS.';
