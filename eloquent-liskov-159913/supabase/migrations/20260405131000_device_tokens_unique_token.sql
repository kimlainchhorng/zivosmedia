WITH ranked_tokens AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY token
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, id DESC
    ) AS rank
  FROM public.device_tokens
)
DELETE FROM public.device_tokens AS device_tokens
USING ranked_tokens
WHERE device_tokens.id = ranked_tokens.id
  AND ranked_tokens.rank > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_device_tokens_token_unique
  ON public.device_tokens(token);