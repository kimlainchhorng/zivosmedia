-- Atomic wallet withdrawal helper.
-- Keeps balance debits and transaction-ledger inserts in one locked database
-- transaction so concurrent payout attempts cannot spend the same balance.

CREATE OR REPLACE FUNCTION public.process_customer_wallet_withdrawal(
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
    'withdrawal',
    p_description,
    p_reference_id
  )
  RETURNING id INTO v_transaction_id;

  RETURN QUERY SELECT v_transaction_id, v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.process_customer_wallet_withdrawal(uuid, integer, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.process_customer_wallet_withdrawal(uuid, integer, text, uuid) TO service_role;
