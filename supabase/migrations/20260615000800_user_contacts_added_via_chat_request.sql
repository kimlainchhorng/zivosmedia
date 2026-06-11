-- Fix: "Add Contact" from a chat silently failed.
--
-- user_contacts.added_via has a CHECK constraint (from migration 20260426140220)
-- that only allowed: username, qr, invite_link, phone, suggestion, group.
-- But the chat "Add Contact" button sends added_via='chat', and accept_request
-- sends 'request' — neither was allowed, so the upsert failed the constraint and
-- the add returned a 500 ("Could not update contacts"). Add both values.

alter table public.user_contacts
  drop constraint if exists user_contacts_added_via_check;

alter table public.user_contacts
  add constraint user_contacts_added_via_check
  check (added_via in ('username','qr','invite_link','phone','suggestion','group','chat','request'));
