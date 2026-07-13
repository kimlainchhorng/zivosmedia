-- Bot creation and employee invite claim RPCs require either a signed-in app
-- user or a backend service-role caller. They should not be directly callable
-- by anonymous clients through PostgREST.

revoke execute on function public.create_bot(text, text, text) from public;
revoke execute on function public.create_bot(text, text, text) from anon;
grant execute on function public.create_bot(text, text, text) to authenticated;
grant execute on function public.create_bot(text, text, text) to service_role;

revoke execute on function public.create_bot_row(uuid, uuid, text, text, text) from public;
revoke execute on function public.create_bot_row(uuid, uuid, text, text, text) from anon;
revoke execute on function public.create_bot_row(uuid, uuid, text, text, text) from authenticated;
grant execute on function public.create_bot_row(uuid, uuid, text, text, text) to service_role;

revoke execute on function public.claim_employee_invite(text) from public;
revoke execute on function public.claim_employee_invite(text) from anon;
grant execute on function public.claim_employee_invite(text) to authenticated;
grant execute on function public.claim_employee_invite(text) to service_role;
