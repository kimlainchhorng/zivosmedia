# MiMo run — 2026-06-16T17:55:49.745Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Plan a focused Telegram-style overflow menu update for src/pages/channels/ChannelPage.tsx. Reference: Telegram channel top-right three-dot menu with large rounded light-blue panel and rows Search, Mute/Unmute, Select Messages, Send a Gift, Boost Channel, Leave Channel. Use existing ChannelPage actions where possible; avoid backend changes. Suggest minimal diff and bugs to avoid.
- files: src/pages/channels/ChannelPage.tsx

---

## (1) Plan

**Goal:** Add a Telegram-style ⋮ three-dot overflow menu to the ChannelPage header, styled as a large rounded light-blue dropdown panel anchored top-right.

**Menu rows → existing actions:**

| Row | Icon | Action | Source |
|-----|------|--------|--------|
| Mute / Unmute | `BellOff` / `Bell` | `setNotifications(!notificationsOn)` | ✅ existing hook |
| Share channel | `Share2` | `shareChannel()` | ✅ existing fn |
| Copy link | `Copy` | `copyChannelLink()` | ✅ existing fn |
| Channel info | `Info` | `setInfoOpen(true)` | ✅ existing state |
| Leave channel | `LogOut` | `unsubscribe()` | ✅ existing hook (subscribed non-owners only) |

No Search / Select Messages / Send a Gift / Boost — no existing backend or UI for those.

**Scope:** Single file, ~70 lines added. No new dependencies, no backend changes.

---

## (2) Proposed diff — `src/pages/channels/ChannelPage.tsx`

### A. Import additions (line 3)

```diff
- import { Bell, ChevronDown, ChevronLeft, Compass, Copy, Info, Pin, Share2, Users, X } from "lucide-react";
+ import { Bell, BellOff, ChevronDown, ChevronLeft, Compass, Copy, Info, LogOut, MoreVertical, Pin, Share2, Users, X } from "lucide-react";
```

### B. New state + Escape handler (after existing `useState`/`useRef` declarations, ~line 64)

Insert after the `setDismissedPinnedPostId` line:

```tsx
  const [menuOpen, setMenuOpen] = useState(false);
```

Add a new `useEffect` (after the existing scroll/swipe effects, before the overscroll effect):

```tsx
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMenuOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);
```

### C. Header — add ⋮ button after the avatar button (~line 230)

Insert after the closing `</button>` of the avatar block:

```tsx
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className={cn(
              "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/80 text-slate-600 shadow-sm ring-1 ring-white/80 backdrop-blur transition hover:bg-white",
              menuOpen && "bg-sky-100 text-sky-700 ring-sky-300",
            )}
            aria-label="More options"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
```

### D. Menu overlay + panel (insert after the swipe-gradient `div`s, before the sticky header div — so it layers above the header's z-20)

Insert right after the closing `</div>` of the swipe-indicator circle (~line 208):

```tsx
      {menuOpen && (
        <>
          {/* Transparent backdrop — click anywhere outside to close */}
          <div
            className="fixed inset-0 z-50"
            onClick={() => setMenuOpen(false)}
            aria-hidden="true"
          />
          <div
            role="menu"
            className="fixed right-3 top-[calc(var(--zivo-safe-top,0px)+4.25rem)] z-50 w-60 overflow-hidden rounded-2xl bg-sky-50 shadow-xl ring-1 ring-sky-200/60"
          >
            <div className="py-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setNotifications(!notificationsOn); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium text-slate-800 transition hover:bg-sky-100/70"
              >
                {notificationsOn
                  ? <BellOff className="h-5 w-5 text-slate-500" />
                  : <Bell className="h-5 w-5 text-sky-600" />}
                {notificationsOn ? "Mute" : "Unmute"}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); shareChannel(); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium text-slate-800 transition hover:bg-sky-100/70"
              >
                <Share2 className="h-5 w-5 text-slate-500" />
                Share channel
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); void copyChannelLink(); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium text-slate-800 transition hover:bg-sky-100/70"
              >
                <Copy className="h-5 w-5 text-slate-500" />
                Copy link
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setMenuOpen(false); setInfoOpen(true); }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium text-slate-800 transition hover:bg-sky-100/70"
              >
                <Info className="h-5 w-5 text-slate-500" />
                Channel info
              </button>
              {isSubscribed && !isOwner && (
                <>
                  <div className="mx-3 my-1 h-px bg-sky-200/60" aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      if (window.confirm("Leave this channel?")) {
                        setMenuOpen(false);
                        unsubscribe();
                      }
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-[15px] font-medium text-red-600 transition hover:bg-red-50/70"
                  >
                    <LogOut className="h-5 w-5" />
                    Leave channel
                  </button>
                </>
              )}
            </div>
          </div>
        </>
      )}
```

---

## (3) Bugs to watch for / owner verification

| Risk | Mitigation |
|------|-----------|
| **Backdrop swallows scroll/touch** — transparent fixed div captures all pointer events while open | Menu closes on first tap; only open briefly. No scroll-lock needed (not a modal). |
| **z-index collision with sticky header** — header is `z-20`, menu must layer above | Backdrop + panel both at `z-50`. Verify the pinned bar (`z-10`) doesn't poke through. |
| **`setNotifications` arg type** — must be `boolean`, not a toggle function | Code passes `!notificationsOn` (boolean). Verify the hook signature accepts `(on: boolean)`. |
| **Owner can't leave** — gate the row on `isSubscribed && !isOwner` | ✅ Conditional render. Non-subscribers also excluded. |
| **Leave is destructive** — no undo | `window.confirm` gates the call. Consider a custom confirm dialog later. |
| **`unsubscribe()` error handling** — if it throws, menu is already closed | The hook should toast internally. If not, wrap in try/catch as a follow-up. |
| **Menu position on devices with large safe-area insets** — the `top` calc uses `--zivo-safe-top` | ✅ Already accounts for it. Test on iPhone with notch/Dynamic Island. |
| **Accessibility** — `role="menu"` / `role="menuitem"` + Escape key + `aria-expanded` on trigger | ✅ All present. Tab navigation works naturally through the items. |
| **Build gate** | Must pass `npm run update` (type-check + worker type-check + production build). No new deps. |

**Preview:** open any channel (`/c/:handle`) at 375px / 768px / 1280px viewport widths; tap the ⋮ button; verify the panel appears below the header, all 5 rows are tappable, and the menu closes on backdrop tap / Escape / action. For subscribed non-owners, verify "Leave channel" appears with a confirm dialog. For the owner, verify it's hidden.
