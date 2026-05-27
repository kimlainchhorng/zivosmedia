-- ============ REVIEW & RATING SYSTEM ============

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  reviewer_id uuid not null,
  service_type text not null check (service_type in ('hotel', 'flight', 'car_rental', 'restaurant', 'activity')),
  service_id text not null,
  booking_reference text,
  rating int not null check (rating >= 1 and rating <= 5),
  title text,
  body text,
  tags text[] default '{}',
  helpful_count int default 0,
  unhelpful_count int default 0,
  photos jsonb default '[]'::jsonb,
  verified_purchase boolean default false,
  status text default 'published' check (status in ('published', 'flagged', 'pending_moderation', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (reviewer_id) references auth.users(id) on delete cascade
);

-- Service-specific detail tables (optional, for rich data)
create table public.hotel_reviews (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  cleanliness_rating int check (cleanliness_rating >= 1 and cleanliness_rating <= 5),
  amenities_rating int check (amenities_rating >= 1 and amenities_rating <= 5),
  service_rating int check (service_rating >= 1 and service_rating <= 5),
  location_rating int check (location_rating >= 1 and location_rating <= 5),
  value_rating int check (value_rating >= 1 and value_rating <= 5),
  foreign key (review_id) references public.reviews(id) on delete cascade
);

create table public.restaurant_reviews (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  food_rating int check (food_rating >= 1 and food_rating <= 5),
  service_rating int check (service_rating >= 1 and service_rating <= 5),
  atmosphere_rating int check (atmosphere_rating >= 1 and atmosphere_rating <= 5),
  value_rating int check (value_rating >= 1 and value_rating <= 5),
  would_recommend boolean,
  foreign key (review_id) references public.reviews(id) on delete cascade
);

create table public.car_rental_reviews (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  vehicle_condition_rating int check (vehicle_condition_rating >= 1 and vehicle_condition_rating <= 5),
  pickup_experience_rating int check (pickup_experience_rating >= 1 and pickup_experience_rating <= 5),
  return_experience_rating int check (return_experience_rating >= 1 and return_experience_rating <= 5),
  value_rating int check (value_rating >= 1 and value_rating <= 5),
  foreign key (review_id) references public.reviews(id) on delete cascade
);

-- Review helpfulness tracking
create table public.review_votes (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  user_id uuid not null,
  vote_type text not null check (vote_type in ('helpful', 'unhelpful')),
  created_at timestamptz not null default now(),
  foreign key (review_id) references public.reviews(id) on delete cascade,
  foreign key (user_id) references auth.users(id) on delete cascade,
  unique(review_id, user_id)
);

-- Review moderation/flagging
create table public.review_flags (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null,
  reporter_id uuid not null,
  reason text not null check (reason in ('inappropriate', 'fake', 'off-topic', 'spam', 'conflict_of_interest')),
  description text,
  created_at timestamptz not null default now(),
  resolved boolean default false,
  resolved_at timestamptz,
  resolution_notes text,
  foreign key (review_id) references public.reviews(id) on delete cascade,
  foreign key (reporter_id) references auth.users(id) on delete cascade
);

-- ============ INDEXES ============
create index idx_reviews_service on public.reviews(service_type, service_id);
create index idx_reviews_reviewer on public.reviews(reviewer_id);
create index idx_reviews_rating on public.reviews(rating);
create index idx_reviews_created on public.reviews(created_at);
create index idx_reviews_status on public.reviews(status);
create index idx_review_votes_review on public.review_votes(review_id);
create index idx_review_flags_review on public.review_flags(review_id);
create index idx_review_flags_unresolved on public.review_flags(resolved);

-- ============ updated_at TRIGGERS ============
create trigger trg_reviews_updated
  before update on public.reviews
  for each row execute function public.update_updated_at_column();

-- ============ ENABLE RLS ============
alter table public.reviews enable row level security;
alter table public.hotel_reviews enable row level security;
alter table public.restaurant_reviews enable row level security;
alter table public.car_rental_reviews enable row level security;
alter table public.review_votes enable row level security;
alter table public.review_flags enable row level security;

-- ============ RLS POLICIES ============
-- Anyone can read published reviews
create policy "Anyone can read published reviews"
  on public.reviews for select
  using (status = 'published');

-- Authenticated users can insert reviews
create policy "Users can create reviews"
  on public.reviews for insert
  with check (reviewer_id = auth.uid());

-- Users can update their own reviews
create policy "Users can update own reviews"
  on public.reviews for update
  using (reviewer_id = auth.uid() and status != 'published');

-- Admins can moderate all reviews
create policy "Admins moderate reviews"
  on public.reviews for all
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

-- Review votes (anyone authenticated can vote)
create policy "Users can vote on reviews"
  on public.review_votes for insert
  with check (user_id = auth.uid());

-- Review flagging (anyone authenticated can flag)
create policy "Users can flag inappropriate reviews"
  on public.review_flags for insert
  with check (reporter_id = auth.uid());

-- Service-specific table policies inherit from parent review
create policy "Read hotel reviews"
  on public.hotel_reviews for select
  using (exists(select 1 from public.reviews where id = review_id and status = 'published'));

create policy "Read restaurant reviews"
  on public.restaurant_reviews for select
  using (exists(select 1 from public.reviews where id = review_id and status = 'published'));

create policy "Read car_rental reviews"
  on public.car_rental_reviews for select
  using (exists(select 1 from public.reviews where id = review_id and status = 'published'));
