# DeepSeek run — 2026-06-14T08:01:53.212Z

- model: deepseek-chat
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

## Plan

Both edits (A) and (B) are **correct as applied** in the file. No changes needed.

### Edit A — Star-rating picker button (L171)

**Final className:**
```
rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Aria:** `aria-label={`${i} star`}` (keep as-is, no `aria-pressed`)

**Rationale verified:**
- ✅ `scale-95` — correct icon-only tier
- ✅ `transition-transform` NEW — scale is sole animated prop, no self-hover, no prior transition
- ✅ `rounded` — tight ring on bare icon
- ✅ OUTWARD `ring-ring` — neutral `bg-card` parent
- ✅ NO `aria-pressed` — this is a 1-5 value scale (cumulative fill), not 5 independent toggles; per-star `aria-label` already names each option

### Edit B — "Rate this trip" trigger button (L189)

**Final className:**
```
flex items-center gap-1.5 text-xs font-bold text-primary rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Aria:** none (visible text conveys action)

**Rationale verified:**
- ✅ `[0.97]` — correct small inline text-link tier
- ✅ `transition-transform` NEW — scale sole animated prop, no self-hover, no prior transition
- ✅ `rounded` — ring traces the inline link
- ✅ OUTWARD `ring-ring` — neutral `bg-card` parent
- ✅ No `aria-label` — visible text "Rate this trip"

### Leave list confirmed

| Control | Reason |
|---------|--------|
| shadcn `Button` "Bus" L125 | Own focus/scale tokens |
| shadcn `Button` "Submit review" L184 | Own focus/scale tokens |
| shadcn `Button` "Cancel" L185 | Own focus/scale tokens |
| `<textarea>` L181 | Already has `focus:ring-2 focus:ring-primary/40` |
| `AppLayout` / `SEOHead` | Wrappers |
| Static star display L162 | Non-interactive (no onClick) |
| Loading spinner, status badges, text spans | Non-interactive |
| Ticket/Bus/Star icons | Decorative |

### No missed controls

The file has exactly **2 raw interactive controls** in scope (both edited). All other interactive elements are shadcn components (left) or non-interactive presentational elements (left).

**Status: PASS — both edits are correct and complete.**
