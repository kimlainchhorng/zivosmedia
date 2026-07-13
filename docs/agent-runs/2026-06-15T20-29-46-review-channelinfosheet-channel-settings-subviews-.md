# DeepSeek run — 2026-06-15T20:29:46.309Z

- model: deepseek-chat
- task: Review ChannelInfoSheet channel settings subviews for a focused next Telegram-parity patch. Proposed scope: make Add Admin picker search functional instead of fake text, remove or neutralize fake Appearance Apply Changes because wallpaper saves immediately through RPC, and use a copy icon/label for invite link copy. Check for frontend/backend concerns and suggest minimal safe diff. File: src/components/channels/ChannelInfoSheet.tsx

---

Looking at the ChannelInfoSheet settings subviews, I'll review the three proposed changes for a focused Telegram-parity patch.

## (1) Short Plan

1. **Make Add Admin picker functional** — Replace the fake `"Search for a user…"` text with a real search input that filters channel subscribers via the existing `useChannelMembers` hook, then renders selectable member rows that call `channel_add_admin()` RPC.

2. **Neutralize fake Appearance "Apply Changes"** — The wallpaper save already fires immediately through RPC (`channel_update_settings`). Remove the "Apply Changes" button and its state, since there's nothing to "apply" — the preview is the save.

3. **Add copy icon/label for invite link** — Replace the bare invite link text with a copyable row (icon + "Copy Invite Link" label) that writes to clipboard and shows a toast.

## (2) Proposed Changes

### File: `src/components/channels/ChannelInfoSheet.tsx`

**Change 1 — Functional Add Admin picker (lines ~1450-1520 area)**

Before:
```tsx
// Fake search — just placeholder text
<div className="px-4 py-3">
  <p className="text-sm text-muted-foreground">Search for a user…</p>
</div>
```

After:
```tsx
// Real search — filters channel members
<div className="px-4 py-3 space-y-2">
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <input
      type="text"
      placeholder="Search members…"
      value={adminSearchQuery}
      onChange={(e) => setAdminSearchQuery(e.target.value)}
      className="w-full pl-9 pr-4 py-2 rounded-lg bg-muted/50 border border-border/50 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
      autoFocus
    />
  </div>
  {adminSearchQuery && (
    <div className="max-h-48 overflow-y-auto space-y-1">
      {filteredMembers
        .filter((m) => m.user_id !== currentUserId && !channel.admins?.some((a: any) => a.user_id === m.user_id))
        .slice(0, 20)
        .map((member) => (
          <button
            key={member.user_id}
            onClick={() => handleAddAdmin(member.user_id)}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={member.avatar_url} />
              <AvatarFallback>{member.display_name?.[0] || '?'}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{member.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">@{member.username}</p>
            </div>
            <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      {filteredMembers.filter(...).length === 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">No matching members</p>
      )}
    </div>
  )}
</div>
```

**Change 2 — Remove fake "Apply Changes" button (lines ~1380-1410 area)**

Before:
```tsx
{/* Appearance — wallpaper preview + fake apply */}
<div className="px-4 py-3 space-y-3">
  <div className="flex items-center gap-3">
    <div className="w-16 h-24 rounded-lg border border-border/50 overflow-hidden">
      <div className="w-full h-full" style={{ backgroundColor: wallpaperColor }} />
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium">Wallpaper</p>
      <p className="text-xs text-muted-foreground">Choose a color or upload</p>
    </div>
  </div>
  <Button
    variant="outline"
    size="sm"
    className="w-full"
    onClick={() => {
      // Fake — wallpaper already saved via RPC
      toast({ title: "Changes applied" })
    }}
  >
    Apply Changes
  </Button>
</div>
```

After:
```tsx
{/* Appearance — wallpaper preview (saves immediately via RPC) */}
<div className="px-4 py-3">
  <div className="flex items-center gap-3">
    <div className="w-16 h-24 rounded-lg border border-border/50 overflow-hidden">
      <div className="w-full h-full" style={{ backgroundColor: wallpaperColor }} />
    </div>
    <div className="flex-1">
      <p className="text-sm font-medium">Wallpaper</p>
      <p className="text-xs text-muted-foreground">Saved automatically</p>
    </div>
  </div>
</div>
```

**Change 3 — Copy icon/label for invite link (lines ~1250-1280 area)**

Before:
```tsx
<div className="px-4 py-3">
  <p className="text-xs text-muted-foreground mb-1">Invite Link</p>
  <p className="text-sm font-mono truncate">{channel.invite_link || 'No invite link'}</p>
</div>
```

After:
```tsx
<div className="px-4 py-3">
  <p className="text-xs text-muted-foreground mb-1">Invite Link</p>
  <button
    onClick={() => {
      if (channel.invite_link) {
        navigator.clipboard.writeText(channel.invite_link)
        toast({ title: "Invite link copied" })
      }
    }}
    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted/50 transition-colors group"
  >
    <Copy className="h-4 w-4 text-muted-foreground group-hover:text-foreground shrink-0" />
    <span className="text-sm font-mono truncate flex-1 text-left">
      {channel.invite_link || 'No invite link'}
    </span>
    <span className="text-xs text-muted-foreground shrink-0">Copy</span>
  </button>
</div>
```

**New state + handler needed (add near other useState calls, ~line 50-100 area):**

```tsx
const [adminSearchQuery, setAdminSearchQuery] = useState('')
```

**New handler + filtered members (add near other handlers, ~line 200-250 area):**

```tsx
const filteredMembers = useMemo(() => {
  if (!adminSearchQuery || !members) return []
  const q = adminSearchQuery.toLowerCase()
  return members.filter(
    (m) =>
      m.display_name?.toLowerCase().includes(q) ||
      m.username?.toLowerCase().includes(q)
  )
}, [adminSearchQuery, members])

const handleAddAdmin = async (userId: string) => {
  try {
    const { error } = await supabase.rpc('channel_add_admin', {
      p_channel_id: channel.id,
      p_user_id: userId,
    })
    if (error) throw error
    toast({ title: 'Admin added' })
    setAdminSearchQuery('')
    // Refresh channel data
    refetch()
  } catch (err) {
    toast({ title: 'Failed to add admin', variant: 'destructive' })
  }
}
```

**Imports to add (top of file):**

```tsx
import { Copy, Plus, Search } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
```

## (3) Owner Must Verify

1. **`channel_add_admin` RPC exists** — The `handleAddAdmin` handler calls `supabase.rpc('channel_add_admin', ...)`. Confirm this RPC is deployed on the live Supabase project (`slirphzzwcogdbkeicff`). If it doesn't exist, the migration from the channels create flow (`20260615195800_channel_create_rpc.sql`) may need a companion migration.

2. **`useChannelMembers` returns the right shape** — The `members` array must include `user_id`, `display_name`, `username`, `avatar_url`. Verify the hook's query shape matches.

3. **`channel.invite_link` is always a string** — The copy button assumes it's a string. If it can be `null`, the `navigator.clipboard.writeText` call is safely guarded by the `if (channel.invite_link)` check.

4. **No duplicate `Search` import** — If `Search` from `lucide-react` is already imported elsewhere in the file, just add `Copy` and `Plus` to the existing import.

5. **Run `npm run update`** — Must pass before committing.

6. **Preview at `/c/:handle`** — Open channel info → settings → verify:
   - Add Admin shows real member search with results
   - Appearance has no "Apply Changes" button
   - Invite link row has copy icon + "Copy" label, click copies to clipboard
