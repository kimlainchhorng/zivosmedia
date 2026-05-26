-- Allow anyone (including anonymous visitors) to read active lodge rooms.
-- Required so the public store profile page can display room listings.
CREATE POLICY "Anyone can view active lodge rooms"
ON public.lodge_rooms
FOR SELECT
USING (is_active = true);
