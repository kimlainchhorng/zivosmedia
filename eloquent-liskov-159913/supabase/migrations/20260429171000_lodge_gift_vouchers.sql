-- Lodge gift vouchers: sell and redeem gift certificates for stays and services
CREATE TABLE IF NOT EXISTS public.lodge_gift_vouchers (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id         uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  code             text        NOT NULL,
  value_cents      int         NOT NULL DEFAULT 0,
  balance_cents    int         NOT NULL DEFAULT 0,
  recipient_name   text,
  recipient_email  text,
  purchaser_name   text,
  message          text,
  expires_at       date,
  status           text        NOT NULL DEFAULT 'active'
                               CHECK (status IN ('active','partially_used','redeemed','expired','voided')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, code)
);

CREATE INDEX IF NOT EXISTS lodge_gift_vouchers_store_idx
  ON public.lodge_gift_vouchers (store_id, status);

ALTER TABLE public.lodge_gift_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage gift vouchers"
ON public.lodge_gift_vouchers
FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
