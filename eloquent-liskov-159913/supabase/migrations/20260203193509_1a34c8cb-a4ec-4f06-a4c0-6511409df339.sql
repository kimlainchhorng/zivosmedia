-- Enums for pricing engine (create if not exists via DO block)
DO $$ BEGIN CREATE TYPE public.pricing_rule_type AS ENUM ('markup_percent', 'markup_flat', 'service_fee_percent', 'service_fee_flat'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.promo_type AS ENUM ('percent', 'flat'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.promo_status AS ENUM ('active', 'paused', 'expired', 'scheduled'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.experiment_status AS ENUM ('draft', 'running', 'paused', 'completed'); EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN CREATE TYPE public.product_category AS ENUM ('flight', 'hotel', 'activity', 'transfer', 'car_rental', 'all'); EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Pricing Rules Table
CREATE TABLE IF NOT EXISTS public.pricing_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  rule_type pricing_rule_type NOT NULL,
  value NUMERIC NOT NULL CHECK (value >= 0),
  applies_to product_category NOT NULL DEFAULT 'all',
  min_order_value NUMERIC,
  max_order_value NUMERIC,
  priority INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Promo Redemptions Log
CREATE TABLE IF NOT EXISTS public.promo_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promo_id UUID NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  order_id UUID,
  original_amount NUMERIC NOT NULL,
  discount_amount NUMERIC NOT NULL,
  final_amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'applied',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- A/B Experiments Table
CREATE TABLE IF NOT EXISTS public.experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  hypothesis TEXT,
  metric_primary TEXT NOT NULL DEFAULT 'conversion_rate',
  metric_secondary TEXT[],
  variants JSONB NOT NULL DEFAULT '[{"name": "control", "weight": 50}, {"name": "variant_a", "weight": 50}]',
  targeting_rules JSONB,
  auto_stop_rules JSONB DEFAULT '{"min_sample_size": 1000, "significance_level": 0.95, "max_conversion_drop_percent": 20}',
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status experiment_status NOT NULL DEFAULT 'draft',
  winner_variant TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Experiment Assignments (sticky per user/session)
CREATE TABLE IF NOT EXISTS public.experiment_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  variant TEXT NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(experiment_id, user_id),
  UNIQUE(experiment_id, session_id)
);

-- Experiment Events (conversions, metrics)
CREATE TABLE IF NOT EXISTS public.experiment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  experiment_id UUID NOT NULL REFERENCES public.experiments(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.experiment_assignments(id),
  variant TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_value NUMERIC,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Price Calculation Audit Log
CREATE TABLE IF NOT EXISTS public.price_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT,
  product_type product_category NOT NULL,
  supplier_price NUMERIC NOT NULL,
  markup_amount NUMERIC NOT NULL DEFAULT 0,
  service_fee NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  final_price NUMERIC NOT NULL,
  promo_code TEXT,
  promo_id UUID,
  pricing_rules_applied UUID[],
  experiment_variant TEXT,
  pricing_version INTEGER NOT NULL DEFAULT 1,
  calculation_inputs JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_rules_active ON public.pricing_rules(is_active, applies_to);
CREATE INDEX IF NOT EXISTS idx_promo_redemptions_user ON public.promo_redemptions(user_id, promo_id);
CREATE INDEX IF NOT EXISTS idx_experiments_status ON public.experiments(status);
CREATE INDEX IF NOT EXISTS idx_experiment_assignments_user ON public.experiment_assignments(user_id, experiment_id);
CREATE INDEX IF NOT EXISTS idx_experiment_events_experiment ON public.experiment_events(experiment_id, event_type);
CREATE INDEX IF NOT EXISTS idx_price_calculations_order ON public.price_calculations(order_id);

-- RLS Policies
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promo_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experiment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_calculations ENABLE ROW LEVEL SECURITY;

-- Pricing rules: admin only
CREATE POLICY "Admins can manage pricing rules" ON public.pricing_rules
  FOR ALL USING (public.is_admin(auth.uid()));

-- Promo redemptions policies
CREATE POLICY "Users can see own redemptions" ON public.promo_redemptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage redemptions" ON public.promo_redemptions
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert redemptions" ON public.promo_redemptions
  FOR INSERT WITH CHECK (true);

-- Experiments: admin only
CREATE POLICY "Admins can manage experiments" ON public.experiments
  FOR ALL USING (public.is_admin(auth.uid()));

-- Assignments policies
CREATE POLICY "Users can see own assignments" ON public.experiment_assignments
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage assignments" ON public.experiment_assignments
  FOR ALL USING (true);

-- Experiment events policies
CREATE POLICY "Admins can read experiment events" ON public.experiment_events
  FOR SELECT USING (public.is_admin(auth.uid()));

CREATE POLICY "System can insert events" ON public.experiment_events
  FOR INSERT WITH CHECK (true);

-- Price calculations policies
CREATE POLICY "Admins can read price calculations" ON public.price_calculations
  FOR ALL USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can see own calculations" ON public.price_calculations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert calculations" ON public.price_calculations
  FOR INSERT WITH CHECK (true);

-- Triggers for updated_at
DROP TRIGGER IF EXISTS update_pricing_rules_updated_at ON public.pricing_rules;
CREATE TRIGGER update_pricing_rules_updated_at BEFORE UPDATE ON public.pricing_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_experiments_updated_at ON public.experiments;
CREATE TRIGGER update_experiments_updated_at BEFORE UPDATE ON public.experiments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to validate promo code
CREATE OR REPLACE FUNCTION public.validate_promo_code(
  p_code TEXT,
  p_user_id UUID,
  p_order_total NUMERIC,
  p_product_type TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_promo RECORD;
  v_user_uses INTEGER;
  v_user_order_count INTEGER;
  v_discount NUMERIC;
BEGIN
  -- Find active promo
  SELECT * INTO v_promo
  FROM public.promotions
  WHERE UPPER(code) = UPPER(p_code)
    AND is_active = true
    AND valid_from <= now()
    AND valid_until > now();
  
  IF v_promo IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Invalid or expired promo code');
  END IF;
  
  -- Check min order
  IF v_promo.min_order_value IS NOT NULL AND p_order_total < v_promo.min_order_value THEN
    RETURN jsonb_build_object('valid', false, 'error', format('Minimum order of $%s required', v_promo.min_order_value));
  END IF;
  
  -- Check max uses
  IF v_promo.max_uses IS NOT NULL AND v_promo.times_used >= v_promo.max_uses THEN
    RETURN jsonb_build_object('valid', false, 'error', 'Promo code limit reached');
  END IF;
  
  -- Check per-user limit
  IF p_user_id IS NOT NULL AND v_promo.max_uses_per_user IS NOT NULL THEN
    SELECT COUNT(*) INTO v_user_uses
    FROM public.promo_redemptions
    WHERE promo_id = v_promo.id AND user_id = p_user_id AND status = 'applied';
    
    IF v_user_uses >= v_promo.max_uses_per_user THEN
      RETURN jsonb_build_object('valid', false, 'error', 'You have already used this promo');
    END IF;
  END IF;
  
  -- Calculate discount
  IF v_promo.discount_type = 'percentage' THEN
    v_discount := ROUND(p_order_total * (v_promo.discount_value / 100), 2);
  ELSE
    v_discount := v_promo.discount_value;
  END IF;
  
  -- Apply max discount cap
  IF v_promo.max_discount IS NOT NULL AND v_discount > v_promo.max_discount THEN
    v_discount := v_promo.max_discount;
  END IF;
  
  RETURN jsonb_build_object(
    'valid', true,
    'promo_id', v_promo.id,
    'promo_name', v_promo.name,
    'discount_type', v_promo.discount_type,
    'discount_amount', v_discount,
    'final_amount', GREATEST(p_order_total - v_discount, 0)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Function to get experiment variant (deterministic assignment)
CREATE OR REPLACE FUNCTION public.get_experiment_variant(
  p_experiment_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL
)
RETURNS TEXT AS $$
DECLARE
  v_experiment RECORD;
  v_existing_variant TEXT;
  v_hash BIGINT;
  v_bucket INTEGER;
  v_cumulative INTEGER := 0;
  v_variant JSONB;
BEGIN
  -- Get experiment
  SELECT * INTO v_experiment
  FROM public.experiments
  WHERE id = p_experiment_id AND status = 'running';
  
  IF v_experiment IS NULL THEN
    RETURN NULL;
  END IF;
  
  -- Check existing assignment
  SELECT variant INTO v_existing_variant
  FROM public.experiment_assignments
  WHERE experiment_id = p_experiment_id
    AND (user_id = p_user_id OR session_id = p_session_id)
  LIMIT 1;
  
  IF v_existing_variant IS NOT NULL THEN
    RETURN v_existing_variant;
  END IF;
  
  -- Deterministic hash based on user/session
  v_hash := abs(hashtext(COALESCE(p_user_id::text, '') || COALESCE(p_session_id, '') || p_experiment_id::text));
  v_bucket := (v_hash % 100) + 1;
  
  -- Select variant based on weights
  FOR v_variant IN SELECT * FROM jsonb_array_elements(v_experiment.variants)
  LOOP
    v_cumulative := v_cumulative + (v_variant->>'weight')::integer;
    IF v_bucket <= v_cumulative THEN
      -- Record assignment
      INSERT INTO public.experiment_assignments (experiment_id, user_id, session_id, variant)
      VALUES (p_experiment_id, p_user_id, p_session_id, v_variant->>'name')
      ON CONFLICT DO NOTHING;
      
      RETURN v_variant->>'name';
    END IF;
  END LOOP;
  
  RETURN 'control';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;