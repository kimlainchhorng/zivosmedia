# MiMo run — 2026-06-16T18:06:56.763Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Plan a focused Telegram-style Archived Chats screen update for src/pages/ChatHubPage.tsx. Reference: Telegram Web Archived Chats screen with pale-blue header, back arrow, title 'Archived Chats', top-right overflow, and clean rows with avatar, name, muted icon, preview, time/unread badge. Existing app currently expands archived chats inline via showArchived; avoid backend changes and preserve chat opening/unarchive behavior. Suggest minimal diff and risks.
- files: src/pages/ChatHubPage.tsx

---

# Plan: Telegram-Style Archived Chats Screen for `ChatHubPage.tsx`

## 1. Short Plan

**Current state:** `showArchived` is a boolean that toggles archived chats *inline* (probably expanding a section inside the main chat list). The file already imports `Archive`, `ArchiveRestore`, `ArrowLeft`, `MoreVertical`, `BellOff`, and `ChevronRight`; `ChatRowAvatar` already has `variant="archived"` styling (rounded-xl, muted bg, ring).

**Goal:** Replace the inline expansion with a **full-screen Telegram-style archived view** when `showArchived` is true: a dedicated pale-blue header (`bg-sky-50 dark:bg-sky-950/30`) with `← Back | Archived Chats | ⋮`, rendered as clean scrollable rows (avatar, name, muted icon if applicable, last-message preview, time/unread badge). Reuses all existing data (`personalChats` filtered for archived, `groupChats`, etc.) and the existing swipe-to-unarchive behavior.

**Approach — 3 additive hunks, 0 data-layer changes:**

### Hunk A — New helper component: `ArchivedChatsScreen`

Define it **above** the `ChatHubPage` export (after `ChatRowAvatar`, before `CategoryTab`). This is a pure render component — it receives the archived rows as props and renders the Telegram-style screen. No new state, no new queries.

```tsx
function ArchivedChatsScreen({
  archivedChats,
  onBack,
  onOpen,
  onUnarchive,
}: {
  archivedChats: Array<{
    id: string;
    name: string;
    avatar?: string | null;
    lastMessage: string;
    lastTime: string;
    unread: number;
    isGroup?: boolean;
    isMuted?: boolean;
    isSelfChat?: boolean;
  }>;
  onBack: () => void;
  onOpen: (chat: any) => void;
  onUnarchive: (chatId: string) => void;
}) {
  return (
    <div className="flex flex-col h-full bg-background">
      {/* Telegram-style pale-blue header */}
      <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 bg-sky-50 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/40">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors"
          aria-label="Back to chats"
        >
          <ArrowLeft className="w-5 h-5 text-sky-700 dark:text-sky-300" />
        </button>
        <h2 className="flex-1 text-[15px] font-semibold text-sky-900 dark:text-sky-100 truncate">
          Archived Chats
        </h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors" aria-label="More options">
              <MoreVertical className="w-5 h-5 text-sky-700 dark:text-sky-300" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => archivedChats.forEach(c => onUnarchive(c.id))}>
              <ArchiveRestore className="w-4 h-4 mr-2" />
              Unarchive all
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto">
        {archivedChats.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Archive className="w-12 h-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">No archived chats</p>
            <p className="text-xs mt-1 opacity-70">Swipe left on a chat to archive it</p>
          </div>
        ) : (
          archivedChats.map((chat) => (
            <button
              key={chat.id}
              onClick={() => onOpen(chat)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-left border-b border-border/30"
            >
              <ChatRowAvatar
                avatar={chat.avatar}
                name={chat.name}
                isGroup={!!chat.isGroup}
                active="personal"
                variant="archived"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium truncate flex items-center gap-1">
                    {chat.name}
                    {chat.isMuted && <BellOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {chat.lastTime ? formatChatTime(chat.lastTime) : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "No messages"}</p>
                  {chat.unread > 0 && (
                    <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-sky-500 text-white text-[10px] font-bold px-1">
                      {chat.unread > 99 ? "99+" : chat.unread}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
```

### Hunk B — Derive archived rows inside `ChatHubPage`

Add a `useMemo` alongside the existing chat-data derives (near the `hasAnyChatData` computation ~L640 area):

```tsx
const archivedChats = useMemo(() => {
  // Merge all categories that can be archived, dedup by id
  const all: Array<{
    id: string; name: string; avatar?: string | null;
    lastMessage: string; lastTime: string; unread: number;
    isGroup?: boolean; isMuted?: boolean; isSelfChat?: boolean;
  }> = [];

  for (const c of personalChats) {
    if ((c as any).archived) all.push({ ...c, isGroup: false, isSelfChat: (c as any).isSelfChat });
  }
  for (const c of groupChats) {
    if ((c as any).archived) all.push({ ...c, isGroup: true });
  }
  // Add other categories as needed (shop/ride/support rarely archived)

  return all.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
}, [personalChats, groupChats]);
```

> **Note:** The exact `.archived` field name depends on how the existing code detects archived chats in the hidden portion. If it's a local `useLocalChatHide` hook or a DB column, this `useMemo` should mirror whatever the inline expansion already uses. The advisor should check the hidden rendering section (~L800–L2800) for the exact filter before wiring.

### Hunk C — Conditional render swap

In the main return JSX, wherever the component renders the main chat content vs. archived (search for `showArchived` in the JSX), replace the inline expansion with:

```tsx
{showArchived ? (
  <ArchivedChatsScreen
    archivedChats={archivedChats}
    onBack={() => setShowArchived(false)}
    onOpen={(chat) => {
      setShowArchived(false);
      // Reuse existing chat-open logic (same as the current inline archived row click)
      if (chat.isGroup) {
        setOpenGroupChat({ id: chat.id, name: chat.name, avatar: chat.avatar });
      } else {
        setOpenPersonalChat({ id: chat.id, name: chat.name, avatar: chat.avatar });
      }
    }}
    onUnarchive={(chatId) => {
      // Call existing unarchive handler (same as current swipe-right or context menu)
      // Re-check the hidden portion for the exact handler name
    }}
  />
) : (
  /* existing main chat list content */
)}
```

---

## 2. Proposed Diff (Exact Shape)

All changes in **one file**: `src/pages/ChatHubPage.tsx`

**Hunk A** — Insert after `ChatRowAvatar` definition (~L165):
```diff
+ function ArchivedChatsScreen({ archivedChats, onBack, onOpen, onUnarchive }: {
+   archivedChats: Array<{ id: string; name: string; avatar?: string | null; lastMessage: string; lastTime: string; unread: number; isGroup?: boolean; isMuted?: boolean; isSelfChat?: boolean }>;
+   onBack: () => void;
+   onOpen: (chat: any) => void;
+   onUnarchive: (chatId: string) => void;
+ }) {
+   return (
+     <div className="flex flex-col h-full bg-background">
+       <div className="shrink-0 flex items-center gap-3 px-3 py-2.5 bg-sky-50 dark:bg-sky-950/30 border-b border-sky-100 dark:border-sky-900/40">
+         <button onClick={onBack} className="p-1.5 -ml-1 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors" aria-label="Back to chats">
+           <ArrowLeft className="w-5 h-5 text-sky-700 dark:text-sky-300" />
+         </button>
+         <h2 className="flex-1 text-[15px] font-semibold text-sky-900 dark:text-sky-100 truncate">Archived Chats</h2>
+         <DropdownMenu>
+           <DropdownMenuTrigger asChild>
+             <button className="p-1.5 rounded-full hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-colors" aria-label="More options">
+               <MoreVertical className="w-5 h-5 text-sky-700 dark:text-sky-300" />
+             </button>
+           </DropdownMenuTrigger>
+           <DropdownMenuContent align="end">
+             <DropdownMenuItem onClick={() => archivedChats.forEach(c => onUnarchive(c.id))}>
+               <ArchiveRestore className="w-4 h-4 mr-2" />Unarchive all
+             </DropdownMenuItem>
+           </DropdownMenuContent>
+         </DropdownMenu>
+       </div>
+       <div className="flex-1 overflow-y-auto">
+         {archivedChats.length === 0 ? (
+           <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
+             <Archive className="w-12 h-12 mb-3 opacity-30" />
+             <p className="text-sm font-medium">No archived chats</p>
+             <p className="text-xs mt-1 opacity-70">Swipe left on a chat to archive it</p>
+           </div>
+         ) : (
+           archivedChats.map((chat) => (
+             <button key={chat.id} onClick={() => onOpen(chat)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 active:bg-muted transition-colors text-left border-b border-border/30">
+               <ChatRowAvatar avatar={chat.avatar} name={chat.name} isGroup={!!chat.isGroup} active="personal" variant="archived" />
+               <div className="flex-1 min-w-0">
+                 <div className="flex items-center justify-between gap-2">
+                   <span className="text-sm font-medium truncate flex items-center gap-1">{chat.name}{chat.isMuted && <BellOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}</span>
+                   <span className="text-[11px] text-muted-foreground shrink-0">{chat.lastTime ? formatChatTime(chat.lastTime) : ""}</span>
+                 </div>
+                 <div className="flex items-center justify-between gap-2 mt-0.5">
+                   <p className="text-xs text-muted-foreground truncate">{chat.lastMessage || "No messages"}</p>
+                   {chat.unread > 0 && (
+                     <span className="shrink-0 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-sky-500 text-white text-[10px] font-bold px-1">{chat.unread > 99 ? "99+" : chat.unread}</span>
+                   )}
+                 </div>
+               </div>
+             </button>
+           ))
+         )}
+       </div>
+     </div>
+   );
+ }
```

**Hunk B** — Add `archivedChats` memo inside `ChatHubPage` (~near L640, after `hasChatListRefreshError`):
```diff
+ const archivedChats = useMemo(() => {
+   const all: Array<{ id: string; name: string; avatar?: string | null; lastMessage: string; lastTime: string; unread: number; isGroup?: boolean; isMuted?: boolean; isSelfChat?: boolean }> = [];
+   for (const c of personalChats) {
+     if ((c as any).archived) all.push({ ...c, isGroup: false, isSelfChat: (c as any).isSelfChat });
+   }
+   for (const c of groupChats) {
+     if ((c as any).archived) all.push({ ...c, isGroup: true });
+   }
+   return all.sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
+ }, [personalChats, groupChats]);
```

**Hunk C** — In the JSX return, wherever `showArchived` is currently toggling an inline section, wrap the main content:
```diff
- {/* existing inline archived expansion */}
+ {showArchived ? (
+   <ArchivedChatsScreen
+     archivedChats={archivedChats}
+     onBack={() => setShowArchived(false)}
+     onOpen={(chat) => {
+       setShowArchived(false);
+       if (chat.isGroup) {
+         setOpenGroupChat({ id: chat.id, name: chat.name, avatar: chat.avatar });
+       } else {
+         setOpenPersonalChat({ id: chat.id, name: chat.name, avatar: chat.avatar, isSelfChat: chat.isSelfChat });
+       }
+     }}
+     onUnarchive={(chatId) => { /* wire to existing unarchive handler */ }}
+   />
+ ) : (
+   /* ... existing main list ... */
+ )}
```

---

## 3. Risks & Owner Verification

| Risk | Mitigation |
|------|-----------|
| **Archived filter is unknown** — the 21% visible portion doesn't show how archived chats are detected. The `.archived` property assumption must be confirmed by reading the hidden rendering section (~L800–L2800). | Codex must read the full file and verify the exact field name / filter used by the existing `showArchived` inline expansion before applying Hunks B+C. |
| **Unarchive handler name unknown** — the `onUnarchive` callback must match whatever the current swipe/context-menu handler calls. | Same — inspect the hidden portion for the existing unarchive function and wire it identically. |
| **Dedup across categories** — if a personal chat and a group chat share the same `id`, the merge could produce duplicates. | Use `Map<string, ...>` keyed on `id` in the memo instead of array concat. |
| **Muted detection** — the `isMuted` field is assumed; check if muted chats carry a flag or use the `BellOff` logic already in the file. | Inspect hidden portion for muted state. |
| **No new queries** — this is purely a render-layer change over existing data. Zero backend risk. | ✓ |
| **`npm run update` gate** — must pass type-check + worker + build. The new component reuses only existing imports (`ArrowLeft`, `MoreVertical`, `Archive`, `ArchiveRestore`, `BellOff`, `DropdownMenu*`, `ChatRowAvatar`, `formatChatTime`). No new imports needed. | Run `npm run update` after applying. |

**Bottom line:** The structural change is clean and additive (one new component + one conditional swap), but the **exact wiring** of the archived-chat filter and the unarchive handler requires reading the hidden ~80% of the file. Codex should apply this plan after confirming those two hooks.
