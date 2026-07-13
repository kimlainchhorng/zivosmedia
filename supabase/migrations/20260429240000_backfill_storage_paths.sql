-- =============================================================================
-- Backfill: convert legacy public URLs in chat-media columns to storage paths.
--
-- Before this migration, image_url / video_url / voice_url columns stored full
-- public URLs of the form
--   https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
--
-- New uploads (post 20260429230000_security_hardening.sql) store the bare path.
-- This migration rewrites historical rows so the client (`useSignedMedia`) can
-- mint signed URLs uniformly.
--
-- Idempotent: rows that already contain a path (no scheme) are left alone.
-- =============================================================================

-- Helper: strip the public-URL prefix for a given bucket
create or replace function public._strip_public_url(_url text, _bucket text)
returns text
language sql
immutable
as $$
  select case
    when _url is null or _url = '' then _url
    when position('://' in _url) = 0 then _url  -- already a path
    else regexp_replace(
      _url,
      '^https?://[^/]+/storage/v1/object/public/' || _bucket || '/',
      ''
    )
  end;
$$;

-- ── direct_messages ───────────────────────────────────────────────────────────
update public.direct_messages
   set image_url = public._strip_public_url(image_url, 'chat-media-files')
 where image_url like 'http%' and image_url like '%/chat-media-files/%';

update public.direct_messages
   set video_url = public._strip_public_url(video_url, 'chat-media-files')
 where video_url like 'http%' and video_url like '%/chat-media-files/%';

update public.direct_messages
   set voice_url = public._strip_public_url(voice_url, 'chat-media-files')
 where voice_url like 'http%' and voice_url like '%/chat-media-files/%';

-- ── group_messages ────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'group_messages' and column_name = 'image_url'
  ) then
    update public.group_messages
       set image_url = public._strip_public_url(image_url, 'chat-media-files')
     where image_url like 'http%' and image_url like '%/chat-media-files/%';
  end if;
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'group_messages' and column_name = 'video_url'
  ) then
    update public.group_messages
       set video_url = public._strip_public_url(video_url, 'chat-media-files')
     where video_url like 'http%' and video_url like '%/chat-media-files/%';
  end if;
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'group_messages' and column_name = 'voice_url'
  ) then
    update public.group_messages
       set voice_url = public._strip_public_url(voice_url, 'chat-media-files')
     where voice_url like 'http%' and voice_url like '%/chat-media-files/%';
  end if;
end$$;

-- ── chat_media (file attachments) ─────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'chat_media' and column_name = 'file_url'
  ) then
    update public.chat_media
       set file_url = public._strip_public_url(file_url, 'chat-media-files')
     where file_url like 'http%' and file_url like '%/chat-media-files/%';
  end if;
end$$;

-- ── call_recordings ───────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'call_recordings' and column_name = 'recording_url'
  ) then
    update public.call_recordings
       set recording_url = public._strip_public_url(recording_url, 'chat-media-files')
     where recording_url like 'http%' and recording_url like '%/chat-media-files/%';
  end if;
end$$;

-- Drop the helper — only needed for the one-shot backfill
drop function public._strip_public_url(text, text);

-- ── Add a CHECK constraint going forward (optional, soft) ────────────────────
-- We don't enforce path-only at the DB layer because some older rows in
-- chat_media may still link to other public buckets we haven't migrated.
-- A future cleanup can add: check (file_url not like 'http%')
