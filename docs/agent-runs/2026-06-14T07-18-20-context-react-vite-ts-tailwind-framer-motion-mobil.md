# DeepSeek run — 2026-06-14T07:18:20.502Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/FeedbackPage.tsx (338-line "Feedback" — submit product feedback + see the team's response: REAL Supabase `useQuery ["feedback-submissions", user.id]` reading `feedback_submissions` (eq user_id, order created_at desc) + a `submit` that calls the `feedback-submit` EDGE FUNCTION via `supabase.functions.invoke`; AUTH-aware via useAuth, enabled gating; `useState category/subject/message/rating/submitting`; `useMemo stats` (total/responded/avgRating); sticky header [shadcn ghost icon Back + ig-gradient Feedback title] + an ig-gradient stats banner + a NEW-FEEDBACK form card [category chip row (single-select) + subject input + message textarea + a 5-star rating row + a Send button] + a list of PAST submissions (each a presentational card with category/subject/message/rating + an optional ZIVO-team reply block or a status badge)). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setCategory/setSubject/setMessage/setRating/submit, useQuery/Supabase query, supabase.functions.invoke, toast, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale). Don't churn already-polished controls. Don't churn shadcn <Button> (ships own focus/scale tokens). Don't renumber an existing scale (some buttons already carry active:scale-90 / active:scale-95 — LEAVE those numbers).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient-FILLED button (bg-ig-gradient) on a NEUTRAL parent still uses ring-ring (the ring renders against the neutral parent, not the button's own fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row/card WITH its own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border/opacity OR existing color wash. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. ALREADY transition-transform with NO hover (scale only) → append ring without flipping. ALREADY framer whileTap → append the focus ring ONLY.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, submit/send).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L175 CATEGORY chip (raw `<button>`, mapped ×5 over CATEGORIES [general/bug/feature/praise/ux], single-select category picker for the new submission [`category` persists in state, drives `submit`], selection bg-conveyed `bg-ig-gradient text-white shadow-sm` [active] vs `bg-secondary text-foreground hover:bg-muted`, one-shot `setCategory(c.id)`, renders an icon + label): base via `cn` 1st arg `h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-all`, ALREADY `transition-all`, NO scale/focus/aria. Parent = the form card `bg-card`, chip row `flex flex-wrap gap-1.5`. → plan: **ADD `aria-pressed={isActive}`** (persistent single-select segmented chip, bg-conveyed state, no role=tablist → aria-pressed is the house pattern) + APPEND into `cn` 1st arg `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented chip tier [0.97]; NO flip — transition-all present; OUTWARD ring-ring — ig-gradient is the chip's OWN active fill, ring renders against the neutral form-card row; single edit hits all 5 chips). Confirm aria-pressed + tier + ring + no-flip.

B) L214 STAR-rating button (raw `<button>`, mapped ×5 over [1..5], icon-only Star, ALREADY `aria-label={`${n} stars`}`, TOGGLE-ish one-shot `onClick={() => setRating(n === rating ? 0 : n)}` [clicking the current rating clears it to 0], the lit state is conveyed by fill `n <= rating ? "text-amber-500 fill-amber-500" : "text-muted-foreground/30"`): base `active:scale-90 transition-transform`, ALREADY `active:scale-90` + `transition-transform`, NO focus. Parent = the rating row inside the form card `bg-card`, star row `flex items-center gap-1` (4px gap, transparent icon buttons ~20px). → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE existing active:scale-90 — don't renumber; `transition-transform` covers scale, NO hover → NO flip; OUTWARD ring-ring on neutral bg-card; single edit hits all 5 stars). OPEN QUESTION for you: this is a 5-STAR RATING widget (icon-only stars already `aria-label`led with their value, lit-by-fill, set-or-clear). Does each star warrant **`aria-pressed={n <= rating}`** (conveying the lit/selected state — like a bg-conveyed selection picker), or LEAVE aria as-is (the `aria-label={`${n} stars`}` already names each star's value, and a true rating widget would need a role=radiogroup/radio restructure which is OUT of scope for a display-only pass, so adding `aria-pressed` to plain buttons could be semantically noisy)? Resolve explicitly — aria-pressed vs LEAVE.

C) L234 SEND-feedback button (raw `<button>`, NOT shadcn, `disabled={submitting || message.trim().length < 12}`, one-shot `onClick={submit}`, visible text "Send feedback"/"Sending…" + Send/Loader2 icon): base `h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm`, ALREADY `active:scale-95` + `transition-all` + `hover:opacity`, NO focus. Parent = the form card `bg-card`, in a `flex justify-end` row. → plan: ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (LEAVE existing active:scale-95 — don't renumber; `transition-all` present → NO flip; OUTWARD ring-ring — bg-ig-gradient is the button's OWN fill, ring renders against the neutral bg-card parent; NO aria — it has VISIBLE TEXT, not icon-only, and is a one-shot submit). Confirm ring color + no-flip + no-aria.

ALSO CONFIRM I should LEAVE these: the shadcn ghost-icon Back `<Button>` L137 (aria-label="Back" already, own tokens); the subject `<input>` L191 + message `<textarea>` L200 (already carry `focus:outline-none focus:ring-2 focus:ring-rose-500/30`); SwipeBackContainer/SEOHead (wrappers/non-visual); the stats banner motion.div L150 (entrance anim, NO onClick); the past-submission cards motion.div L266 (entrance anim, NOT clickable — presentational); the loading skeleton divs L249; the category/status/reply badge `<span>`/`<div>`s (non-interactive); MessageSquareHeart/Sparkles/Send/Star/Bug/Lightbulb/ThumbsUp/Smile/ShieldCheck/Clock/CheckCircle2/Loader2/ArrowLeft icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. A/B are mapped templates (single edit hits every chip / every star). Resolve B's aria-pressed open question explicitly.
- files: src/pages/FeedbackPage.tsx

---

# FeedbackPage — Premium Interaction + A11y Pass

## Plan

Three raw `<button>` controls need the house token treatment. No framer `whileTap` present, so CSS `active:scale` is safe. No shadcn `<Button>` churn. All logic preserved byte-identical.

## Control Analysis

### A) L175 CATEGORY chip (mapped ×5)

**Final className after-string** (append into `cn` 1st arg):
```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Aria:** `aria-pressed={isActive}` — YES, warranted. Persistent single-select segmented chip, bg-conveyed state, no `role=tablist`. House pattern matches `PromotePage` tier cards and `StoryArchivePage` filter chips.

**Ring color:** `ring-ring` — OUTWARD. The `bg-ig-gradient` is the chip's OWN active fill; the ring renders against the neutral `bg-card` form-card parent.

**Press tier:** `[0.97]` — segmented filter chip tier.

**Transition:** NO FLIP — `transition-all` already present.

**Ring direction:** OUTWARD — `gap-1.5` has clearance, not a near-gapless grid.

### B) L214 STAR-rating button (mapped ×5)

**Final className after-string** (append to existing `active:scale-90 transition-transform`):
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Aria:** **LEAVE as-is** — do NOT add `aria-pressed`. This is a 5-star rating widget where each star is a value-picker, not a toggle. The existing `aria-label={`${n} stars`}` correctly names each star's value. Adding `aria-pressed` to plain buttons would be semantically noisy — a proper rating widget would need `role=radiogroup` + `role=radio` with `aria-checked`, which is a structural change beyond a display-only pass. The house pattern (`aria-pressed` on bg-conveyed single-select filters) applies to segmented controls where the active state is conveyed by background color; here the state is conveyed by fill color on the icon, not the button's background.

**Ring color:** `ring-ring` — OUTWARD. The star row sits on neutral `bg-card` with `gap-1` (4px) clearance.

**Press tier:** LEAVE existing `active:scale-90` — don't renumber.

**Transition:** NO FLIP — `transition-transform` covers the existing scale only, no hover wash.

**Ring direction:** OUTWARD — `gap-1` has clearance, not a flush grid.

### C) L234 SEND-feedback button

**Final className after-string** (append to existing `h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm`):
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Aria:** NONE — has visible text "Send feedback"/"Sending…", not icon-only. One-shot submit, not a toggle.

**Ring color:** `ring-ring` — OUTWARD. `bg-ig-gradient` is the button's OWN fill; ring renders against the neutral `bg-card` parent.

**Press tier:** LEAVE existing `active:scale-95` — don't renumber.

**Transition:** NO FLIP — `transition-all` already present.

**Ring direction:** OUTWARD — standalone button in a `flex justify-end` row.

## Controls to LEAVE (confirmed)

- L137 shadcn ghost-icon Back `<Button>` — ships own tokens
- L191 subject `<input>` — already has `focus:ring-rose-500/30`
- L200 message `<textarea>` — already has `focus:ring-rose-500/30`
- L150 stats banner `motion.div` — presentational
- L266 past-submission cards `motion.div` — presentational
- L249 loading skeleton divs — non-interactive
- All badge `<span>`/`<div>`s — non-interactive
- All icons — decorative

## Diff

```diff
--- a/src/pages/FeedbackPage.tsx
+++ b/src/pages/FeedbackPage.tsx
@@ -168,7 +168,8 @@ export default function FeedbackPage() {
                 <button
                   key={c.id}
                   type="button"
+                  aria-pressed={isActive}
-                  onClick={() => setCategory(c.id)}
+                  onClick={() => setCategory(c.id)}
                   className={cn(
-                    "h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-all",
+                    "h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     isActive ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                   )}
                 >
@@ -210,7 +211,7 @@ export default function FeedbackPage() {
                   type="button"
                   aria-label={`${n} stars`}
                   onClick={() => setRating(n === rating ? 0 : n)}
-                  className="active:scale-90 transition-transform"
+                  className="active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   <Star
                     className={cn(
@@ -229,7 +230,7 @@ export default function FeedbackPage() {
               disabled={submitting || message.trim().length < 12}
               onClick={submit}
-              className="h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
+              className="h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
```

## Guard Grep Verification

```
focus-visible:ring=3 (A/B/C)
ring-ring=3 (all OUTWARD on neutral parents)
ring-inset=0
ring-white/70=0
aria-pressed=1 (A — new)
aria-label=0 new (B's pre-existing)
aria-expanded=0
active:scale-[0.97]=1 (A — new)
active:scale-95 kept=1 (C — unchanged)
active:scale-90 kept=1 (B — unchanged)
FLIPs=0 (all already transition-all or transition-transform)
transition-colors removed=0
```

## Owner Verification

- Run `npm run update` — must pass (type-check + worker + build)
- Preview at 375/768/1280 — form card, chip row, star row, send button all lay out cleanly
- The `aria-pressed` on category chips is the house pattern (matches `StoryArchivePage` filter chips, `PromotePage` tier cards)
- Star rating `aria-pressed` intentionally omitted — proper `role=radiogroup` upgrade is a future structural task
