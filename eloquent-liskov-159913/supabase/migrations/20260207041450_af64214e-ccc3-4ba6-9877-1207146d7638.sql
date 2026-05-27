-- Add feedback column to trips table for rider comments
ALTER TABLE trips ADD COLUMN IF NOT EXISTS feedback TEXT;