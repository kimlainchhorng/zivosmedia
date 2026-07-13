# MiMo run — 2026-06-16T18:40:53.475Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review and plan a focused Telegram-style archived chats summary row update in src/pages/ChatHubPage.tsx. Reference: Telegram Web main chat list row below All/Personal segment: large blue circular archive icon on left, bold 'Archived Chats' title, gray preview listing archived chat names, gray unread/count badge on the right, no chevron. Existing implementation is the archived row around lines 4289-4308 with compact icon, title, 'N conversation' preview, optional unread badge, and chevron. Avoid backend changes; preserve click opening the dedicated archived screen and existing archive behavior. Suggest minimal diff and risks.
- files: src/pages/ChatHubPage.tsx

---

## 1. Plan

The goal is to restyle the archived-chats summary row that appears in the main chat list (around **lines 4289–4308** of `src/pages/ChatHubPage.tsx`) to match Telegram's visual treatment:

| Aspect | Current | Target (Telegram) |
|--------|---------|-------------------|
| **Left icon** | Compact/small avatar-area with Archive icon | Large 56px **blue circle** with white Archive icon |
| **Title** | "Archived Chats" (same weight as other rows) | **Bold** "Archived Chats" |
| **Preview text** | "N conversation(s)" — count only | **Gray comma-separated names** of first few archived chats (e.g. "Alice, Bob, Charlie") |
| **Right side** | Optional unread badge + **chevron-right** | Gray unread/count badge **only** — **no chevron** |
| **Click** | Opens archived screen via `setShowArchived(true)` | Same — no behavior change |

**No backend changes.** All data (the archived chat list) is already available in scope as `archivedList` (used by the archived screen). The preview names can be derived from that array client-side.

### Risks

1. **`archivedList` scope** — I cannot see lines 4289–4308; the person applying must confirm `archivedList` (or equivalent archived-chats data) is in scope at the row. If it's only fetched inside the archived-screen component, the simplest fix is to pass a `previewNames` string prop down or derive it from the same `personalChats` + `archivedChatIds` data already in scope. The diff below assumes `archivedList` is available; if not, use `archivedChatIds` to splice the first 3 names from `personalChats`.
2. **No layout shift** — the row height should remain 64–72px like other chat rows. The 56px blue circle is slightly larger than the 46px default avatar, so adjacent rows may need consistent vertical padding. Verify at 375px mobile.
3. **Reduced motion** — no new animations introduced (pure className/style change).

---

## 2. Proposed diff

**File:** `src/pages/ChatHubPage.tsx`, lines ~4289–4308 (the archived-chats summary row)

### Before (approximate reconstruction from task description)

```tsx
{/* Archived row */}
<button
  onClick={() => setShowArchived(true)}
  className="flex items-center w-full px-4 py-3 hover:bg-muted/50 transition-colors"
>
  <ChatRowAvatar avatar={null} name="Archived" isGroup={false} active={active} />
  <div className="flex-1 min-w-0 ml-3">
    <div className="flex items-center justify-between">
      <span className="font-medium text-sm">Archived Chats</span>
      {/* optional time */}
    </div>
    <p className="text-xs text-muted-foreground truncate">
      {archivedList.length} conversation{archivedList.length !== 1 ? "s" : ""}
    </p>
  </div>
  {/* unread badge (conditional) */}
  {archivedUnread > 0 && (
    <span className="ml-2 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-primary text-primary-foreground">
      {archivedUnread}
    </span>
  )}
  <ChevronRight className="w-4 h-4 text-muted-foreground ml-1 shrink-0" />
</button>
```

### After

```tsx
{/* Archived row — Telegram style */}
<button
  onClick={() => setShowArchived(true)}
  className="flex items-center w-full px-4 py-3 hover:bg-muted/50 transition-colors"
>
  {/* Large blue circle with white Archive icon (Telegram 56px) */}
  <div className="flex items-center justify-center h-14 w-14 rounded-full bg-blue-500 shrink-0">
    <Archive className="w-6 h-6 text-white" />
  </div>

  <div className="flex-1 min-w-0 ml-3">
    <div className="flex items-center justify-between">
      <span className="font-bold text-[15px]">Archived Chats</span>
    </div>
    <p className="text-xs text-muted-foreground truncate mt-0.5">
      {(() => {
        const names = (archivedList || [])
          .slice(0, 3)
          .map((c: any) => c.name || "Chat");
        if (names.length === 0) return "No archived chats";
        const suffix = archivedList.length > 3 ? ` and ${archivedList.length - 3} more` : "";
        return names.join(", ") + suffix;
      })()}
    </p>
  </div>

  {/* Muted unread/count badge — no chevron */}
  {archivedUnread > 0 && (
    <span className="ml-2 px-2 py-0.5 text-[11px] font-semibold rounded-full bg-muted text-muted-foreground shrink-0">
      {archivedUnread}
    </span>
  )}
</button>
```

### Key changes summarised

| # | Change | Why |
|---|--------|-----|
| 1 | Replace `<ChatRowAvatar>` with a hardcoded 56px `bg-blue-500` circle + white `<Archive>` icon | Telegram uses a large blue circle, not a generic avatar placeholder |
| 2 | Title: `font-medium text-sm` → `font-bold text-[15px]` | Telegram's archived row title is bolder/larger than normal row titles |
| 3 | Preview: `{count} conversation(s)` → comma-separated first 3 names + "and N more" | Telegram lists actual chat names, not a count |
| 4 | Unread badge: `bg-primary text-primary-foreground` → `bg-muted text-muted-foreground` | Telegram uses a muted/gray badge for archive count, not the primary color |
| 5 | Remove `<ChevronRight>` entirely | Telegram's archive row has no chevron — it's treated as a top-level nav item |

### If `archivedList` is not in scope

Replace the names derivation with a fallback that reads from the already-fetched `personalChats` + a set of archived IDs:

```tsx
const archivedNames = personalChats
  .filter(c => archivedChatIds?.has(c.id))
  .slice(0, 3)
  .map(c => c.name);
```

Ask the person applying to check the variable name for archived chat IDs in the surrounding scope (likely `archivedChatIds` or derived from `archivedList`).

---

## 3. Verify / deploy

1. **Visual check at 375px and 768px** — confirm the row is 64–72px tall, the blue circle doesn't crowd adjacent rows, and the preview text truncates cleanly.
2. **Empty state** — if there are zero archived chats, the preview should show "No archived chats" (the IIFE handles this).
3. **Click behavior** — tapping the row must still call `setShowArchived(true)` and open the dedicated archived screen (unchanged).
4. **Run `npm run update`** — type-check + worker type-check + production build must pass with 0 errors.
5. **No live Supabase writes** — this is purely a presentational change.
