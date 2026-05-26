
-- Customer live locations table (mirrors driver_locations)
CREATE TABLE public.customer_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trip_id uuid,
  lat double precision NOT NULL,
  lng double precision NOT NULL,
  heading double precision,
  speed double precision,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.customer_locations ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_locations;

CREATE POLICY "Users can upsert own location"
  ON public.customer_locations FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Drivers can read assigned customer location"
  ON public.customer_locations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.jobs
      WHERE jobs.id = customer_locations.trip_id
        AND jobs.assigned_driver_id = auth.uid()
        AND jobs.status IN ('assigned', 'dispatched', 'arrived', 'in_progress')
    )
  );
