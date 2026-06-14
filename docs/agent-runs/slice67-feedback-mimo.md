# MiMo run — 2026-06-14T07:19:09.267Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

3 raw `<button>` controls to edit (3 className appends + 2 `aria-pressed` additions). Zero logic touched. All shadcn Buttons, inputs, textareas, presentational motion.divs, icons, and skeletons left as-is.

---

## Control-by-control verdict

### A) Category chip — ✅ confirmed, exact plan

**ADD** `aria-pressed={isActive}` attribute + **APPEND** `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into `cn` 1st arg.

- Tier: segmented chip `[0.97]`
- Ring: **OUTWARD `ring-ring`** — ig-gradient is the chip's own fill; ring renders against the neutral `bg-card` form-card parent
- Transition: **NO flip** — `transition-all` already present
- Single edit hits all 5 chips

### B) Star rating — `aria-pressed` resolved: **ADD it**

**ADD** `aria-pressed={n <= rating}` + **APPEND** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

Rationale for `aria-pressed`: each star IS a persistent state-conveyed picker — the "lit" state (`n <= rating`) is visually conveyed by fill color, directly analogous to bg-conveyed selection chips. Without `aria-pressed`, a screen reader hears "3 stars, button" with no indication of selected state; with it, "3 stars, pressed". The toggle-to-clear behavior (`n === rating ? 0 : n`) maps cleanly — when the user hears "pressed", they know clicking deselects. A `role=radiogroup` restructure would be structural and out of scope; `aria-pressed` on plain `<button>` is valid and display-only. **ADD `aria-pressed={n <= rating}`.**

- Tier: LEAVE existing `active:scale-90` (don't renumber)
- Ring: **OUTWARD `ring-ring`** on neutral `bg-card`
- Transition: **NO flip** — `transition-transform` covers scale, no hover props
- Single edit hits all 5 stars

### C) Send button — ✅ confirmed, exact plan

**APPEND** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

- Tier: LEAVE existing `active:scale-95` (don't renumber)
- Ring: **OUTWARD `ring-ring`** — bg-ig-gradient is the button's own fill, ring against neutral `bg-card`
- Transition: **NO flip** — `transition-all` already present
- **NO aria** — has visible text, one-shot submit, not icon-only

---

## Proposed diff — `src/pages/FeedbackPage.tsx`

**Control A (L175 category chip):**

```diff
               <button
                  key={c.id}
                  type="button"
+                 aria-pressed={isActive}
                  onClick={() => setCategory(c.id)}
                  className={cn(
-                   "h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-all",
+                   "h-8 px-3 rounded-full text-[11px] font-bold inline-flex items-center gap-1.5 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                  )}
```

**Control B (L214 star button):**

```diff
               <button
                  key={n}
                  type="button"
                  aria-label={`${n} stars`}
+                 aria-pressed={n <= rating}
                  onClick={() => setRating(n === rating ? 0 : n)}
-                 className="active:scale-90 transition-transform"
+                 className="active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
```

**Control C (L234 send button):**

```diff
             <button
                type="button"
                disabled={submitting || message.trim().length < 12}
                onClick={submit}
-               className="h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
+               className="h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
```

---

## Guard grep summary

| Token | Count | Where |
|-------|-------|-------|
| `focus-visible:ring` | 3 | A/B/C |
| `ring-ring` | 3 | all OUTWARD on neutral `bg-card` |
| `ring-inset` | 0 | — |
| `ring-white/70` | 0 | — |
| `aria-pressed` | 2 new | A (`isActive`), B (`n <= rating`) |
| `aria-label` | 0 new | B's pre-existing kept |
| `active:scale-[0.97]` | 1 new | A |
| `active:scale-90` kept | 1 | B unchanged |
| `active:scale-95` kept | 1 | C unchanged |
| FLIPs | 0 | — |
| Logic lines touched | 0 | all onClick/setCategory/setSubject/setMessage/setRating/submit/useQuery/invoke/toast byte-identical |

## LEAVE list — all confirmed

shadcn Back `<Button>` L137 (own tokens); subject `<input>` L191 + message `<textarea>` L200 (own `focus:ring-rose-500/30`); SwipeBackContainer/SEOHead (wrappers); stats `motion.div` L150 (entrance); past-submission cards `motion.div` L266 (entrance, not clickable); loading skeletons L249; category/status/reply badge spans (non-interactive); all icons (decorative).

## Owner verification

1. Apply the 3 edits above.
2. Run `npm run update` — must pass (types + worker types + build, 0 errors).
3. Preview at 375/768/1280 — category chips should show keyboard focus ring on Tab; stars should ring on Tab and announce "pressed" to screen readers; send button should ring on Tab when enabled.
4. No payment/auth risk — this page writes via edge function, no Stripe interaction.
