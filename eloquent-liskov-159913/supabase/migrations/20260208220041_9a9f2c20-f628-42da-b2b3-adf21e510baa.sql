-- Add missing columns to call_sessions
ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS driver_phone text;
ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS merchant_phone text;
ALTER TABLE call_sessions ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create indexes if not exist
CREATE INDEX IF NOT EXISTS idx_call_sessions_order_id ON call_sessions(order_id);
CREATE INDEX IF NOT EXISTS idx_call_sessions_status ON call_sessions(status) WHERE status = 'active';

-- Add RLS policies for call_sessions (drop first if exist)
DROP POLICY IF EXISTS "Participants can read call_sessions" ON call_sessions;
DROP POLICY IF EXISTS "Service role can manage call_sessions" ON call_sessions;

CREATE POLICY "Participants can read call_sessions"
ON call_sessions FOR SELECT
TO authenticated
USING (
  customer_user_id = auth.uid() OR
  driver_user_id = auth.uid() OR
  merchant_user_id = auth.uid()
);

CREATE POLICY "Service role can manage call_sessions"
ON call_sessions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Add RLS policies for call_logs (drop first if exist)
DROP POLICY IF EXISTS "Participants can read call_logs" ON call_logs;
DROP POLICY IF EXISTS "Service role can manage call_logs" ON call_logs;

CREATE POLICY "Users can read their own call_logs"
ON call_logs FOR SELECT
TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Service role can manage call_logs"
ON call_logs FOR ALL
TO service_role
USING (true)
WITH CHECK (true);