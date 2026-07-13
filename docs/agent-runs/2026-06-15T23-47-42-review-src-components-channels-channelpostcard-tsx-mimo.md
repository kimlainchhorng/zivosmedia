# MiMo run — 2026-06-15T23:47:42.757Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review src/components/channels/ChannelPostCard.tsx for a focused Telegram-style polish: the media post views/time overlay selected in /c/vip_khmer is too large. Suggest a minimal scoped diff to make the overlay compact like Telegram without changing post logic.
- files: src/components/channels/ChannelPostCard.tsx

---

## (1) Plan

The `PostMediaStatsOverlay` component renders the view-count + eye-icon + time chip in the bottom-right of media thumbnails and stickers. The sticker variant (`pill={true}`) is already compact (`text-[12px]`, dark `bg-black/45` pill). But the **media variant** (`pill={false}`, the default) is oversized at `text-[17px]` with a `h-5 w-5` eye icon and no background — just a text-shadow. Telegram's equivalent is a small semi-transparent dark pill with ~11px text and a tiny eye icon.

**Change:** convert the non-pill (media) variant from "large text + text-shadow" to a compact dark pill matching Telegram's style. No logic changes, no prop changes, no new dependencies.

---

## (2) Proposed Diff

**File:** `src/components/channels/ChannelPostCard.tsx` — the `PostMediaStatsOverlay` function (around line 230)

```diff
 function PostMediaStatsOverlay({ views, time, pill = false }: { views: number; time: string; pill?: boolean }) {
   return (
     <span
       className={cn(
-        "pointer-events-none absolute bottom-1.5 right-2 inline-flex items-center gap-1.5 leading-none text-white",
-        // Stickers have no bubble behind them, so plain white text reads poorly
-        // over light artwork — wrap it in a dark Telegram-style pill instead.
+        "pointer-events-none absolute bottom-1 right-1.5 inline-flex items-center gap-1 leading-none text-white",
         pill
           ? "rounded-full bg-black/45 px-2 py-1 text-[12px] font-medium backdrop-blur-sm"
-          : "text-[17px] font-medium",
+          : "rounded-full bg-black/40 px-1.5 py-0.5 text-[11px] font-medium backdrop-blur-sm",
       )}
-      style={pill ? undefined : { textShadow: "0 1px 2px rgba(0,0,0,.55)" }}
+      style={undefined}
     >
       <span>{formatViewCount(views)}</span>
-      <Eye className={cn("fill-white/30 stroke-[2.4]", pill ? "h-3.5 w-3.5" : "h-5 w-5")} />
+      <Eye className={cn("fill-white/30 stroke-[2.4]", pill ? "h-3.5 w-3.5" : "h-3 w-3")} />
       {time && <span>{time}</span>}
     </span>
   );
 }
```

### What changes (token-level summary):

| Property | Before (media) | After (media) | Rationale |
|---|---|---|---|
| `text-[17px]` | ✗ | → `text-[11px]` | Telegram-compact font size |
| No bg class | — | → `rounded-full bg-black/40 px-1.5 py-0.5 backdrop-blur-sm` | Dark pill provides contrast over any media, replacing the text-shadow |
| `gap-1.5` | ✗ | → `gap-1` | Tighter spacing |
| `bottom-1.5 right-2` | ✗ | → `bottom-1 right-1.5` | Tighter corner inset |
| `h-5 w-5` eye | ✗ | → `h-3 w-3` | Matches `text-[11px]` scale |
| `textShadow` style | ✗ | → removed | Dark pill replaces it |
| Sticker `pill` variant | unchanged | unchanged | Already compact |

**Zero logic lines touched.** The sticker variant (`pill={true}`) is not modified at all.

---

## (3) Owner Verification

1. **Run `npm run update`** — pure className + inline style edit, should be green (0 TS errors, build passes).
2. **Preview at `/c/vip_khmer`** — scroll through image/video posts and confirm:
   - The overlay is now a small dark rounded pill in the bottom-right corner
   - Text, eye icon, and time are all compact (~11px)
   - The overlay is readable over both light and dark media
   - Sticker posts (with `pill`) are unchanged
3. **Check responsive** at 375/768/1280 — the pill should stay small and not overflow any media thumbnail at any breakpoint.
