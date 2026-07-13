
-- Create a simple enqueue_email function that logs the email
-- Since we don't have pgmq, we'll use email_send_log as the queue
CREATE OR REPLACE FUNCTION public.enqueue_email(
  queue_name text,
  payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.email_send_log
  SET status = 'queued', metadata = payload
  WHERE message_id = (payload->>'message_id')::text
    AND status = 'pending';
  
  -- If no pending row found, insert a new one
  IF NOT FOUND THEN
    INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, metadata)
    VALUES (
      (payload->>'message_id')::text,
      (payload->>'label')::text,
      (payload->>'to')::text,
      'queued',
      payload
    );
  END IF;
END;
$$;
