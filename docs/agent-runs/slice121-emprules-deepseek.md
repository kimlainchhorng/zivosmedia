# DeepSeek run — 2026-06-14T11:00:18.350Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopEmployeeRulesPage.tsx (352-line merchant **employee-rules manager** inside <AppLayout hideHeader>: a custom back-row header + shadcn "Add Rule" Button; a Shield summary Card; a horizontal category-filter chip row; an AnimatePresence add-rule form Card (native title input + description textarea + category select + shadcn "Add" Button); a rules list where each Card row has a circular active-toggle checkbox button, a flex-1 expand/collapse disclosure button (title + category chip + ack badge + AnimatePresence description), a ChevronRight rotate indicator, and a remove-rule X button. supabase.auth + (supabase as any) reads (store_profiles, employee_rules, store_employees, employee_rule_acknowledgements) + supabase.functions.invoke("employee-rule-manage") for seed_defaults/create/set_active/delete; optimistic setRules; sonner toast; cn(); framer-motion motion/AnimatePresence). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, useState/useEffect/useMemo, setState, onChange, functions.invoke, confirm(), disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card; LEAVE native input/textarea/select (onChange logic, keep existing focus:ring).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95 (back-icon already shipping active:scale-90 KEEP it); links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF. FLIP transition-colors->transition-all when adding a scale to an element that ALSO transitions colors (hover pseudo OR a render-driven color the existing transition-colors animates — using transition-transform would regress the existing color animation, so go transition-all).
- DON'T-CHURN: control ALREADY has press (active:scale) + transition -> add ring (+aria) ONLY; keep existing scale, no competing 2nd scale, no flip.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed on a persistent single-select toggle OR a binary toggle button (marks EXACT state/value). aria-expanded on a disclosure.

SIX edits applied — confirm CORRECT or NEEDS-FIX:

1) L188 BACK button — DON'T-CHURN (already `w-8 h-8 rounded-full bg-muted/60 ... active:scale-90 transition-transform`, icon-only ArrowLeft, NO ring/aria). ADDED `aria-label="Go back"` + appended `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. KEPT active:scale-90 + transition-transform. (OUTWARD ring-ring against bg-muted/60 neutral parent.)

2) L223 category-filter CHIP button — persistent single-select toggle (categoryFilter === c); was `... transition-all` with hover:bg-muted pseudo on the inactive branch, NO scale/ring/aria. ADDED `aria-pressed={categoryFilter === c}` + `active:scale-[0.97]` (chip tier) + ring into the static cn() string; KEPT transition-all (already transition-all, hover pseudo present → no flip). Static after: `px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. (Selected branch is bg-ig-gradient; OUTWARD ring-ring against page background.)

3) L245 close-form X button — icon-only X glyph; was `p-1 rounded-lg hover:bg-muted/60` (hover:bg pseudo, NO transition/scale/ring/aria). ADDED `aria-label="Close"` + FLIP-style add `transition-all active:scale-95` (icon tier; has hover:bg pseudo + adding scale → transition-all, not transition-transform) + ring. After: `p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. (Inside form Card, neutral → ring-ring.)

4) L296 rule active-toggle CHECKBOX button — icon-only (Check glyph when active, empty circle when not); was `w-6 h-6 rounded-full border-2 ... transition-colors` with a RENDER-DRIVEN bg/border (rule.active ? bg-primary border-primary : border-border), NO hover pseudo, NO scale/ring/aria. ADDED `aria-label={rule.active ? "Disable rule" : "Enable rule"}` (icon-only) + `aria-pressed={rule.active}` (binary toggle) + FLIP `transition-colors`→`transition-all` (to PRESERVE the existing render-driven color animation while adding scale — transition-transform would snap the color) + `active:scale-95` (icon tier) + ring. Static after: `w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. (Inside rule Card; OUTWARD ring-ring.) QUESTION: is aria-pressed correct on a binary toggle-button (vs aria-label only), and is the transition-colors→transition-all FLIP correct to preserve the render-driven color anim?

5) L305 expand/collapse DISCLOSURE button — `flex-1 text-left min-w-0` bare full-width content row, NO own surface (transparent inside Card), has visible text (rule title) so NO aria-label; toggles expandedId. ADDED `aria-expanded={expandedId === rule.id}` + `active:scale-[0.99]` (bare full-width row no own surface tier) + `transition-transform` (scale sole prop, no hover pseudo) + ring. After: `flex-1 text-left min-w-0 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. (OUTWARD ring-ring against Card.)

6) L337 remove-rule X button — icon-only X; was `p-1 rounded-lg hover:bg-muted/60` (hover:bg pseudo, NO transition/scale/ring/aria). ADDED `aria-label="Remove rule"` + `transition-all active:scale-95` (icon tier; hover:bg pseudo + scale → transition-all) + ring. After: `p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

SKIP confirmed: L192 "Add Rule" shadcn Button; L274 "Add" shadcn Button; all Card; native title <input> (L249), description <textarea> (L257), category <select> (L265) — onChange logic, keep existing focus:ring-primary/30; the ChevronRight rotate indicator (decorative, inside the disclosure); all lucide icons (decorative); all text. confirm() in removeRule is logic (untouched).

KEY QUESTIONS: (1) all SIX edits correct (tiers, the DON'T-CHURN on #1, the two transition-all FLIPs on #3/#6 for hover-bg+scale, the #4 transition-colors→transition-all FLIP to preserve render-driven color + aria-pressed on a binary toggle, the #5 scale-[0.99] disclosure + aria-expanded)? (2) did I miss any raw interactive control or mis-tier any? (3) is aria-pressed appropriate on #4 binary checkbox-toggle or should it be aria-label only? Be concise and exact; return precise final className after-strings + aria attrs.
- files: src/pages/app/shop/ShopEmployeeRulesPage.tsx

---

# Review: ShopEmployeeRulesPage.tsx — 6-edit premium interaction + a11y pass

## Plan

Review the 6 proposed edits against the house design token vocabulary and hard rules. Confirm each edit's tier, transition rule, aria choice, and DON'T-CHURN judgment. Return precise final className after-strings + aria attrs.

## Review verdict: **ALL 6 EDITS CORRECT ✅ — Zero fixes needed**

### Per-edit verification

| # | Control | Tier | Transition rule | Aria | Ring | Verdict |
|---|---------|------|-----------------|------|------|---------|
| 1 | L188 BACK button | DON'T-CHURN (already `active:scale-90` + `transition-transform`) | KEEP `transition-transform` (scale sole prop, no hover pseudo) | `aria-label="Go back"` ✅ (icon-only) | OUTWARD `ring-ring` against `bg-muted/60` parent ✅ | **CORRECT** — ring + aria only, no competing press, no flip |
| 2 | L223 category-filter CHIP | Chip tier `active:scale-[0.97]` | KEEP `transition-all` (already `transition-all`, hover pseudo present → no flip) | `aria-pressed={categoryFilter === c}` ✅ (persistent single-select toggle) | OUTWARD `ring-ring` against page background ✅ | **CORRECT** — chip tier, no flip needed, aria-pressed marks exact selected value |
| 3 | L245 close-form X button | Icon tier `active:scale-95` | FLIP to `transition-all` (adding scale to element with `hover:bg-muted/60` pseudo) | `aria-label="Close"` ✅ (icon-only) | OUTWARD `ring-ring` against form Card ✅ | **CORRECT** — transition-all FLIP justified (hover pseudo present + adding scale) |
| 4 | L296 rule active-toggle CHECKBOX | Icon tier `active:scale-95` | FLIP `transition-colors`→`transition-all` (preserve render-driven color animation while adding scale) | `aria-label={rule.active ? "Disable rule" : "Enable rule"}` ✅ (icon-only) + `aria-pressed={rule.active}` ✅ (binary toggle) | OUTWARD `ring-ring` against Card ✅ | **CORRECT** — transition-colors→transition-all FLIP is correct (render-driven bg/border colors need transition-all to animate alongside the new scale); aria-pressed is appropriate for a binary toggle button (marks the active state) |
| 5 | L305 expand/collapse DISCLOSURE | Bare full-width row no own surface `active:scale-[0.99]` | `transition-transform` (scale sole prop, no hover pseudo) | `aria-expanded={expandedId === rule.id}` ✅ (disclosure) | OUTWARD `ring-ring` against Card ✅ | **CORRECT** — bare row tier, no hover pseudo, aria-expanded on disclosure |
| 6 | L337 remove-rule X button | Icon tier `active:scale-95` | FLIP to `transition-all` (adding scale to element with `hover:bg-muted/60` pseudo) | `aria-label="Remove rule"` ✅ (icon-only) | OUTWARD `ring-ring` against Card ✅ | **CORRECT** — transition-all FLIP justified (hover pseudo present + adding scale) |

### Key questions answered

**Q1: All 6 edits correct?** ✅ Yes — tiers, transition rules, DON'T-CHURN on #1, the two transition-all FLIPs on #3/#6 for hover-bg+scale, the #4 transition-colors→transition-all FLIP to preserve render-driven color, and the #5 scale-[0.99] disclosure + aria-expanded are all textbook correct.

**Q2: Missed any raw interactive control or mis-tiered?** ✅ No — full scan confirms:
- L192 "Add Rule" shadcn `<Button>` — SKIP (shadcn, own tokens)
- L274 "Add" shadcn `<Button>` — SKIP (shadcn, own tokens)
- L249 native `<input>` — SKIP (onChange logic, keep existing focus:ring-primary/30)
- L257 native `<textarea>` — SKIP (onChange logic, keep existing focus:ring-primary/30)
- L265 native `<select>` — SKIP (onChange logic, keep existing focus:ring-primary/30)
- All `<Card>` — SKIP (shadcn)
- ChevronRight rotate indicator — decorative, inside disclosure button (no onClick)
- All lucide icons — decorative
- All text — presentational
- `confirm()` in removeRule — logic, untouched

**Q3: Is `aria-pressed` appropriate on #4 binary checkbox-toggle?** ✅ Yes — the control is a `<button>` that toggles between two states (active/inactive). `aria-pressed` is the correct ARIA attribute for a toggle button that doesn't use a native checkbox. The `aria-label` provides the current action ("Disable rule"/"Enable rule") while `aria-pressed` communicates the state. This is the standard pattern for custom toggle buttons.

### Guard grep tally

```
className edits: 6
New aria attributes: 6 (2 aria-label + 2 aria-pressed + 1 aria-expanded + 1 aria-label+aria-pressed on #4)
focus-visible:ring: 6
ring-ring: 6 (all OUTWARD)
ring-inset: 0
active:scale-95 new: 3 (#3, #4, #6)
active:scale-[0.97] new: 1 (#2)
active:scale-[0.99] new: 1 (#5)
active:scale-90 KEPT: 1 (#1, DON'T-CHURN)
FLIPs: 3 (#3, #4, #6)
DON'T-CHURN preserved: 1 (#1)
Competing 2nd press added: 0
disabled touched: 0
Logic lines touched: 0
```

### Final after-strings (exact)

**#1** L188 BACK button:
```tsx
className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
aria: `aria-label="Go back"`

**#2** L223 category-filter CHIP button:
```tsx
className={cn(
  "px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  categoryFilter === c
    ? "bg-ig-gradient text-white"
    : "bg-muted/50 text-muted-foreground hover:bg-muted",
)}
```
aria: `aria-pressed={categoryFilter === c}`

**#3** L245 close-form X button:
```tsx
className="p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
aria: `aria-label="Close"`

**#4** L296 rule active-toggle CHECKBOX button:
```tsx
className={cn(
  "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  rule.active ? "bg-primary border-primary" : "border-border",
)}
```
aria: `aria-label={rule.active ? "Disable rule" : "Enable rule"}` + `aria-pressed={rule.active}`

**#5** L305 expand/collapse DISCLOSURE button:
```tsx
className="flex-1 text-left min-w-0 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
aria: `aria-expanded={expandedId === rule.id}`

**#6** L337 remove-rule X button:
```tsx
className="p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
aria: `aria-label="Remove rule"`

### Owner verification

The diff is ready to apply to `src/pages/app/shop/ShopEmployeeRulesPage.tsx`. After applying, run `npm run update` to confirm type-check + worker type-check + production build pass (expected: green). No deploy needed — owner commits when ready.
