
-- Trigger function: notify user when they receive a friend request
CREATE OR REPLACE FUNCTION public.notify_friend_request()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_name TEXT;
BEGIN
  -- Only notify on new pending requests
  IF NEW.status = 'pending' THEN
    -- Get sender's name
    SELECT COALESCE(full_name, 'Someone') INTO sender_name
    FROM public.profiles
    WHERE id = NEW.user_id OR user_id = NEW.user_id
    LIMIT 1;

    -- Insert in-app notification for the recipient
    INSERT INTO public.notifications (
      user_id,
      title,
      body,
      category,
      channel,
      status,
      template,
      event_type,
      action_url,
      metadata
    ) VALUES (
      NEW.friend_id,
      'New Friend Request',
      sender_name || ' sent you a friend request',
      'account',
      'in_app',
      'queued',
      'friend_request',
      'friend_request_received',
      '/user/' || NEW.user_id,
      jsonb_build_object('sender_id', NEW.user_id, 'sender_name', sender_name)
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
DROP TRIGGER IF EXISTS on_friend_request_notify ON public.friendships;
CREATE TRIGGER on_friend_request_notify
  AFTER INSERT ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_friend_request();
