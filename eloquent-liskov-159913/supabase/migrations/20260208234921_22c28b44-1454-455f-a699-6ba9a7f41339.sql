-- Add missing columns to push_subscriptions
ALTER TABLE push_subscriptions 
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS platform TEXT DEFAULT 'web';

-- Add unique constraint on (user_id, endpoint) for proper upserts
-- First drop if exists to avoid conflicts
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'push_subscriptions_user_id_endpoint_key'
  ) THEN
    ALTER TABLE push_subscriptions
      ADD CONSTRAINT push_subscriptions_user_id_endpoint_key 
      UNIQUE (user_id, endpoint);
  END IF;
END $$;

-- Index for fast lookups of active subscriptions by user
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user_active 
  ON push_subscriptions(user_id) 
  WHERE is_active = true;

-- Update existing records to have default values
UPDATE push_subscriptions 
SET is_active = true, platform = 'web' 
WHERE is_active IS NULL OR platform IS NULL;

-- Enable RLS if not already enabled
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for push_subscriptions
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can view their own subscriptions" 
  ON push_subscriptions 
  FOR SELECT 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can insert their own subscriptions" 
  ON push_subscriptions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can update their own subscriptions" 
  ON push_subscriptions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON push_subscriptions;
CREATE POLICY "Users can delete their own subscriptions" 
  ON push_subscriptions 
  FOR DELETE 
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage all subscriptions" ON push_subscriptions;
CREATE POLICY "Service role can manage all subscriptions" 
  ON push_subscriptions 
  FOR ALL 
  USING (true)
  WITH CHECK (true);