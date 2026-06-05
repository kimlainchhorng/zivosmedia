-- Auto-repair internal functions should not be callable anonymously through
-- PostgREST RPC endpoints. Trigger functions do not need client EXECUTE at all;
-- the document-number RPC is intentionally available only to signed-in users.

revoke execute on function public.ar_invoices_enforce_fleet_rules() from public;
revoke execute on function public.ar_invoices_enforce_fleet_rules() from anon;
revoke execute on function public.ar_invoices_enforce_fleet_rules() from authenticated;

revoke execute on function public.ar_recalc_invoice_payment() from public;
revoke execute on function public.ar_recalc_invoice_payment() from anon;
revoke execute on function public.ar_recalc_invoice_payment() from authenticated;

revoke execute on function public.ar_next_doc_number(uuid, text) from public;
revoke execute on function public.ar_next_doc_number(uuid, text) from anon;
grant execute on function public.ar_next_doc_number(uuid, text) to authenticated;
grant execute on function public.ar_next_doc_number(uuid, text) to service_role;
