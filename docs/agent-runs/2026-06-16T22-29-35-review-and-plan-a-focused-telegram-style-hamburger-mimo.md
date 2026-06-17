# MiMo run — 2026-06-16T22:29:35.492Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review and plan a focused Telegram-style hamburger side menu overlay update in src/pages/ChatHubPage.tsx. Reference: Telegram Web main chat list hamburger opened on mobile: whole page gets pale blue overlay, a left menu panel about 390px wide with light blue/white translucent background, rounded corners, profile row with circular avatar/initial, Add Account, Saved Messages, Archived Chats with count, My Stories, Contacts, divider, Wallet, Settings, More with chevron; icons are large outline, text bold, rows about 56px. Existing code uses chat-hub-menu-toggle peer menu in ChatHubPage header. Preserve current actions and no backend changes; avoid replacing navigation/actions. Suggest minimal diff and risks.
- files: src/pages/ChatHubPage.tsx

---

## 1 · Plan

1. **Add one import** — `Wallet` icon from lucide (all other needed icons are already imported).
2. **Add `showMoreMenu` state** — toggles the expandable "More" sub-section inside the side panel.
3. **Add Escape-key effect** — closes the menu on Escape when it's open.
4. **Add `handleSideMenuAction` callback** — dispatches each menu row to the **existing** action/navigation (preserving current behavior; no new routes or backend).
5. **Add `SideMenuRow` helper + `renderChatSideMenu()` function** — a portal'd overlay with the Telegram-style pale-blue backdrop, a 390px left panel (spring-animated), profile row, the 10 Telegram menu rows, and an expandable "More" section that surfaces the existing `personalHubMenu` items.
6. **Wire into JSX** — call `{renderChatSideMenu()}` in the component return; replace the old `chat-hub-menu-toggle` peer checkbox / `DropdownMenu` trigger with `onClick={() => setShowChatMenu(true)}`.
7. **Derive `archivedChatCount`** from the existing archived-chats data (the exact variable is in the hidden portion — see §3).

No new files, no backend changes, no new routes — purely a visual/structural replacement of the existing hamburger menu.

---

## 2 · Proposed Diff

**File:** `src/pages/ChatHubPage.tsx`

### 2a. Add import (near the other lucide imports, ~L42)

```diff
 import Activity from "lucide-react/dist/esm/icons/activity";
+import Wallet from "lucide-react/dist/esm/icons/wallet";
```

### 2b. Add state (right after `const [showChatMenu, setShowChatMenu] = useState(false);`)

```diff
 const [showChatMenu, setShowChatMenu] = useState(false);
+const [showMoreMenu, setShowMoreMenu] = useState(false);
```

### 2c. Derive archived count (near the other `useMemo` hooks, after `supportLastSeenSignature`)

The exact source depends on how `archivedList` is built in the hidden portion. Common shape:

```typescript
const archivedChatCount = useMemo(() => {
  // If archivedList is a derived array in the hidden portion, use its .length.
  // If archived IDs come from chatPrefs, use chatPrefs.archivedIds?.length ?? 0.
  // Placeholder — replace with the actual variable:
  return 0;
}, [/* same deps as archivedList */]);
```

> **Verify:** search the hidden portion for `archivedList` or `archived` — the count is its `.length`. If it comes from `useChatPrefs`, destructure the archived IDs from that hook.

### 2d. Escape-key effect (after the existing keyboard effects, near ~L480)

```typescript
useEffect(() => {
  if (!showChatMenu) return;
  const handler = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      setShowChatMenu(false);
      setShowMoreMenu(false);
    }
  };
  window.addEventListener("keydown", handler);
  return () => window.removeEventListener("keydown", handler);
}, [showChatMenu]);
```

### 2e. Action handler (near the other `useCallback` handlers)

This maps each Telegram-style row to the **existing** actions — no new navigation.

```typescript
const handleSideMenuAction = useCallback((action: string) => {
  setShowChatMenu(false);
  setShowMoreMenu(false);
  switch (action) {
    /* --- top-level Telegram rows --- */
    case "profile":
      navigate("/account");            // existing travel/social account page
      break;
    case "add-account":
      navigate(withRedirectParam("/auth", location.pathname));
      break;
    case "saved":
      openSavedMessages();             // existing function — opens self-chat
      break;
    case "archived":
      setShowArchived(true);           // existing state — shows archived list
      break;
    case "stories":
      // Wire to existing stories navigation if one exists;
      // otherwise no-op or navigate("/stories")
      break;
    case "contacts":
      setGlobalSearchOpen(true);       // existing state — opens contacts/search
      break;
    case "wallet":
      navigate("/wallet");
      break;
    case "settings":
      navigate("/settings");
      break;
    /* --- "More" expanded items (personalHubMenu actions) --- */
    case "find-contacts":
      setGlobalSearchOpen(true);
      break;
    case "contact-requests":
      // Wire to existing contact-requests surface
      break;
    case "nearby":
      // Wire to existing People Nearby surface
      break;
    case "broadcasts":
      // Wire to existing Broadcast Lists surface
      break;
    case "folders":
      // Wire to existing Folders surface
      break;
    case "bots":
      // Wire to existing Bots surface
      break;
    case "privacy":
      navigate("/settings");
      break;
    case "sessions":
      navigate("/settings");
      break;
    case "storage":
      navigate("/settings");
      break;
    default:
      break;
  }
}, [navigate, location.pathname, openSavedMessages]);
```

> **Verify:** check the hidden JSX for how each `personalHubMenu` item's `action` string is currently dispatched, and match it exactly. The switch above is a best-effort mapping; replace `break` stubs with the real handlers.

### 2f. `SideMenuRow` helper + `renderChatSideMenu()` function

Place these **inside** the `ChatHubPage` function body, before the `return`:

```tsx
/* ---------- Telegram-style side menu row ---------- */
function SideMenuRow({
  icon: Icon,
  label,
  badge,
  onClick,
  indent = false,
}: {
  icon: typeof Menu;
  label: string;
  badge?: number;
  onClick: () => void;
  indent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-3.5 w-full text-left h-14 px-5",
        "hover:bg-sky-100/60 active:bg-sky-200/40 transition-colors",
        indent && "pl-14",
      )}
    >
      <Icon className="h-6 w-6 text-slate-500 shrink-0" strokeWidth={1.75} />
      <span className="font-semibold text-[15px] text-slate-800 flex-1">{label}</span>
      {typeof badge === "number" && badge > 0 && (
        <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sky-500 px-1.5 text-[11px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

/* ---------- Telegram-style hamburger side menu overlay ---------- */
function renderChatSideMenu() {
  return (
    <BodyPortal>
      <AnimatePresence>
        {showChatMenu && (
          <>
            {/* Pale-blue full-page backdrop */}
            <motion.div
              key="side-menu-backdrop"
              className="fixed inset-0 z-[100] bg-sky-100/80 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => { setShowChatMenu(false); setShowMoreMenu(false); }}
              aria-hidden="true"
            />

            {/* Left panel — 390px, translucent blue-white, rounded corners */}
            <motion.nav
              key="side-menu-panel"
              role="dialog"
              aria-label="Chat menu"
              className={cn(
                "fixed inset-y-0 left-0 z-[101] flex w-[390px] max-w-[85vw] flex-col",
                "bg-sky-50/95 backdrop-blur-xl rounded-r-2xl shadow-2xl overflow-y-auto overscroll-contain",
              )}
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              {/* Close (X) */}
              <div className="flex items-center justify-end px-4 pt-4 pb-1">
                <button
                  onClick={() => { setShowChatMenu(false); setShowMoreMenu(false); }}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white/80 text-slate-500 hover:bg-white transition"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Profile row */}
              <button
                onClick={() => handleSideMenuAction("profile")}
                className="flex items-center gap-3.5 px-5 py-3 hover:bg-sky-100/60 active:bg-sky-200/40 transition-colors w-full text-left"
              >
                <div className="h-14 w-14 rounded-full overflow-hidden bg-sky-200 flex items-center justify-center shrink-0">
                  {chatMenuAvatar ? (
                    <img src={chatMenuAvatar} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="text-xl font-bold text-sky-700">{chatMenuInitial}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-[16px] text-slate-900 truncate">{chatMenuDisplayName}</div>
                  <div className="text-[13px] text-slate-400 truncate">
                    {chatMenuPhone || chatMenuUsername}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-slate-300 shrink-0" />
              </button>

              <div className="h-px bg-slate-200/50 mx-4 my-1.5" />

              {/* Add Account */}
              <SideMenuRow icon={UserPlus} label="Add Account" onClick={() => handleSideMenuAction("add-account")} />

              <div className="h-px bg-slate-200/50 mx-4 my-1.5" />

              {/* Saved Messages */}
              <SideMenuRow icon={Bookmark} label="Saved Messages" onClick={() => handleSideMenuAction("saved")} />

              {/* Archived Chats (with count badge) */}
              <SideMenuRow
                icon={Archive}
                label="Archived Chats"
                badge={archivedChatCount > 0 ? archivedChatCount : undefined}
                onClick={() => handleSideMenuAction("archived")}
              />

              {/* My Stories */}
              <SideMenuRow icon={Star} label="My Stories" onClick={() => handleSideMenuAction("stories")} />

              {/* Contacts */}
              <SideMenuRow icon={Users} label="Contacts" onClick={() => handleSideMenuAction("contacts")} />

              <div className="h-px bg-slate-200/50 mx-4 my-1.5" />

              {/* Wallet */}
              <SideMenuRow icon={Wallet} label="Wallet" onClick={() => handleSideMenuAction("wallet")} />

              {/* Settings */}
              <SideMenuRow icon={Settings} label="Settings" onClick={() => handleSideMenuAction("settings")} />

              {/* More (expandable → personalHubMenu items) */}
              <button
                onClick={() => setShowMoreMenu((v) => !v)}
                className="flex items-center gap-3.5 h-14 px-5 w-full text-left hover:bg-sky-100/60 active:bg-sky-200/40 transition-colors"
              >
                <MoreVertical className="h-6 w-6 text-slate-500 shrink-0" strokeWidth={1.75} />
                <span className="font-semibold text-[15px] text-slate-800 flex-1">More</span>
                <ChevronRight
                  className={cn(
                    "h-5 w-5 text-slate-300 shrink-0 transition-transform duration-200",
                    showMoreMenu && "rotate-90",
                  )}
                />
              </button>

              {/* Expanded "More" sub-items */}
              <AnimatePresence>
                {showMoreMenu && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    {personalHubMenu.map((item) => (
                      <SideMenuRow
                        key={item.action}
                        icon={item.icon}
                        label={item.label}
                        onClick={() => handleSideMenuAction(item.action)}
                        indent
                      />
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Bottom spacer + version */}
              <div className="flex-1" />
              <div className="px-5 pb-6 pt-2 text-[11px] text-slate-300 select-none">
                ZIVO Chat
              </div>
            </motion.nav>
          </>
        )}
      </AnimatePresence>
    </BodyPortal>
  );
}
```

### 2g. Wire into JSX

**In the component's `return`**, add the portal call at the top level (sibling to the main page wrapper):

```diff
  return (
    <>
+     {renderChatSideMenu()}
      {/* ... existing page JSX ... */}
    </>
  );
```

**In the header**, replace the old hamburger trigger. Look for the `chat-hub-menu-toggle` peer checkbox pattern or the `<DropdownMenuTrigger>` that wraps the `<Menu>` icon, and replace its click handler:

```diff
- {/* old peer checkbox: <input id="chat-hub-menu-toggle" ... /> */}
- {/* old trigger: <label htmlFor="chat-hub-menu-toggle" ... /> */}
+ <button
+   onClick={() => setShowChatMenu(true)}
+   className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-muted transition"
+   aria-label="Open menu"
+ >
+   <Menu className="h-5 w-5 text-foreground" />
+ </button>
```

If the old menu was a `<DropdownMenu>` (the shadcn import is in scope), **remove** the `<DropdownMenu>` / `<DropdownMenuContent>` / `<DropdownMenuItem>` tree that renders the `personalHubMenu` items — those items are now rendered inside `renderChatSideMenu()` via the "More" expandable section.

---

## 3 · What the Owner / Implementer Must Verify

| # | Item | Why |
|---|------|-----|
| 1 | **`archivedChatCount` source** | Search the hidden portion of ChatHubPage for `archivedList`, `archivedIds`, or the `useChatPrefs` destructure. Replace the `return 0` placeholder with the real `.length`. |
| 2 | **`personalHubMenu` action dispatch** | Check the hidden JSX for how each `action` string ("contacts", "find-contacts", etc.) is currently handled. Match `handleSideMenuAction` to those exact handlers. |
| 3 | **Old menu removal** | Find the `chat-hub-menu-toggle` peer checkbox / `<DropdownMenu>` in the hidden JSX. Remove it and replace the trigger with the simple `setShowChatMenu(true)` button. |
| 4 | **Route verification** | Confirm `/wallet`, `/settings`, `/account`, `/auth` routes exist. Adjust `handleSideMenuAction` if any are different. |
| 5 | **`npm run update`** | Must pass (type-check + worker type-check + production build, true exit 0). |
| 6 | **Visual preview** | Open at `http://127.0.0.1:5173/chat` on a 375px viewport → tap hamburger → confirm: pale-blue backdrop, 390px left panel, profile row, all 10 rows at ~56px height, "More" expands/collapses, backdrop/Escape close, archived badge appears when count > 0. |
| 7 | **No behavioral regressions** | Every menu item must trigger the same action it did before. Saved Messages opens self-chat. Archived shows the archived list. Contacts opens search. Etc. |
| 8 | **Reduced motion** | The framer-motion spring + fade transitions respect `prefers-reduced-motion` automatically via the global motion config. Verify in a reduced-motion browser if needed. |

---

### Risks

- **Incomplete action mapping.** Several `personalHubMenu` actions ("nearby", "broadcasts", "bots", "contact-requests") may not have dedicated routes — they might open modals or sheets wired in the hidden JSX. The implementer must trace each one.
- **Old menu cleanup.** If the old `<DropdownMenu>` is used elsewhere in the same return block (not just for the hamburger), removing it could break other dropdowns. Scope the removal carefully.
- **`archivedChatCount` stale closure.** If the archived list comes from a react-query cache that updates asynchronously, the badge might lag by one refetch. This matches Telegram's behavior (it's a convenience count, not a real-time indicator).
