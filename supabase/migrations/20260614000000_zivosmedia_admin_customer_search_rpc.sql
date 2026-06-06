-- Narrow customer lookup for the central Zivo Admin control plane.
-- Service-role only. Returns admin-search summary fields without broad table exposure.

create or replace function public.zivosmedia_admin_customer_search(
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
set search_path = public
as $$
  with profile_base as (
    select
      p.id,
      p.user_id,
      coalesce(nullif(p.display_brand_name, ''), nullif(p.full_name, ''), nullif(p.username::text, ''), 'Unnamed customer') as name,
      coalesce(nullif(p.email, ''), 'No email') as email,
      coalesce(nullif(p.status, ''), 'active') as profile_status,
      coalesce(p.updated_at, p.last_seen, p.created_at) as activity_at,
      coalesce(p.payout_hold, false) as payout_hold,
      coalesce(p.email_verified, false) as email_verified,
      coalesce(p.phone_verified, false) as phone_verified,
      coalesce(p.setup_complete, false) as setup_complete,
      coalesce(p.role, '') as profile_role,
      coalesce(p.admin_role, '') as admin_role,
      exists(select 1 from public.store_profiles sp where sp.owner_id = p.user_id) as has_software,
      exists(select 1 from public.drivers d where d.user_id = p.user_id or lower(d.email) = lower(p.email)) as has_driver,
      exists(select 1 from public.hotel_bookings hb where hb.customer_id = p.user_id)
        or exists(select 1 from public.flight_bookings fb where fb.customer_id = p.user_id)
        or exists(select 1 from public.car_rental_reservations cr where cr.customer_id = p.user_id) as has_travel
    from public.profiles p
    where
      coalesce(p.is_bot, false) = false
      and (
        coalesce(nullif(p_query, ''), '') = ''
        or p.full_name ilike '%' || p_query || '%'
        or p.display_brand_name ilike '%' || p_query || '%'
        or p.email ilike '%' || p_query || '%'
        or p.username::text ilike '%' || p_query || '%'
        or p.status ilike '%' || p_query || '%'
      )
  ),
  enriched as (
    select
      pb.*,
      array_remove(array[
        'Media',
        case when pb.has_travel then 'Travel' end,
        case when pb.has_software then 'Software' end,
        case when pb.has_driver then 'Driver' end
      ], null) as product_list
    from profile_base pb
  )
  select
    e.id::text as id,
    e.name,
    e.email,
    case
      when e.has_driver then 'zivodriver.com'
      when e.has_travel then 'zivostravel.com'
      when e.has_software then 'zivosoftware.com'
      else 'zivosmedia.com'
    end as "primaryDomain",
    e.product_list as products,
    case
      when lower(e.profile_status) in ('inactive', 'disabled', 'suspended') then 'Inactive'
      when e.setup_complete = false and e.has_software then 'Pending'
      else 'Active'
    end as status,
    case
      when e.payout_hold or lower(e.profile_status) in ('suspended', 'disabled') then 'High'
      when e.email_verified = false or e.phone_verified = false then 'Medium'
      else 'Low'
    end as risk,
    to_char(e.activity_at, 'Mon DD HH24:MI') as "lastActivity"
  from enriched e
  order by e.activity_at desc nulls last
  limit least(greatest(coalesce(p_limit, 25), 1), 50);
$$;

revoke all on function public.zivosmedia_admin_customer_search(text, integer) from public;
grant execute on function public.zivosmedia_admin_customer_search(text, integer) to service_role;
