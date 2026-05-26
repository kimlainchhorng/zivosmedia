-- Money requests reverse the chat authoring role:
--   send    => sender pays, receiver accepts/declines, sender cancels
--   request => sender pays, sender accepts/declines, receiver cancels
-- The original RPCs only authorized receiver accept/decline and sender cancel,
-- which made request cards render correctly but fail when tapped.

CREATE OR REPLACE FUNCTION public.accept_p2p_transfer(p_transfer_id uuid)
 RETURNS public.p2p_transfers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_t public.p2p_transfers;
  v_sender_balance integer;
  v_new_sender_balance integer;
  v_new_receiver_balance integer;
  v_amount integer;
  v_is_request boolean := false;
  v_notify_user uuid;
BEGIN
  SELECT * INTO v_t FROM public.p2p_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'transfer_not_found'; END IF;

  SELECT COALESCE((dm.file_payload->>'mode') = 'request', false)
    INTO v_is_request
  FROM public.direct_messages dm
  WHERE dm.id = v_t.message_id;

  v_is_request := COALESCE(v_is_request, false);

  IF v_is_request THEN
    IF v_t.sender_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
    v_notify_user := v_t.receiver_id;
  ELSE
    IF v_t.receiver_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
    v_notify_user := v_t.sender_id;
  END IF;

  IF v_t.status <> 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;

  v_amount := v_t.amount_cents;

  INSERT INTO public.customer_wallets (user_id, balance_cents) VALUES (v_t.sender_id, 0)   ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.customer_wallets (user_id, balance_cents) VALUES (v_t.receiver_id, 0) ON CONFLICT (user_id) DO NOTHING;

  IF v_t.sender_id < v_t.receiver_id THEN
    PERFORM 1 FROM public.customer_wallets WHERE user_id = v_t.sender_id   FOR UPDATE;
    PERFORM 1 FROM public.customer_wallets WHERE user_id = v_t.receiver_id FOR UPDATE;
  ELSE
    PERFORM 1 FROM public.customer_wallets WHERE user_id = v_t.receiver_id FOR UPDATE;
    PERFORM 1 FROM public.customer_wallets WHERE user_id = v_t.sender_id   FOR UPDATE;
  END IF;

  SELECT balance_cents INTO v_sender_balance FROM public.customer_wallets WHERE user_id = v_t.sender_id;
  IF v_sender_balance < v_amount THEN RAISE EXCEPTION 'insufficient_funds'; END IF;

  UPDATE public.customer_wallets
     SET balance_cents = balance_cents - v_amount, updated_at = now()
   WHERE user_id = v_t.sender_id
   RETURNING balance_cents INTO v_new_sender_balance;

  UPDATE public.customer_wallets
     SET balance_cents = balance_cents + v_amount, updated_at = now()
   WHERE user_id = v_t.receiver_id
   RETURNING balance_cents INTO v_new_receiver_balance;

  INSERT INTO public.customer_wallet_transactions
    (user_id, amount_cents, balance_after_cents, type, description, reference_id)
  VALUES
    (v_t.sender_id,   -v_amount, v_new_sender_balance,   'transfer_out', 'P2P transfer sent',     v_t.id),
    (v_t.receiver_id,  v_amount, v_new_receiver_balance, 'transfer_in',  'P2P transfer received', v_t.id);

  UPDATE public.p2p_transfers
     SET status = 'completed', completed_at = now()
   WHERE id = v_t.id
   RETURNING * INTO v_t;

  INSERT INTO public.notifications
    (user_id, channel, category, template, title, body, action_url, status, metadata)
  VALUES
    (v_notify_user, 'in_app', 'transactional', 'p2p_accepted',
     CASE WHEN v_is_request THEN 'Money request paid' ELSE 'Transfer completed' END,
     CASE
       WHEN v_is_request THEN 'Your request for $' || to_char((v_amount::numeric) / 100, 'FM999999999990.00') || ' was paid'
       ELSE 'Your transfer of $' || to_char((v_amount::numeric) / 100, 'FM999999999990.00') || ' was accepted'
     END,
     '/wallet', 'sent',
     jsonb_build_object('transfer_id', v_t.id, 'amount_cents', v_amount, 'mode', CASE WHEN v_is_request THEN 'request' ELSE 'send' END));

  RETURN v_t;
END;
$function$;

CREATE OR REPLACE FUNCTION public.decline_p2p_transfer(p_transfer_id uuid)
 RETURNS public.p2p_transfers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_t public.p2p_transfers;
  v_is_request boolean := false;
  v_notify_user uuid;
BEGIN
  SELECT * INTO v_t FROM public.p2p_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'transfer_not_found'; END IF;

  SELECT COALESCE((dm.file_payload->>'mode') = 'request', false)
    INTO v_is_request
  FROM public.direct_messages dm
  WHERE dm.id = v_t.message_id;

  v_is_request := COALESCE(v_is_request, false);

  IF v_is_request THEN
    IF v_t.sender_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
    v_notify_user := v_t.receiver_id;
  ELSE
    IF v_t.receiver_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
    v_notify_user := v_t.sender_id;
  END IF;

  IF v_t.status <> 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;

  UPDATE public.p2p_transfers
     SET status = 'declined'
   WHERE id = v_t.id
   RETURNING * INTO v_t;

  INSERT INTO public.notifications
    (user_id, channel, category, template, title, body, action_url, status, metadata)
  VALUES
    (v_notify_user, 'in_app', 'transactional', 'p2p_declined',
     CASE WHEN v_is_request THEN 'Money request declined' ELSE 'Transfer declined' END,
     CASE
       WHEN v_is_request THEN 'Your request for $' || to_char((v_t.amount_cents::numeric) / 100, 'FM999999999990.00') || ' was declined'
       ELSE 'Your transfer of $' || to_char((v_t.amount_cents::numeric) / 100, 'FM999999999990.00') || ' was declined'
     END,
     '/wallet', 'sent',
     jsonb_build_object('transfer_id', v_t.id, 'mode', CASE WHEN v_is_request THEN 'request' ELSE 'send' END));

  RETURN v_t;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cancel_p2p_transfer(p_transfer_id uuid)
 RETURNS public.p2p_transfers
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_t public.p2p_transfers;
  v_is_request boolean := false;
BEGIN
  SELECT * INTO v_t FROM public.p2p_transfers WHERE id = p_transfer_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'transfer_not_found'; END IF;

  SELECT COALESCE((dm.file_payload->>'mode') = 'request', false)
    INTO v_is_request
  FROM public.direct_messages dm
  WHERE dm.id = v_t.message_id;

  v_is_request := COALESCE(v_is_request, false);

  IF v_is_request THEN
    IF v_t.receiver_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  ELSE
    IF v_t.sender_id <> auth.uid() THEN RAISE EXCEPTION 'forbidden'; END IF;
  END IF;

  IF v_t.status <> 'pending' THEN RAISE EXCEPTION 'not_pending'; END IF;

  UPDATE public.p2p_transfers
     SET status = 'cancelled'
   WHERE id = v_t.id
   RETURNING * INTO v_t;

  RETURN v_t;
END;
$function$;
