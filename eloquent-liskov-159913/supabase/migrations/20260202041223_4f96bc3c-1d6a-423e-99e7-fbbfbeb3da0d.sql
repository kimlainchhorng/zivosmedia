-- SearchSession: tracks user searches across flights/hotels/cars
CREATE TABLE public.search_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id TEXT NOT NULL UNIQUE, -- Format: SS_{timestamp}_{random}
  type TEXT NOT NULL CHECK (type IN ('flights', 'hotels', 'cars')),
  origin TEXT,
  destination TEXT,
  depart_date DATE,
  return_date DATE,
  passengers INTEGER DEFAULT 1,
  rooms INTEGER DEFAULT 1,
  guests INTEGER DEFAULT 1,
  cabin_class TEXT,
  search_params JSONB, -- Full search parameters
  user_id UUID REFERENCES auth.users(id),
  user_email TEXT,
  device_type TEXT,
  user_agent TEXT,
  ip_address INET,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.search_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_sessions
CREATE POLICY "Users can view their own search sessions"
  ON public.search_sessions FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Anyone can create search sessions"
  ON public.search_sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can view all search sessions"
  ON public.search_sessions FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Indexes for performance
CREATE INDEX idx_search_sessions_session_id ON public.search_sessions(session_id);
CREATE INDEX idx_search_sessions_type ON public.search_sessions(type);
CREATE INDEX idx_search_sessions_created_at ON public.search_sessions(created_at DESC);
CREATE INDEX idx_search_sessions_user_id ON public.search_sessions(user_id);