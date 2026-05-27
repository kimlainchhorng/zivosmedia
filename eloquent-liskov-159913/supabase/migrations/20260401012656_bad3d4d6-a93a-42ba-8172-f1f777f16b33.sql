-- Fix SECURITY DEFINER view warnings by setting security_invoker = true
-- This ensures views use the permissions of the querying user, not the view creator

ALTER VIEW public.square_connections_safe SET (security_invoker = true);
ALTER VIEW public.auth_relay_tokens_safe SET (security_invoker = true);
ALTER VIEW public.flight_passengers_safe SET (security_invoker = true);