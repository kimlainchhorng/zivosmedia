import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const migrationPath = "supabase/migrations/20260714000000_rc2_chat_authority_media_unlock_hardening.sql";
const migration = () => readFileSync(path.join(root, migrationPath), "utf8").replace(/\r\n/g, "\n");

describe("RC2 Chat authority media and transcript contracts", () => {
  it("creates direct-message-only race backstops after explicit duplicate preflight", () => {
    const sql = migration();

    expect(sql).toContain("lock table public.media_unlocks in share row exclusive mode");
    expect(sql).toContain("mu.message_table = 'direct_messages'");
    expect(sql).toContain("mu.status in ('pending', 'completed')");
    expect(sql).toContain("duplicate direct-message active/completed media unlocks");
    expect(sql).toContain("duplicate Stripe Checkout Session ID");
    expect(sql).toContain("create unique index idx_media_unlocks_direct_active_completed_unique");
    expect(sql).toContain("where message_table = 'direct_messages'");
    expect(sql).toContain("create unique index idx_media_unlocks_stripe_session_unique");
    expect(sql).toContain("where stripe_session_id is not null");
    expect(sql).not.toMatch(/\bdelete\s+from\s+public\.media_unlocks\b/i);
    expect(sql).not.toMatch(/\bupdate\s+public\.media_unlocks\b/i);
  });

  it("leaves media-unlock mutations service-owned while retaining buyer reads", () => {
    const sql = migration();

    expect(sql).toContain("alter table public.media_unlocks enable row level security");
    expect(sql).toContain("from pg_policies");
    expect(sql).toContain("tablename = 'media_unlocks'");
    expect(sql).toContain("revoke all on table public.media_unlocks from public");
    expect(sql).toContain("revoke all on table public.media_unlocks from anon, authenticated");
    expect(sql).toContain("grant select on table public.media_unlocks to authenticated");
    expect(sql).toContain('create policy "Media unlock buyers read own rows"');
    expect(sql).toContain("using ((select auth.uid()) = buyer_id)");
  });

  it("requires real authority buckets and makes both private", () => {
    const sql = migration();

    expect(sql).toContain("required chat storage bucket(s) missing");
    expect(sql).toContain("('chat-media-files'::text), ('voice-notes'::text)");
    expect(sql).toContain("update storage.buckets");
    expect(sql).toContain("set public = false");
    expect(sql).toContain("where id in ('chat-media-files', 'voice-notes')");
  });

  it("fails closed for an unknown transcript-cache relation and uses the documented participant boundary when present", () => {
    const sql = migration();

    expect(sql).toContain('to_regclass(\'public.voice_transcriptions\')');
    expect(sql).toContain("voice-note/direct-message participant columns are missing");
    expect(sql).toContain("public.voice_notes.message_id must match public.direct_messages.id");
    expect(sql).toContain("public.voice_notes.message_id is required for transcript-cache authorization");
    expect(sql).toContain("public.voice_transcriptions must be a table, not a view or other relation");
    expect(sql).toContain("v_cache_message_type <> v_note_message_type");
    expect(sql).toContain("RC2 transcript-cache hardening skipped");
    expect(sql).toContain('create policy "Voice note owner or direct-message participant can read"');
    expect(sql).toContain('create policy "Voice transcription cache participants can read"');
    expect(sql).toContain("vn.message_id = voice_transcriptions.message_id");
    expect(sql).toContain("revoke all on table public.voice_transcriptions from anon, authenticated");
  });
});
