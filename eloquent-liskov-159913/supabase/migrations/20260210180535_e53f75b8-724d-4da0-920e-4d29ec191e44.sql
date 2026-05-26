
-- Fix 5 SECURITY DEFINER functions: add SET search_path = public to prevent search path hijacking

CREATE OR REPLACE FUNCTION public.get_referral_device_groups(min_count integer DEFAULT 2, hours integer DEFAULT 168)
 RETURNS TABLE(device_fingerprint text, referral_count bigint, referral_ids uuid[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT 
    device_fingerprint,
    COUNT(*) as referral_count,
    array_agg(id) as referral_ids
  FROM referrals
  WHERE device_fingerprint IS NOT NULL
    AND created_at > now() - make_interval(hours => hours)
  GROUP BY device_fingerprint
  HAVING COUNT(*) >= min_count
  ORDER BY referral_count DESC
$function$;

CREATE OR REPLACE FUNCTION public.get_referral_ip_groups(min_count integer DEFAULT 2, hours integer DEFAULT 24)
 RETURNS TABLE(ip_address text, referral_count bigint, referral_ids uuid[])
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = public
AS $function$
  SELECT 
    ip_address::text,
    COUNT(*) as referral_count,
    array_agg(id) as referral_ids
  FROM referrals
  WHERE ip_address IS NOT NULL
    AND created_at > now() - make_interval(hours => hours)
  GROUP BY ip_address
  HAVING COUNT(*) >= min_count
  ORDER BY referral_count DESC
$function$;

CREATE OR REPLACE FUNCTION public.get_restaurant_avg_prep_time(p_restaurant_id uuid)
 RETURNS TABLE(avg_prep_minutes numeric, sample_size integer, source text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ROUND(AVG(sm.prep_seconds) / 60.0, 1) as avg_prep_minutes,
    COUNT(*)::INT as sample_size,
    'sla_metrics'::TEXT as source
  FROM sla_metrics sm
  WHERE sm.merchant_id = p_restaurant_id 
    AND sm.prep_seconds IS NOT NULL 
    AND sm.prep_seconds > 0
  HAVING COUNT(*) >= 3;
  
  IF FOUND THEN RETURN; END IF;
  
  RETURN QUERY
  SELECT 
    ROUND(AVG(EXTRACT(EPOCH FROM (fo.ready_at - fo.accepted_at)) / 60.0), 1),
    COUNT(*)::INT,
    'order_timestamps'::TEXT
  FROM food_orders fo
  WHERE fo.restaurant_id = p_restaurant_id
    AND fo.ready_at IS NOT NULL 
    AND fo.accepted_at IS NOT NULL
    AND fo.status = 'delivered'
  HAVING COUNT(*) >= 3;
  
  IF FOUND THEN RETURN; END IF;
  
  RETURN QUERY
  SELECT 
    COALESCE(r.avg_prep_time, 25)::NUMERIC,
    0,
    'restaurant_default'::TEXT
  FROM restaurants r
  WHERE r.id = p_restaurant_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$function$;

CREATE OR REPLACE FUNCTION public.update_slot_driver_count()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.slot_id IS NOT NULL THEN
    UPDATE public.shift_slots 
    SET current_drivers = current_drivers + 1,
        updated_at = NOW()
    WHERE id = NEW.slot_id;
  ELSIF TG_OP = 'DELETE' AND OLD.slot_id IS NOT NULL THEN
    UPDATE public.shift_slots 
    SET current_drivers = GREATEST(0, current_drivers - 1),
        updated_at = NOW()
    WHERE id = OLD.slot_id;
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.slot_id IS DISTINCT FROM NEW.slot_id THEN
      IF OLD.slot_id IS NOT NULL THEN
        UPDATE public.shift_slots 
        SET current_drivers = GREATEST(0, current_drivers - 1),
            updated_at = NOW()
        WHERE id = OLD.slot_id;
      END IF;
      IF NEW.slot_id IS NOT NULL THEN
        UPDATE public.shift_slots 
        SET current_drivers = current_drivers + 1,
            updated_at = NOW()
        WHERE id = NEW.slot_id;
      END IF;
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$function$;
