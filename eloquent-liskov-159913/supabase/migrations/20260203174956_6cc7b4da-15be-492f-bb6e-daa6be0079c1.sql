-- Fix functions missing search_path to prevent injection attacks

-- 1. calculate_clv_tier - Pure SQL function, add search_path
CREATE OR REPLACE FUNCTION public.calculate_clv_tier(p_clv_score numeric)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN p_clv_score >= 10000 THEN 'platinum'
    WHEN p_clv_score >= 5000 THEN 'gold'
    WHEN p_clv_score >= 2000 THEN 'silver'
    WHEN p_clv_score >= 500 THEN 'bronze'
    ELSE 'standard'
  END;
$function$;

-- 2. clean_expired_flight_cache - SECURITY DEFINER needs search_path
CREATE OR REPLACE FUNCTION public.clean_expired_flight_cache()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM public.flight_search_cache WHERE expires_at < now();
END;
$function$;

-- 3. generate_zivo_ticket_number - SECURITY DEFINER trigger needs search_path
CREATE OR REPLACE FUNCTION public.generate_zivo_ticket_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.ticket_number := 'ZS-' || to_char(now(), 'YYYYMMDD') || '-' || 
    lpad(floor(random() * 10000)::text, 4, '0');
  RETURN NEW;
END;
$function$;

-- 4. is_service_available - SQL function needs search_path
CREATE OR REPLACE FUNCTION public.is_service_available(p_service_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (SELECT NOT is_paused AND status = 'operational' 
     FROM public.service_health_status 
     WHERE service_name = p_service_name),
    true
  );
$function$;