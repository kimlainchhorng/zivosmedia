# MiMo run — 2026-06-14T01:27:05.257Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Review: MentionsPage.tsx — interaction polish pass

### (1) Short plan

**One edit, zero new attributes, zero churn.** The page has exactly one interactive control that lacks the standard tokens: the mention-row `motion.button` (the `.map` over `mentions`). Every other interactive element either ships shadcn tokens (the back `<Button>`) or is non-interactive/decorative. The change is **className-only**: append the focus ring into the existing className string. Everything else — `whileTap`, `transition-colors`, `aria-label`, all data logic — stays byte-identical.

---

### (2) The change — exact before/after

**File:** `src/pages/MentionsPage.tsx`
**Control:** mention-row `motion.button` (inside the `.map` over `mentions`, ~line 211)

**Before:**
```
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
```

**After:**
```
className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

That is the entire diff. One className string extended, nothing else touched.

---

### (3) Answers to Q1–Q5

**Q1 — Ring-only, keep `transition-colors`, keep `whileTap`?**

All three are correct. Converged analysis:

| Decision | Reasoning |
|----------|-----------|
| **Ring-only (no CSS `active:scale`)** | `whileTap={{ scale: 0.985 }}` applies an inline `transform` via framer-motion's style resolver. CSS `active:scale-*` via Tailwind generates a `transform` in the stylesheet — inline always beats the cascade, so the CSS scale would be **dead code**. The ring (box-shadow) is unaffected by transforms and renders correctly regardless. ✅ |
| **Keep `transition-colors`** | It animates only the `hover:bg-secondary/40` color/background change. It does NOT touch `transform`, so it cannot conflict with framer-motion's inline scale. Flipping to `transition-all` would add a dead transform-transition that never fires (motion owns that) and would make the box-shadow ring fade in instead of appearing instantly on focus — strictly worse. ✅ Keep. |
| **Keep `whileTap={{ scale: 0.985 }}`** | The nominal tier for a "wide full-width row/card" is `active:scale-[0.99]` (~1% press). The existing 0.985 is ~1.5% — slightly stronger, still tasteful, and the **don't-churn rule** applies. It's a sensible press depth for a 56px-tall feed row. **No nudge.** ✅ |

**Q2 — The existing `aria-label` on the row**

The current label is `Open post mentioning you from ${name}`. Advisory opinion (outside the scope of this pass — you asked, so):

**Keep it for now, but note the trade-off.** The `aria-label` *replaces* the entire child text content for the accessible name computation. That means a screen reader user hears "Open post mentioning you from John Doe, button" but **not** the caption, like count, comment count, or relative time. The label gives a clear action + author (the most important info), but it does suppress the caption which could help the user decide whether to tap.

A future refinement could be to **remove** the `aria-label` entirely and let the natural child text flow through (author name + caption + counts — all real text in `<p>`/`<span>` elements). The accessible name would become the concatenation of all descendant text, which is longer but gives full context. Alternatively, keep the `aria-label` but append the truncated caption: `Post by ${name}: ${caption?.slice(0,60)}`. Both are logic changes outside this pass's scope; flag for a future a11y polish.

**Q3 — Outward ring vs ring-inset**

**Normal outward ring is correct.** The row is `rounded-2xl` and lives inside `<div className="space-y-2">`. The `space-y-2` parent is NOT `overflow-hidden`. No ancestor clips overflow. The 2px box-shadow ring extends ~2px beyond the row's border-box and is fully visible. No `ring-inset` needed.

**Q4 — Untouched list**

| Element | Verdict | Reason |
|---------|---------|--------|
| Back `<Button>` (~line 157) | ✅ SKIP | shadcn, `aria-label="Back"` already present, ships tokens |
| Hero stat `motion.div` (~line 170) | ✅ SKIP | No `onClick` — purely presentational entrance animation |
| Loading skeletons (~line 187) | ✅ SKIP | Non-interactive `<div>`s with `animate-pulse` |
| Empty-state card (~line 193) | ✅ SKIP | Non-interactive — just icon + text |
| Thumbnail `<video>`/`<img>` (~line 226/228) | ✅ SKIP | Decorative children inside the row button, `alt=""` on img |
| Author `<Avatar>` (~line 238) | ✅ SKIP | Decorative child inside the row button, `alt=""` on AvatarImage |
| Fallback `<div>` with `<ImageIcon>` (~line 229) | ✅ SKIP | Decorative placeholder inside the row button |
| `<ChevronRight>` icon (~line 243) | ✅ SKIP | Decorative trailing indicator inside the row button, no separate interaction |

Inventory is **exhaustive** — every element in the file traced; the only interactive control needing tokens is the one `motion.button` in the `.map`.

**Q5 — 375px layout**

Clean, no crush. The math:

```
Viewport:           375px
Outer px-4:         −32px  → 343px inner
Button p-3:         −24px  → 319px inside button
Thumbnail w-14:     −56px
gap-3:              −12px
ChevronRight icon:  −16px (h-4 w-4, shrink-0)
───────────────────────────
Flex-1 column:       235px
```

Inside that 235px column:
- **Author row:** Avatar 20px + gap-2 8px + name `truncate` + "·" + relative time `shrink-0` — name truncates cleanly, time stays visible.
- **Caption:** `text-xs line-clamp-2` — two lines of 12px text with `leading-snug` fit comfortably.
- **Like/comment row:** `text-[10px]` with tiny icons — fits easily.

The row has `text-left` so multi-line content aligns naturally. No overflow or crush at 375px. ✅

---

### Owner must verify

1. Run `npm run update` — must pass (0 type errors + worker type-check + production build). This is a single className append, so it should be a clean pass.
2. Preview at 375px: navigate to `/mentions` with a logged-in user who has mention rows; verify the rows render with visible focus rings when tabbed to and that the `hover:bg` still fades smoothly.
3. The `aria-label` suppression of child text content (Q2) is flagged for a future a11y pass — no action needed in this round.
