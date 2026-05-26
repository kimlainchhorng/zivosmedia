CREATE OR REPLACE FUNCTION public.tg_p2p_notify_receiver()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_sender_name TEXT;
BEGIN
  IF NEW.status <> 'pending' THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'Someone') INTO v_sender_name
  FROM public.public_profiles
  WHERE user_id = NEW.sender_id
  LIMIT 1;

  INSERT INTO public.notifications
    (user_id, channel, category, template, title, body, action_url, status, metadata)
  VALUES
    (NEW.receiver_id, 'in_app', 'transactional', 'p2p_pending',
     COALESCE(v_sender_name, 'Someone') || ' sent you money',
     '$' || to_char((NEW.amount_cents::numeric) / 100, 'FM999999999990.00') ||
       CASE WHEN NEW.note IS NOT NULL AND NEW.note <> '' THEN ' — "' || left(NEW.note, 60) || '"' ELSE '' END,
     '/wallet?transfer=' || NEW.id::text,
     'sent',
     jsonb_build_object('transfer_id', NEW.id, 'amount_cents', NEW.amount_cents, 'sender_id', NEW.sender_id));

  RETURN NEW;
END;
$function$;
