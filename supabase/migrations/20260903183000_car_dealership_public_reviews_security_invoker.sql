-- Harden the public car dealership reviews view for Postgres 17 / Data API
-- exposure: force security_invoker so RLS of the underlying table applies.
ALTER VIEW public.car_dealership_public_reviews SET (security_invoker = true);
