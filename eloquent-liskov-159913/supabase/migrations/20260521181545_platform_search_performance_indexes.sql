-- Platform search/performance upgrade.
-- Uses built-in Postgres trigram and guarded expression indexes as a lighter
-- first step before adding a separate Elasticsearch/OpenSearch cluster.

CREATE SCHEMA IF NOT EXISTS extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

DO $$
DECLARE
  has_cols boolean;
BEGIN
  IF to_regclass('public.store_profiles') IS NOT NULL THEN
    SELECT count(*) = 5 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_profiles'
      AND column_name IN ('name', 'description', 'category', 'address', 'is_active');

    IF has_cols THEN
      EXECUTE $sql$
        CREATE INDEX IF NOT EXISTS idx_store_profiles_public_search_trgm
        ON public.store_profiles
        USING gin (
          lower(
            concat_ws(' ', name, description, category, address)
          ) extensions.gin_trgm_ops
        )
        WHERE is_active = true
      $sql$;
    END IF;
  END IF;

  IF to_regclass('public.store_products') IS NOT NULL THEN
    SELECT count(*) = 5 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_products'
      AND column_name IN ('name', 'description', 'category', 'brand', 'in_stock');

    IF has_cols THEN
      EXECUTE $sql$
        CREATE INDEX IF NOT EXISTS idx_store_products_public_search_trgm
        ON public.store_products
        USING gin (
          lower(
            concat_ws(' ', name, description, category, brand)
          ) extensions.gin_trgm_ops
        )
        WHERE in_stock = true
      $sql$;
    END IF;
  END IF;

  IF to_regclass('public.user_posts') IS NOT NULL THEN
    SELECT count(*) >= 2 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_posts'
      AND column_name IN ('caption', 'created_at');

    IF has_cols THEN
      EXECUTE $sql$
        CREATE INDEX IF NOT EXISTS idx_user_posts_caption_trgm
        ON public.user_posts
        USING gin (lower(coalesce(caption, '')) extensions.gin_trgm_ops)
      $sql$;

      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_user_posts_created_brin ON public.user_posts USING brin (created_at)';
    END IF;
  END IF;

  IF to_regclass('public.store_posts') IS NOT NULL THEN
    SELECT count(*) >= 2 INTO has_cols
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'store_posts'
      AND column_name IN ('caption', 'created_at');

    IF has_cols THEN
      EXECUTE $sql$
        CREATE INDEX IF NOT EXISTS idx_store_posts_caption_trgm
        ON public.store_posts
        USING gin (lower(coalesce(caption, '')) extensions.gin_trgm_ops)
      $sql$;

      EXECUTE 'CREATE INDEX IF NOT EXISTS idx_store_posts_created_brin ON public.store_posts USING brin (created_at)';
    END IF;
  END IF;
END $$;

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'public.store_profiles',
    'public.store_products',
    'public.user_posts',
    'public.store_posts'
  ] LOOP
    IF to_regclass(t) IS NOT NULL THEN
      EXECUTE 'ANALYZE ' || t;
    END IF;
  END LOOP;
END $$;
