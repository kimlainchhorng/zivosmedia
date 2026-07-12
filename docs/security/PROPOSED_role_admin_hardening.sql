-- PROPOSED — NOT APPLIED. Task 4: stop arbitrary role/admin enumeration.
--
-- ⚠️ REVIEW GATE (read before applying):
--   1. This was authored from migration source WITHOUT live DB access. Diff it against
--      the CURRENT function bodies and the roles table name/columns before applying.
--   2. Confirm via live pg_policies that NO RLS policy calls is_admin()/has_role() with a
--      NON-caller uuid (e.g. is_admin(row.owner_id)). If one does, hardening changes its
--      result — adjust the policy or the guard accordingly first.
--   3. Apply on a restorable clone (or with a tested rollback) — this is a 266-user
--      PRODUCTION project. Keep anon EXECUTE (RLS needs it); we change the BODY, not the grant.
--
-- Principle: the (uuid) overloads answer truthfully ONLY when the caller is the subject
-- or is themselves an admin; otherwise they return false. This preserves caller-scoped
-- RLS use (policies passing auth.uid()) while blocking arbitrary-user probing.

-- is_admin(check_user_id uuid): reveal admin status only to the subject or an admin.
create or replace function public.is_admin(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      -- caller may only learn about themselves, unless the caller is an admin
      when auth.uid() is null then false
      when auth.uid() <> check_user_id and not public.is_admin() then false
      else exists (
        select 1 from public.user_roles ur         -- ADAPT: match the real roles table
        where ur.user_id = check_user_id
          and ur.role = 'admin'                     -- ADAPT: match the real role value/enum
      )
    end;
$$;

-- has_role(_user_id uuid, _role ...): same guard. Provide for each existing overload
-- (text and public.app_role) to match the current signatures.
create or replace function public.has_role(_user_id uuid, _role text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is null then false
      when auth.uid() <> _user_id and not public.is_admin() then false
      else exists (
        select 1 from public.user_roles ur         -- ADAPT to real schema
        where ur.user_id = _user_id and ur.role::text = _role
      )
    end;
$$;

-- NOTE: the zero-arg is_admin() (caller check) and the caller-scoped predicates
-- (is_chat_member, is_store_owner, is_trip_participant, …) are intentionally KEPT as-is —
-- they return false for anon and are required by the public-read RLS path. Do NOT revoke them.
