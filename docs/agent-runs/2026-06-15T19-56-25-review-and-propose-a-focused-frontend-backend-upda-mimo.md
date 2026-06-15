# MiMo run — 2026-06-15T19:56:25.476Z

- model: mimo-v2.5-pro
- api_format: openai
- task: Review and propose a focused frontend/backend update for /channels/new. Current issue: channel creation page needs a more complete create flow; likely backend gap is creator should become owner subscriber/admin and frontend should validate/sanitize handle, prevent stale availability races, improve accessible form state, and test end-to-end. Keep changes scoped to NewChannelPage and a migration/RPC if needed; do not touch unrelated ride/driver files. Compare with current DB policies: self-subscribe permits only sub/pending, managers use channel_add_member, useMyChannels reads channel_subscribers.
- files: src/pages/channels/NewChannelPage.tsx, src/hooks/useMyChannels.ts, supabase/migrations/20260602033000_add_channel_join_approval.sql, supabase/migrations/20260602033500_add_channel_removed_users.sql, supabase/migrations/20260602034500_add_channel_add_member_rpc.sql, supabase/migrations/20260602035500_add_channel_redeem_invite.sql

---

# Channel Creation Flow — Review & Proposed Fix

## 1. Plan

**Problem:** When a user creates a channel via `NewChannelPage`, only a `channels` row is inserted. The creator is **never added as a subscriber** (let alone with `owner` role). This means:

- `useMyChannels` (which reads `channel_subscribers`) won't show the newly created channel in "My Channels."
- The creator has no `channel_subscribers` row, so they can't manage members via `channel_add_member` (which checks `is_channel_manager`).
- The self-subscribe RLS policy only allows `role = 'sub'` or `'pending'` — not `'owner'`. So a post-insert self-subscribe from the client would fail or produce the wrong role.

**Additional frontend gaps:**
- Handle availability check has a stale-read race: the debounced check can resolve *after* the user clicks "Create," and there's no re-check at submit time.
- No minimum handle length or leading-character validation.
- The availability icon is not announced to screen readers (no `aria-live`).
- The form uses `onClick` on the submit button instead of `<form onSubmit>`, so Enter-to-submit doesn't work.

**Fix — two parts:**

### Part A: New migration — `channel_create` RPC
A SECURITY DEFINER function that:
1. Inserts the channel row.
2. Inserts the creator as `channel_subscribers` with `role = 'owner'` (bypasses the self-subscribe RLS which only allows `sub`/`pending`).
3. Returns the new channel's `id` and `handle`.

This mirrors the existing pattern (`channel_add_member`, `channel_redeem_invite` are both SECURITY DEFINER functions that bypass self-subscribe RLS).

### Part B: `NewChannelPage` improvements
- Call the new `channel_create` RPC instead of raw `insert`.
- Re-check handle availability at submit time (close the race).
- Validate handle length ≥ 3, no leading `_`/digit.
- Wrap in `<form onSubmit>` for Enter-to-submit.
- Add `aria-live` region for availability feedback.
- Add `aria-label` on the Back button (already has one — keep it).
- Add interaction tokens (focus ring, active scale) per the repo's premium pattern.

---

## 2. Proposed Changes

### File A: `supabase/migrations/20260614000000_add_channel_create_rpc.sql` (NEW)

```sql
-- Create a channel and subscribe the creator as owner.
-- SECURITY DEFINER because the self-subscribe RLS on channel_subscribers
-- only allows role 'sub' or 'pending' — the creator needs 'owner'.
create or replace function public.channel_create(
  p_name text,
  p_handle text,
  p_description text,
  p_is_public boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_channel public.channels;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  -- Validate handle: 3-32 chars, lowercase alphanumeric + underscore,
  -- must start with a letter.
  if p_handle is null or length(p_handle) < 3 or length(p_handle) > 32 then
    raise exception 'handle must be 3-32 characters';
  end if;
  if p_handle !~ '^[a-z][a-z0-9_]*$' then
    raise exception 'handle must start with a letter and contain only lowercase letters, digits, and underscores';
  end if;

  -- Validate name
  if p_name is null or length(trim(p_name)) = 0 then
    raise exception 'name is required';
  end if;

  -- Unique handle check (the insert would fail anyway, but a clear message is better)
  if exists (select 1 from public.channels where handle = p_handle) then
    raise exception 'handle is already taken';
  end if;

  insert into public.channels (name, handle, description, is_public, owner_id)
  values (trim(p_name), p_handle, nullif(trim(p_description), ''), p_is_public, v_user_id)
  returning * into v_channel;

  -- Subscribe creator as owner (bypasses self-subscribe RLS)
  insert into public.channel_subscribers (channel_id, user_id, role)
  values (v_channel.id, v_user_id, 'owner');

  return jsonb_build_object('id', v_channel.id, 'handle', v_channel.handle);
end;
$$;

grant execute on function public.channel_create(text, text, text, boolean) to authenticated;
```

### File B: `src/pages/channels/NewChannelPage.tsx` (MODIFIED)

```tsx
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useSmartBack } from "@/lib/smartBack";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Check, X, ChevronLeft } from "lucide-react";

const HANDLE_RE = /^[a-z][a-z0-9_]{2,31}$/;

function sanitizeHandle(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 32);
}

export default function NewChannelPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/channels");
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [userHasEditedHandle, setUserHasEditedHandle] = useState(false);
  const [desc, setDesc] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  // Auto-derive handle from name until user manually edits it
  useEffect(() => {
    if (!userHasEditedHandle && name.trim()) {
      setHandle(sanitizeHandle(name.trim()));
    }
  }, [name, userHasEditedHandle]);

  // Debounced availability check
  useEffect(() => {
    if (!handle.trim() || !HANDLE_RE.test(handle)) {
      setAvailable(null);
      return;
    }
    const t = setTimeout(async () => {
      const { data } = await supabase
        .from("channels")
        .select("id")
        .eq("handle", handle)
        .maybeSingle();
      setAvailable(!data);
    }, 300);
    return () => clearTimeout(t);
  }, [handle]);

  const handleValid = HANDLE_RE.test(handle);
  const nameValid = name.trim().length > 0;

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    // Derive handle if still empty
    let finalHandle = handle;
    if (!finalHandle && name.trim()) {
      finalHandle = sanitizeHandle(name.trim());
      setHandle(finalHandle);
    }

    if (!nameValid) {
      toast.error("Name is required");
      return;
    }
    if (!HANDLE_RE.test(finalHandle)) {
      toast.error("Handle must be 3-32 chars, start with a letter, and use only lowercase letters, digits, or underscores");
      return;
    }

    setSubmitting(true);

    // Re-check availability at submit time to close the stale-read race
    const { data: existing } = await supabase
      .from("channels")
      .select("id")
      .eq("handle", finalHandle)
      .maybeSingle();

    if (existing) {
      setAvailable(false);
      setSubmitting(false);
      toast.error("Handle was just taken — please choose another");
      return;
    }

    const { data: u } = await supabase.auth.getUser();
    if (!u.user) {
      toast.error("Sign in required");
      setSubmitting(false);
      return;
    }

    const { data, error } = await supabase.rpc("channel_create", {
      p_name: name.trim(),
      p_handle: finalHandle,
      p_description: desc.trim() || "",
      p_is_public: isPublic,
    });

    setSubmitting(false);

    if (error) {
      // Surface server-side validation (duplicate handle, etc.)
      toast.error(error.message);
      return;
    }

    const result = data as { id: string; handle: string } | null;
    toast.success("Channel created");
    nav(`/c/${result?.handle ?? finalHandle}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button
          type="button"
          onClick={goBack}
          className="p-1.5 rounded-full hover:bg-muted/60 transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">New channel</h1>
      </header>
      <div className="mx-auto max-w-lg p-4">
        <form
          ref={formRef}
          onSubmit={submit}
          className="space-y-4 rounded-lg border border-border bg-card p-4"
        >
          <div>
            <Label htmlFor="channel-name">Name</Label>
            <Input
              id="channel-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My channel"
              maxLength={100}
              required
            />
          </div>
          <div>
            <Label htmlFor="channel-handle">Handle</Label>
            <div className="relative">
              <Input
                id="channel-handle"
                value={handle}
                onChange={(e) => {
                  setHandle(sanitizeHandle(e.target.value));
                  setUserHasEditedHandle(true);
                }}
                placeholder="myhandle"
                maxLength={32}
                aria-invalid={handle.length > 0 && !handleValid}
                aria-describedby="handle-hint handle-status"
              />
              <span
                className="absolute right-3 top-2.5"
                aria-live="polite"
                id="handle-status"
              >
                {available === true && (
                  <Check className="h-4 w-4 text-green-500" aria-label="Handle available" />
                )}
                {available === false && (
                  <X className="h-4 w-4 text-destructive" aria-label="Handle taken" />
                )}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground" id="handle-hint">
              @{handle || "yourhandle"} · 3-32 chars, starts with a letter
            </p>
          </div>
          <div>
            <Label htmlFor="channel-desc">Description</Label>
            <Textarea
              id="channel-desc"
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="channel-public">Public</Label>
              <p className="text-xs text-muted-foreground">Anyone can find and view</p>
            </div>
            <Switch
              id="channel-public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>
          <Button
            type="submit"
            disabled={submitting || !nameValid || !handleValid}
            className="w-full"
          >
            {submitting ? "Creating…" : "Create channel"}
          </Button>
        </form>
      </div>
    </div>
  );
}
```

---

## 3. Summary of Changes

| What | Before | After |
|------|--------|-------|
| **Channel insert** | Raw `supabase.from("channels").insert(...)` — creator gets no `channel_subscribers` row | `supabase.rpc("channel_create", ...)` — SECURITY DEFINER inserts channel + subscribes creator as `owner` |
| **Handle validation** | Client-side regex strips chars but no length/leading-char check; server error is opaque | Client `HANDLE_RE = /^[a-z][a-z0-9_]{2,31}$/` + server-side validation in the RPC with clear error messages |
| **Availability race** | Debounced check only; stale result at submit time | Re-checks `channels` for the handle immediately before the RPC call |
| **Form submission** | `onClick` on Button (no Enter-to-submit) | `<form onSubmit>` — Enter works in any field |
| **Accessibility** | Availability icon has no screen-reader text; no `aria-invalid`/`aria-describedby` | `aria-live="polite"` region, `aria-label` on icons, `aria-invalid` on handle input, `aria-describedby` linking hint text |
| **Interaction tokens** | Back button has no focus ring or press scale | Added `transition-transform active:scale-95 focus-visible:ring-2 focus-visible:ring-ring` (per repo pattern) |
| **Label/Input association** | `<Label>` not `htmlFor`-linked | All inputs have `id` + matching `htmlFor` |

## 4. Owner Verification / Deployment Steps

1. **Apply the migration** to the live Supabase project (`slirphzzwcogdbkeicff`):
   ```bash
   supabase db push   # or apply the migration file manually via the dashboard
   ```
   The migration creates `channel_create(uuid)` RPC and grants `EXECUTE` to `authenticated`.

2. **Verify the RPC works** in the SQL editor:
   ```sql
   -- As an authenticated user:
   select public.channel_create('Test Channel', 'testchan', 'A test', true);
   -- Should return {"id": "...", "handle": "testchan"}
   -- Verify: select * from channel_subscribers where channel_id = '<id>';
   -- Should show one row with role = 'owner'
   ```

3. **Run the frontend gate:**
   ```bash
   npm run update
   ```
   Must pass (0 type errors + worker type-check + production build).

4. **Manual QA checklist:**
   - Create a channel → verify it appears in "My Channels" (`useMyChannels`).
   - Try creating a channel with a duplicate handle → should get "Handle was just taken."
   - Try a handle like `_abc` or `123` → should be blocked client-side.
   - Press Enter in any field → form should submit.
   - Tab through the form → availability icon should be announced by screen reader.

5. **No unrelated files touched.** The diff is scoped to `NewChannelPage.tsx` + one new migration file. No ride/driver/social files modified.
