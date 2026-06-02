do $$ begin
  create type public.channel_reaction_policy as enum ('all', 'some', 'none');
exception
  when duplicate_object then null;
end $$;

alter table public.channels
  add column if not exists reaction_policy public.channel_reaction_policy not null default 'all';

comment on column public.channels.reaction_policy is
  'Controls whether channel posts allow all supported reactions, a curated subset, or no reactions.';
