-- Auto-repair: per-shop sequential, unique invoice/estimate numbers.
--
-- nextDocNumber() used a random 4-digit suffix (INV-####) with a real
-- collision risk and no uniqueness guarantee. Replace with an atomic per-store
-- counter + a SECURITY DEFINER RPC, and enforce uniqueness at the DB.

-- Per-(store, doc_type) counter.
CREATE TABLE IF NOT EXISTS public.ar_doc_counters (
  store_id UUID NOT NULL,
  doc_type TEXT NOT NULL CHECK (doc_type IN ('invoice','estimate')),
  last_number INTEGER NOT NULL DEFAULT 1000,
  PRIMARY KEY (store_id, doc_type)
);
ALTER TABLE public.ar_doc_counters ENABLE ROW LEVEL SECURITY;
-- No client policies: only the SECURITY DEFINER RPC below touches this table.

-- Seed each counter from the highest existing numeric suffix so freshly issued
-- numbers never collide with legacy random ones. Ignore long (timestamp-style)
-- suffixes so the sequence stays in a sane range.
INSERT INTO public.ar_doc_counters (store_id, doc_type, last_number)
SELECT store_id, 'invoice',
       GREATEST(1000, COALESCE(MAX(NULLIF(regexp_replace(number, '\D', '', 'g'), '')::int), 1000))
FROM public.ar_invoices
WHERE length(regexp_replace(number, '\D', '', 'g')) BETWEEN 1 AND 5
GROUP BY store_id
ON CONFLICT (store_id, doc_type) DO NOTHING;

INSERT INTO public.ar_doc_counters (store_id, doc_type, last_number)
SELECT store_id, 'estimate',
       GREATEST(1000, COALESCE(MAX(NULLIF(regexp_replace(number, '\D', '', 'g'), '')::int), 1000))
FROM public.ar_estimates
WHERE length(regexp_replace(number, '\D', '', 'g')) BETWEEN 1 AND 5
GROUP BY store_id
ON CONFLICT (store_id, doc_type) DO NOTHING;

-- Atomically allocate the next number for a store + doc type.
CREATE OR REPLACE FUNCTION public.ar_next_doc_number(_store_id UUID, _doc_type TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_next INTEGER;
  v_prefix TEXT;
BEGIN
  IF _doc_type NOT IN ('invoice','estimate') THEN
    RAISE EXCEPTION 'invalid doc_type %', _doc_type;
  END IF;
  v_prefix := CASE WHEN _doc_type = 'invoice' THEN 'INV-' ELSE 'EST-' END;

  INSERT INTO public.ar_doc_counters (store_id, doc_type, last_number)
    VALUES (_store_id, _doc_type, 1001)
  ON CONFLICT (store_id, doc_type)
    DO UPDATE SET last_number = public.ar_doc_counters.last_number + 1
  RETURNING last_number INTO v_next;

  RETURN v_prefix || v_next::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ar_next_doc_number(UUID, TEXT) TO authenticated;

-- Enforce uniqueness now that numbering is sequential (verified: no dupes today).
ALTER TABLE public.ar_invoices  ADD CONSTRAINT ar_invoices_store_number_unique  UNIQUE (store_id, number);
ALTER TABLE public.ar_estimates ADD CONSTRAINT ar_estimates_store_number_unique UNIQUE (store_id, number);
