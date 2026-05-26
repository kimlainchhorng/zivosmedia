-- Lodge notification templates: email/SMS templates sent to guests automatically
CREATE TABLE IF NOT EXISTS public.lodge_notification_templates (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid        NOT NULL REFERENCES public.store_profiles(id) ON DELETE CASCADE,
  trigger_type    text        NOT NULL DEFAULT 'on_booking'
                              CHECK (trigger_type IN (
                                'on_booking','pre_checkin','on_checkin',
                                'pre_checkout','on_checkout','review_request','custom'
                              )),
  channel         text        NOT NULL DEFAULT 'email'
                              CHECK (channel IN ('email','sms','whatsapp')),
  subject         text,
  body            text        NOT NULL DEFAULT '',
  send_hours_before int,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lodge_notification_templates_store_idx
  ON public.lodge_notification_templates (store_id, trigger_type);

CREATE TRIGGER trg_lodge_notification_templates_updated
  BEFORE UPDATE ON public.lodge_notification_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.lodge_notification_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage notification templates"
ON public.lodge_notification_templates
FOR ALL TO authenticated
USING (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
)
WITH CHECK (
  public.is_store_owner(store_id, auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
);
