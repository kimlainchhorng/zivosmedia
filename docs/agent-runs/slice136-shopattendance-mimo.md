# MiMo run — 2026-06-14T12:34:10.201Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopAttendancePage.tsx (243-line employee attendance/leave page INSIDE `<AppLayout title="Attendance & Leave" hideHeader>`). Records stored in `feedback_submissions` (category shop_attendance). State via useState (filterTab/showForm/saving/form{employeeName,date,status,notes}); useQuery(["shop-attendance", user?.id]); handleSave inserts via `(supabase as any).from("feedback_submissions").insert(...)`; useAuth; cn(); toast.

RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, setShowForm, setForm, setFilterTab, handleSave, useQuery, supabase insert, byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP AppLayout, the three form `<input>`s (L143 name / L150 date / L169 notes — already `focus:ring-1 focus:ring-primary/30` form fields), stat cards (non-interactive divs), record rows (non-interactive motion.div), all lucide icons, all motion.div/AnimatePresence wrappers/text.

DESIGN TOKEN VOCABULARY (house standard):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent. --ring resolves BLACK. Neutral parent (bg-background/card/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/segmented filter/tab/single-select/card-tile active:scale-[0.97]; medium active:scale-[0.98]; wide full-width active:scale-[0.98/0.99].
- transition rule: transition-transform when scale is sole animated prop; transition-all when colour/bg also animates. FLIP transition-colors→transition-all when adding a NEW CSS active:scale. ALREADY transition-all → append scale WITHOUT flipping.
- DON'T-CHURN: control already has press (active:scale OR whileTap) + transition → ADD ring (+aria if missing) ONLY; KEEP existing scale (no renumber); no competing 2nd scale.
- aria: aria-label ONLY on icon-only/glyph-only controls (visible text → NO aria-label). aria-pressed on a PERSISTENT single-select segmented filter/tab/picker whose on/off is bg-conveyed.

6 edit groups applied — confirm CORRECT or NEEDS-FIX:

A) L104 BACK `<button>` (icon-only ArrowLeft; STATIC `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center`; onClick navigate(-1); NO scale/ring/aria) — ADDED `aria-label="Back"` + `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Icon-only tier scale-95. transition-transform (scale sole prop, no hover color). OUTWARD ring-ring (bg-muted neutral).

B) L108 ADD (+) `<button>` (icon-only Plus; STATIC `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center`; onClick setShowForm(true); NO scale/ring/aria) — ADDED `aria-label="Add attendance record"` + `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Icon-only tier. transition-transform. OUTWARD ring-ring (bg-primary/10 faint tint = neutral-ish → ring-ring).

C) L141 CLOSE-FORM X `<button>` (icon-only X; BARE — no prior className; onClick setShowForm(false); NO scale/ring/aria) — ADDED `aria-label="Close form"` + `rounded-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Icon-only tier. rounded-md so ring has radius (X sits on bg-card form panel). OUTWARD ring-ring.

D) L157 STATUS-PICKER `<button>` ×4 (single-select form.status, bg-conveyed via cn() `form.status === s ? "bg-ig-gradient text-white border-primary" : "border-border bg-muted/40"`; onClick setForm status; visible text; cn() STATIC base `px-3 py-1 rounded-full text-xs font-medium border transition-colors` [transition-colors]; NO scale/ring/aria) — ADDED `aria-pressed={form.status === s}` + FLIPPED transition-colors→`transition-all` + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Single-select chip tier [0.97]. FLIP (was transition-colors + colors animate + NEW scale added). OUTWARD ring-ring (chips on bg-card form panel; selected is bg-ig-gradient but ring renders on neutral track).

E) L175 SAVE-RECORD `<button>` (STATIC `w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50`; disabled={saving}; visible text; NO transition/scale/ring) — ADDED `transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Wide full-width own-surface tier [0.98]. transition-transform (scale sole animated prop — bg-ig-gradient is a static fill, no hover color, disabled:opacity is state not transition-driven). disabled preserved. OUTWARD ring-ring.

F) L189 FILTER-TABS `<button>` ×5 (single-select filterTab, bg-conveyed via cn() `filterTab === tab ? "bg-ig-gradient text-white border-primary" : "border-border/50 bg-muted/30"`; onClick setFilterTab; visible text; cn() STATIC base `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors` [transition-colors]; NO scale/ring/aria) — ADDED `aria-pressed={filterTab === tab}` + FLIPPED transition-colors→`transition-all` + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Segmented-filter tier [0.97]. FLIP. OUTWARD ring-ring.

SKIP confirmed: the three form `<input>`s (L143/L150/L169, already focus:ring-1 — form fields), AppLayout, stat cards (non-interactive divs L122), record rows (non-interactive motion.div L217), all lucide icons, all motion.div/AnimatePresence wrappers/text.

KEY QUESTIONS: (1) all 6 edit groups correct? (2) A/B/C — icon-only scale-95 + transition-transform + aria-label correct? (3) D/F — aria-pressed + FLIP transition-colors→transition-all + [0.97] correct for single-select bg-conveyed pickers (vs role=tablist/tab — structural)? (4) E — Save: transition-transform (not transition-all) correct since bg-ig-gradient is static fill (no hover color animates), scale sole animated prop? Wide own-surface [0.98] correct? (5) OUTWARD ring-ring correct for all 6 (incl. bg-ig-gradient selected pills whose ring renders on neutral track, and bg-primary/10 faint-tint Add button)? (6) any missed raw interactive control? (Confirm the 3 form inputs correctly SKIPPED.) Be concise and exact; return precise final className after-strings + aria attrs + verdict per group.
- files: src/pages/app/shop/ShopAttendancePage.tsx

---

## Verification — ShopAttendancePage.tsx premium interaction + a11y pass

**All 6 edit groups are CORRECT. Zero fixes needed.**

### Per-group verdict

| Group | Control | After-className | Aria | Verdict |
|-------|---------|----------------|------|---------|
| **A** | Back icon `<button>` | `…transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Back"` | ✅ Icon-only `scale-95`, `transition-transform` (scale sole prop), OUTWARD `ring-ring` (neutral `bg-muted/60`) |
| **B** | Add (+) icon `<button>` | `…transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Add attendance record"` | ✅ Same pattern; `bg-primary/10` faint tint → OUTWARD `ring-ring` |
| **C** | Close-form X `<button>` | `rounded-md transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Close form"` | ✅ Bare button → fresh `transition-transform`; `rounded-md` for ring radius; sits on `bg-card` → OUTWARD |
| **D** | Status picker ×4 | `px-3 py-1 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-pressed={form.status === s}` | ✅ FLIP `transition-colors`→`transition-all` correct (new scale + colors animate). Chip tier `[0.97]`. OUTWARD `ring-ring` — `bg-ig-gradient` selected pill's ring renders on neutral `bg-card` track. |
| **E** | Save Record `<button>` | `w-full py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | *(visible text, none)* | ✅ Wide own-surface `[0.98]`. `transition-transform` correct — `bg-ig-gradient` is static fill, no hover color animates, scale sole prop. `disabled` preserved. OUTWARD on neutral `bg-card` parent. |
| **F** | Filter tabs ×5 | `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-pressed={filterTab === tab}` | ✅ Same FLIP + `[0.97]` pattern as D. OUTWARD `ring-ring` — chips on neutral page bg. |

### Guard tally

```
className edits:      6  (A B C D E F)
new aria-label:       3  (A, B, C — icon-only)
new aria-pressed:     2  (D, F — single-select bg-conveyed)
new aria-expanded:    0
focus-visible:ring:   6  ALL ring-ring
ring-inset:           0
ring-white/70:        0
active:scale new:     6  (A/B/C = 95, D/F = [0.97], E = [0.98])
FLIPs:                2  (D, F: transition-colors → transition-all)
fresh transitions:    3  (A, B, C: transition-transform added bare)
competing 2nd scale:  0
disabled touched:     0
logic lines touched:  0
```

### Skips confirmed

- **3 form `<input>`s** (employee name / date / notes) — already `focus:ring-1 focus:ring-primary/30` → form-field carveout ✅
- **AppLayout**, **stat cards** (`<div>` non-interactive), **record rows** (`motion.div` non-interactive), all **lucide icons**, all **motion.div/AnimatePresence** wrappers ✅

### Missed controls check

Scanned all `<button>` elements in the file — exactly 6 raw `<button>` elements (Back, Add, Close-X, status-picker ×4, Save, filter-tabs ×5). **Zero missed.** No raw `<a>`/`<Link>`, no clickable `onClick` divs.

### Key questions answered

1. **All 6 groups correct?** Yes.
2. **A/B/C icon-only pattern?** Yes — `scale-95` + `transition-transform` + `aria-label` = textbook icon-only tier.
3. **D/F `aria-pressed` + FLIP?** Yes — `aria-pressed` is the house pattern for persistent single-select bg-conveyed pickers. `role="tablist"`/`role="tab"` would be more semantically precise but is STRUCTURAL → FLAG per rules.
4. **E `transition-transform` (not `transition-all`)?** Yes — `bg-ig-gradient` is a static fill with no hover-color animation; scale is the sole CSS prop gaining animation. Wide own-surface `[0.98]` correct.
5. **OUTWARD `ring-ring` for all?** Yes — all controls sit against neutral parents (`bg-background`/`bg-card`/`bg-muted`); `bg-ig-gradient` selected pills' rings render on the neutral track around them, not their own fill.
6. **Missed controls?** None. 3 form inputs correctly skipped.

### Owner action

The pass is **clean and ready to commit**. No changes needed. Verify with `npm run update` (gate must pass before moving to Done in `AGENT_TASKS.md`).
