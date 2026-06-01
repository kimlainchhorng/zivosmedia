-- Force customer wallet payment debits through wallet-payment-deduct.
-- The RPC performs trusted server-side balance checks and ledger writes in one locked transaction.

CREATE OR REPLACE FUNCTION public.process_customer_wallet_payment(
  p_user_id uuid,
  p_amount_cents integer,
  p_description text,
  p_reference_id uuid DEFAULT NULL
)
RETURNS TABLE(transaction_id uuid, new_balance_cents integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_balance integer;
  v_new_balance integer;
  v_transaction_id uuid;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'missing_user';
  END IF;

  IF p_amount_cents IS NULL OR p_amount_cents <= 0 THEN
    RAISE EXCEPTION 'invalid_amount';
  END IF;

  SELECT balance_cents
    INTO v_current_balance
    FROM public.customer_wallets
   WHERE user_id = p_user_id
   FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'wallet_not_found';
  END IF;

  IF COALESCE(v_current_balance, 0) < p_amount_cents THEN
    RAISE EXCEPTION 'insufficient_funds';
  END IF;

  UPDATE public.customer_wallets
     SET balance_cents = balance_cents - p_amount_cents,
         updated_at = now()
   WHERE user_id = p_user_id
   RETURNING balance_cents INTO v_new_balance;

  INSERT INTO public.customer_wallet_transactions (
    user_id,
    amount_cents,
    balance_after_cents,
    type,
    description,
    reference_id
  )
  VALUES (
    p_user_id,
    -p_amount_cents,
    v_new_balance,
    'payment',
    COALESCE(NULLIF(p_description, ''), 'Wallet payment'),
    p_reference_id
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.process_customer_wallet_payment(uuid, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_customer_wallet_payment(uuid, integer, text, uuid) TO service_role;

ALTER TABLE public.customer_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cw_update_own" ON public.customer_wallets;
DROP POLICY IF EXISTS customer_wallets_block_direct_insert ON public.customer_wallets;
DROP POLICY IF EXISTS "customer_wallets_block_direct_insert" ON public.customer_wallets;
CREATE POLICY "customer_wallets_block_direct_insert"
ON public.customer_wallets
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS customer_wallets_block_direct_update ON public.customer_wallets;
DROP POLICY IF EXISTS "customer_wallets_block_direct_update" ON public.customer_wallets;
CREATE POLICY "customer_wallets_block_direct_update"
ON public.customer_wallets
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false)
WITH CHECK (false);

DROP POLICY IF EXISTS customer_wallets_block_direct_delete ON public.customer_wallets;
DROP POLICY IF EXISTS "customer_wallets_block_direct_delete" ON public.customer_wallets;
CREATE POLICY "customer_wallets_block_direct_delete"
ON public.customer_wallets
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

COMMENT ON TABLE public.customer_wallets IS
'Customer wallet balances are mutated by server functions such as wallet-payment-deduct for trusted server-side balance checks.';
