create or replace function public.set_ar_expense_item_store_id()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  computed_line_total integer;
begin
  if new.store_id is null then
    select e.store_id into new.store_id
    from public.ar_expenses e
    where e.id = new.expense_id;
  end if;

  computed_line_total := round(coalesce(new.unit_price_cents, 0) * greatest(coalesce(new.quantity, 1), 0))::integer;

  if coalesce(new.line_total_cents, 0) = 0 then
    new.line_total_cents := computed_line_total;
  end if;

  if coalesce(new.amount_cents, 0) = 0 then
    new.amount_cents := coalesce(nullif(new.line_total_cents, 0), computed_line_total, 0);
  end if;

  return new;
end;
$$;
