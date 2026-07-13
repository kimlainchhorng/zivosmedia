
-- Group Order Sessions
CREATE TABLE public.group_order_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  host_user_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'locked', 'checked_out', 'cancelled')),
  deadline timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Group Order Items
CREATE TABLE public.group_order_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.group_order_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  item_name text NOT NULL,
  price numeric NOT NULL,
  quantity integer NOT NULL DEFAULT 1,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.group_order_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_order_items ENABLE ROW LEVEL SECURITY;

-- Sessions: anyone authenticated can read sessions they're part of or by invite code
CREATE POLICY "Anyone can read sessions" ON public.group_order_sessions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sessions" ON public.group_order_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_user_id);

CREATE POLICY "Host can update their sessions" ON public.group_order_sessions
  FOR UPDATE USING (auth.uid() = host_user_id);

CREATE POLICY "Host can delete their sessions" ON public.group_order_sessions
  FOR DELETE USING (auth.uid() = host_user_id);

-- Items: anyone can read items in a session, users can manage their own
CREATE POLICY "Anyone can read group items" ON public.group_order_items
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can add items" ON public.group_order_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own items" ON public.group_order_items
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own items" ON public.group_order_items
  FOR DELETE USING (auth.uid() = user_id);

-- Host can also delete any item in their session
CREATE POLICY "Host can delete any item in session" ON public.group_order_items
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.group_order_sessions s
      WHERE s.id = session_id AND s.host_user_id = auth.uid()
    )
  );

-- Indexes
CREATE INDEX idx_group_sessions_invite_code ON public.group_order_sessions(invite_code);
CREATE INDEX idx_group_sessions_restaurant ON public.group_order_sessions(restaurant_id);
CREATE INDEX idx_group_items_session ON public.group_order_items(session_id);

-- Updated_at trigger
CREATE TRIGGER update_group_sessions_updated_at
  BEFORE UPDATE ON public.group_order_sessions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_order_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_order_items;
