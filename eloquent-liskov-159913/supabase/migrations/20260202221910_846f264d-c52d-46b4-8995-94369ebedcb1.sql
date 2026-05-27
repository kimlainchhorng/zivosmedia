-- Add additional validation constraints to prevent spam while keeping INSERT public
-- This is intentionally permissive for a public waitlist signup
ALTER TABLE p2p_renter_waitlist 
  ADD CONSTRAINT waitlist_email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  ADD CONSTRAINT waitlist_name_length CHECK (length(full_name) >= 2 AND length(full_name) <= 100),
  ADD CONSTRAINT waitlist_city_length CHECK (length(city) >= 2 AND length(city) <= 100);