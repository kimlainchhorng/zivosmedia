# MiMo run — 2026-06-14T09:31:23.403Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/PersonalSchedulePage.tsx (585-line "My Schedule" rendered inside <AppLayout title="Schedule" hideHeader>; @tanstack/react-query useQuery my-employee-record/personal-schedule/emp-shifts; supabase.functions.invoke store-employee-manage + travel-support-submit; useState weekStart/now/showRequestSheet/reqType/reqDate/reqReason/reqNote/reqSubmitting/reqDone; live clock setInterval; date-fns; shadcn Sheet Request form). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys, setState, byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (add ring only). Don't add role/tabIndex/onKeyDown (structural — FLAG). Don't touch disabled. SKIP shadcn Sheet/AppLayout (own tokens). LEAVE native form fields (date input, select, textarea — native focus outline is house standard).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface (even if the control's OWN fill is colored/gradient). Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. Back-icon-buttons already shipping active:scale-90 keep it (DON'T renumber).
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- DON'T-CHURN: control ALREADY has press (active:scale) + transition → ADD ring (+aria) ONLY; don't renumber, no redundant 2nd scale, no flip.
- For bare icon/text-link buttons/anchors add a rounded/rounded-full so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure (collapse) control.

EIGHT edits applied — confirm each CORRECT or NEEDS-FIX:

A) L257 BACK button — was `w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform -ml-1` (ALREADY ships active:scale-90 + transition-transform; aria-label="Go back"; on bg-background neutral; NO ring) → DON'T-CHURN: APPENDED ring (kept scale-90, NO renumber). Final: `w-8 h-8 rounded-full flex items-center justify-center active:scale-90 transition-transform -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm.

B) L261 REQUEST button — was `flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold active:scale-95 transition-transform` (ALREADY ships active:scale-95 + transition-transform; own surface bg-primary/10; rounded-full; NO ring) → DON'T-CHURN: APPENDED ring. Final adds `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm.

C) L325 PREV-WEEK chevron — was `w-7 h-7 rounded-full flex items-center justify-center hover:bg-muted/60 active:scale-90 transition-all` (icon-only; ALREADY ships active:scale-90 + transition-all + hover:bg; sits in a bg-muted/30 rounded-full p-[3px] segmented container; NO ring) → DON'T-CHURN: APPENDED ring (kept scale-90 + transition-all, NO renumber, NO flip). Confirm: OUTWARD ring-ring against the bg-muted/30 container correct? scale-90 kept (not renumbered to 95) correct for an already-shipping control?

D) L328 TODAY button — was `text-[11px] font-semibold h-7 px-3 rounded-full hover:bg-muted/60 active:scale-95 transition-all` (text pill; ALREADY ships active:scale-95 + transition-all + hover:bg; same segmented container; NO ring) → DON'T-CHURN: APPENDED ring. Confirm.

E) L334 NEXT-WEEK chevron — same as C → DON'T-CHURN: APPENDED ring. Confirm.

F) L528 CLOSE text button (success state of Sheet) — was `mt-2 text-sm text-primary font-semibold` (bare text-link button; NO press, NO transition, NO ring, NO rounded; inside shadcn SheetContent centered success panel) → ADDED `rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (link tier scale-[0.97]; transition-transform since scale is the only animated prop, no hover color on itself; rounded so ring traces). Final: `mt-2 text-sm text-primary font-semibold rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: (1) [0.97] link tier correct; (2) transition-transform (not transition-all) correct since no hover-color on the element; (3) rounded + OUTWARD ring correct.

G) L536 REQUEST-TYPE toggle buttons (time_off/swap segmented) — was `flex-1 py-2 rounded-xl text-xs font-bold transition-all ${reqType === t ? "bg-ig-gradient text-white" : "bg-muted/40 text-muted-foreground"}` (persistent single-select segmented toggle; transition-all ALREADY present for the active/inactive bg swap; NO scale, NO ring, NO aria-pressed) → ADDED `active:scale-[0.97]` + ring + `aria-pressed={reqType === t}` (kept transition-all — no flip needed, it already animates bg; chip/segmented tier scale-[0.97]; aria-pressed because it's a persistent single-select segmented filter). Final className adds `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` after transition-all, plus `aria-pressed={reqType === t}` attr. Confirm: (1) aria-pressed correct for a segmented single-select toggle; (2) scale-[0.97] tier correct; (3) keeping transition-all (NOT flipping, NOT churning — it already had transition-all) correct; (4) OUTWARD ring-ring renders against the SheetContent surface even though the active button's own fill is bg-ig-gradient — correct (ring traces against parent, not gradient)?

H) L574 SUBMIT button — was `w-full h-12 rounded-2xl bg-ig-gradient text-white font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform flex items-center justify-center gap-2` (wide full-width WITH own surface; ALREADY ships active:scale-[0.98] + transition-transform; has disabled={!reqDate || reqSubmitting}; NO ring) → DON'T-CHURN: APPENDED ring (kept scale-[0.98] + transition-transform; disabled UNTOUCHED). Final adds `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: ring on a disabled-able button valid (native disabled removes focus → ring inert when disabled, not dead code)?

ALSO CONFIRM I should LEAVE: the AppLayout shell + shadcn Sheet (own tokens); native date <input> L548 (has title + focus:ring-1); native <select> L556 (has aria-label + focus:ring-1); native <textarea> L568 (focus:ring-1) — all native form fields, native focus outline is house standard, LEAVE; the mini-week-calendar day cells (divs, no onClick); employee card div L284 (no onClick); next-shift countdown motion.div banner; stat tiles; day-by-day shift rows (motion.div, no onClick); week-range span; all lucide icons (decorative); empty-state "No Schedule Found". No clickable divs with onClick on this page.

Be concise and exact. Return the precise final className after-string for EACH of A–H + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) F — Close text button [0.97]+transition-transform+rounded+ring — correct? (2) G — aria-pressed + scale-[0.97] + keep transition-all on the segmented toggle, OUTWARD ring against SheetContent (not the gradient fill) — correct? (3) the DON'T-CHURN ring-only adds (A/B/C/D/E/H) — correct to keep their existing scale numbers (90/95/90/95/90/0.98) and not renumber/flip? (4) leaving all native form fields untouched — correct?
- files: src/pages/app/personal/PersonalSchedulePage.tsx

---

## Verdict: ALL 8 EDITS CORRECT — zero fixes needed.

### Per-edit confirmation

| Edit | Final tokens | Verdict |
|------|-------------|---------|
| **A** Back (L257) | `…active:scale-90 transition-transform -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` · `aria-label="Go back"` kept | ✅ DON'T-CHURN ring-only. Scale-90 kept (not renumbered). OUTWARD ring on neutral header. |
| **B** Request (L261) | `…active:scale-95 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | ✅ DON'T-CHURN ring-only. `rounded-full` pre-existing. OUTWARD ring on header neutral. No aria (visible "Request" text). |
| **C** Prev-week (L325) | `…hover:bg-muted/60 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | ✅ DON'T-CHURN ring-only. Scale-90 kept (icon-only 95 is house default, but DON'T-CHURN = no renumber). `hover:bg` + existing `transition-all` correct (bg-color ON ITSELF). OUTWARD ring against `bg-muted/30` container. |
| **D** Today (L328) | `…hover:bg-muted/60 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | ✅ DON'T-CHURN ring-only. Scale-95 + `transition-all` kept. OUTWARD ring. |
| **E** Next-week (L334) | Same as C | ✅ Identical pattern, identical verdict. |
| **F** Close (L528) | `mt-2 text-sm text-primary font-semibold rounded transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | ✅ NEW (no prior press). `[0.97]` link-tier correct. `transition-transform` correct (no hover-color on element — scale is sole animated prop). `rounded` so ring traces. OUTWARD ring inside SheetContent. No aria (visible "Close"). |
| **G** Type toggle (L536) | `…transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${conditional}` + `aria-pressed={reqType === t}` | ✅ `aria-pressed` correct for persistent single-select segmented toggle. `[0.97]` chips tier correct. Keeping `transition-all` correct (already animated bg-swap, no churn). OUTWARD ring-ring renders against SheetContent parent — NOT the gradient fill (ring traces parent surface, element's own fill is irrelevant). |
| **H** Submit (L574) | `…active:scale-[0.98] transition-transform …focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` · `disabled={!reqDate \|\| reqSubmitting}` untouched | ✅ DON'T-CHURN ring-only. `[0.98]` wide-full-width-WITH-own-surface correct. `disabled` untouched. Ring inert when disabled (native `disabled` removes focusability — not dead code). |

### Answers to your 4 specific questions

1. **F** — `[0.97]` link tier + `transition-transform` (not `transition-all`) + `rounded` + OUTWARD ring — **all correct**. No hover-color on the element; scale is sole animated prop.
2. **G** — `aria-pressed` correct for segmented single-select. `[0.97]` chips tier correct. Keeping `transition-all` (no flip, no churn) correct. OUTWARD ring against SheetContent surface correct (ring traces parent, not the gradient fill).
3. **DON'T-CHURN** — keeping existing scale numbers (A=90, B=95, C=90, D=95, E=90, H=0.98) and NOT renumbering/flipping — **all correct**. The rule is explicit: already-shipping press + transition → ring-only, no churn.
4. **Native form fields left** — **correct**. `<input type="date">` (title + focus:ring-1), `<select>` (aria-label + focus:ring-1), `<textarea>` (focus:ring-1) — native focus outline is house standard. No custom ring, no press-scale on form controls.

### Missed-controls scan

Scanned every `onClick`/`onOpenChange`/interactive handler in the file:

| Control | Status |
|---------|--------|
| Back button (L257) | ✅ Covered (A) |
| Request button (L261) | ✅ Covered (B) |
| Prev-week chevron (L325) | ✅ Covered (C) |
| Today pill (L328) | ✅ Covered (D) |
| Next-week chevron (L334) | ✅ Covered (E) |
| Close text button (L528) | ✅ Covered (F) |
| Type toggle buttons (L536) | ✅ Covered (G) |
| Submit button (L574) | ✅ Covered (H) |

**No other raw interactive controls missed.** No clickable divs with `onClick`. No `<Link>` components. The `Sheet onOpenChange` is a Sheet prop (own tokens). All remaining elements are non-interactive (stat tiles, shift rows, calendar cells, countdown banner, employee card, empty-state).

### Guard-grep summary

```
focus-visible:ring  = 8  (A–H)
ring-ring           = 8  (all OUTWARD)
ring-inset          = 0
aria-pressed        = 1  (G, new)
aria-label          = 0  new (A pre-existing kept)
aria-expanded       = 0
active:scale-90     = 3  kept (A, C, E — NOT renumbered)
active:scale-95     = 2  kept (B, D)
active:scale-[0.97] = 2  new (F, G)
active:scale-[0.98] = 1  kept (H)
FLIPs               = 0
disabled touched    = 0
logic lines touched = 0
```

### What the owner must do

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build).
2. **Preview at 375/768/1280** — the page is a single-column `px-3` layout inside `AppLayout`; the Sheet is `side="bottom" max-h-[90dvh]`; no responsive risk.
3. **Commit** when ready — the diff is 8 className edits + 1 `aria-pressed` attr, zero logic changes.
