-- Creator type persistence + Pay-Per-View (PPV) feature
-- ------------------------------------------------------
-- 1. Add canonical creator_type column to profiles (was localStorage-only)
-- 2. Add ppv_posts + ppv_unlocks tables for OF-style locked content

-- Ensure is_of_creator exists. The 20260507200000 migration may not have run
-- against every environment, so add the column defensively before we backfill.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_of_creator boolean NOT NULL DEFAULT false;

-- ─── 1. Profile creator_type ─────────────────────────────────────────────────
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creator_type text
    CHECK (creator_type IN ('content', 'of'));
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS creator_type_set_at timestamptz;

-- Backfill creator_type from existing is_of_creator flag so we don't lose state.
UPDATE public.profiles
SET creator_type = 'of', creator_type_set_at = COALESCE(creator_type_set_at, now())
WHERE is_of_creator = true AND creator_type IS NULL;

-- ─── 2. PPV posts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ppv_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  price_cents integer NOT NULL CHECK (price_cents >= 0),
  currency text NOT NULL DEFAULT 'usd',
  media_paths text[] NOT NULL DEFAULT '{}',
  preview_path text,
  is_published boolean NOT NULL DEFAULT true,
  unlock_count integer NOT NULL DEFAULT 0,
  revenue_cents integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ppv_posts_creator_idx ON public.ppv_posts(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ppv_posts_published_idx ON public.ppv_posts(is_published, created_at DESC);

ALTER TABLE public.ppv_posts ENABLE ROW LEVEL SECURITY;

-- Creators manage their own PPV posts
DROP POLICY IF EXISTS "ppv_posts_owner_all" ON public.ppv_posts;
CREATE POLICY "ppv_posts_owner_all" ON public.ppv_posts
  FOR ALL USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

-- Anyone authenticated can see published posts (metadata only — media stays in storage and is gated by unlock)
DROP POLICY IF EXISTS "ppv_posts_read_published" ON public.ppv_posts;
CREATE POLICY "ppv_posts_read_published" ON public.ppv_posts
  FOR SELECT USING (is_published = true);

-- ─── 3. PPV unlocks ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ppv_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ppv_id uuid NOT NULL REFERENCES public.ppv_posts(id) ON DELETE CASCADE,
  unlocker_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents_paid integer NOT NULL CHECK (amount_cents_paid >= 0),
  currency text NOT NULL DEFAULT 'usd',
  payment_provider text NOT NULL DEFAULT 'wallet',
  payment_ref text,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ppv_id, unlocker_id)
);

CREATE INDEX IF NOT EXISTS ppv_unlocks_unlocker_idx ON public.ppv_unlocks(unlocker_id, unlocked_at DESC);
CREATE INDEX IF NOT EXISTS ppv_unlocks_creator_idx ON public.ppv_unlocks(creator_id, unlocked_at DESC);

ALTER TABLE public.ppv_unlocks ENABLE ROW LEVEL SECURITY;

-- Users can see their own unlocks (as unlocker OR as creator earning revenue)
DROP POLICY IF EXISTS "ppv_unlocks_read_own" ON public.ppv_unlocks;
CREATE POLICY "ppv_unlocks_read_own" ON public.ppv_unlocks
  FOR SELECT USING (auth.uid() = unlocker_id OR auth.uid() = creator_id);

-- Users can create unlocks for themselves
DROP POLICY IF EXISTS "ppv_unlocks_insert_self" ON public.ppv_unlocks;
CREATE POLICY "ppv_unlocks_insert_self" ON public.ppv_unlocks
  FOR INSERT WITH CHECK (auth.uid() = unlocker_id);

-- ─── 4. Aggregate trigger: bump unlock_count + revenue on insert ─────────────
CREATE OR REPLACE FUNCTION public.ppv_unlocks_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ppv_posts
  SET unlock_count = unlock_count + 1,
      revenue_cents = revenue_cents + NEW.amount_cents_paid,
      updated_at = now()
  WHERE id = NEW.ppv_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ppv_unlocks_aggregate ON public.ppv_unlocks;
CREATE TRIGGER ppv_unlocks_aggregate
  AFTER INSERT ON public.ppv_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.ppv_unlocks_after_insert();

-- ─── 5. Storage bucket for PPV media (private — signed URLs only) ────────────
INSERT INTO storage.buckets (id, name, public)
VALUES ('ppv-media', 'ppv-media', false)
ON CONFLICT (id) DO NOTHING;

-- Creators can upload to their own folder (path prefix = their auth uid)
DROP POLICY IF EXISTS "ppv_media_owner_upload" ON storage.objects;
CREATE POLICY "ppv_media_owner_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ppv-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Creators can update/delete files in their own folder
DROP POLICY IF EXISTS "ppv_media_owner_update" ON storage.objects;
CREATE POLICY "ppv_media_owner_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ppv-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "ppv_media_owner_delete" ON storage.objects;
CREATE POLICY "ppv_media_owner_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'ppv-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Read: creators see their own files; unlockers see files for posts they've unlocked
DROP POLICY IF EXISTS "ppv_media_owner_or_unlocker_read" ON storage.objects;
CREATE POLICY "ppv_media_owner_or_unlocker_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'ppv-media'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.ppv_unlocks u
        JOIN public.ppv_posts p ON p.id = u.ppv_id
        WHERE u.unlocker_id = auth.uid()
          AND (
            name = ANY(p.media_paths)
            OR name = p.preview_path
          )
      )
    )
  );
