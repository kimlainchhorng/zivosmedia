# MiMo run — 2026-06-16T18:18:07.746Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review and plan a focused Telegram archived-chat row-list polish in src/pages/ChatHubPage.tsx. Reference: Telegram Web Archived Chats content area rows: white header, rows on a pale blue/white canvas, 56px round avatars, bold 20px title with muted icon inline, right-aligned time, gray 18px preview with optional thumbnail/media cue, gray unread badge. Existing implementation has archivedScreenOpen dedicated screen around lines 4008-4138. Avoid backend changes; preserve open/unarchive/delete behavior. Suggest minimal diff and risks.
- files: src/pages/ChatHubPage.tsx

---

# Archived Chat Row-List Polish — Review & Plan

## (1) Plan

The archived chats screen (≈L4008-4138, not visible in the 20% window) was already restructured into a dedicated Telegram-style screen with a pale-blue header, clean rows, avatars, name+mute+preview+time+unread, and swipe actions. The task is to **tune the row content area** to match Telegram Web's archived-chats content more precisely:

| Element | Telegram Reference | Likely Current | Change Needed |
|---|---|---|---|
| **Canvas bg** | Pale blue-white (`#f4f4f5` / slate-50) | Probably white | `bg-slate-50` on the scroll container |
| **Row container** | White card, full-width, divider | Likely already white | Confirm `bg-white` + `divide-y divide-slate-100` or bottom-border |
| **Avatar** | 56px round | ✅ `ChatRowAvatar variant="archived"` = `h-14 w-14` | Already correct; confirm ring matches |
| **Title line** | Bold ~20px, chat name, **muted archive icon inline** after name | Probably `font-semibold text-sm` | `text-[17px] sm:text-[20px] font-bold`; add inline `<Archive className="w-4 h-4 text-slate-400 ml-1.5 inline shrink-0" />` after name span |
| **Time** | Right-aligned, small muted | Likely present | Confirm `text-xs text-slate-400 ml-auto shrink-0 tabular-nums` |
| **Preview** | Gray ~18px (Telegram uses ~14px but task says 18px), with optional media cue icon from `getMessagePreviewIcon` | Probably `text-sm text-muted-foreground` | `text-[15px] sm:text-[18px] text-slate-500 leading-snug line-clamp-1`; prepend `getMessagePreviewIcon` inline (already available) |
| **Unread badge** | Gray pill, right-aligned under time | Likely colored primary | `bg-slate-200 text-slate-700` (gray, not blue/primary) |
| **Mute icon** | Inline next to name, muted | May be present | Confirm `BellOff className="w-3.5 h-3.5 text-slate-400 ml-1"` if muted |
| **Swipe** | SwipeableRow wrapping each row | Already done | No change |

### Risks

1. **Line-clamp + preview icon alignment** — `getMessagePreviewIcon` returns an inline SVG with `inline mr-1`. When combined with `line-clamp-1`, the icon can orphan on its own line. Fix: wrap icon + text in a `<span className="inline-flex items-center gap-1">` container.
2. **`text-[17px]`/`text-[18px]` custom sizes** — these aren't standard Tailwind tokens. They compile fine but are unusual. Alternative: use `text-lg` (18px) for preview and `text-xl` (20px) for title at `sm:` breakpoint, `text-base`/`text-lg` on mobile.
3. **Avatar `h-14 w-14` (56px) on very small screens** — at 320px viewport this is 17.5% of width. Telegram uses 54px. Acceptable, but if rows feel cramped on SE-class devices, consider `h-12 w-12 sm:h-14 sm:w-14`.
4. **No live data in the truncated region** — I cannot confirm the exact markup at L4008-4138. The applying agent must read those lines and map the classes below onto the actual JSX structure.

---

## (2) Proposed Diff

Since the archived row markup is at L4008-4138 (outside the visible 20%), here is the **target state** for the archived row list area, expressed as the exact JSX pattern the applying agent should morph the current code toward. File: `src/pages/ChatHubPage.tsx`, lines ≈4008-4138.

### Canvas / scroll container

```
BEFORE (likely):
<div className="flex-1 overflow-y-auto">

AFTER:
<div className="flex-1 overflow-y-auto bg-slate-50">
```

### Individual row (inside the `.map()` over `archivedList`)

```
BEFORE (likely — approximate, agent must match actual markup):
<SwipeableRow ...>
  <button
    className="flex items-center gap-3 w-full px-4 py-3 bg-white ..."
    onClick={() => { ... }}
  >
    <ChatRowAvatar ... variant="archived" />
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm truncate">{chat.name}</span>
        <span className="text-xs text-muted-foreground ml-2">{formatChatTime(chat.lastTime)}</span>
      </div>
      <div className="text-sm text-muted-foreground truncate">
        {chat.lastMessage}
      </div>
    </div>
    {chat.unread > 0 && (
      <span className="... bg-primary text-primary-foreground ...">{chat.unread}</span>
    )}
  </button>
</SwipeableRow>

AFTER (target):
<SwipeableRow ...>
  <button
    className="flex items-center gap-3.5 w-full px-4 py-3.5 bg-white hover:bg-slate-50/70 active:bg-slate-100 transition-colors border-b border-slate-100"
    onClick={() => { /* unchanged — opens chat + toggles archive */ }}
  >
    <ChatRowAvatar ... variant="archived" />
    <div className="flex-1 min-w-0">
      {/* ── Title line: name + archive icon + optional mute + time ── */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center min-w-0 gap-1">
          <span className="font-bold text-[17px] sm:text-[20px] text-slate-900 truncate leading-tight">
            {chat.name}
          </span>
          <Archive className="w-4 h-4 text-slate-400 shrink-0" aria-hidden="true" />
          {chat.isMuted && (
            <BellOff className="w-3.5 h-3.5 text-slate-400 shrink-0" aria-label="Muted" />
          )}
        </div>
        <span className="text-xs text-slate-400 ml-auto shrink-0 tabular-nums leading-tight">
          {formatChatTime(chat.lastTime)}
        </span>
      </div>
      {/* ── Preview line: optional media icon + preview text ── */}
      <div className="flex items-center gap-1 mt-0.5">
        <span className="inline-flex items-center gap-1 text-[15px] sm:text-[18px] text-slate-500 leading-snug min-w-0">
          {(() => {
            const preview = parseRichMessagePreview(chat.lastMessage);
            const icon = getMessagePreviewIcon(preview);
            return (
              <>
                {icon}
                <span className="truncate">{preview || "No messages"}</span>
              </>
            );
          })()}
        </span>
      </div>
    </div>
    {/* ── Unread badge: gray, not primary ── */}
    {chat.unread > 0 && (
      <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-slate-200 text-slate-700 text-xs font-semibold tabular-nums shrink-0">
        {chat.unread > 99 ? "99+" : chat.unread}
      </span>
    )}
  </button>
</SwipeableRow>
```

### Key class changes summary

| Selector / Element | Before (typical) | After |
|---|---|---|
| Scroll container | `overflow-y-auto` | `overflow-y-auto bg-slate-50` |
| Row button | `px-4 py-3 bg-white` | `px-4 py-3.5 bg-white hover:bg-slate-50/70 active:bg-slate-100 transition-colors border-b border-slate-100` |
| Avatar gap | `gap-3` | `gap-3.5` |
| Name text | `font-semibold text-sm` | `font-bold text-[17px] sm:text-[20px] text-slate-900` |
| After name | *(none or just mute)* | `<Archive>` icon + optional `<BellOff>` |
| Time | `text-xs text-muted-foreground` | `text-xs text-slate-400 tabular-nums` |
| Preview text | `text-sm text-muted-foreground truncate` | `text-[15px] sm:text-[18px] text-slate-500 line-clamp-1` wrapped in `inline-flex items-center gap-1` with `getMessagePreviewIcon` |
| Unread badge | `bg-primary text-primary-foreground` | `bg-slate-200 text-slate-700` |

---

## (3) What the Owner Must Verify / Do

1. **Read lines ≈4000-4150** of `src/pages/ChatHubPage.tsx` to confirm the exact current archived-row JSX before applying. The diff above is the *target shape*; the applying agent must map it onto the actual markup.
2. **Confirm `archivedList` item shape** — verify which fields are available (`.isMuted`, `.name`, `.lastMessage`, `.lastTime`, `.unread`). If `isMuted` isn't in the data, omit the `<BellOff>` conditional.
3. **Run `npm run update`** after applying (type-check + worker + build must be green).
4. **Preview** at 375px / 768px / 1280px: open archived chats screen, confirm rows match Telegram reference, confirm swipe-to-unarchive/delete still works, confirm opening a chat from archive still works.
5. **No backend changes** — this is purely a className / JSX visual polish. All existing open/unarchive/delete/swipe behavior is preserved.
6. **Reduced-motion** — no new animations introduced; only `transition-colors` (respects `prefers-reduced-motion` since Tailwind transitions are instant when reduced-motion is active in the existing setup).
