# DeepSeek run — 2026-06-14T08:26:05.555Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/account/AccountAnalyticsPage.tsx (342-line "Analytics" — profile/engagement analytics at /account/analytics. REAL Supabase + @tanstack/react-query: 3 useQuery (profile stats over follows/user_posts/profile_views/post_likes; follower-growth bucketed; top-posts by metric+bucket over analytics_events); useState period/topBucket/topMetric; useMemo range via getBucketRange. Layout: a sticky header [raw icon Back + "Analytics" + a 3-chip PERIOD filter row (7d/30d/90d)] + a body [a 2-col metrics grid of non-interactive stat cards + a "Top Posts" panel (a section with a 2-chip BUCKET filter [Today/This week] + a 4-chip horizontally-scrolling METRIC filter [Likes/Comments/Shares/Saves] + a divide-y list of clickable top-post rows) + a non-interactive follower-growth bar chart]. RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setPeriod/setTopBucket/setTopMetric, useQuery keys, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button> (own tokens). Don't add role/tabIndex/onKeyDown. Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). The house ring COLOR token is `ring-ring` (black). OUTWARD default. `focus-visible:ring-inset` ONLY when control is a flush edge child of a rounded overflow-hidden PARENT, OR a flush media tile in a near-gapless grid.
- Ring color: --ring resolves BLACK. OUTWARD ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/IMAGE surface AS THE PARENT (or ring over media) = ring-white/70. A gradient/tinted-FILLED chip (bg-ig-gradient / a faint bg-rose-500/10 tint) selected-state on a NEUTRAL parent still uses ring-ring (the OUTWARD ring renders against the neutral parent, NOT the chip's own fill). For an INSET ring it renders over the control's OWN surface — an image-dominant tile → ring-white/70; a neutral bg-card row (text + a SMALL thumbnail, NOT image-dominant) → ring-ring.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab/single-select picker active:scale-[0.97]; wide full-width row/button WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]. Don't renumber an existing scale.
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. ALREADY bare `transition` (Tailwind's `transition` covers transform+colors+opacity+shadow) → covers a new scale, leave as-is. Adding ONLY a focus ring (no new animated prop) → leave the existing transition class as-is.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav). For custom tabs without role=tablist/tab structure, aria-pressed is the house pattern.

CONTROLS (give me per control: exact final after-string of appended/changed classes, ring color + reason, press tier, transition class + whether a FLIP/NEW/leave, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L184 HEADER BACK button (raw <button>, icon-only ArrowLeft, one-shot onClick navigate(-1) else navigate("/profile"), ALREADY aria-label="Back", base `h-10 w-10 flex items-center justify-center rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-foreground active:scale-95 transition focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none`). Parent = sticky header `bg-background/95 backdrop-blur-md` (neutral). **KEY DECISION:** this button ALREADY ships a press scale (active:scale-95) + a transition (bare `transition`) + a focus ring — BUT the ring COLOR is the OFF-HOUSE-TOKEN `focus-visible:ring-primary/60` (a 60%-opacity PRIMARY/purple ring), not the house `ring-ring` (black). The input-carveout (leave native `focus:ring-primary/50` on raw <input>/<textarea>) is for FORM FIELDS only — this is a BUTTON. → my plan: MIGRATE the ring color `focus-visible:ring-primary/60` → `focus-visible:ring-ring` (house-standardize the focus ring to the black `ring-ring` token; pure display-only single-token swap, 0 logic; KEEP active:scale-95 [don't renumber], KEEP the bare `transition` [it already covers transform+colors], KEEP outline-none + aria-label="Back"; OUTWARD ring on the neutral header). So the changed segment is ONLY `ring-primary/60`→`ring-ring`. Confirm: MIGRATE ring-primary/60→ring-ring (vs LEAVE) for a BUTTON's off-house focus ring + KEEP everything else (scale-95, bare transition, outline-none, aria).

B) L196 PERIOD filter chip (raw <button>, MAPPED ×3 over ["7d","30d","90d"], single-select filter, selection bg-conveyed `bg-ig-gradient text-white` [active] vs `bg-muted/50 text-muted-foreground` [inactive], one-shot onClick={() => setPeriod(p)}, VISIBLE text; className via cn() with a static arg `px-3 py-1.5 rounded-full text-xs font-medium transition-colors` + the conditional, ALREADY transition-colors, NO scale/focus/aria). Container = `flex gap-1 px-4 pb-2` in the sticky header (neutral). → my plan: ADD `aria-pressed={period === p}` + APPEND into the cn() static arg `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` AND FLIP `transition-colors`→`transition-all` (segmented-filter tier [0.97]; FLIP REQUIRED — gains a new active:scale transform NOT covered by transition-colors, and the bg-ig-gradient selection wash must keep animating; OUTWARD ring-ring — the bg-ig-gradient selected fill renders the OUTWARD ring against the neutral header; aria-pressed — persistent single-select bg-conveyed filter; single edit hits all 3). Confirm FLIP + [0.97] + aria-pressed + OUTWARD ring-ring.

C) L239 BUCKET filter chip (raw <button>, MAPPED ×2 over [{today},{this_week}], single-select filter, selection bg-conveyed `bg-ig-gradient text-white` vs `bg-muted/50 text-muted-foreground`, one-shot onClick={() => setTopBucket(b.id)}, VISIBLE text; className via cn() static arg `px-3 py-1.5 rounded-full text-xs font-medium transition-colors` + conditional, ALREADY transition-colors, NO scale/focus/aria). Container = `flex gap-1 mt-3` inside the Top Posts panel header (the panel `section` is `rounded-2xl bg-card`, neutral). → my plan: identical to B — ADD `aria-pressed={topBucket === b.id}` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the cn() static arg AND FLIP `transition-colors`→`transition-all` (segmented-filter [0.97]; FLIP REQUIRED; OUTWARD ring-ring — bg-ig-gradient fill on the neutral bg-card panel header; single edit hits both). Confirm identical-to-B FLIP treatment.

D) L257 METRIC filter chip (raw <button>, MAPPED ×4 over TOP_METRICS, single-select filter, selection bg-conveyed `cn(m.bg, m.color)` [active: a FAINT tint e.g. bg-rose-500/10 text-rose-500] vs `bg-muted/40 text-muted-foreground`, one-shot onClick={() => setTopMetric(m.id)}, VISIBLE text + a leading metric icon; className via cn() static arg `shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all` + conditional, ALREADY transition-all, NO scale/focus/aria). Container = `flex gap-1 mt-2 overflow-x-auto -mx-1 px-1` (a HORIZONTAL-SCROLL chip strip with -mx-1 px-1 padding) inside the panel header (bg-card). → my plan: ADD `aria-pressed={topMetric === m.id}` [the file computes `const active = topMetric === m.id`] + APPEND into the cn() static arg `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` with NO FLIP (segmented-filter [0.97]; ALREADY transition-all → append without flipping; OUTWARD ring-ring — the faint bg-tint selected fill renders the OUTWARD ring against the neutral bg-card panel header, NOT the chip's own faint tint; single edit hits all 4). **Resolve the ring-inset-vs-outward question:** the chip strip is `overflow-x-auto` (so overflow-y computes to auto/clip too) with `-mx-1 px-1` (4px) padding — a 2px OUTWARD ring on a chip renders within the px-1 padding horizontally, but could a top/bottom 2px outward ring be clipped by the overflow-y? These are PILL chips (rounded-full), NOT flush media tiles and NOT flush edge children of a rounded overflow-hidden parent → by the inset rule they are NOT inset candidates → OUTWARD ring-ring (consistent with B/C); the px-1 + the chips' own py-1.5 give the ring room. Confirm: aria-pressed + [0.97] + NO-flip (already transition-all) + OUTWARD ring-ring (pill chip in a scroller is NOT an inset case).

E) L287 TOP-POST ROW button (raw <button>, MAPPED over topPosts, one-shot onClick={() => navigate(`/reels?post=${post.id}`)}, base `w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/40 transition-colors text-left`, ALREADY hover:bg-muted/30 + active:bg-muted/40 [press via BACKGROUND wash] + transition-colors, NO scale/focus/aria; CONTAINS a rank# <span> + a SMALL `h-12 w-12` thumbnail <img>/<Calendar> + caption + media_type + a metric-count badge). PARENT = the divide-y list inside the Top Posts `section` `rounded-2xl bg-card border overflow-hidden`; the rows are FLUSH full-width children of the overflow-hidden section (flush to its left/right edges; the first/last row flush to top/bottom). → my plan: ring-ONLY append (DON'T add a scale — the row ALREADY presses via active:bg-muted/40; adding a scale would be a SECOND competing press; adding ONLY a ring = no new animated prop → leave hover:bg-muted/30 + active:bg-muted/40 + transition-colors as-is, NO flip). Ring placement: `focus-visible:ring-inset` — the row is a FLUSH full-width child of the rounded-2xl OVERFLOW-HIDDEN section, so an OUTWARD ring would be CLIPPED on the left/right (and top/bottom for the end rows); inset is correct. Ring color: the INSET ring renders over the control's OWN surface = the bg-card row (text + a SMALL h-12 thumbnail — NOT image-dominant) → `ring-ring` (NOT ring-white/70). So APPEND `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm: ring-inset (overflow-hidden section parent) + ring-ring (neutral bg-card row, NOT ring-white/70) + ring-only (KEEP hover/active bg + transition-colors, NO scale, NO flip) + no aria.

ALSO CONFIRM I should LEAVE these: the metrics-grid stat cards <div> L214 (non-interactive — no onClick); the follower-growth chart bar <div>s L324 (non-interactive presentational, title tooltips); ZivoMobileNav L339 (own file); the Top Posts panel <section>/<header>/<h2>/<h3> + count badges + caption/media-type <p>s + the timeZone <span> (non-interactive); the post thumbnail <img> (decorative alt="") + Calendar fallback; ArrowLeft/Eye/Heart/Users/TrendingUp/BarChart3/Calendar/MessageCircle/Send/Bookmark icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. 5 raw buttons: A back (MIGRATE the off-house ring-primary/60→ring-ring, KEEP scale-95/transition/aria), B period ×3 + C bucket ×2 (both FLIP transition-colors→transition-all + aria-pressed + [0.97] + OUTWARD ring-ring on bg-ig-gradient), D metric ×4 (aria-pressed + [0.97] + NO flip [already transition-all] + OUTWARD ring-ring, pill-in-scroller is NOT an inset case), E top-post row (ring-ONLY, ring-inset [flush child of overflow-hidden section] + ring-ring [neutral card row], KEEP active:bg + transition-colors, no scale). Resolve especially: A MIGRATE-vs-LEAVE the button's off-house focus ring; B/C the transition-colors→transition-all FLIP + aria-pressed; D OUTWARD-vs-inset for a pill chip in an overflow-x-auto scroller; E ring-inset + ring-ring (neutral row) + no competing scale.
- files: src/pages/account/AccountAnalyticsPage.tsx

---

# Plan

**5 raw `<button>` controls** in `src/pages/account/AccountAnalyticsPage.tsx` need the premium interaction + a11y pass:

| Control | Lines | Action |
|---------|-------|--------|
| **A** Header Back | 184 | MIGRATE `ring-primary/60`→`ring-ring` (off-house token fix). KEEP `scale-95`, bare `transition`, `aria-label`. |
| **B** Period filter ×3 | 196 | FLIP `transition-colors`→`transition-all` + ADD `aria-pressed` + `active:scale-[0.97]` + focus ring. |
| **C** Bucket filter ×2 | 239 | Same as B. |
| **D** Metric filter ×4 | 257 | ADD `aria-pressed` + `active:scale-[0.97]` + focus ring. NO FLIP (already `transition-all`). |
| **E** Top-post row ×N | 287 | Ring-ONLY: `ring-inset` + `ring-ring`. NO scale (already `active:bg-muted/40`). KEEP `transition-colors`. |

---

# Diff

```diff
--- a/src/pages/account/AccountAnalyticsPage.tsx
+++ b/src/pages/account/AccountAnalyticsPage.tsx
@@ -181,7 +181,7 @@ export default function AccountAnalyticsPage() {
           <button
             type="button"
             aria-label="Back"
-            onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/profile"); }}
-            className="h-10 w-10 flex items-center justify-center rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-foreground active:scale-95 transition focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:outline-none"
+            onClick={() => { if (window.history.length > 1) navigate(-1); else navigate("/profile"); }}
+            className="h-10 w-10 flex items-center justify-center rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-foreground active:scale-95 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
           >
             <ArrowLeft className="h-5 w-5" />
           </button>
@@ -192,7 +192,7 @@ export default function AccountAnalyticsPage() {
           {(["7d", "30d", "90d"] as Period[]).map((p) => (
             <button type="button"
               key={p}
               onClick={() => setPeriod(p)}
-              className={cn(
-                "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
+              aria-pressed={period === p}
+              className={cn(
+                "px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 period === p ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
               )}
             >
@@ -233,7 +233,7 @@ export default function AccountAnalyticsPage() {
               {([
                 { id: "today" as Bucket, label: "Today" },
                 { id: "this_week" as Bucket, label: "This week" },
               ]).map((b) => (
                 <button type="button"
                   key={b.id}
                   onClick={() => setTopBucket(b.id)}
-                  className={cn(
-                    "px-3 py-1.5 rounded-full text-xs font-medium transition-colors",
+                  aria-pressed={topBucket === b.id}
+                  className={cn(
+                    "px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     topBucket === b.id ? "bg-ig-gradient text-white" : "bg-muted/50 text-muted-foreground"
                   )}
                 >
@@ -253,7 +253,7 @@ export default function AccountAnalyticsPage() {
                 return (
                   <button type="button"
                     key={m.id}
                     onClick={() => setTopMetric(m.id)}
+                    aria-pressed={active}
                     className={cn(
-                      "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all",
+                      "shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                       active ? cn(m.bg, m.color) : "bg-muted/40 text-muted-foreground"
                     )}
                   >
@@ -284,7 +284,7 @@ export default function AccountAnalyticsPage() {
               <button type="button"
                 key={post.id}
                 onClick={() => navigate(`/reels?post=${post.id}`)}
-                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/40 transition-colors text-left"
+                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/40 transition-colors text-left focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
```

---

# Per-control summary

| Ctrl | Final className after-string | Ring | Press | Transition | Aria |
|------|------------------------------|------|-------|------------|------|
| **A** | `h-10 w-10 flex items-center justify-center rounded-full border border-border/60 bg-muted/40 hover:bg-muted text-foreground active:scale-95 transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none` | OUTWARD `ring-ring` (neutral header parent) — **MIGRATED** from `ring-primary/60` | `scale-95` (kept) | bare `transition` (kept — covers transform+colors) | `aria-label="Back"` (kept) |
| **B** | `px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD `ring-ring` (bg-ig-gradient fill on neutral header parent) | `[0.97]` (new) | **FLIP** `transition-colors`→`transition-all` | `aria-pressed={period === p}` (new) |
| **C** | `px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD `ring-ring` (bg-ig-gradient fill on neutral bg-card panel) | `[0.97]` (new) | **FLIP** `transition-colors`→`transition-all` | `aria-pressed={topBucket === b.id}` (new) |
| **D** | `shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | OUTWARD `ring-ring` (faint bg-tint fill on neutral bg-card panel — pill in scroller is NOT an inset case) | `[0.97]` (new) | NO FLIP (already `transition-all`) | `aria-pressed={active}` (new) |
| **E** | `w-full flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 active:bg-muted/40 transition-colors text-left focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | **INSET** `ring-ring` (flush child of `overflow-hidden` section; neutral bg-card row, NOT image-dominant) | **NONE** (already `active:bg-muted/40` — no competing scale) | NO FLIP (ring-only — leave `transition-colors`) | none |

---

# Key decisions resolved

**A — MIGRATE `ring-primary/60`→`ring-ring`**: Yes. This is a `<button>`, not a form input. The off-house `ring-primary/60` (purple, 60% opacity) is a legacy token. House standard is `ring-ring` (black). Pure display-only single-token swap, 0 logic.

**B/C — FLIP `transition-colors`→`transition-all`**: Yes. Both gain a new `active:scale-[0.97]` transform not covered by `transition-colors`. The `bg-ig-gradient` selection wash must keep animating. FLIP required.

**D — OUTWARD `ring-ring` (not inset)**: Correct. These are pill chips in an `overflow-x-auto` scroller with `-mx-1 px-1` (4px) padding. They are NOT flush edge children of a rounded `overflow-hidden` parent. The 2px outward ring has room within the padding. Not an inset case.

**E — `ring-inset` + `ring-ring` (not `ring-white/70`)**: Correct. The row is a flush full-width child of the `rounded-2xl overflow-hidden` section — outward ring would clip. Inset renders over the row's own surface, which is a neutral `bg-card` row with text + a small `h-12` thumbnail — NOT image-dominant → `ring-ring`, not `ring-white/70`. No competing scale added (row already presses via `active:bg-muted/40`).

---

# Verify

Run `npm run update` before marking done. The diff touches 5 className strings + 3 `aria-pressed` attrs + 1 `aria-label` kept. Zero logic lines changed.
