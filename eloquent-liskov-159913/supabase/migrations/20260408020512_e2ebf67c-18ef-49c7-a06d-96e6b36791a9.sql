
-- suppressed_emails
CREATE TABLE IF NOT EXISTS public.suppressed_emails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL DEFAULT 'unsubscribe',
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT suppressed_emails_email_key UNIQUE (email)
);
ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;

-- email_send_log
CREATE TABLE IF NOT EXISTS public.email_send_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id text,
  template_name text,
  recipient_email text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;

-- email_unsubscribe_tokens
CREATE TABLE IF NOT EXISTS public.email_unsubscribe_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  email text NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_unsubscribe_tokens_email_key UNIQUE (email)
);
ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;

-- email_send_state (single-row config)
CREATE TABLE IF NOT EXISTS public.email_send_state (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  batch_size integer NOT NULL DEFAULT 10,
  send_delay_ms integer NOT NULL DEFAULT 200,
  retry_after_until timestamptz,
  transactional_email_ttl_minutes integer NOT NULL DEFAULT 60,
  auth_email_ttl_minutes integer NOT NULL DEFAULT 15,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.email_send_state ENABLE ROW LEVEL SECURITY;

-- Insert default config row
INSERT INTO public.email_send_state (id) VALUES (1) ON CONFLICT DO NOTHING;
