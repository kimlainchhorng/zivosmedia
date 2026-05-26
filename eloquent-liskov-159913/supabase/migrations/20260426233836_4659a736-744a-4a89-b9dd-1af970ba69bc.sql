
-- 1) store_employees: hospitality fields
ALTER TABLE public.store_employees
  ADD COLUMN IF NOT EXISTS lodging_role text,
  ADD COLUMN IF NOT EXISTS shift text;

-- 2) lodging_messages
CREATE TABLE IF NOT EXISTS public.lodging_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  reservation_id uuid,
  guest_id uuid,
  sender_role text NOT NULL DEFAULT 'staff',
  sender_user_id uuid,
  body text NOT NULL,
  attachments jsonb NOT NULL DEFAULT '[]'::jsonb,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lodging_messages_store ON public.lodging_messages(store_id);
CREATE INDEX IF NOT EXISTS idx_lodging_messages_reservation ON public.lodging_messages(reservation_id);
CREATE INDEX IF NOT EXISTS idx_lodging_messages_guest ON public.lodging_messages(guest_id);

ALTER TABLE public.lodging_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view lodging_messages"
  ON public.lodging_messages FOR SELECT
  USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners insert lodging_messages"
  ON public.lodging_messages FOR INSERT
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners update lodging_messages"
  ON public.lodging_messages FOR UPDATE
  USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners delete lodging_messages"
  ON public.lodging_messages FOR DELETE
  USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Guests view their lodging_messages"
  ON public.lodging_messages FOR SELECT
  USING (auth.uid() IS NOT NULL AND guest_id = auth.uid());

CREATE POLICY "Guests reply to their lodging_messages"
  ON public.lodging_messages FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND guest_id = auth.uid() AND sender_role = 'guest');

CREATE TRIGGER set_lodging_messages_updated_at
  BEFORE UPDATE ON public.lodging_messages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) lodging_room_blocks (iCal-imported blocked dates)
CREATE TABLE IF NOT EXISTS public.lodging_room_blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid NOT NULL,
  room_id uuid,
  source text NOT NULL DEFAULT 'manual',
  external_uid text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, room_id, source, external_uid)
);

CREATE INDEX IF NOT EXISTS idx_lodging_room_blocks_store ON public.lodging_room_blocks(store_id);
CREATE INDEX IF NOT EXISTS idx_lodging_room_blocks_room ON public.lodging_room_blocks(room_id);
CREATE INDEX IF NOT EXISTS idx_lodging_room_blocks_dates ON public.lodging_room_blocks(start_date, end_date);

ALTER TABLE public.lodging_room_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners view lodging_room_blocks"
  ON public.lodging_room_blocks FOR SELECT
  USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners insert lodging_room_blocks"
  ON public.lodging_room_blocks FOR INSERT
  WITH CHECK (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners update lodging_room_blocks"
  ON public.lodging_room_blocks FOR UPDATE
  USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Owners delete lodging_room_blocks"
  ON public.lodging_room_blocks FOR DELETE
  USING (public.is_store_owner(store_id, auth.uid()) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER set_lodging_room_blocks_updated_at
  BEFORE UPDATE ON public.lodging_room_blocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
