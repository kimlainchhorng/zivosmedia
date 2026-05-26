-- Phase 66: per-store tip preset percentages. Defaults match the
-- previously hardcoded 15/18/20 so existing stores see no behavior change.
-- Stores in lower-tip-culture markets (or higher) can rebalance.

ALTER TABLE public.cafe_settings
  ADD COLUMN IF NOT EXISTS tip_preset_1 SMALLINT NOT NULL DEFAULT 15
    CHECK (tip_preset_1 BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS tip_preset_2 SMALLINT NOT NULL DEFAULT 18
    CHECK (tip_preset_2 BETWEEN 1 AND 100),
  ADD COLUMN IF NOT EXISTS tip_preset_3 SMALLINT NOT NULL DEFAULT 20
    CHECK (tip_preset_3 BETWEEN 1 AND 100);
