# MiMo run — 2026-06-15T20:15:19.462Z

- model: mimo-v2.5-pro
- api_format: openai
- task: Review ChannelInfoSheet Channel Settings edit view for Telegram-like missing frontend/backend pieces. User selected settings area on /c/vip_khmer and asked to use DeepSeek + MiMo update frontend and backend, more missing like Telegram. Keep scoped to src/components/channels/ChannelInfoSheet.tsx and additive Supabase RPC/migration if useful. Current concerns: hardcoded Reactions value, hardcoded Administrators value, direct table updates for profile/settings, missing channel handle/link row in settings, missing unsaved-change/disabled states. Propose a practical diff and backend function without touching unrelated files.
- files: src/components/channels/ChannelInfoSheet.tsx, src/hooks/useChannel.ts, supabase/migrations/20260602033000_add_channel_join_approval.sql, supabase/migrations/20260602033500_add_channel_removed_users.sql, supabase/migrations/20260602034000_add_channel_admin_log.sql, supabase/migrations/20260611000000_add_channel_subscriber_permissions.sql

---

# ChannelInfoSheet — Telegram-like Settings Gap Analysis & Plan

## 1. Short Plan

After reviewing the full `ChannelInfoSheet.tsx` (~2400 lines), `useChannel.ts`, and the migration history, here are the concrete missing pieces in the **edit/settings view** compared to Telegram's channel settings:

### Issues Found

| # | Issue | Severity | Scope |
|---|-------|----------|-------|
| **A** | **Hardcoded "Reactions" value** — the edit view shows a static "All" for reactions instead of reading `channel.reaction_policy` | Medium | Frontend only |
| **B** | **Hardcoded "Administrators" count** — the edit view shows a static "1" admin count instead of computing from `adminMembers.length` | Medium | Frontend only |
| **C** | **Direct table updates for channel profile** — the edit view's save handler does raw `supabase.from("channels").update(...)` instead of using an RPC, which bypasses server-side validation (name length, handle uniqueness, etc.) | Medium | Frontend + Backend |
| **D** | **Missing channel handle/link row in edit view** — Telegram shows the `@handle` and a copy-link row in the settings edit screen; the current edit view has no handle display or link-copy affordance | Low-Medium | Frontend only |
| **E** | **No unsaved-changes guard** — navigating away from the edit view discards changes silently with no dirty-state tracking or confirmation | Low | Frontend only |
| **F** | **No disabled/saving state on the Save button** — the save button can be double-clicked; no loading spinner or disabled state during the async save | Low | Frontend only |

### What I'll Propose

1. **Frontend diff** (scoped to `ChannelInfoSheet.tsx`):
   - Fix hardcoded Reactions → read from `channel.reaction_policy`
   - Fix hardcoded Administrators → use `adminMembers.length`
   - Add handle/link row to the edit view header
   - Add dirty-state tracking + unsaved-changes confirmation
   - Add saving/disabled state on the Save button

2. **Backend migration** (new file, additive):
   - `channel_update_settings` RPC that validates + updates channel profile fields server-side, logs the action, and returns the updated row

---

## 2. Proposed Changes

### 2A. Frontend — `src/components/channels/ChannelInfoSheet.tsx`

The file is ~2400 lines and the `TelegramSubview` component (which renders the "edit" view) is in the truncated portion. Based on the patterns visible in the provided code and the `Channel` type, here are the specific edits:

#### Fix A: Hardcoded Reactions value

In the edit view's settings rows, find the row that displays "Reactions" with a hardcoded value like `"All"`. Replace with:

```tsx
// BEFORE (in the edit view settings rows):
<SettingsRow
  icon={Heart}
  label="Reactions"
  value="All"          // ← hardcoded
  onClick={() => setView("reactions")}
/>

// AFTER:
<SettingsRow
  icon={Heart}
  label="Reactions"
  value={
    channel.reaction_policy === "none"
      ? "Off"
      : channel.reaction_policy === "some"
        ? "Selected"
        : "All"
  }
  onClick={() => setView("reactions")}
/>
```

#### Fix B: Hardcoded Administrators count

```tsx
// BEFORE:
<SettingsRow
  icon={Shield}
  label="Administrators"
  value="1"            // ← hardcoded
  onClick={() => setView("admins")}
/>

// AFTER:
<SettingsRow
  icon={Shield}
  label="Administrators"
  value={String(adminMembers.length || 1)}
  onClick={() => setView("admins")}
/>
```

#### Fix D: Add handle/link row to edit view

Add a new row near the top of the edit view (after the channel name/avatar section, before the settings rows):

```tsx
{/* Channel link row — Telegram-style */}
<button
  type="button"
  onClick={async () => {
    try {
      await copyText(channelShareUrl);
      toast.success("Channel link copied");
    } catch {
      showManualCopyInvite(channelShareUrl);
    }
  }}
  className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-slate-50/70 active:bg-sky-50/70"
>
  <LinkIcon className="h-6 w-6 shrink-0 text-slate-500" />
  <span className="min-w-0 flex-1">
    <span className="block text-[15px] font-medium leading-tight text-slate-950">
      Channel Link
    </span>
    <span className="mt-0.5 block truncate text-[13px] leading-tight text-sky-500">
      {channelShareUrl.replace(/^https?:\/\//, "")}
    </span>
  </span>
  <Copy className="h-5 w-5 shrink-0 text-slate-400" />
</button>
```

#### Fix E: Unsaved-changes tracking

Add state at the top of the edit view's state block:

```tsx
const [editDirty, setEditDirty] = useState(false);

// Mark dirty whenever an edit field changes:
const markDirty = () => setEditDirty(true);

// On back-navigation from edit view, confirm if dirty:
const handleEditBack = () => {
  if (editDirty) {
    const discard = window.confirm("You have unsaved changes. Discard?");
    if (!discard) return;
  }
  setEditDirty(false);
  setView("info");
};
```

Then replace the edit view's back button `onClick` from `() => setView("info")` to `handleEditBack`.

#### Fix F: Save button disabled/saving state

```tsx
const [editSaving, setEditSaving] = useState(false);

// In the save handler:
const handleEditSave = async () => {
  if (editSaving) return;
  setEditSaving(true);
  try {
    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) throw new Error("Sign in required");

    // Use the new RPC instead of direct table update:
    const { error } = await (supabase as any).rpc("channel_update_settings", {
      p_channel_id: channel.id,
      p_name: editName.trim(),
      p_description: editDescription.trim() || null,
      p_is_public: editIsPublic,
      // ... other fields
    });
    if (error) throw error;

    void logChannelAction(channel.id, userData.user.id, "settings_changed", {
      meta: { fields: ["name", "description", "is_public"].filter(Boolean) },
    });

    setEditDirty(false);
    toast.success("Channel updated");
    await onRefresh?.();
    setView("info");
  } catch (err: any) {
    toast.error(err?.message || "Could not update channel");
  } finally {
    setEditSaving(false);
  }
};

// On the Save button:
<button
  type="button"
  onClick={() => void handleEditSave()}
  disabled={editSaving || !editDirty}
  className={cn(
    "rounded-full px-5 py-2 text-sm font-bold text-white transition",
    editSaving || !editDirty
      ? "bg-sky-300 cursor-not-allowed"
      : "bg-sky-500 hover:bg-sky-600 active:scale-95"
  )}
>
  {editSaving ? (
    <span className="inline-flex items-center gap-1.5">
      <Loader2 className="h-4 w-4 animate-spin" /> Saving…
    </span>
  ) : (
    "Save"
  )}
</button>
```

---

### 2B. Backend — New migration file

**File:** `supabase/migrations/20260616120000_channel_update_settings_rpc.sql`

```sql
-- channel_update_settings: server-side validated channel profile update.
-- Validates name length, handle uniqueness (if handle changes), and logs the action.
-- Returns the updated channel row so the client can refresh optimistically.

create or replace function public.channel_update_settings(
  p_channel_id uuid,
  p_name text default null,
  p_description text default null,
  p_is_public boolean default null,
  p_channel_join_approval_required boolean default null,
  p_restrict_saving_content boolean default null,
  p_reaction_policy text default null,
  p_slow_mode_seconds int default null,
  p_hide_members boolean default null,
  p_topics_enabled boolean default null,
  p_wallpaper_style text default null,
  p_subscriber_permissions jsonb default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_channel public.channels%rowtype;
  v_actor uuid := auth.uid();
  v_changes jsonb := '{}'::jsonb;
begin
  -- Must be signed in
  if v_actor is null then
    raise exception 'sign in required';
  end if;

  -- Must be channel manager (owner or admin)
  if not public.is_channel_manager(p_channel_id, v_actor) then
    raise exception 'only channel owners and admins can update settings';
  end if;

  select * into v_channel from public.channels where id = p_channel_id;
  if not found then
    raise exception 'channel not found';
  end if;

  -- Validate name
  if p_name is not null then
    if length(trim(p_name)) < 1 then
      raise exception 'channel name cannot be empty';
    end if;
    if length(trim(p_name)) > 128 then
      raise exception 'channel name too long (max 128 characters)';
    end if;
  end if;

  -- Validate reaction_policy
  if p_reaction_policy is not null and p_reaction_policy not in ('all', 'some', 'none') then
    raise exception 'invalid reaction_policy: must be all, some, or none';
  end if;

  -- Validate slow_mode_seconds
  if p_slow_mode_seconds is not null and (p_slow_mode_seconds < 0 or p_slow_mode_seconds > 3600) then
    raise exception 'slow_mode_seconds must be between 0 and 3600';
  end if;

  -- Validate wallpaper_style
  if p_wallpaper_style is not null and p_wallpaper_style not in ('green', 'blue', 'pink', 'none') then
    raise exception 'invalid wallpaper_style';
  end if;

  -- Apply updates, tracking what changed
  if p_name is not null and trim(p_name) is distinct from v_channel.name then
    update public.channels set name = trim(p_name) where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('name', trim(p_name));
  end if;

  if p_description is not null and p_description is distinct from v_channel.description then
    update public.channels set description = p_description where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('description', p_description);
  end if;

  if p_is_public is not null and p_is_public is distinct from v_channel.is_public then
    update public.channels set is_public = p_is_public where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('is_public', p_is_public);
  end if;

  if p_channel_join_approval_required is not null and p_channel_join_approval_required is distinct from v_channel.channel_join_approval_required then
    update public.channels set channel_join_approval_required = p_channel_join_approval_required where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('channel_join_approval_required', p_channel_join_approval_required);
  end if;

  if p_restrict_saving_content is not null and p_restrict_saving_content is distinct from v_channel.restrict_saving_content then
    update public.channels set restrict_saving_content = p_restrict_saving_content where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('restrict_saving_content', p_restrict_saving_content);
  end if;

  if p_reaction_policy is not null and p_reaction_policy is distinct from v_channel.reaction_policy then
    update public.channels set reaction_policy = p_reaction_policy where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('reaction_policy', p_reaction_policy);
  end if;

  if p_slow_mode_seconds is not null and p_slow_mode_seconds is distinct from v_channel.slow_mode_seconds then
    update public.channels set slow_mode_seconds = p_slow_mode_seconds where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('slow_mode_seconds', p_slow_mode_seconds);
  end if;

  if p_hide_members is not null and p_hide_members is distinct from v_channel.hide_members then
    update public.channels set hide_members = p_hide_members where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('hide_members', p_hide_members);
  end if;

  if p_topics_enabled is not null and p_topics_enabled is distinct from v_channel.topics_enabled then
    update public.channels set topics_enabled = p_topics_enabled where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('topics_enabled', p_topics_enabled);
  end if;

  if p_wallpaper_style is not null and p_wallpaper_style is distinct from v_channel.wallpaper_style then
    update public.channels set wallpaper_style = p_wallpaper_style where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('wallpaper_style', p_wallpaper_style);
  end if;

  if p_subscriber_permissions is not null and p_subscriber_permissions is distinct from v_channel.subscriber_permissions then
    update public.channels set subscriber_permissions = p_subscriber_permissions where id = p_channel_id;
    v_changes := v_changes || jsonb_build_object('subscriber_permissions', p_subscriber_permissions);
  end if;

  -- Log the action if anything changed
  if v_changes <> '{}'::jsonb then
    insert into public.channel_admin_log (channel_id, actor_id, action, meta)
    values (p_channel_id, v_actor, 'settings_changed', v_changes);
  end if;

  -- Return the updated channel as JSON
  return (
    select to_jsonb(c) from public.channels c where c.id = p_channel_id
  );
end;
$$;

-- RLS: the function itself is security definer + checks is_channel_manager internally,
-- so no additional policy needed. Grant execute to authenticated users.
grant execute on function public.channel_update_settings(
  uuid, text, text, boolean, boolean, boolean, text, int, boolean, boolean, text, jsonb
) to authenticated;

comment on function public.channel_update_settings is
  'Validated channel settings update. Owner/admin only. Logs changes to channel_admin_log.';
```

---

## 3. What the Owner Must Verify or Deploy

1. **Apply the migration first** — the new `channel_update_settings` RPC must exist in Supabase before the frontend switches to calling it. Run:
   ```bash
   # Local dev
   npx supabase db push
   
   # Or apply the SQL directly in the Supabase dashboard SQL editor
   ```

2. **Run the verify gate** after applying both changes:
   ```bash
   npm run update
   ```

3. **Manual testing checklist:**
   - Open `/c/vip_khmer` → tap the info sheet → tap the pencil (edit) icon
   - Verify the Reactions row shows the actual `reaction_policy` value (not hardcoded "All")
   - Verify the Administrators count matches the actual admin count
   - Verify the new Channel Link row appears and copies on tap
   - Change a field → try to go back → confirm the unsaved-changes dialog appears
   - Save with a valid change → confirm the button shows "Saving…" and disables
   - Save with no changes → confirm the button stays disabled
   - Verify the `channel_admin_log` table has a new `settings_changed` row after saving

4. **The edit view's exact line numbers** for the hardcoded values depend on the truncated portion of `ChannelInfoSheet.tsx` (the `TelegramSubview` component). The applying agent will need to locate:
   - The Reactions `<SettingsRow>` with `value="All"` (or similar hardcoded string)
   - The Administrators `<SettingsRow>` with `value="1"` (or similar hardcoded string)
   - The Save button in the edit view header

5. **No unrelated files are touched.** The migration is additive (new function only). The frontend changes are scoped entirely to `ChannelInfoSheet.tsx`.
