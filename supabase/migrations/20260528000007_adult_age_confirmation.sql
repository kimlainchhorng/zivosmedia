-- Persistent adult-content age confirmation.
-- Without this, the age gate re-prompts on every page load because it's stored
-- in component state only. Adds a per-user timestamp so confirmation survives
-- across sessions and devices.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS adult_age_confirmed_at timestamptz;
