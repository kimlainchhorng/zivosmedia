
-- Allow anonymous (not logged in) users to read profiles so feed shows names/avatars
CREATE POLICY "Anon users can read all profiles"
  ON public.profiles
  FOR SELECT
  TO anon
  USING (true);
