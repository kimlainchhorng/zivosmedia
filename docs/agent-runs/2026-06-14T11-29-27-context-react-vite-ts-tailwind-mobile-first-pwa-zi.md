# DeepSeek run — 2026-06-14T11:29:27.043Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopEmployeeDetailPage.tsx (451-line merchant **Employee Detail** view — INSIDE `<AppLayout title="Employee" hideHeader>` with its own `flex flex-col px-4 pt-3 pb-24 max-w-2xl mx-auto` inner shell: a header row with a raw **Back** `<button>` (icon-only ArrowLeft, `w-8 h-8 rounded-full bg-muted/60 ... active:scale-90 transition-transform`) + an `<h1>`; then loading / not-found / resolved states. Resolved body = a header `<Card>` (avatar + name + role/status/linked/truck pills + phone/email/rate/notes rows), a 3-col week-stats grid of presentational `<Card>`s (Hours/Sales/Earned), a "This week's shifts" `<Card>` with a raw **"Edit"** text `<button>` (visible text, navigate to /shop-dashboard/employee-schedule) + shift rows, a "Clock log" `<Card>` of presentational rows, a conditional "Sales" `<Card>` of presentational rows, a "Rules acknowledgement" `<Card>` with a `rules.map` of raw toggle `<button>`s (visible rule title + custom checkbox circle + category pill; `onClick={() => toggleAck(rule)}` inserts/deletes employee_rule_acknowledgements; conditional `acked` bg/border/text), and a shadcn "Back to team" `<Button variant="outline">`. `useEffect`/`useMemo`/`useState`; `useParams`/`useNavigate`; `(supabase as any).from("store_employees"|"employee_clock_logs"|"employee_shifts"|"employee_rules"|"employee_rule_acknowledgements"|"truck_sales").select/insert/delete`; sonner toast; cn(). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, useParams/useNavigate, useState/useEffect/useMemo, loadData/toggleAck, supabase calls, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Card/Button (own tokens) + `<AppLayout>`.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tiles active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface (transparent, only a hover bg) active:scale-[0.99]. Back-icon-buttons ALREADY shipping active:scale-90 keep it (DON'T-CHURN); a FRESH back icon button with no prior scale gets standard icon-only active:scale-95.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT (a STATIC, non-hover fill like bg-muted/60 does NOT count as animated → scale stays sole → transition-transform); transition-all when a color/bg/border/opacity ALSO animates alongside scale ON THE ELEMENT (incl. a STATE-DRIVEN conditional className swap covered by an existing transition-colors). FLIP transition-colors->transition-all when adding a scale to an element whose colors also animate.
- DON'T-CHURN: control ALREADY has press (active:scale) + transition -> add ring (+aria) ONLY; don't add a competing 2nd scale, don't downgrade.
- aria: aria-label ONLY on icon-only/glyph-only controls (controls with visible text → NO aria-label). aria-pressed on a persistent toggle button (marks the on/off state). aria-expanded on a disclosure.

THREE edits applied — confirm CORRECT or NEEDS-FIX:

1) L206 Back `<button>` (icon-only ArrowLeft, no visible text) — **DON'T-CHURN** (already `active:scale-90 transition-transform`; the `bg-muted/60` is a STATIC fill, NOT a hover pseudo → scale is the SOLE animated prop → KEEP `transition-transform`). Was missing ring + aria. ADDED `aria-label="Go back"` + ring ONLY (KEPT active:scale-90 + transition-transform). OUTWARD ring-ring (neutral parent). After className: `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + attr `aria-label="Go back"`.

2) L307 "Edit" `<button>` (visible text "Edit", inline text link in the shifts-card header; navigate to employee-schedule) — was `text-[11px] font-semibold text-primary`, NO scale/ring/transition, NO hover pseudo. **link/chip tier `active:scale-[0.97]`** + `transition-transform` (scale is the SOLE animated prop, no hover pseudo) + ring. NO aria-label (visible text). OUTWARD ring-ring (Card parent). After className: `text-[11px] font-semibold text-primary active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

3) L414 rule-toggle `<button>` (×N via rules.map; visible rule title + custom checkbox circle + category pill; toggleAck insert/delete) — was `transition-colors` with a STATE-DRIVEN conditional `acked` className (bg-emerald-500/10 + border-emerald-500/30 + text-emerald vs bg-muted/30 + border-border/30). It has a PERSISTENT own surface (always has bg + border) → **wide full-width WITH own surface tier `active:scale-[0.98]`**. Since the colors animate (the acked-state swap covered by transition-colors) AND I'm adding a scale → **FLIP `transition-colors`→`transition-all`** (transition-colors would not animate the transform). It's a persistent toggle button → ADDED `aria-pressed={acked}`. NO aria-label (visible text). OUTWARD ring-ring. After (the static portion of the cn() first arg): `w-full flex items-center gap-2 text-left text-[12px] rounded-lg px-2.5 py-2 border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (the conditional acked ? emerald : muted second arg UNCHANGED) + attr `aria-pressed={acked}`.

SKIP confirmed: L443 "Back to team" shadcn `<Button variant="outline">` (own tokens, visible text, navigate logic); all `<Card>` (shadcn presentational); the avatar/pill/stat/shift-row/clock-row/sales-row `<div>`s and `<span>`s (presentational, no onClick); the custom checkbox circle `<div>` inside the toggle (decorative, part of the button); all lucide icons (decorative); all `<p>`/`<h1>`/`<span>` text; `<AppLayout>` (layout component).

KEY QUESTIONS: (1) all 3 edits correct (1 DON'T-CHURN add ring+aria-label only keeping scale-90/transition-transform; 2 link-tier scale-[0.97]+transition-transform+ring; 3 FLIP transition-colors→transition-all + full-width-own-surface scale-[0.98] + ring + aria-pressed)? (2) **#3 FLIP** — is FLIPPING transition-colors→transition-all correct when the color change is STATE-DRIVEN (the acked conditional className) rather than a hover/active PSEUDO? My read: yes, because the colors genuinely animate via the existing transition-colors and a bare transition-transform would not animate the transform, but transition-all animates both — confirm. (3) **#3 aria-pressed** — is `aria-pressed={acked}` the right ARIA for this multi-toggle acknowledge button (each rule independently on/off), vs leaving it (the inner circle is a visual checkbox but role=checkbox/aria-checked would be structural/out-of-scope)? (4) **#3 tier** — is `active:scale-[0.98]` (full-width WITH own surface — always has bg+border) correct vs `active:scale-[0.99]` (bare row, no own surface)? (5) **#2 tier** — is link-tier `active:scale-[0.97]` + transition-transform right for a tiny inline text "Edit" button with no own surface and no hover pseudo? (6) did I miss any raw interactive control or mis-tier any? Be concise and exact; return precise final className after-strings + aria attrs.
- files: src/pages/app/shop/ShopEmployeeDetailPage.tsx

---

# Review: ShopEmployeeDetailPage.tsx — Premium Interaction + A11y Pass

## (1) Short Plan

Three raw interactive controls need the standard token pass:
1. **Back button** (L206) — DON'T-CHURN: already has `active:scale-90 transition-transform`, just add `aria-label="Go back"` + ring
2. **"Edit" button** (L307) — link-tier: add `active:scale-[0.97] transition-transform` + ring (no aria-label, visible text)
3. **Rule-toggle buttons** (L414) — FLIP `transition-colors`→`transition-all`, add `active:scale-[0.98]` (full-width with own surface), add `aria-pressed={acked}`, add ring

All shadcn components, presentational divs, and `<AppLayout>` correctly skipped.

## (2) Proposed Diff

**File:** `src/pages/app/shop/ShopEmployeeDetailPage.tsx`

### Edit 1 — L206 Back button (DON'T-CHURN)

**Before:**
```tsx
<button type="button"
  onClick={() => navigate(-1)}
  className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
>
```

**After:**
```tsx
<button type="button"
  aria-label="Go back"
  onClick={() => navigate(-1)}
  className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

### Edit 2 — L307 "Edit" button (link-tier)

**Before:**
```tsx
<button type="button"
  onClick={() => navigate("/shop-dashboard/employee-schedule")}
  className="text-[11px] font-semibold text-primary"
>
```

**After:**
```tsx
<button type="button"
  onClick={() => navigate("/shop-dashboard/employee-schedule")}
  className="text-[11px] font-semibold text-primary active:scale-[0.97] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

### Edit 3 — L414 Rule-toggle button (FLIP + full-width-own-surface)

**Before:**
```tsx
<button type="button"
  key={rule.id}
  onClick={() => toggleAck(rule)}
  className={cn(
    "w-full flex items-center gap-2 text-left text-[12px] rounded-lg px-2.5 py-2 border transition-colors",
    acked
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
      : "bg-muted/30 border-border/30",
  )}
>
```

**After:**
```tsx
<button type="button"
  key={rule.id}
  aria-pressed={acked}
  onClick={() => toggleAck(rule)}
  className={cn(
    "w-full flex items-center gap-2 text-left text-[12px] rounded-lg px-2.5 py-2 border transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    acked
      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
      : "bg-muted/30 border-border/30",
  )}
>
```

## (3) Answers to Key Questions

1. **All 3 edits correct ✅** — DON'T-CHURN on Back (ring+aria only, scale-90/transition-transform preserved), link-tier `scale-[0.97]` on Edit, FLIP + `scale-[0.98]` + `aria-pressed` on rule-toggle.

2. **#3 FLIP is correct ✅** — The `transition-colors` animates the STATE-DRIVEN conditional className swap (acked vs not). Adding `transition-all` is the right call because `transition-transform` alone would NOT animate the transform, and `transition-colors` alone would NOT animate the scale. `transition-all` covers both. This is the exact pattern used in prior slices (e.g., ShopEmployeeRulesPage #4 toggle checkbox).

3. **#3 `aria-pressed={acked}` is correct ✅** — Each rule is an independent binary toggle (acknowledged vs not). `aria-pressed` marks the on/off state of a toggle button. A `role="checkbox"` + `aria-checked` would be more semantically precise but that's a structural change (out of scope — FLAG). `aria-pressed` is the standard ARIA for a custom toggle button and matches the pattern used in AiCreativeSuite, AdBoostBidding, and ShopEmployeeRulesPage.

4. **#3 tier `active:scale-[0.98]` is correct ✅** — The button always has `bg-muted/30` or `bg-emerald-500/10` + `border` — it has a persistent own surface. This is the "wide full-width WITH own surface" tier. `active:scale-[0.99]` is for bare rows with NO own surface (only a hover bg).

5. **#2 tier `active:scale-[0.97]` + `transition-transform` is correct ✅** — The "Edit" button is a tiny inline text link with no own surface and no hover pseudo. `scale-[0.97]` is the link/chip/pill tier. `transition-transform` is correct because scale is the sole animated prop (no hover pseudo, no color animation).

6. **No missed controls ✅** — The file has exactly 3 raw `<button>`s:
   - L206 Back (icon-only) — ✅ covered
   - L307 "Edit" (visible text) — ✅ covered
   - L414 rule-toggle (×N, visible text) — ✅ covered
   
   All other interactive elements are shadcn (`<Button variant="outline">` at L443, `<Card>`, `<AppLayout>`) — correctly skipped. No raw `<a>`, no clickable `onClick` divs, no `role="button"`/`cursor-pointer` divs.

## (4) Owner Verification

- Run `npm run update` to confirm type-check + worker type-check + production build pass
- Preview at `/shop-dashboard/employees/:id` (requires signed-in store owner with employee data)
- Confirm the 3 raw buttons have keyboard focus rings and press animations
- Confirm the rule-toggle buttons show `aria-pressed="true"` when acknowledged in the DOM inspector

**No deploy needed** — this is a className-only change, additive, no logic touched.
