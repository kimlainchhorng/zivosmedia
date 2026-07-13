# DeepSeek run — 2026-06-14T03:54:51.743Z

- model: deepseek-chat
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/BugReportsPage.tsx (205 lines, "Submit + view your bug reports", REAL Supabase bug_reports table + supabase.functions.invoke("bug-report-submit") edge fn — NOT mock; AUTH-GATED via useAuth). Backed by one useQuery ["bug-reports", user?.id] from bug_reports (.select/.eq("user_id", user.id)/.order("created_at" desc), enabled !!user?.id). description/screenshotUrl/submitting useState. submit() = validate >=20 chars (toast.error else) -> setSubmitting(true) -> functions.invoke("bug-report-submit", {body...}) -> setSubmitting(false) -> on error toast.error; else toast.success + clear inputs + qc.invalidateQueries. formatRelative util. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + Bug badge + "Bug Reports" title); gradient hero stat motion.div ({bugs.length} reports filed, NO onClick); a "Report a bug" form card (label + textarea + url input + a row with a hint <p> and a RAW Submit button); loading skeletons; then a "Past reports" section header + a list of report cards (each presentational motion.div [entrance anim, NO onClick] containing: a Bug-icon tile + a flex-1 column [description line-clamp-3 + a meta row with relative-time span + optional "page" <a> external link + optional "screenshot" <a> external link]). NO bottom nav.

Reference standard for tokens: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 1 RAW <button type="button"> + 2 inline <a> external links + 1 shadcn back <Button> + 1 textarea + 1 url input. 0 motion.button.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full" onClick={navigate(-1)}> (L96) => SKIP (ships tokens, labeled).
- (A) Submit button (L141, RAW): disabled={submitting || description.trim().length < 20}, onClick={submit}, VISIBLE TEXT changes (Send icon + "Submit" / Loader2 spinner + "Sending…"), className "h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm" — ALREADY HAS active:scale-95 + transition-all + hover:opacity-90 + disabled:opacity-50, NO ring. Sits in a flex justify-between row inside the p-4 bg-card form card (NOT overflow-hidden).
- (B) "page" <a> (L182): href={b.page_url} target="_blank" rel="noopener noreferrer", VISIBLE TEXT "page" + ExternalLink icon, className "inline-flex items-center gap-0.5 hover:text-foreground" — HAS hover:text-foreground color fade, NO transition/ring/rounded. Inline micro text-link (text-[11px]) in the report card's meta row.
- (C) "screenshot" <a> (L190): identical className "inline-flex items-center gap-0.5 hover:text-foreground", href={b.screenshot_url} target="_blank" rel="noopener noreferrer", VISIBLE TEXT "screenshot" + ImageIcon. Same inline micro text-link.

TOKEN TIERS (this repo): wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. transition-all when the control ALSO has hover:bg/text/opacity OR underline; transition-transform for PURE press-scale with NO hover. DON'T-CHURN: if a raw button ALREADY has active:scale + a transition, ADD ring (+aria) ONLY — do NOT renumber a valid existing scale, do NOT re-flip an existing valid transition. aria-pressed ONLY for persistent toggle/segmented/filter state conveyed by bg/color — NOT for one-shot actions or transient feedback whose label text changes. ring-inset ONLY when flush inside an overflow-hidden rounded PARENT; OUTWARD default. Inputs that ALREADY ship a focus:ring => don't-churn (LEAVE).

HARD RULE: className + display-only attr (aria-*) ONLY. Do NOT change any onClick / submit / setDescription / setScreenshotUrl / setSubmitting / functions.invoke / qc.invalidateQueries / navigate / useQuery / useAuth / disabled / href / target / rel / any logic. Do NOT add onClick to a no-op control (FLAG it).

MY PLAN -- validate or correct:

(A) Submit button (L141; RAW; ALREADY active:scale-95 + transition-all + hover:opacity-90; disabled-gated; working onClick submit): RING-ONLY (DON'T-CHURN) -> append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring". KEEP active:scale-95 (don't renumber), KEEP transition-all (eases hover:opacity-90 + the disabled:opacity-50 swap). NO aria-label (visible Submit/Sending text). NO aria-pressed (one-shot submit, label text changes, not a toggle). OUTWARD ring (button in a flex row inside the p-4 bg-card form card, NOT overflow-hidden). before: "h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm" -> after: append " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

(B)+(C) "page"/"screenshot" <a> external links (L182/L190; identical className "inline-flex items-center gap-0.5 hover:text-foreground"; HAS hover:text-foreground; real external nav links currently with NO focus indicator at all): A11Y RING-ONLY -> append " transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded" to each (rounded so the ring isn't a sharp rectangle around inline text; transition-colors to ease the existing hover:text-foreground; NO active:scale — these are tiny text-[11px] inline micro-links where a press-scale would be imperceptible/odd; visible text → NO aria-label; navigational → NO aria-pressed; OUTWARD ring — inline in the meta row inside a p-3 bg-card report card, not overflow-hidden). I can use replace_all over the identical className string.

QUESTIONS:
(1) Submit button (A): RING-ONLY don't-churn (pre-existing active:scale-95 + transition-all)? KEEP active:scale-95 even though a px-5 rounded-full text+icon Submit reads as a primary/pill (tiers→[0.98]/[0.97])? — I lean DON'T-CHURN (keep 95, valid existing, renumber=noise). AGREE or advise renumber?
(2) (B)+(C) inline <a> links: ADD a11y focus-visible ring + transition-colors + rounded, NO active:scale (tiny inline micro-links)? Or do you prefer FULL link treatment (active:scale-[0.97] + transition-all)? Or RING-ONLY with NO transition/rounded (most minimal)? I lean ring + transition-colors + rounded, no scale. AGREE or advise.
(3) Is touching the <a> links IN SCOPE (they're genuine focusable controls lacking any focus indicator — a real a11y gap), or should I LEAVE them and only FLAG (to keep the diff to the one <button>)? I lean fix (pure a11y win, className-only).
(4) Inventory exhaustive (1 RAW button + 2 <a> + 1 shadcn back)? hero stat motion.div L109 + report-card motion.div L165 correctly presentational (NO onClick)? form card div L122 non-interactive container? textarea L124 + url input L132 ALREADY ship focus:outline-none focus:ring-2 focus:ring-rose-500/30 → don't-churn LEAVE (valid existing focus indicator)? loading skeleton L153 non-interactive?
(5) Responsive 375/768/1280: header; hero stat; form card (textarea rows=5 + url input h-10 + hint/Submit flex justify-between row); report card (Bug tile 36px + flex-1 [desc line-clamp-3 + meta flex-wrap with time + page + screenshot links]). Any crush @375 (the justify-between hint <p> + Submit button)? sub-44px tap targets to FLAG (back h-10 40px; Submit h-10 40px; inline <a> links ~16px)?
(6) Owner flags (logic/out of scope, FLAG not fix): the report card has no tap-to-detail (only the inline page/screenshot links act); the supabase cast type-workaround; the form has no client-side URL validation beyond type=url; anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/BugReportsPage.tsx

---

## Plan

**One file:** `src/pages/BugReportsPage.tsx` — 3 controls, all className-only.

### (A) Submit button (L141) — RING-ONLY don't-churn ✅
- **AGREE** keep `active:scale-95` + `transition-all` (valid existing, renumber = noise)
- Append: ` focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- No `aria-label` (visible text), no `aria-pressed` (one-shot submit)

### (B)+(C) Inline `<a>` links (L182, L190) — RING + `transition-colors` + `rounded` ✅
- **AGREE** ring + `transition-colors` + `rounded`, no `active:scale` (tiny `text-[11px]` micro-links)
- Append: ` transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded`
- Genuine a11y fix (currently zero focus indicator) — **in scope** (className-only, no logic touch)

### Inventory ✅
- 1 RAW `<button>` (A), 2 `<a>` (B/C), 1 shadcn `<Button>` (back L96 — skip)
- Hero `motion.div` L109 + report-card `motion.div` L165 — presentational ✅
- Form card div L122 — non-interactive container ✅
- `<textarea>` L124 + `<input>` L132 — already ship `focus:ring-rose-500/30` → **LEAVE** ✅
- Loading skeleton L153 — non-interactive ✅

### Responsive @375 ✅
- `max-w-2xl mx-auto px-4` → ~343px inner
- Form: `flex items-center justify-between` — hint `<p>` (~200px) + Submit button (~80px) fits
- Report card: Bug tile 36px + `flex-1 min-w-0` + meta `flex-wrap` — no crush

### Sub-44px targets to FLAG
- Back button `h-10 w-10` (40px)
- Submit button `h-10` (40px)
- Inline `<a>` links (~16px — standard text link, not actionable as standalone tap targets)

### Owner flags (logic/out of scope)
- No tap-to-detail on report cards (only inline page/screenshot links act)
- `supabase as unknown as {...}` type-workaround
- No client-side URL validation beyond `type=url`

---

## Diff

```diff
--- a/src/pages/BugReportsPage.tsx
+++ b/src/pages/BugReportsPage.tsx
@@ -138,7 +138,7 @@ export default function BugReportsPage() {
             <button
               type="button"
               disabled={submitting || description.trim().length < 20}
               onClick={submit}
-              className="h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
+              className="h-10 px-5 rounded-full bg-ig-gradient text-white text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
               {submitting ? "Sending…" : "Submit"}
@@ -179,7 +179,7 @@ export default function BugReportsPage() {
                       {b.page_url && (
                         <>
                           <span>·</span>
-                          <a href={b.page_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">
+                          <a href={b.page_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                             <ExternalLink className="h-2.5 w-2.5" /> page
                           </a>
                         </>
@@ -187,7 +187,7 @@ export default function BugReportsPage() {
                       {b.screenshot_url && (
                         <>
                           <span>·</span>
-                          <a href={b.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground">
+                          <a href={b.screenshot_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded">
                             <ImageIcon className="h-2.5 w-2.5" /> screenshot
                           </a>
                         </>
```

---

## Verify & deploy

```bash
npm run update    # must pass (type-check + worker + build)
```

**3 ins / 3 del, 0 logic lines touched.** Ready for owner to commit.
