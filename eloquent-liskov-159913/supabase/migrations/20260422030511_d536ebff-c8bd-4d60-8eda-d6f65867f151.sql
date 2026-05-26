CREATE TABLE public.lodge_maintenance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,
  room_id UUID,
  room_number TEXT,
  title TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  assignee_id UUID,
  assignee_name TEXT,
  reported_by TEXT,
  notes TEXT,
  photos JSONB DEFAULT '[]'::jsonb,
  cost_cents INT DEFAULT 0,
  reported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_lodge_maintenance_store ON public.lodge_maintenance (store_id, status);
CREATE INDEX idx_lodge_maintenance_room ON public.lodge_maintenance (room_id);

ALTER TABLE public.lodge_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Store owners manage their maintenance tickets"
ON public.lodge_maintenance
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = lodge_maintenance.store_id
      AND r.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.restaurants r
    WHERE r.id = lodge_maintenance.store_id
      AND r.owner_id = auth.uid()
  )
);

CREATE POLICY "Admins manage all maintenance tickets"
ON public.lodge_maintenance
FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_lodge_maintenance_updated_at
BEFORE UPDATE ON public.lodge_maintenance
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();