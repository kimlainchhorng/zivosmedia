-- Expose the central admin customer lookup through the API schema used by PostgREST.

create schema if not exists api;

grant usage on schema api to service_role;

create or replace function api.zivosmedia_admin_customer_search(
  p_query text default '',
  p_limit integer default 25
)
returns table (
  id text,
  name text,
  email text,
  "primaryDomain" text,
  products text[],
  status text,
  risk text,
  "lastActivity" text
)
language sql
stable
security invoker
set search_path = api, public
as $$
  select *
  from public.zivosmedia_admin_customer_search(p_query, p_limit);
$$;

revoke all on function api.zivosmedia_admin_customer_search(text, integer) from public;
grant execute on function api.zivosmedia_admin_customer_search(text, integer) to service_role;
