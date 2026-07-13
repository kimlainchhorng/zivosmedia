-- =============================================
-- ZIVO GLOBAL EXPANSION & MULTI-COUNTRY SCHEMA
-- =============================================

-- Add super_admin to app_role enum if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'super_admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'super_admin';
  END IF;
END$$;

-- 1) COUNTRIES TABLE
CREATE TABLE IF NOT EXISTS public.countries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(2) NOT NULL UNIQUE,
  code_alpha3 VARCHAR(3),
  name TEXT NOT NULL,
  native_name TEXT,
  region TEXT NOT NULL,
  subregion TEXT,
  default_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  default_language VARCHAR(5) NOT NULL DEFAULT 'en',
  timezone TEXT DEFAULT 'UTC',
  phone_code VARCHAR(10),
  flag_emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_beta BOOLEAN DEFAULT false,
  launched_at TIMESTAMPTZ,
  disabled_at TIMESTAMPTZ,
  disabled_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) COUNTRY SERVICES
CREATE TABLE IF NOT EXISTS public.country_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  is_beta BOOLEAN DEFAULT false,
  launched_at TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_id, service_type)
);

-- 3) COUNTRY LEGAL PAGES
CREATE TABLE IF NOT EXISTS public.country_legal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  page_type TEXT NOT NULL,
  language VARCHAR(5) NOT NULL DEFAULT 'en',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0',
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_id, page_type, language, version)
);

-- 4) COUNTRY TAX CONFIG
CREATE TABLE IF NOT EXISTS public.country_tax_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  tax_name TEXT NOT NULL,
  tax_type TEXT NOT NULL,
  rate_percent DECIMAL(5,2) NOT NULL,
  applies_to TEXT[] DEFAULT ARRAY['all'],
  is_inclusive BOOLEAN DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_until TIMESTAMPTZ,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5) SUPPORTED LANGUAGES
CREATE TABLE IF NOT EXISTS public.supported_languages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(5) NOT NULL UNIQUE,
  name TEXT NOT NULL,
  native_name TEXT NOT NULL,
  direction TEXT NOT NULL DEFAULT 'ltr',
  flag_emoji TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6) UI TRANSLATIONS
CREATE TABLE IF NOT EXISTS public.ui_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language_code VARCHAR(5) NOT NULL,
  namespace TEXT NOT NULL DEFAULT 'common',
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(language_code, namespace, key)
);

-- 7) USER LOCALE PREFERENCES
CREATE TABLE IF NOT EXISTS public.user_locale_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  country_code VARCHAR(2),
  language_code VARCHAR(5) DEFAULT 'en',
  currency_code VARCHAR(3) DEFAULT 'USD',
  timezone TEXT,
  detected_country VARCHAR(2),
  detected_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 8) COUNTRY ANALYTICS
CREATE TABLE IF NOT EXISTS public.country_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  country_id UUID NOT NULL REFERENCES public.countries(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  service_type TEXT NOT NULL,
  total_users INT DEFAULT 0,
  new_users INT DEFAULT 0,
  active_users INT DEFAULT 0,
  total_bookings INT DEFAULT 0,
  total_revenue_usd DECIMAL(12,2) DEFAULT 0,
  total_clicks INT DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(country_id, date, service_type)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_countries_code ON public.countries(code);
CREATE INDEX IF NOT EXISTS idx_countries_active ON public.countries(is_active);
CREATE INDEX IF NOT EXISTS idx_countries_region ON public.countries(region);
CREATE INDEX IF NOT EXISTS idx_country_services_country ON public.country_services(country_id);
CREATE INDEX IF NOT EXISTS idx_country_services_type ON public.country_services(service_type);
CREATE INDEX IF NOT EXISTS idx_country_legal_country ON public.country_legal_pages(country_id);
CREATE INDEX IF NOT EXISTS idx_country_tax_country ON public.country_tax_config(country_id);
CREATE INDEX IF NOT EXISTS idx_ui_translations_lang ON public.ui_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_ui_translations_ns ON public.ui_translations(namespace);
CREATE INDEX IF NOT EXISTS idx_user_locale_user ON public.user_locale_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_country_analytics_country ON public.country_analytics(country_id);
CREATE INDEX IF NOT EXISTS idx_country_analytics_date ON public.country_analytics(date);

-- Enable RLS
ALTER TABLE public.countries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_legal_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_tax_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supported_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ui_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_locale_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.country_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Countries are publicly readable" ON public.countries FOR SELECT USING (true);
CREATE POLICY "Admins can manage countries" ON public.countries FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Active country services are publicly readable" ON public.country_services FOR SELECT USING (is_enabled = true OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage country services" ON public.country_services FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Legal pages are publicly readable" ON public.country_legal_pages FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage legal pages" ON public.country_legal_pages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read tax config" ON public.country_tax_config FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can manage tax config" ON public.country_tax_config FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Languages are publicly readable" ON public.supported_languages FOR SELECT USING (true);
CREATE POLICY "Admins can manage languages" ON public.supported_languages FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Translations are publicly readable" ON public.ui_translations FOR SELECT USING (true);
CREATE POLICY "Admins can manage translations" ON public.ui_translations FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can read own locale" ON public.user_locale_preferences FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can manage own locale" ON public.user_locale_preferences FOR ALL TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can read all locales" ON public.user_locale_preferences FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read country analytics" ON public.country_analytics FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "System can write analytics" ON public.country_analytics FOR INSERT TO authenticated WITH CHECK (true);

-- Seed languages
INSERT INTO public.supported_languages (code, name, native_name, direction, flag_emoji, is_active, is_default, sort_order) VALUES
  ('en', 'English', 'English', 'ltr', '🇺🇸', true, true, 1),
  ('es', 'Spanish', 'Español', 'ltr', '🇪🇸', false, false, 2),
  ('fr', 'French', 'Français', 'ltr', '🇫🇷', false, false, 3),
  ('de', 'German', 'Deutsch', 'ltr', '🇩🇪', false, false, 4),
  ('ja', 'Japanese', '日本語', 'ltr', '🇯🇵', false, false, 5),
  ('ko', 'Korean', '한국어', 'ltr', '🇰🇷', false, false, 6),
  ('zh', 'Chinese', '中文', 'ltr', '🇨🇳', false, false, 7),
  ('ar', 'Arabic', 'العربية', 'rtl', '🇸🇦', false, false, 8)
ON CONFLICT (code) DO NOTHING;

-- Seed countries
INSERT INTO public.countries (code, code_alpha3, name, native_name, region, subregion, default_currency, default_language, timezone, phone_code, flag_emoji, is_active, launched_at) VALUES
  ('US', 'USA', 'United States', 'United States', 'Americas', 'Northern America', 'USD', 'en', 'America/New_York', '+1', '🇺🇸', true, now()),
  ('CA', 'CAN', 'Canada', 'Canada', 'Americas', 'Northern America', 'CAD', 'en', 'America/Toronto', '+1', '🇨🇦', false, null),
  ('GB', 'GBR', 'United Kingdom', 'United Kingdom', 'Europe', 'Northern Europe', 'GBP', 'en', 'Europe/London', '+44', '🇬🇧', false, null),
  ('DE', 'DEU', 'Germany', 'Deutschland', 'Europe', 'Western Europe', 'EUR', 'de', 'Europe/Berlin', '+49', '🇩🇪', false, null),
  ('FR', 'FRA', 'France', 'France', 'Europe', 'Western Europe', 'EUR', 'fr', 'Europe/Paris', '+33', '🇫🇷', false, null),
  ('JP', 'JPN', 'Japan', '日本', 'Asia', 'Eastern Asia', 'JPY', 'ja', 'Asia/Tokyo', '+81', '🇯🇵', false, null),
  ('AU', 'AUS', 'Australia', 'Australia', 'Oceania', 'Australia and New Zealand', 'AUD', 'en', 'Australia/Sydney', '+61', '🇦🇺', false, null),
  ('SG', 'SGP', 'Singapore', 'Singapore', 'Asia', 'South-Eastern Asia', 'SGD', 'en', 'Asia/Singapore', '+65', '🇸🇬', false, null)
ON CONFLICT (code) DO NOTHING;

-- Enable services for US
INSERT INTO public.country_services (country_id, service_type, is_enabled, launched_at) 
SELECT id, 'flights', true, now() FROM public.countries WHERE code = 'US' ON CONFLICT DO NOTHING;
INSERT INTO public.country_services (country_id, service_type, is_enabled, launched_at) 
SELECT id, 'hotels', true, now() FROM public.countries WHERE code = 'US' ON CONFLICT DO NOTHING;
INSERT INTO public.country_services (country_id, service_type, is_enabled, launched_at) 
SELECT id, 'cars', true, now() FROM public.countries WHERE code = 'US' ON CONFLICT DO NOTHING;
INSERT INTO public.country_services (country_id, service_type, is_enabled, is_beta) 
SELECT id, 'rides', false, true FROM public.countries WHERE code = 'US' ON CONFLICT DO NOTHING;
INSERT INTO public.country_services (country_id, service_type, is_enabled, is_beta) 
SELECT id, 'eats', false, true FROM public.countries WHERE code = 'US' ON CONFLICT DO NOTHING;
INSERT INTO public.country_services (country_id, service_type, is_enabled, is_beta) 
SELECT id, 'move', false, true FROM public.countries WHERE code = 'US' ON CONFLICT DO NOTHING;

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_country_services(p_country_code VARCHAR(2))
RETURNS TABLE(service_type TEXT, is_enabled BOOLEAN, is_beta BOOLEAN)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT cs.service_type, cs.is_enabled, cs.is_beta
  FROM public.country_services cs
  JOIN public.countries c ON c.id = cs.country_id
  WHERE c.code = p_country_code AND c.is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_active_countries()
RETURNS TABLE(code VARCHAR(2), name TEXT, region TEXT, default_currency VARCHAR(3), default_language VARCHAR(5), flag_emoji TEXT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT code, name, region, default_currency, default_language, flag_emoji
  FROM public.countries WHERE is_active = true ORDER BY name;
$$;