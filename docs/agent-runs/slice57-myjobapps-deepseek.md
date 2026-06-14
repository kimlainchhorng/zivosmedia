# DeepSeek run — 2026-06-14T05:09:53.716Z

- model: deepseek-chat
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

# SLICE 57 — MyJobApplicationsPage.tsx — Premium Interaction + A11y Pass

## Plan

Apply the standing interaction-token rules to 5 RAW `<button>` controls on `src/pages/MyJobApplicationsPage.tsx`. All changes are className-only + display-only aria attrs. 0 logic lines touched.

## Proposed Diff

```diff
--- a/src/pages/MyJobApplicationsPage.tsx
+++ b/src/pages/MyJobApplicationsPage.tsx
@@ -149,9 +149,9 @@ export default function MyJobApplicationsPage() {
         </motion.div>

         <div className="flex gap-2">
-          <button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
-          <button type="button" onClick={() => setTab("active")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "active" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Active ({stats.active})</button>
-          <button type="button" onClick={() => setTab("decided")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "decided" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Decided</button>
+          <button type="button" onClick={() => setTab("all")} aria-pressed={tab === "all"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
+          <button type="button" onClick={() => setTab("active")} aria-pressed={tab === "active"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "active" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Active ({stats.active})</button>
+          <button type="button" onClick={() => setTab("decided")} aria-pressed={tab === "decided"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "decided" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Decided</button>
         </div>

         {isLoading && <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />)}</div>}
@@ -187,7 +187,7 @@ export default function MyJobApplicationsPage() {
                   className="rounded-2xl bg-card border border-border p-3.5"
                 >
-                  <button type="button" onClick={() => navigate(`/jobs/${a.job_id}`)} className="w-full text-left flex items-start gap-3">
+                  <button type="button" onClick={() => navigate(`/jobs/${a.job_id}`)} className="w-full text-left flex items-start gap-3 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <div className={cn("shrink-0 h-10 w-10 rounded-xl flex items-center justify-center", meta.bg)}>
                       <Icon className={cn("h-4 w-4", meta.tone, a.status === "reviewing" && "animate-spin")} />
                     </div>
@@ -210,7 +210,7 @@ export default function MyJobApplicationsPage() {
                   </button>
                   {canWithdraw && (
-                    <button type="button" onClick={() => withdraw(a.id)} className="mt-2 w-full h-8 rounded-lg bg-secondary hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-foreground text-xs font-bold transition-colors">
+                    <button type="button" onClick={() => withdraw(a.id)} className="mt-2 w-full h-8 rounded-lg bg-secondary hover:bg-rose-500/15 hover:text-rose-600 dark:hover:text-rose-400 text-foreground text-xs font-bold transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                       Withdraw application
                     </button>
                   )}
```

## Per-Control Breakdown

### Q1 — Segmented filter tabs (L152–154)
- **`aria-pressed={tab === id}`** — YES. Exact OrderDisputesPage precedent: bg-conveyed selection, constant label word ("All"/"Active"/"Decided"), supplementary count badge does NOT disqualify.
- **`active:scale-[0.97]`** — segmented tier, APPEND (not flip) since `transition-all` already present.
- **OUTWARD `ring-ring`** — tabs sit in `flex gap-2` row (gap between tabs, NOT flush edge-to-edge), on neutral page bg, NOT overflow-hidden.
- **No aria-label** — visible text present.

### Q2 — Card-open button (L190)
- **Tier: `[0.98]`** — self-contained card tier. The button fills the card interior (inset by parent's `p-3.5`), and the visual card IS the interactive region. This matches the JobPostingDetailPage "Apply" button precedent (`active:scale-[0.98]` for a full-width button inside a card context).
- **`transition-transform`** — NO hover color (the button has no `hover:bg-*`/`hover:text-*`/`hover:border-*`/`hover:opacity`). Pure press-scale → `transition-transform`, no flip needed.
- **OUTWARD `ring-ring`** — button is inset from the card edge by parent's `p-3.5`, and the parent `motion.div` is NOT `overflow-hidden`. An outward ring renders cleanly against the neutral `bg-card` surface.
- **No aria-label** — visible text (job title + meta) provides accessible name.

### Q3 — Withdraw button (L210)
- **FLIP `transition-colors`→`transition-all`** — gaining a new `active:scale` alongside existing `hover:bg-rose-500/15` + `hover:text-rose-600` color fades.
- **`active:scale-[0.99]`** — full-width tier (`w-full` inside the card).
- **OUTWARD `ring-ring`** — button is inset by parent's `p-3.5`, parent NOT overflow-hidden.
- **No aria-label** — visible text "Withdraw application".
- **No `aria-pressed`** — one-shot action (button is removed from DOM once withdrawn), NOT a persistent toggle.

## Owner Verification

1. Run `npm run update` — must pass (type-check + worker type-check + production build).
2. Preview at `/my-job-applications` (or navigate there from the app) at 375/768/1280 widths.
3. Verify: tab filter rings visible on keyboard focus, press scales feel correct, Withdraw button hover color transitions smoothly with the new scale.
4. Commit when ready — no deploy needed from this change alone.
