CREATE TABLE public.lodging_concierge_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  reservation_id UUID,
  guest_name TEXT,
  room_number TEXT,
  request_type TEXT NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT,
  due_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_concierge_tasks_store ON public.lodging_concierge_tasks(store_id);
CREATE INDEX idx_lodging_concierge_tasks_status ON public.lodging_concierge_tasks(store_id, status);
ALTER TABLE public.lodging_concierge_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view concierge tasks" ON public.lodging_concierge_tasks FOR SELECT USING (is_store_owner(store_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners insert concierge tasks" ON public.lodging_concierge_tasks FOR INSERT WITH CHECK (is_store_owner(store_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update concierge tasks" ON public.lodging_concierge_tasks FOR UPDATE USING (is_store_owner(store_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners delete concierge tasks" ON public.lodging_concierge_tasks FOR DELETE USING (is_store_owner(store_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_lodging_concierge_tasks_updated_at
BEFORE UPDATE ON public.lodging_concierge_tasks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.lodging_lost_found (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  store_id UUID NOT NULL,
  reservation_id UUID,
  item_name TEXT NOT NULL,
  description TEXT,
  location_found TEXT,
  found_by TEXT,
  finder_contact TEXT,
  owner_name TEXT,
  owner_contact TEXT,
  status TEXT NOT NULL DEFAULT 'found',
  claimed_at TIMESTAMPTZ,
  photo_url TEXT,
  notes TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_lodging_lost_found_store ON public.lodging_lost_found(store_id);
CREATE INDEX idx_lodging_lost_found_status ON public.lodging_lost_found(store_id, status);
ALTER TABLE public.lodging_lost_found ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view lost found" ON public.lodging_lost_found FOR SELECT USING (is_store_owner(store_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners insert lost found" ON public.lodging_lost_found FOR INSERT WITH CHECK (is_store_owner(store_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners update lost found" ON public.lodging_lost_found FOR UPDATE USING (is_store_owner(store_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Owners delete lost found" ON public.lodging_lost_found FOR DELETE USING (is_store_owner(store_id, auth.uid()) OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_lodging_lost_found_updated_at
BEFORE UPDATE ON public.lodging_lost_found
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();