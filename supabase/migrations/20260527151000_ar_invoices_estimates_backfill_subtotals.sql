-- Auto Repair — backfill subtotal/discount on legacy ar_invoices and
-- ar_estimates rows. Before today the save logic stored
--   subtotal_cents = total_cents (post-discount sum), discount_cents = 0
-- losing the discount/subtotal split. Recompute both from the canonical
-- `items` JSONB so reporting and PDF totals are correct.
--
-- Only touches rows that still look unsplit (subtotal == total AND discount == 0)
-- so re-running this migration on a row already corrected by the app is a no-op.

with line_calc as (
  select
    inv.id as row_id,
    case (it->>'category')
      when 'labor' then coalesce((it->>'hours')::numeric, 0) * coalesce((it->>'price')::numeric, 0)
      when 'part'  then coalesce((it->>'qty')::numeric,   0) * coalesce((it->>'price')::numeric, 0)
      else              coalesce((it->>'price')::numeric, 0)
    end as line_gross,
    coalesce((it->>'discount')::numeric, 0) as disc_val,
    coalesce(it->>'discountType', 'pct') as disc_type
  from public.ar_invoices inv
  cross join lateral jsonb_array_elements(coalesce(inv.items, '[]'::jsonb)) it
  where inv.subtotal_cents = inv.total_cents
    and coalesce(inv.discount_cents, 0) = 0
),
inv_totals as (
  select
    row_id,
    sum(line_gross) as gross,
    sum(
      case disc_type
        when 'amt' then least(disc_val, line_gross)
        else line_gross * least(100, disc_val) / 100
      end
    ) as discount
  from line_calc
  group by row_id
)
update public.ar_invoices inv
set
  subtotal_cents = round(t.gross * 100)::int,
  discount_cents = round(t.discount * 100)::int
from inv_totals t
where inv.id = t.row_id;

with line_calc as (
  select
    est.id as row_id,
    case (it->>'category')
      when 'labor' then coalesce((it->>'hours')::numeric, 0) * coalesce((it->>'price')::numeric, 0)
      when 'part'  then coalesce((it->>'qty')::numeric,   0) * coalesce((it->>'price')::numeric, 0)
      else              coalesce((it->>'price')::numeric, 0)
    end as line_gross,
    coalesce((it->>'discount')::numeric, 0) as disc_val,
    coalesce(it->>'discountType', 'pct') as disc_type
  from public.ar_estimates est
  cross join lateral jsonb_array_elements(
    coalesce(est.items, est.line_items, '[]'::jsonb)
  ) it
  where est.subtotal_cents = est.total_cents
    and coalesce(est.discount_cents, 0) = 0
),
est_totals as (
  select
    row_id,
    sum(line_gross) as gross,
    sum(
      case disc_type
        when 'amt' then least(disc_val, line_gross)
        else line_gross * least(100, disc_val) / 100
      end
    ) as discount
  from line_calc
  group by row_id
)
update public.ar_estimates est
set
  subtotal_cents = round(t.gross * 100)::int,
  discount_cents = round(t.discount * 100)::int
from est_totals t
where est.id = t.row_id;
