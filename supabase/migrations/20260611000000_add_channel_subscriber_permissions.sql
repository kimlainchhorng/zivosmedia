alter table public.channels
  add column if not exists subscriber_permissions jsonb not null default jsonb_build_object(
    'sendMessages', true,
    'sendMedia', true,
    'addMembers', true,
    'pinMessages', false,
    'editOwnTags', true,
    'changeInfo', false,
    'chargeStars', false
  );

comment on column public.channels.subscriber_permissions is
  'Telegram-style channel permission switches for subscriber capabilities.';
