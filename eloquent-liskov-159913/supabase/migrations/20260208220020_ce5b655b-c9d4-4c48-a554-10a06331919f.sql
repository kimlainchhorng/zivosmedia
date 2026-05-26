-- Add missing trigger for auto-expiring call sessions (if not exists)
DROP TRIGGER IF EXISTS trg_expire_call_sessions ON food_orders;

CREATE OR REPLACE FUNCTION expire_call_sessions()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('delivered', 'cancelled') AND OLD.status != NEW.status THEN
    UPDATE call_sessions
    SET status = 'ended', updated_at = now()
    WHERE order_id = NEW.id AND status = 'active';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_expire_call_sessions
AFTER UPDATE ON food_orders
FOR EACH ROW
EXECUTE FUNCTION expire_call_sessions();