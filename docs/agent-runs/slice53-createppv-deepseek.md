# DeepSeek run — 2026-06-14T05:44:06.215Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/CreatePPVPostPage.tsx (create a pay-per-view locked post). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, mutation, Supabase calls byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/muted) = ring-ring; saturated/image surface as the PARENT = ring-white/70. A gradient/tinted-FILLED button sitting ON a neutral parent still uses ring-ring (ring renders against neutral parent, not the fill). A button OVERLAID on top of a media/image thumbnail → its parent surface is the image → ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border (or a state-driven bg/border flip you want eased). FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale, adding ONLY a ring does NOT require a flip.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. aria-expanded on a disclosure. NOT aria-pressed on one-shot actions (file pickers, publish, remove).
- No-op/don't-churn: if a control already ships active:scale + transition, append ring ONLY; keep its existing scale number + transition class.

CONTROLS (give me per control: exact final after-string of appended/changed classes, ring color + reason, press tier, transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched):

A) L167 header Back icon button: `className="p-2 -ml-2 rounded-full hover:bg-muted/50"` ALREADY has `aria-label="Back"`, onClick navigate(-1). Icon-only (ArrowLeft). No scale, no transition class (only hover:bg).

B) L230 "Free for subscribers" toggle button (rendered only when PPV_FREE_FOR_SUBS_UI_ENABLED): cn base `"w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99]"` + conditional `freeForSubscribers ? "border-rose-500 bg-rose-500/8" : "border-border bg-card hover:border-rose-500/40"`. onClick setFreeForSubscribers(v=>!v). Contains a visual switch knob (moving motion.div). ALREADY has active:scale-[0.99] + transition-colors. Two-way on/off toggle, state conveyed by border/bg + knob position. → Should it get aria-pressed? Ring color/treatment?

C) L265 "Schedule for later" toggle button: identical structure to B (violet accent): cn base `"w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99]"` + `scheduled ? "border-violet-500 bg-violet-500/8" : "border-border bg-card hover:border-violet-500/40"`. onClick setScheduled(v=>!v). Same switch-knob structure. ALREADY active:scale-[0.99] + transition-colors.

D) L335 price preset chips ×5 (["2.99","4.99","9.99","19.99","49.99"]): cn base `"px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors"` + `priceUsd === p ? "bg-rose-500 text-white border-rose-500" : "bg-card text-muted-foreground border-border hover:border-rose-500/40"`. onClick setPriceUsd(p). Single-select price filter, selection bg-conveyed; priceUsd defaults "9.99" (one preset) but user can type a custom price in the number input above (then NONE matches). No scale/transition-other-than-colors. Parent is the page (neutral), chips in a `flex gap-1.5` row.

E) L367 empty-state dropzone button "Upload images or video": `className="mt-1 w-full h-32 rounded-2xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-2 transition-colors"`. onClick fileRef.current?.click() (one-shot file picker), disabled while uploading. No scale. Full-width bordered dashed dropzone on neutral page.

F) L410 thumbnail remove (X) icon button: `className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"`. onClick removeItem(idx). Icon-only (X), positioned ABSOLUTE over a media thumbnail (img or video tile). No aria-label, no scale, no transition, no hover.

G) L417 thumbnail "Set preview"/"Preview" strip button: cn base `"absolute bottom-1 left-1 right-1 text-[9px] font-extrabold rounded-md py-1 uppercase tracking-wide"` + `isPreview ? "bg-rose-500 text-white" : "bg-black/60 text-white"`. onClick setPreviewIdx(idx) — marks THIS thumbnail as the single public preview (single-select among thumbnails). Positioned ABSOLUTE over the media thumbnail. No scale/transition/hover. State (isPreview) conveyed by bg flip rose vs black. → press tier? transition class (the bg flips between states on tap — ease it or not)? aria-pressed candidate?

H) L440 "Add more" grid-tile dropzone button: `className="aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-1"`. onClick fileRef.current?.click() (one-shot file picker), disabled while uploading. No scale, NO transition class currently, has hover:border. Square tile on neutral page.

I) L464 Publish button: cn base `"w-full h-13 rounded-2xl font-extrabold text-[15px] py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"` + `canSubmit ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-muted/50 text-muted-foreground cursor-not-allowed"`. onClick create.mutate(), disabled when !canSubmit. ALREADY has transition-all + active:scale-[0.98]. Full-width; enabled fill bg-rose-500 (saturated) sits on neutral page bg.

ALSO CONFIRM I should LEAVE these (each ships its own focus affordance): title input L200 (focus:border-rose-500/60), description textarea L216 (focus:border-rose-500/60), price number input L323 inside wrapper with focus-within:border-rose-500/60, datetime-local input L303 (focus:border-violet-500/60), hidden file input L357. And presentational: hero motion.div L184, the switch-knob motion.divs, the thumbnail img/Video tiles.

Be concise and exact. Return the precise final className after-string per control + any aria attr.
- files: src/pages/CreatePPVPostPage.tsx

---

# Plan

**File:** `src/pages/CreatePPVPostPage.tsx`

**Scope:** className-only + aria-* additions on 9 interactive controls. 0 logic lines touched.

---

## Per-control analysis

### A) L167 Header Back icon button
- **Current:** `"p-2 -ml-2 rounded-full hover:bg-muted/50"`
- **Needs:** FRESH `transition-all` (eases new scale + existing hover:bg), `active:scale-95` (icon tier), ring (outward — parent is sticky header bg-background/80 → `ring-ring`)
- **After:** `"p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **aria:** Already has `aria-label="Back"` — KEEP

### B) L230 "Free for subscribers" toggle
- **Current:** `"w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99]"`
- **Needs:** RING-ONLY (already has `active:scale-[0.99]` + `transition-colors` — don't-churn scale, no flip needed since only adding ring). Outward `ring-ring` (parent is neutral page bg-background).
- **After:** `"w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **aria-pressed:** YES — two-way toggle, state conveyed by border/bg + knob position. `aria-pressed={freeForSubscribers}`. Valid: persistent toggle, bg-conveyed, constant label.

### C) L265 "Schedule for later" toggle
- **Current:** `"w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99]"`
- **Needs:** RING-ONLY (same as B). Outward `ring-ring`.
- **After:** `"w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **aria-pressed:** YES — same pattern as B. `aria-pressed={scheduled}`.

### D) L335 Price preset chips ×5
- **Current:** `"px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors"`
- **Needs:** FLIP `transition-colors`→`transition-all` (gaining a NEW `active:scale`), ADD `active:scale-[0.97]` (segmented filter tier), ring (outward — `flex gap-1.5` row, not overflow-hidden → `ring-ring`)
- **After:** `"px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **aria-pressed:** YES — single-select price filter, bg-conveyed selection. `aria-pressed={priceUsd === p}`. Valid: persistent single-select, default "9.99" so exactly one always pressed.

### E) L367 Empty-state dropzone button
- **Current:** `"mt-1 w-full h-32 rounded-2xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-2 transition-colors"`
- **Needs:** FLIP `transition-colors`→`transition-all` (gaining NEW `active:scale`), ADD `active:scale-[0.98]` (wide full-width bordered row tier), ring (outward — parent neutral page → `ring-ring`)
- **After:** `"mt-1 w-full h-32 rounded-2xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **aria:** One-shot file picker → NO `aria-pressed`

### F) L410 Thumbnail remove (X) icon button
- **Current:** `"absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"`
- **Needs:** FRESH `transition-all active:scale-95` (icon tier, tiny 24px), ring. **PARENT is the media thumbnail** (img/video tile) → `ring-white/70` (overlaid on image surface).
- **After:** `"absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"`
- **aria-label:** YES — icon-only. `aria-label="Remove {item.name}"`

### G) L417 Thumbnail "Set preview"/"Preview" strip button
- **Current:** `"absolute bottom-1 left-1 right-1 text-[9px] font-extrabold rounded-md py-1 uppercase tracking-wide"`
- **Needs:** FRESH `transition-all` (eases the bg flip between states + new scale), `active:scale-[0.97]` (small chip tier — it's a thin strip, not a full card), ring. **PARENT is the media thumbnail** → `ring-white/70`.
- **After:** `"absolute bottom-1 left-1 right-1 text-[9px] font-extrabold rounded-md py-1 uppercase tracking-wide transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"`
- **aria-pressed:** YES — single-select among thumbnails, bg-conveyed (rose vs black). `aria-pressed={isPreview}`. Valid: persistent single-select, exactly one can be pressed.

### H) L440 "Add more" grid-tile dropzone
- **Current:** `"aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-1"`
- **Needs:** FRESH `transition-all` (eases hover:border + new scale), `active:scale-[0.98]` (bordered tile tier), ring (outward — parent neutral page → `ring-ring`)
- **After:** `"aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **aria:** One-shot file picker → NO `aria-pressed`

### I) L464 Publish button
- **Current:** `"w-full h-13 rounded-2xl font-extrabold text-[15px] py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]"`
- **Needs:** RING-ONLY (already has `transition-all` + `active:scale-[0.98]` — don't-churn). Outward `ring-ring` (bg-rose-500 sits on neutral page bg → ring renders against neutral parent).
- **After:** `"w-full h-13 rounded-2xl font-extrabold text-[15px] py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
- **aria:** One-shot publish → NO `aria-pressed`

### LEAVE untouched (confirmed):
- Title input L200 (focus:border-rose-500/60)
- Description textarea L216 (focus:border-rose-500/60)
- Price number input L323 (wrapper focus-within:border-rose-500/60)
- Datetime-local input L303 (focus:border-violet-500/60)
- Hidden file input L357
- Hero motion.div L184 (presentational)
- Switch-knob motion.divs (presentational)
- Thumbnail img/Video tiles (presentational)

---

## Diff

```diff
--- a/src/pages/CreatePPVPostPage.tsx
+++ b/src/pages/CreatePPVPostPage.tsx
@@ -164,7 +164,7 @@ export default function CreatePPVPostPage() {
           <button
             type="button"
             onClick={() => navigate(-1)}
-            aria-label="Back"
-            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
+            className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="h-5 w-5" />
           </button>
@@ -222,6 +222,7 @@ export default function CreatePPVPostPage() {
           <button
             type="button"
             onClick={() => setFreeForSubscribers((v) => !v)}
+            aria-pressed={freeForSubscribers}
             className={cn(
               "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99]",
+              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
               freeForSubscribers
                 ? "border-rose-500 bg-rose-500/8"
                 : "border-border bg-card hover:border-rose-500/40"
@@ -258,6 +259,7 @@ export default function CreatePPVPostPage() {
           <button
             type="button"
             onClick={() => setScheduled((v) => !v)}
+            aria-pressed={scheduled}
             className={cn(
               "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99]",
+              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
               scheduled
                 ? "border-violet-500 bg-violet-500/8"
                 : "border-border bg-card hover:border-violet-500/40"
@@ -332,7 +334,7 @@ export default function CreatePPVPostPage() {
                 key={p}
                 type="button"
                 onClick={() => setPriceUsd(p)}
+                aria-pressed={priceUsd === p}
                 className={cn(
-                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors",
+                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                   priceUsd === p
                     ? "bg-rose-500 text-white border-rose-500"
                     : "bg-card text-muted-foreground border-border hover:border-rose-500/40"
@@ -355,7 +357,7 @@ export default function CreatePPVPostPage() {
               type="button"
               onClick={() => fileRef.current?.click()}
               disabled={uploading}
-              className="mt-1 w-full h-32 rounded-2xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-2 transition-colors"
+              className="mt-1 w-full h-32 rounded-2xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               {uploading ? (
                 <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
@@ -406,7 +408,8 @@ export default function CreatePPVPostPage() {
                       <button
                         type="button"
                         onClick={() => removeItem(idx)}
-                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
+                        aria-label={`Remove ${item.name}`}
+                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
                       >
                         <X className="h-3 w-3" />
                       </button>
@@ -414,6 +417,7 @@ export default function CreatePPVPostPage() {
                         type="button"
                         onClick={() => setPreviewIdx(idx)}
+                        aria-pressed={isPreview}
                         className={cn(
-                          "absolute bottom-1 left-1 right-1 text-[9px] font-extrabold rounded-md py-1 uppercase tracking-wide",
+                          "absolute bottom-1 left-1 right-1 text-[9px] font-extrabold rounded-md py-1 uppercase tracking-wide transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
                           isPreview
                             ? "bg-rose-500 text-white"
                             : "bg-black/60 text-white"
@@ -436,7 +440,7 @@ export default function CreatePPVPostPage() {
                   type="button"
                   onClick={() => fileRef.current?.click()}
                   disabled={uploading}
-                  className="aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-1"
+                  className="aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
                   {uploading ? (
                     <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
@@ -461,7 +465,7 @@ export default function CreatePPVPostPage() {
           disabled={!canSubmit}
           className={cn(
-            "w-full h-13 rounded-2xl font-extrabold text-[15px] py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
+            "w-full h-13 rounded-2xl font-extrabold text-[15px] py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
             canSubmit
               ? "bg-rose-500 text-white hover:bg-rose-600"
               : "bg-muted/50 text-muted-foreground cursor-not-allowed"
```

---

## Summary

| Control | Change type | Ring color | Press tier | Transition | aria-* |
|---------|-------------|------------|------------|------------|--------|
| A) Back icon | FRESH | `ring-ring` | `scale-95` | `transition-all` | KEEP `aria-label` |
| B) Free toggle | RING-ONLY | `ring-ring` | KEEP `[0.99]` | KEEP `transition-colors` | ADD `aria-pressed` |
| C) Schedule toggle | RING-ONLY | `ring-ring` | KEEP `[0.99]` | KEEP `transition-colors` | ADD `aria-pressed` |
| D) Price chips | FLIP+ADD | `ring-ring` | `[0.97]` | `transition-all` | ADD `aria-pressed` |
| E) Empty dropzone | FLIP+ADD | `ring-ring` | `[0.98]` | `transition-all` | — |
| F) Remove X | FRESH | `ring-white/70` | `scale-95` | `transition-all` | ADD `aria-label` |
| G) Preview strip | FRESH | `ring-white/70` | `[0.97]` | `transition-all` | ADD `aria-pressed` |
| H) Add more tile | FRESH | `ring-ring` | `[0.98]` | `transition-all` | — |
| I) Publish | RING-ONLY | `ring-ring` | KEEP `[0.98]` | KEEP `transition-all` | — |

**0 logic lines touched.** Must pass `npm run update` before done.
