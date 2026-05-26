-- Drop the safe view first (depends on the table)
DROP VIEW IF EXISTS public.auth_relay_tokens_safe;

-- Drop the table and all its policies
DROP TABLE IF EXISTS public.auth_relay_tokens CASCADE;