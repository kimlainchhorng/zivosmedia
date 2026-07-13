# MiMo run — 2026-06-14T08:02:42.338Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/BusTicketsPage.tsx (204-line "My Bus Tickets" — a signed-in customer's bus bookings at /bus/tickets; REAL Supabase via the self-scoped SECURITY DEFINER RPC get_my_bus_bookings() + a bus_reviews select/insert; useState rows/loading/reviews/openReview/rating/comment/savingReview; loadReviews + submitReview; layout: AppLayout [own header/back] + loading spinner + empty state [shadcn Button "Bus"] + a list of booking cards, each card with route/operator/date/seats/amount + a conditional review block for confirmed trips: either a static star display (already reviewed), OR an inline review editor (a 1-5 star PICKER + a textarea + shadcn Submit/Cancel Buttons), OR a "Rate this trip" trigger button). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, setRating/setOpenReview/setComment, RPC/Supabase, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button> (own focus/scale tokens). Don't churn the <textarea> (ALREADY has focus:ring-2 focus:ring-primary/40). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset only when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. NEW transition (no prior transition class, scale-only, no self-hover) → transition-transform NEW (not a flip).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way bg-conveyed toggle.

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L171 STAR-RATING picker button (raw <button>, mapped over [1,2,3,4,5], icon-only Star [h-6 w-6, fill conveys current rating], one-shot onClick={() => setRating(i)}, ALREADY aria-label={`${i} star`}, the button had NO className at all [no transition/scale/focus/hover]). Parent = the inline review editor on a neutral bg-card booking card. → applied: ADDED className `rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; transition-transform NEW [scale sole, no self-hover, no prior transition]; `rounded` so the focus ring traces the bare icon tightly; OUTWARD ring-ring on the neutral card; KEPT the pre-existing aria-label). OPEN: is a star rating PICKER a case for aria-pressed per star? My read: NO — it's a 1-5 VALUE scale conveyed by cumulative fill (multiple stars appear "filled"), not 5 independent bg-conveyed toggles; the per-star aria-label={`${i} star`} already names each option; adding aria-pressed to all 5 would mislead (several would read "pressed"). Confirm: keep aria-label only, NO aria-pressed; tier scale-95; transition-transform NEW + rounded + OUTWARD ring-ring.

B) L189 "RATE THIS TRIP" trigger button (raw <button>, Star icon + VISIBLE text "Rate this trip", one-shot onClick that opens the inline editor [setOpenReview/setRating/setComment], base `flex items-center gap-1.5 text-xs font-bold text-primary`, NO transition/scale/hover/focus/aria). Parent = the neutral bg-card booking card. → applied: APPENDED `rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; transition-transform NEW [scale sole, no self-hover, no prior transition]; `rounded` for the ring on the inline link; OUTWARD ring-ring on neutral bg-card; NO aria — visible text "Rate this trip" conveys the action). Confirm tier [0.97] + transition-transform NEW + rounded + OUTWARD ring-ring + no-aria.

ALSO CONFIRM I should LEAVE: the shadcn empty-state "Bus" <Button> L125 + Submit <Button> L184 + Cancel <Button> L185 (own focus/scale tokens); the <textarea> L181 (ALREADY focus:ring-2 focus:ring-primary/40 — native field with a focus indicator, leave to avoid churn); AppLayout/SEOHead (wrappers); the static star DISPLAY L162 (non-interactive — already-submitted rating, just Star icons, no onClick); the loading spinner + status badge <span>s + all text <span>s/<p>s (non-interactive); Ticket/Bus/Star icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed.
- files: src/pages/app/BusTicketsPage.tsx

---

**PLAN:** Confirm both edits A and B are correct against the house token vocabulary; verify the LEAVE list; scan for any missed raw interactive controls.

---

**Verdict: BOTH EDITS CORRECT. No fix needed.**

**Edit A — Star-rating picker button (L171)** ✅ CORRECT

Final className (replacing the empty string):
```
rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
- **No `aria-pressed`** — correct. This is a 1-5 value scale conveyed by cumulative Star fill, not 5 independent bg-conveyed toggles. `aria-pressed` on all 5 would be misleading (several would read "pressed" simultaneously). The existing per-star `aria-label={`${i} star`}` names each option. A proper fix would be `role="radiogroup"`+`role="radio"`+`aria-checked`, which is a structural/semantic change out of scope.
- **Tier `active:scale-95`** — icon-only (wraps only a `<Star>` icon). ✓
- **`transition-transform` NEW** — button had zero prior className (no transition, no hover, no scale). Scale sole animated prop. ✓
- **`rounded`** — bare button needs rounding for the ring shape. ✓
- **OUTWARD `ring-ring`** — parent is the neutral `bg-card` booking card. ✓

**Edit B — "Rate this trip" trigger button (L189)** ✅ CORRECT

Final className:
```
flex items-center gap-1.5 text-xs font-bold text-primary rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
- **No `aria-label`** — visible text "Rate this trip" conveys the action. ✓
- **No `aria-pressed`** — one-shot trigger, not a toggle/segmented filter. ✓
- **Tier `[0.97]`** — small inline text-link with icon + visible text, `text-xs`. ✓
- **`transition-transform` NEW** — no prior transition, no hover variant, scale sole. ✓
- **`rounded`** — inline element needs rounding for ring shape. ✓
- **OUTWARD `ring-ring`** — parent is the neutral `bg-card` booking card. ✓

**LEAVE list — COMPLETE, no omissions:**
- shadcn `<Button>` ×3 (L125 empty-state "Bus", L184 Submit, L185 Cancel) — own focus/scale tokens ✓
- `<textarea>` L181 — already `focus:ring-2 focus:ring-primary/40` (native field focus indicator, leave to avoid churn) ✓
- `AppLayout` / `SEOHead` — wrappers ✓
- Static star display L162 — non-interactive `<Star>` icons inside `<span>`, no onClick ✓
- Loading spinner, status badge `<span>`, all text `<span>`/`<p>` — non-interactive ✓
- Ticket/Bus/Star icons — decorative ✓

**Missed raw interactive controls: NONE.** I scanned every element in the file. The only raw interactive controls are the star picker (A) and the "Rate this trip" trigger (B). Everything else is either shadcn (own tokens) or non-interactive.

**Summary:** Both edits are textbook-perfect. The file has exactly 2 raw interactive controls, both handled. No diff to propose — this is ready to verify with `npm run update`.
