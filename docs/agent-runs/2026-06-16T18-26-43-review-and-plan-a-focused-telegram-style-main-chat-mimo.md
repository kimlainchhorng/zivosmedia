# MiMo run — 2026-06-16T18:26:43.017Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review and plan a focused Telegram-style main chat list header update in src/pages/ChatHubPage.tsx. Reference: Telegram Web left sidebar header at mobile width: pale-blue top band, hamburger icon left, rounded search pill with Search icon and placeholder, overlapping small avatar stack near the right, star icon button at far right. Existing local header currently shows Chat title and search input. Avoid backend changes; preserve menu/search/channel/folder behavior; suggest minimal diff and risks.
- files: src/pages/ChatHubPage.tsx

---

# Telegram-style Chat List Header — Plan & Diff

## 1. Short Plan

**Goal:** Replace the current chat-list sidebar header (title + search) with a Telegram-style header: pale-blue top band, hamburger icon left, rounded search pill center, overlapping small avatar stack right, star-icon (Saved Messages) far right.

**What already exists in the file (confirmed from visible code):**
- `Menu` icon imported, `showChatMenu` state + hamburger-menu already wired
- `Search` icon imported, `search`/`searchInputRef` state + `/`-to-focus binding
- `globalSearchOpen` state for the search overlay (keeps existing behavior)
- `chatMenuProfile` query returns user avatar/name for the header
- `Bell` + `ChatBellPopover` already mounted (keep or relocate)
- `showArchived` / `ArrowLeft` for the archived-chats back button
- `openSavedMessages()` handler already exists

**What to add/change (header band only — no data/backend changes):**
1. A pale-blue gradient band wrapper (`bg-gradient-to-r from-sky-50 to-blue-50` or similar) for the header area only
2. **Left:** `Menu` button (existing, restyled as a 40×40 rounded button)
3. **Center:** Rounded search pill — the current `<input>` wrapped in a rounded-full container with the `Search` icon as a left adornment and a `Search chats…` placeholder. Clicking it opens `globalSearchOpen` (existing overlay). On desktop, typing inline still works.
4. **Right:** Overlapping avatar stack — the last 3-4 active chat avatars from `personalChats` (the query already returns `avatar`), rendered as overlapping 24px circles with negative margin
5. **Far-right:** Star/bookmark icon button → calls `openSavedMessages()` (existing handler)

**Preserved behaviors:**
- Hamburger menu → existing `showChatMenu` sheet/overlay (unchanged)
- Search → existing `globalSearchOpen` + `search` state + `/` keyboard shortcut (unchanged)
- `ChatBellPopover` → relocated into the header band or kept in its current position
- Archived chats back → existing `showArchived` + `ArrowLeft` (unchanged)
- Folder tabs → rendered below the header band (unchanged)
- All keyboard shortcuts (T→command panels, /→search) preserved

---

## 2. Proposed Diff

The exact JSX is in the **hidden** portion of the file (~L6800+). Based on the visible state/imports, here is the conceptual before/after for the header section. The implementer must locate the header JSX (search for `"Chats"` or the `searchInputRef` usage in the render tree) and replace the header band.

### Before (conceptual — current header):

```tsx
{/* Current header — approximate, from state usage patterns */}
<div className="flex items-center justify-between p-3 border-b">
  <div className="flex items-center gap-2">
    <button onClick={() => setShowChatMenu(true)}>
      <Menu className="w-5 h-5" />
    </button>
    <h1 className="text-lg font-semibold">Chats</h1>
  </div>
  <div className="flex items-center gap-2">
    <input
      ref={searchInputRef}
      value={search}
      onChange={(e) => setSearch(e.target.value)}
      placeholder="Search…"
      className="…"
    />
    {/* Bell, avatar, etc. */}
  </div>
</div>
```

### After (Telegram-style header band):

```tsx
{/* Telegram-style header band */}
<div className="bg-gradient-to-r from-sky-50 via-blue-50 to-sky-50 dark:from-slate-800 dark:via-slate-800 dark:to-slate-800 border-b border-sky-100/60 dark:border-slate-700/60 px-3 py-2">
  <div className="flex items-center gap-2">
    {/* ── Left: hamburger ── */}
    <button
      onClick={() => setShowChatMenu(true)}
      className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-sky-100/70 dark:hover:bg-slate-700/70 transition-colors"
      aria-label="Open menu"
    >
      <Menu className="w-5 h-5 text-sky-600 dark:text-sky-400" />
    </button>

    {/* ── Center: search pill ── */}
    <button
      type="button"
      onClick={() => {
        setGlobalSearchOpen(true);
        // On desktop we could also focus the inline input:
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }}
      className="flex-1 flex items-center gap-2 h-9 px-3 rounded-full
        bg-white/80 dark:bg-slate-700/80 border border-sky-200/60 dark:border-slate-600/60
        shadow-sm hover:shadow transition-shadow text-left"
    >
      <Search className="w-4 h-4 text-sky-400 dark:text-slate-400 shrink-0" />
      <span className="text-sm text-slate-400 dark:text-slate-500 truncate select-none">
        Search chats…
      </span>
    </button>

    {/* ── Right: overlapping avatar stack (last 3 active chats) ── */}
    <div className="flex items-center -space-x-2 shrink-0">
      {personalChats.slice(0, 3).map((chat) => (
        <div
          key={chat.id}
          className="w-6 h-6 rounded-full ring-2 ring-sky-50 dark:ring-slate-800 overflow-hidden bg-muted"
        >
          {chat.avatar ? (
            <img src={chat.avatar} alt="" className="w-full h-full object-cover" loading="lazy" />
          ) : (
            <span className="flex items-center justify-center w-full h-full text-[9px] font-bold text-muted-foreground">
              {(chat.name || "U").slice(0, 1).toUpperCase()}
            </span>
          )}
        </div>
      ))}
    </div>

    {/* ── Far-right: star → Saved Messages ── */}
    <button
      onClick={openSavedMessages}
      className="flex items-center justify-center w-9 h-9 rounded-full
        hover:bg-sky-100/70 dark:hover:bg-slate-700/70 transition-colors"
      aria-label="Saved Messages"
    >
      <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
    </button>
  </div>
</div>
```

**Required import addition** (top of file):

```diff
+import Star from "lucide-react/dist/esm/icons/star";
```

**Search input rework (below the header band):** The existing inline search `<input>` (if it's a separate visible element below the header) should be **hidden on mobile** (`hidden md:block` or removed in favor of the pill + overlay pattern). On desktop it can remain as-is or also become a pill. The `search` state, `searchInputRef`, and `globalSearchOpen` overlay are completely unchanged — the pill just triggers the existing flow.

---

## 3. Risks & Verification

| Risk | Mitigation |
|------|-----------|
| **Can't see the actual render JSX** (file is 295k chars, only 20% visible). The header band location must be confirmed by searching the render tree for `searchInputRef`, `"Chats"`, or the `<header>`/border-b wrapper. | Implementer must locate the exact JSX in the hidden portion before applying. |
| **Dark mode** — the `from-sky-50` gradient looks wrong in dark. | Wrapped both light/dark tokens (`dark:from-slate-800`). Verify in both themes. |
| **Avatar stack width overflow on narrow screens** — 3 avatars (72px + overlaps) + pill + hamburger may not fit at 320px. | The pill uses `flex-1` so it compresses. The avatar stack uses `-space-x-2` (overlap). Test at 320px, 375px, 768px. |
| **`globalSearchOpen` overlay vs pill** — both trigger search. Need to make sure the pill doesn't conflict with the existing inline input if both are rendered. | On mobile, hide the inline input and let the pill open the overlay. On desktop, either keep the inline input or unify on the pill. |
| **`ChatBellPopover` position** — if currently in the header, it needs a new home or the pale-blue band gets crowded. | Move Bell into the hamburger menu items, or keep it as a secondary icon between avatars and star. |
| **Reduced motion** — no motion in this change (static layout), so no risk. | N/A |
| **`npm run update` gate** — must pass (type-check + worker type-check + production build). | Run after applying. The only new import is `Star` (lucide, tree-shaken). |

**Owner must:**
1. Confirm the exact header JSX location in the hidden ~80% of the file
2. Decide: keep `ChatBellPopover` in the header band, or move it into the hamburger menu
3. Decide: do the overlapping avatars come from `personalChats` (recent DMs) or from a different source (e.g., online contacts from `useBulkPresence`)
4. Run `npm run update` after applying
5. Preview at 375px / 768px / 1280px widths
