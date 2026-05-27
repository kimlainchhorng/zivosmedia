
-- Function to update likes_count on user_posts
CREATE OR REPLACE FUNCTION public.update_post_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post_id TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_post_id := OLD.post_id;
  ELSE
    target_post_id := NEW.post_id;
  END IF;

  UPDATE user_posts
  SET likes_count = (
    SELECT COUNT(*) FROM post_likes WHERE post_id = target_post_id
  )
  WHERE id::text = target_post_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on post_likes
CREATE TRIGGER trg_update_post_likes_count
AFTER INSERT OR DELETE ON post_likes
FOR EACH ROW
EXECUTE FUNCTION public.update_post_likes_count();

-- Function to update comments_count on user_posts
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_post_id TEXT;
  target_source TEXT;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_post_id := OLD.post_id;
    target_source := OLD.post_source;
  ELSE
    target_post_id := NEW.post_id;
    target_source := NEW.post_source;
  END IF;

  IF target_source = 'user' THEN
    UPDATE user_posts
    SET comments_count = (
      SELECT COUNT(*) FROM post_comments WHERE post_id = target_post_id AND post_source = 'user'
    )
    WHERE id::text = target_post_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Trigger on post_comments
CREATE TRIGGER trg_update_post_comments_count
AFTER INSERT OR DELETE ON post_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_post_comments_count();
