-- Allow authenticated users to read any profile via public_profiles view
-- This enables seeing other users' names and avatars in the feed
CREATE POLICY "Authenticated users can read all profiles"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (true);