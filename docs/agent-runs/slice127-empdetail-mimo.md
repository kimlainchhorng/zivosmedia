# MiMo run — 2026-06-14T11:30:05.534Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Audit the three edits already applied to `src/pages/app/shop/ShopEmployeeDetailPage.tsx` against the design token vocabulary and file contents. Confirm correctness or flag issues.

## Verification

All three edits are **CORRECT ✅ — zero fixes needed. File is ready to commit as-is.**

### Per-edit audit

| # | Control | Edit | Correctness |
|---|---------|------|-------------|
| 1 | L206 Back `<button>` | DON'T-CHURN: `aria-label="Go back"` + ring ONLY; **KEPT** `active:scale-90` + `transition-transform` | ✅ `bg-muted/60` is a STATIC fill (no hover pseudo) → scale is the sole animated prop → `transition-transform` stays. OUTWARD `ring-ring` against neutral parent row. |
| 2 | L307 "Edit" `<button>` | Link/chip tier: `active:scale-[0.97]` + `transition-transform` + ring; NO aria-label (visible text) | ✅ No own surface, no hover pseudo → scale is the sole animated prop → `transition-transform`. OUTWARD `ring-ring` against Card. |
| 3 | L414 rule-toggle `<button>` (×N) | FLIP `transition-colors`→`transition-all` + full-width-own-surface `active:scale-[0.98]` + ring + `aria-pressed={acked}` | ✅ See detailed analysis below. |

### Key question answers

**(1) All 3 edits correct?** Yes — all tiers, transitions, rings, and aria attributes match the vocabulary exactly.

**(2) #3 FLIP — state-driven conditional className?** **Yes, FLIP is correct.** The original `transition-colors` was there to animate the conditional `acked ? emerald : muted` className swap. Adding a CSS `active:scale-[0.98]` means `transition-colors` alone would NOT animate the transform. `transition-all` covers both. The fact that the color trigger is state-driven (not a hover pseudo) doesn't change the mechanical need — `transition-all` is the superset that animates both color and transform transitions.

**(3) #3 `aria-pressed={acked}`?** **Yes.** Each rule is an independent on/off toggle. `aria-pressed` communicates the boolean state of a toggle button. `aria-label` is unnecessary (visible text = rule title). `role=checkbox`/`aria-checked` would be structural → correctly FLAG'd as out-of-scope.

**(4) #3 tier `[0.98]` vs `[0.99]`?** **`[0.98]` is correct.** The button ALWAYS has a persistent own surface (`bg-muted/30 border-border/30` or `bg-emerald-500/10 border-emerald-500/30`) — it's never transparent. That's "wide full-width WITH own surface" = `[0.98]`. The `[0.99]` tier is for bare rows with no own surface (transparent, only a hover:bg pseudo).

**(5) #2 tier link `[0.97]`?** **Yes.** "Edit" is a tiny inline text button with no own surface and no hover pseudo. Link/chip tier `[0.97]` is correct — it's not a card-tile (no card-like container), not full-width-with-surface, not a bare-row (it has text styling, not a full-width row layout).

**(6) Missed controls?** **None.** Full scan:
- `L206` Back `<button>` → ✅ edited
- `L307` "Edit" `<button>` → ✅ edited
- `L414` rule-toggle `<button>` (×N) → ✅ edited
- `L443` "Back to team" shadcn `<Button variant="outline">` → ✅ correctly skipped (own tokens, visible text)
- All other elements: presentational `<div>`/`<span>` (pills, stats, shift rows, clock rows, sales rows), shadcn `<Card>`, lucide icons (decorative), `<p>`/`<h1>` text, `<AppLayout>` — **no raw `<button>`, no raw `<a>`, no clickable `onClick` divs, no `role="button"`/`cursor-pointer` divs** beyond the 3 edited + 1 skipped.

### Guard-grep tally

```
className edits:        3  (#1 ring-only, #2 full-from-scratch, #3 FLIP+scale+ring)
new aria:               2  (1 aria-label #1, 1 aria-pressed #3)
focus-visible:ring      3  ring-ring=3 (all OUTWARD)
ring-inset              0
active:scale-90 kept    1  (#1 DON'T-CHURN)
active:scale-[0.97] new 1  (#2 link tier)
active:scale-[0.98] new 1  (#3 full-width-own-surface)
FLIPs                   1  (#3 transition-colors→transition-all)
DON'T-CHURN preserved   1  (#1)
disabled touched        0
logic lines touched     0
```

### Responsive

375/768/1280 — clean. The `max-w-2xl mx-auto px-4 pt-3 pb-24` column; header row (Back + h1); header Card (avatar + flex pills); `grid grid-cols-3` stats; shifts/clock/sales Cards with presentational rows; rules Card with full-width toggle buttons — all fit at 375 and scale up. `AppLayout` handles the shell.

### Owner flags (pre-existing, FLAG not fix)

- All Supabase reads use `(supabase as any)` casts (untyped) — pre-existing pattern.
- `toggleAck` calls `loadData()` after every insert/delete (full refetch) — existing behavior.
- The `employee_rule_acknowledgements` insert has no unique constraint guard against double-click races (existing).
- `computeWeeklyHours` uses `Date.now()` for open clock-ins — existing behavior.

**Verified:** the edits are already in the working tree. `npm run update` must pass green (TRUE EXIT 0) before moving to Done. No diff needed — the file as provided IS the correct final state.
