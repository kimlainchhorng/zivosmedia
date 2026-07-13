# MiMo run — 2026-06-14T11:01:41.473Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Verification — ShopEmployeeRulesPage.tsx

All six edits are **CORRECT**. Zero fixes needed. File is ready to commit as-is.

---

### Per-edit audit

| # | Control | Tier / Pattern | Correct? | Notes |
|---|---------|---------------|----------|-------|
| 1 | Back button (L188) | DON'T-CHURN (kept `active:scale-90 transition-transform`) | ✅ | Icon-only → `aria-label="Go back"` ✅; ring added only ✅; no competing 2nd scale ✅ |
| 2 | Category chip (L223) | Chip tier `scale-[0.97]` | ✅ | Persistent single-select → `aria-pressed` ✅; `hover:bg-muted` on inactive → **KEEP** `transition-all` (not a flip) ✅ |
| 3 | Close X (L245) | Icon tier `scale-95` | ✅ | `hover:bg-muted/60` pseudo + adding scale → `transition-all` (FLIP-style add) ✅; `aria-label="Close"` ✅ |
| 4 | Active-toggle checkbox (L296) | Icon tier `scale-95` | ✅ | Binary toggle → `aria-pressed={rule.active}` ✅ + `aria-label` (icon-only) ✅; render-driven `bg-primary/border-primary` color → `transition-colors`→`transition-all` FLIP preserves color anim ✅ |
| 5 | Disclosure (L305) | Bare-row tier `scale-[0.99]` | ✅ | `aria-expanded={expandedId === rule.id}` ✅; `transition-transform` (scale sole prop, no hover pseudo) ✅; visible text → no aria-label ✅ |
| 6 | Remove X (L337) | Icon tier `scale-95` | ✅ | Identical pattern to #3; `hover:bg-muted/60` + scale → `transition-all` ✅; `aria-label="Remove rule"` ✅ |

### Final className + aria after-strings (exact)

**1. Back button:**
```
className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-label="Go back"
```

**2. Category chip (static part):**
```
"px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
+ conditional: selected → "bg-ig-gradient text-white" | inactive → "bg-muted/50 text-muted-foreground hover:bg-muted"
aria-pressed={categoryFilter === c}
```

**3. Close X:**
```
className="p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-label="Close"
```

**4. Active-toggle checkbox (static part):**
```
"w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
+ conditional: active → "bg-primary border-primary" | inactive → "border-border"
aria-label={rule.active ? "Disable rule" : "Enable rule"}
aria-pressed={rule.active}
```

**5. Disclosure:**
```
className="flex-1 text-left min-w-0 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-expanded={expandedId === rule.id}
```

**6. Remove X:**
```
className="p-1 rounded-lg hover:bg-muted/60 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
aria-label="Remove rule"
```

### Guard-grep tally

| Metric | Count |
|--------|-------|
| className edits | 6 |
| New aria attrs | 7 (3 `aria-label` + 2 `aria-pressed` + 1 `aria-expanded` + 1 `aria-pressed`) — actually: `aria-label`=3 (#1, #3, #6) + `aria-pressed`=2 (#2, #4) + `aria-expanded`=1 (#5) + `aria-label`=1 (#4) → **total 4 aria-label + 2 aria-pressed + 1 aria-expanded = 7 new aria** |
| `focus-visible:ring` | 6 |
| `ring-ring` | 6 (all OUTWARD) |
| `ring-inset` | 0 |
| `active:scale-90` kept | 1 (#1, pre-existing) |
| `active:scale-95` new | 3 (#3, #4, #6) |
| `active:scale-[0.97]` new | 1 (#2) |
| `active:scale-[0.99]` new | 1 (#5) |
| FLIPs (`transition-colors`→`transition-all`) | 1 (#4) |
| FLIP-style adds (`transition-all` from scratch, hover pseudo) | 2 (#3, #6) |
| DON'T-CHURN preserved | 1 (#1) |
| Competing 2nd press added | 0 |
| `disabled` touched | 0 |
| Logic lines touched | 0 |

### Missed controls scan

All 6 raw `<button>` elements in the file are covered. No other raw `<button>`, `<a>`, or clickable `onClick` divs exist. Confirmed skips: 2 shadcn `Button`, 3 native form controls (`input`/`textarea`/`select` with onChange logic + existing `focus:ring`), 1 ChevronRight (decorative rotate indicator), all `Card`/`motion.div`/lucide icons, `confirm()` in `removeRule`.

### Answers to key questions

1. **All six correct** — tiers, the DON'T-CHURN on #1, both transition-all FLIPs on #3/#6 (hover-bg+scale), the #4 transition-colors→transition-all FLIP preserving render-driven color, #5 scale-[0.99] disclosure tier.

2. **No missed controls, no mis-tiered edits.** Full scan exhaustive.

3. **`aria-pressed` on #4 is correct.** Per house standard: "aria-pressed on a persistent single-select toggle OR a binary toggle button (marks EXACT state/value)." This is a binary toggle (on/off = active/inactive), `aria-pressed={rule.active}` marks the exact boolean. Combined with `aria-label` for the icon-only glyph — both are appropriate and the combo matches the house checkbox-toggle pattern (same as SandboxModePage type-selectors, AiContentSuite mood buttons).

### Owner verification

- Run `npm run update` → must pass (types + worker types + build).
- Preview at 375/768/1280: category chip row scrolls horizontally, form Card appears/disappears, rule Cards with toggle/disclosure/remove all render correctly.
- `confirm()` in `removeRule` is native browser dialog (logic, untouched) — confirm UX intent.
