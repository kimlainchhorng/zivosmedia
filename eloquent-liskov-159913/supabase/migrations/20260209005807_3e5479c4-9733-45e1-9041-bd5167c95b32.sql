-- Add missing columns to notification_audit table
ALTER TABLE notification_audit
ADD COLUMN IF NOT EXISTS skip_reason TEXT,
ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Rename destination to destination_masked if needed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notification_audit' AND column_name = 'destination') THEN
    ALTER TABLE notification_audit RENAME COLUMN destination TO destination_masked;
  END IF;
END $$;