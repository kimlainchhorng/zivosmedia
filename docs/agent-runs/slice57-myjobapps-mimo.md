# MiMo run — 2026-06-14T05:11:11.523Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 57 — src/pages/MyJobApplicationsPage.tsx (single page, 222 lines, "Track jobs I've applied to" list; segmented filter tabs + per-application cards). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs (aria-label/aria-pressed/aria-expanded only). NO logic, NO handlers, NO state, NO routing changes.

Apply the project's standing interaction-token rules to RAW <button>/<a>/<Link> only:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips & segmented filters [0.97]; self-contained cards [0.98]; full-width buttons/wide-rows/bare full-width flex regions [0.99]).
- transition-* : transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:border-*/hover:opacity COLOR fade; transition-transform for PURE press-scale with NO hover color. When a control already has transition-colors AND we add a new active:scale, FLIP transition-colors→transition-all. When a control already has transition-all and we APPEND active:scale, APPEND (no flip).
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring; ring-inset ONLY if focusable control sits FLUSH inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only button with no visible text and no aria-label -> ADD aria-label. aria-pressed ONLY for segmented single-select controls that convey selection by BACKGROUND fill with a constant label word (NOT role=tab). Do NOT add aria-expanded to dialog openers.

SKIP (already tokenized / non-interactive / not mine): shadcn Button/Input/etc.; presentational motion.div/div without onClick; child components.

The 5 RAW <button> controls under review:
1-3. L152/L153/L154 segmented filter tabs ×3 (all/active/decided) — VISIBLE TEXT constant words "All (n)" / "Active (n)" / "Decided" (the trailing count is SUPPLEMENTARY), onClick setTab(...), selection conveyed by BACKGROUND (active: bg-ig-gradient text-white shadow-sm / inactive: bg-secondary text-foreground hover:bg-muted). className via cn(), shared base = "flex-1 h-10 rounded-xl text-xs font-bold transition-all" + the active/inactive conditional. HAS transition-all, NO scale/ring/aria. They sit in a `flex gap-2` row (gap BETWEEN tabs → NOT flush edge-to-edge), on the neutral page bg, NOT overflow-hidden. (This is the EXACT OrderDisputesPage segmented-filter pattern.)
4. L190 card-open button — full-width, onClick navigate(`/jobs/${job_id}`), className "w-full text-left flex items-start gap-3". A BARE full-width flex region (NO border/bg/rounded/padding of its OWN) that fills the per-application card; the visual card is the PARENT motion.div ("rounded-2xl bg-card border border-border p-3.5" — NOT overflow-hidden). The button is inset from the card edge by the parent's p-3.5. Has a ChevronRight affordance + visible job title/meta text. NO hover, NO transition, NO scale, NO ring.
5. L210 Withdraw button — full-width CONDITIONAL (only when status submitted/reviewing), VISIBLE TEXT "Withdraw application", onClick withdraw(id) [optimistic update], className "mt-2 w-full h-8 rounded-lg bg-secondary hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-foreground text-xs font-bold transition-colors". HAS transition-colors + hover:bg + hover:text, NO scale/ring. w-full inside the card p-3.5 (NOT flush, NOT overflow-hidden). One-shot action (the button is removed once withdrawn).

Confirm per control: exact className change, transition (all/transform/flip/append), scale tier, ring (outward vs inset), and any aria add/keep. KEY QUESTIONS: (Q1) Tabs — confirm ADD aria-pressed={tab===id} (OrderDisputes bg-conveyed segmented precedent, constant label word + supplementary count does NOT disqualify), APPEND active:scale-[0.97] (segmented tier), OUTWARD ring (gap-2 → not flush), APPEND-not-flip (transition-all already present). (Q2) Card-open button #4 — which TIER: [0.98] (it fills/scales a self-contained card) OR [0.99] (it is itself a bare full-width flex region, the card is the parent)? And transition-transform (no hover color → pure press) + OUTWARD ring? (Q3) Withdraw #5 — FLIP transition-colors→transition-all + active:scale-[0.99] (full-width) + OUTWARD ring + NO aria (visible text, one-shot not toggle)? Match the parity reference JobPostingDetailPage.tsx conventions. Reply concise per control.
- files: src/pages/MyJobApplicationsPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

5 RAW `<button>` controls in `src/pages/MyJobApplicationsPage.tsx`. All className + display-only aria; 0 logic lines.

| # | Control | Change | Transition | Scale | Ring | Aria |
|---|---------|--------|------------|-------|------|------|
| 1–3 | Segmented tabs ×3 | APPEND | APPEND onto existing `transition-all` (no flip) | `[0.97]` segmented | OUTWARD `ring-ring` (gap-2, not flush) | ADD `aria-pressed={tab===id}` |
| 4 | Card-open bare flex | FRESH | `transition-transform` (no hover color) | `[0.99]` bare full-width flex region | OUTWARD `ring-ring` (parent NOT overflow-hidden, inset by p-3.5) | none (visible text) |
| 5 | Withdraw w/full | FLIP | `transition-colors`→`transition-all` (has hover:bg+hover:text) | `[0.99]` full-width | OUTWARD `ring-ring` (parent NOT overflow-hidden) | none (visible text, one-shot) |

### Q1 — Tabs
Confirm: ADD `aria-pressed={tab===id}` (bg-conveyed segmented, constant label word All/Active/Decided, supplementary count does NOT disqualify — OrderDisputesPage exact precedent). APPEND `active:scale-[0.97]` segmented tier + ring onto existing `transition-all`. OUTWARD `ring-ring` — `flex gap-2` puts gap between tabs so not flush edge-to-edge. APPEND-not-flip — `transition-all` already present and covers the inactive `hover:bg-muted` color fade alongside the new scale.

### Q2 — Card-open #4
**`[0.99]` tier** — this is a BARE full-width flex region (`"w-full text-left flex items-start gap-3"`, no own bg/border/rounded/padding). The visual card is the parent `motion.div` (`rounded-2xl bg-card border p-3.5`, NOT overflow-hidden). The button is NOT a self-contained card (that would be `[0.98]`). `transition-transform` — no hover color exists, pure press. OUTWARD ring — parent is not overflow-hidden; button sits inset within parent's `p-3.5`. No aria-label needed (visible job title/meta text).

### Q3 — Withdraw #5
FLIP `transition-colors`→`transition-all` — existing `hover:bg-rose-500/15` + `hover:text-rose-600` are color fades that must keep easing alongside the new scale. `active:scale-[0.99]` full-width tier. OUTWARD ring — parent card not overflow-hidden, button has own `rounded-lg`. NO `aria-pressed` — one-shot action, the button is removed from DOM once withdrawn (not a persistent toggle). NO aria-label (visible "Withdraw application" text).

---

## Proposed Diff

**File:** `src/pages/MyJobApplicationsPage.tsx`

```diff
--- a/src/pages/MyJobApplicationsPage.tsx
+++ b/src/pages/MyJobApplicationsPage.tsx
@@ -149,9 +149,9 @@ export default function MyJobApplicationsPage() {
 
         <div className="flex gap-2">
-          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
-          <button type="button" onClick={() => setTab("active")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "active" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Active ({stats.active})</button>
-          <button type="button" onClick={() => setTab("decided")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "decided" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Decided</button>
+          <button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
+          <button type="button" aria-pressed={tab === "active"} onClick={() => setTab("active")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "active" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Active ({stats.active})</button>
+          <button type="button" aria-pressed={tab === "decided"} onClick={() => setTab("decided")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "decided" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Decided</button>
         </div>
 
@@ -187,7 +187,7 @@ export default function MyJobApplicationsPage() {
                   className="rounded-2xl bg-card border border-border p-3.5"
                 >
-                  <button type="button" onClick={() => navigate(`/jobs/${a.job_id}`)} className="w-full text-left flex items-start gap-3">
+                  <button type="button" onClick={() => navigate(`/jobs/${a.job_id}`)} className="w-full text-left flex items-start gap-3 transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
@@ -207,7 +207,7 @@ export default function MyJobApplicationsPage() {
                   {canWithdraw && (
-                    <button type="button" onClick={() => withdraw(a.id)} className="mt-2 w-full h-8 rounded-lg bg-secondary hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-foreground text-xs font-bold transition-colors">
+                    <button type="button" onClick={() => withdraw(a.id)} className="mt-2 w-full h-8 rounded-lg bg-secondary hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-foreground text-xs font-bold transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                       Withdraw application
                     </button>
```

---

## Summary

**5 edits / 5 className changes / 3 new `aria-pressed` attrs / 0 logic lines touched.**

- **3 rings** added (all OUTWARD `ring-ring`)
- **3 `aria-pressed`** added (segmented tabs)
- **3 FRESH scales** (tabs `[0.97]`, card-open `[0.99]`, withdraw `[0.99]`)
- **1 transition FLIP** (`transition-colors`→`transition-all` on Withdraw)
- **1 FRESH `transition-transform`** (card-open, no hover color)
- **1 `transition-all` APPEND ×3** (tabs, already present)
- **0 `ring-inset`**, **0 `ring-white/70`**, **0 `aria-label` added**, **0 logic lines**

## Owner verification

After applying: run `npm run update` (type-check + worker type-check + production build — must pass with exit 0). Preview at 375/768/1280 to confirm: tabs press-scale + ring visible between the gap-2 spacing; card-open flex region scales cleanly within the parent card padding; withdraw button flips from `transition-colors` to `transition-all` correctly (hover rose color + press scale both ease).
