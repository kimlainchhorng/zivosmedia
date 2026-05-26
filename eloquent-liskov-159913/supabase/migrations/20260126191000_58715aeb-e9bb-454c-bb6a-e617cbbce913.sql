-- Create trip_messages table for rider-driver chat
CREATE TABLE public.trip_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('rider', 'driver')),
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_trip_messages_trip_id ON public.trip_messages(trip_id);
CREATE INDEX idx_trip_messages_created_at ON public.trip_messages(created_at);

-- Enable RLS
ALTER TABLE public.trip_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Riders can view/send messages for their trips
CREATE POLICY "Riders can view messages for their trips"
ON public.trip_messages FOR SELECT
USING (
  trip_id IN (SELECT id FROM public.trips WHERE rider_id = auth.uid())
);

CREATE POLICY "Riders can send messages for their trips"
ON public.trip_messages FOR INSERT
WITH CHECK (
  trip_id IN (SELECT id FROM public.trips WHERE rider_id = auth.uid())
  AND sender_type = 'rider'
);

-- RLS Policies: Drivers can view/send messages for their assigned trips
CREATE POLICY "Drivers can view messages for their trips"
ON public.trip_messages FOR SELECT
USING (
  trip_id IN (
    SELECT t.id FROM public.trips t
    JOIN public.drivers d ON t.driver_id = d.id
    WHERE d.user_id = auth.uid()
  )
);

CREATE POLICY "Drivers can send messages for their trips"
ON public.trip_messages FOR INSERT
WITH CHECK (
  trip_id IN (
    SELECT t.id FROM public.trips t
    JOIN public.drivers d ON t.driver_id = d.id
    WHERE d.user_id = auth.uid()
  )
  AND sender_type = 'driver'
);

-- RLS Policies: Users can mark messages as read
CREATE POLICY "Users can update read status"
ON public.trip_messages FOR UPDATE
USING (
  trip_id IN (SELECT id FROM public.trips WHERE rider_id = auth.uid())
  OR trip_id IN (
    SELECT t.id FROM public.trips t
    JOIN public.drivers d ON t.driver_id = d.id
    WHERE d.user_id = auth.uid()
  )
)
WITH CHECK (
  trip_id IN (SELECT id FROM public.trips WHERE rider_id = auth.uid())
  OR trip_id IN (
    SELECT t.id FROM public.trips t
    JOIN public.drivers d ON t.driver_id = d.id
    WHERE d.user_id = auth.uid()
  )
);

-- Admins can manage all messages
CREATE POLICY "Admins can manage all messages"
ON public.trip_messages FOR ALL
USING (has_role(auth.uid(), 'admin'));

-- Enable realtime for trip_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.trip_messages;