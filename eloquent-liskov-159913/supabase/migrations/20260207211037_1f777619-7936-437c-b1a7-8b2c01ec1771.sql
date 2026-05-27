-- FRAUD PREVENTION - Simplified schema
-- Add missing columns to existing risk_events
ALTER TABLE risk_events ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
ALTER TABLE risk_events ADD COLUMN IF NOT EXISTS order_id UUID REFERENCES food_orders(id) ON DELETE SET NULL;
ALTER TABLE risk_events ADD COLUMN IF NOT EXISTS score INT DEFAULT 0;

-- Create risk_scores table
CREATE TABLE IF NOT EXISTS public.risk_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_score INT DEFAULT 0,
  risk_level TEXT DEFAULT 'low',
  last_evaluated TIMESTAMPTZ DEFAULT now(),
  score_breakdown JSONB DEFAULT '{}',
  CONSTRAINT unique_risk_score_user UNIQUE (user_id)
);

-- Create blocked_entities table
CREATE TABLE IF NOT EXISTS public.blocked_entities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_value TEXT NOT NULL,
  reason TEXT,
  blocked_by UUID REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

-- Create device_sessions table
CREATE TABLE IF NOT EXISTS public.device_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  device_fingerprint TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  last_seen TIMESTAMPTZ DEFAULT now(),
  is_trusted BOOLEAN DEFAULT false
);

-- Add risk fields to food_orders
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS risk_score INT DEFAULT 0;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS risk_signals TEXT[] DEFAULT '{}';
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS requires_review BOOLEAN DEFAULT false;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS review_status TEXT;
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);
ALTER TABLE food_orders ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE risk_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocked_entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_sessions ENABLE ROW LEVEL SECURITY;

-- Add permission
INSERT INTO permissions (key, description, category) VALUES
  ('safety.manage', 'View and manage fraud prevention', 'security')
ON CONFLICT (key) DO NOTHING;