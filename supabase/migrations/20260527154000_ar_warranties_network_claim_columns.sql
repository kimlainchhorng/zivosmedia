-- Auto Repair — Warranties: promote network_id and claim_number from notes
-- text markers ([network:foo] [claim:bar]) into real columns.
--
-- Storing them in notes meant:
--   * Filtering by network was a `LIKE '%[network:x]%'` substring match,
--     fragile and unindexable.
--   * Searching for a specific claim number across warranties was impossible
--     without text parsing.
-- This migration adds proper columns and backfills existing rows from the
-- notes markers, then leaves the markers in place (harmless legacy text)
-- so older UI builds reading from notes still work.

alter table public.ar_warranties
  add column if not exists network_id text,
  add column if not exists claim_number text;

create index if not exists ar_warranties_store_network_idx
  on public.ar_warranties (store_id, network_id)
  where network_id is not null;

-- Backfill from notes markers. Only touches rows that don't yet have a
-- network_id / claim_number set (idempotent).
update public.ar_warranties
set network_id = substring(notes from '\[network:([^\]]+)\]')
where network_id is null
  and notes ~ '\[network:[^\]]+\]';

update public.ar_warranties
set claim_number = substring(notes from '\[claim:([^\]]+)\]')
where claim_number is null
  and notes ~ '\[claim:[^\]]+\]';
