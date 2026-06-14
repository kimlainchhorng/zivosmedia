# DeepSeek run — 2026-06-14T01:25:57.227Z

- model: deepseek-chat
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control change is complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/MentionsPage.tsx  (route /mentions — a feed of posts where the signed-in user is @-mentioned; backed by the post_mentions table joined with user_posts and profiles; each mention is a tappable row that opens the feed)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap). Please keep all data logic exactly as it is: the Supabase select/in/eq/order calls, the react-query key, the navigate() target, and all prop wiring should stay byte-identical. Only advise on className tokens and the display-only attributes listed above.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  (no ring-offset)
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] + rounded-sm ; medium chip/pill -> active:scale-[0.98] ; wide full-width row/card -> active:scale-[0.99].
- transition class: use transition-transform when scale is the only animated property; use transition-all when there is also a hover:bg / hover:text / hover:opacity that should animate alongside the press.
- aria-label only on icon-only / image-only controls (visible-text controls do not need it).
- Don't-churn rule: if a control already has a valid existing active:scale (or whileTap) value, keep it rather than renumbering it to the nominal tier.

COMPONENT-TYPE RULES we follow (so we don't double-style or mis-style):
- shadcn <Button> already ships built-in tokens -> leave untouched, EXCEPT an icon-only shadcn Button still needs an aria-label if it lacks one.
- A native <input> that already has its own focus ring -> leave untouched (never add active:scale to an input).
- A raw <button>/<a> gets the full token set; if it already has active:scale + transition, we keep those and only append the focus ring.
- A framer-motion element WITH whileTap: CSS active:scale is overridden by motion's inline transform, so we do NOT add a CSS scale; we add the focus ring via box-shadow ring only. If the element already has a CSS transition that animates only color/background (e.g. transition-colors for a hover:bg), that does not conflict with motion's transform, so we keep it as-is.

MY PLANNED EDIT (please confirm it is right, or correct it):

1. Mention-row button, line ~211 (a .map over the assembled mentions; each is a framer-motion motion.button WITH whileTap={{ scale: 0.985 }} and a per-row entrance/stagger animation):
   current: <motion.button type="button" ... whileTap={{ scale: 0.985 }} onClick={() => navigate("/feed")} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left" aria-label={`Open post mentioning you from ${m.author?.full_name ?? "user"}`}>
   The row's content is a media thumbnail + the author's avatar/name + a 2-line caption + like/comment counts + a trailing ChevronRight.
   plan: append  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring  into the className (ring ONLY — whileTap already owns the press-scale, so no CSS active:scale); KEEP whileTap={{ scale: 0.985 }} (don't-churn); KEEP the existing transition-colors (it animates only the hover:bg-secondary/40 and does not conflict with motion's transform); KEEP the existing aria-label byte-identical; normal OUTWARD ring (the row is itself rounded-2xl and is a direct child of a space-y-2 list that is NOT overflow-hidden).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm none of these need a change):
- Back button, line ~157: shadcn <Button aria-label="Back" variant="ghost" size="icon"> — labeled, ships tokens.
- Hero stat card, line ~170: a motion.div with an entrance animation and NO onClick — presentational.
- Loading skeletons (line ~187) — non-interactive.
- Empty-state card (line ~193) — non-interactive.
- The thumbnail <video>/<img> (line ~226/228) and the author <Avatar> (line ~238) — decorative children inside the row button, not separate controls.

QUESTIONS:
Q1. Mention-row motion.button (edit #1): is ring-ONLY correct (whileTap already owns the scale, so no CSS active:scale)? And is KEEPING transition-colors right (it only animates the hover bg, doesn't touch transform)? Is the existing whileTap={{ scale: 0.985 }} a sensible press for these full-width feed rows, or would you nudge it?
Q2. The row already carries aria-label={`Open post mentioning you from ${name}`} even though it also has visible text (author name + caption + like/comment counts). Is keeping that existing aria-label the right call here, or does it unhelpfully suppress the visible content for screen readers? (Note: per scope I keep existing attributes byte-identical, but I'd value your read on whether it's a good label.)
Q3. Outward ring vs ring-inset: the row is rounded-2xl and is a direct child of a space-y-2 list (NOT overflow-hidden) — confirm a normal outward ring is correct (no ring-inset needed).
Q4. Confirm the untouched list is correct (back shadcn Button labeled; hero/skeleton/empty non-interactive; media + avatar are decorative children of the row).
Q5. Anything missed? At a 375px-wide phone viewport: does the mention row (14x14 thumbnail + author/caption/counts column + trailing chevron) lay out cleanly without crushing?

Please answer Q1-Q5 and give me any corrected className strings. Keep all data/query logic unchanged. Thank you.
- files: src/pages/MentionsPage.tsx

---

# Review: MentionsPage.tsx — Premium Interaction Pass

## Short Plan

The page is clean and well-structured. The single interactive control (mention-row `motion.button`) needs the standard focus ring appended. All other controls are correctly left untouched. The existing `whileTap` and `transition-colors` are appropriate. The `aria-label` is a judgment call but acceptable per scope rules.

## Proposed Change

**File:** `src/pages/MentionsPage.tsx`

**Before (line ~211):**
```tsx
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
```

**After:**
```tsx
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

That's it — **one line, one edit, 3 Tailwind classes appended**.

## Answers to Q1–Q5

### Q1. Ring-only + keep `whileTap` + keep `transition-colors` — **Correct**

- **Ring-only is correct.** The `motion.button` has `whileTap={{ scale: 0.985 }}` which sets an inline `transform` on press. A CSS `active:scale-*` would be overridden by framer-motion's inline style (inline > CSS class), so adding it would be dead code. Ring-only is the right approach.
- **Keep `whileTap={{ scale: 0.985 }}`** — don't-churn rule applies. 0.985 is a sensible press for a full-width feed row (wide-card tier). No nudge needed.
- **Keep `transition-colors`** — correct. It only animates the `hover:bg-secondary/40` color transition. It does NOT animate `transform`, so there's zero conflict with framer-motion's inline scale. Flipping to `transition-all` would add a dead transform transition and make the focus ring fade in instead of appearing instantly — keep `transition-colors`.

### Q2. Existing `aria-label` — **Keep it (acceptable, not ideal)**

The current label `"Open post mentioning you from ${name}"` is verbose but not harmful. It provides a meaningful description that a screen reader would otherwise have to piece together from the row's many children (avatar, name, caption, counts, chevron). The visible text inside the button is accessible to sighted users; the `aria-label` overrides the inner content for screen readers with a concise action description.

**Per scope rules, you keep it byte-identical.** If you wanted to optimize it later (out of scope), a better label would be `"Post from ${name}: ${truncated caption}"` — but that's not needed now.

### Q3. Outward ring — **Correct**

The row is `rounded-2xl` and is a direct child of a `space-y-2` div (NOT `overflow-hidden`). A normal outward `focus-visible:ring-2` will render cleanly around the button's border box. No `ring-inset` needed.

### Q4. Untouched list — **Correct**

- **Back button (shadcn `<Button>`)** — already has `aria-label="Back"`, ships built-in tokens. Leave untouched. ✅
- **Hero stat card (`motion.div`)** — no `onClick`, presentational. ✅
- **Loading skeletons** — non-interactive `<div>`s. ✅
- **Empty-state card** — non-interactive `<div>` with decorative icon. ✅
- **Thumbnail `<video>`/`<img>` and `<Avatar>`** — decorative children inside the row button, not separate controls. ✅

### Q5. 375px viewport — **Clean layout**

Let's check the math on the mention row at 375px:
- Container: `max-w-2xl mx-auto px-4` → inner width ≈ 375 - 32 = **343px**
- Row: `p-3` → inner width ≈ 343 - 24 = **319px**
- Children:
  - Thumbnail: `w-14 h-14 shrink-0` = **56px**
  - `gap-3` = **12px**
  - ChevronRight: `h-4 w-4 shrink-0` = **16px**
  - `gap-3` = **12px**
  - Remaining for `flex-1 min-w-0` column: 319 - 56 - 12 - 16 - 12 = **223px**
- Inside the 223px column:
  - Author row: avatar (20px) + gap (8px) + name (`truncate`) + "· 3h" (`shrink-0`) — the `truncate` on the name ensures it doesn't overflow. The `shrink-0` on the timestamp keeps it visible.
  - Caption: `line-clamp-2` — 2 lines at ~12px font with `leading-snug` (~15px line-height) = ~30px. At 223px wide, ~14-15 characters per line = comfortable for 2 lines.
  - Counts row: `gap-2.5` — heart + 2-digit number + message + 2-digit number ≈ 60px. Fits easily.

**No crush.** The layout is robust at 375px.

## Summary

| Control | Change | Status |
|---------|--------|--------|
| Mention-row `motion.button` | Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | ✅ One edit |
| Back shadcn `<Button>` | None | ✅ Correctly skipped |
| Hero card / skeletons / empty-state | None | ✅ Correctly skipped |
| Thumbnail media / Avatar | None | ✅ Correctly skipped |

**One-line diff, zero behavioral changes, zero data-logic changes.** Ready to apply.
