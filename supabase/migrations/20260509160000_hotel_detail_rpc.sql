-- Phase D: aggregate RPC for the hotel detail page.
-- Replaces ~6 round-trips (store + profile + rooms + promo + reviews + reservations)
-- with one call. Returns a single JSON object.

create or replace function public.get_hotel_detail(
  p_store_id uuid,
  p_check_in date default null,
  p_check_out date default null
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
with
  s as (
    select
      id, name, category, address, logo_url, banner_url, description, phone,
      setup_complete, slug, gallery_images, latitude, longitude
    from store_profiles
    where id = p_store_id
  ),
  p as (
    select to_jsonb(lp.*) - 'created_at' - 'updated_at' as profile
    from lodge_property_profile lp
    where lp.store_id = p_store_id
    limit 1
  ),
  rooms_agg as (
    select coalesce(jsonb_agg(to_jsonb(lr.*) order by lr.sort_order nulls last, lr.name), '[]'::jsonb) as rooms
    from lodge_rooms lr
    where lr.store_id = p_store_id
      and coalesce(lr.is_active, true) = true
  ),
  promo_agg as (
    select coalesce(jsonb_agg(to_jsonb(pr.*)), '[]'::jsonb) as promotions
    from lodging_promotions pr
    where pr.store_id = p_store_id
      and pr.active = true
      and pr.member_only = false
      and (pr.starts_at is null or pr.starts_at <= now())
      and (pr.ends_at is null or pr.ends_at >= now())
  ),
  reviews_recent as (
    select to_jsonb(r) as r
    from (
      select id, rating, title, body, guest_name, created_at,
             cleanliness, comfort, location_score, staff, value
      from lodging_reviews
      where store_id = p_store_id and flagged = false
      order by created_at desc
      limit 10
    ) r
  ),
  reviews_stats as (
    select
      count(*) as count,
      coalesce(avg(rating)::numeric(3,2), 0) as avg,
      coalesce(avg(cleanliness)::numeric(3,2), null) as cleanliness,
      coalesce(avg(comfort)::numeric(3,2), null) as comfort,
      coalesce(avg(location_score)::numeric(3,2), null) as location_score,
      coalesce(avg(staff)::numeric(3,2), null) as staff,
      coalesce(avg(value)::numeric(3,2), null) as value
    from lodging_reviews
    where store_id = p_store_id and flagged = false
  ),
  -- Active room-blocking reservations from today onwards (or filtered to user
  -- window if both check-in/out provided).
  reservations_agg as (
    select coalesce(
      jsonb_agg(jsonb_build_object('room_id', room_id, 'check_in', check_in, 'check_out', check_out)),
      '[]'::jsonb
    ) as reservations
    from lodge_reservations
    where store_id = p_store_id
      and status not in ('cancelled', 'no_show')
      and check_out >= coalesce(p_check_in, current_date)
      and (p_check_out is null or check_in < p_check_out)
  )
select
  jsonb_build_object(
    'store', (select to_jsonb(s) from s),
    'profile', coalesce((select profile from p), null),
    'rooms', (select rooms from rooms_agg),
    'promotions', (select promotions from promo_agg),
    'reviews', jsonb_build_object(
      'items', coalesce((select jsonb_agg(r) from reviews_recent), '[]'::jsonb),
      'stats', (select to_jsonb(reviews_stats) from reviews_stats)
    ),
    'reservations', (select reservations from reservations_agg)
  );
$$;

grant execute on function public.get_hotel_detail(uuid, date, date) to anon, authenticated;

comment on function public.get_hotel_detail(uuid, date, date) is
  'Aggregate read for the hotel detail page. Returns store, profile, rooms, active promotions, recent reviews + stats, and active reservations in one JSON payload.';
