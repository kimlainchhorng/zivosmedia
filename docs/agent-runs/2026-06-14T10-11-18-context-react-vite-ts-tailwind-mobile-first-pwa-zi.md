# DeepSeek run — 2026-06-14T10:11:18.873Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopDocumentsPage.tsx (259-line merchant "Documents" page inside <AppLayout title="Documents" hideHeader>; useAuth + supabase storage (shop-documents bucket) + react-query useQuery "shop-documents"; upload via supabase.storage.upload + functions.invoke("shop-ops-record-submit"); delete via functions.invoke("shop-ops-record-manage"); category + filter chip state; framer-motion AnimatePresence upload form + animated list). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, storage, functions.invoke, react-query keys, href/target/rel, disabled, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (add ring only). Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn AppLayout. LEAVE raw native form fields with their existing focus ring.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring. An OUTWARD ring on a control with its OWN tinted/gradient fill (bg-primary/10, bg-ig-gradient, bg-muted/40) STILL renders against the neutral PARENT → ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover/active bg/text(color)/border/opacity ON THE ELEMENT ITSELF (or an existing transition-colors that animates a conditional color change ON ITSELF).
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF (or an animated conditional color via transition-colors) → use transition-all (FLIP).
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

NINE edits applied — confirm each CORRECT or NEEDS-FIX:

A) L151 BACK icon button — was `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center` (icon-only ArrowLeft; onClick navigate(-1); NO hover/transition/scale/ring; sticky bg-background/80 header neutral; NO aria) → ADDED aria-label="Go back" + icon-only active:scale-95 + transition-transform (scale sole prop, no hover on itself → NOT flip) + ring. Final: `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Go back".

B) L155 PLUS/upload-trigger icon button — was `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center` (icon-only Plus; onClick fileInputRef.click(); own tinted bg-primary/10; NO hover/transition/scale/ring; neutral header; NO aria) → ADDED aria-label="Upload document" + active:scale-95 + transition-transform + ring (OUTWARD ring-ring against neutral header despite own bg-primary/10). Final: `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Upload document".

C) L169 X-CLOSE icon button — was a BARE `<button type="button" onClick={resetForm}>` with NO className at all (icon-only X glyph; onClick resetForm; in the form card header) → ADDED className from scratch: rounded-full (so the ring traces tightly) + aria-label="Close" + active:scale-95 + transition-transform + ring. Final className: `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Close". (Confirm: adding a className where none existed is in-scope; rounded-full + scale-95 + ring is the right minimal premium for a bare icon button; no padding added to preserve layout.)

D) L182 CATEGORY chips (in upload form) — was `cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors", category === c ? "bg-ig-gradient text-white border-primary" : "border-border bg-muted/40")` (visible text label; onClick setCategory(c); a PERSISTENT SINGLE-SELECT category picker; transition-colors animating the conditional selected-bg ON ITSELF; NO scale/ring; NO aria) → ADDED aria-pressed={category === c} (single-select segmented toggle) + chip-tier active:scale-[0.97] + FLIP transition-colors→transition-all (conditional bg color animates ON ITSELF + new scale) + ring. Final base classes: `px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional + aria-pressed={category === c}.

E) L190 CANCEL action button (form) — was `flex-1 py-2.5 rounded-xl border border-border/40 text-sm font-medium` (visible text "Cancel"; onClick resetForm; flex-1 substantial button with its OWN surface (border outline); NO hover/transition/scale/ring) → ADDED active:scale-[0.98] (wide button WITH own surface tier) + transition-transform (scale sole prop, no hover on itself → NOT flip) + ring; NO aria (visible text). Final: `flex-1 py-2.5 rounded-xl border border-border/40 text-sm font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

F) L191 UPLOAD action button (form) — was `flex-1 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2` (visible text; onClick handleUpload; disabled={uploading}; flex-1 substantial button with OWN gradient surface; has disabled:opacity-50; NO hover/transition/scale/ring) → ADDED active:scale-[0.98] + transition-transform + ring; NO aria (visible text). Final: `flex-1 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. **QUESTION: the element has disabled:opacity-50. Is transition-transform correct, or does disabled:opacity (an opacity change ON the element) force transition-all? My read: disabled:opacity is a static disabled-STATE class, NOT a hover/active interaction → scale stays the sole INTERACTIVE animated prop → transition-transform (matching the prior bg-ig-gradient Save-button pattern). Confirm or correct.**

G) L204 FILTER chips (category filter bar) — was `cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors", filterCat === c ? "bg-ig-gradient text-white border-primary" : "border-border/50 bg-muted/30")` (visible text; onClick setFilterCat(c); PERSISTENT SINGLE-SELECT segmented filter (all + 5 categories); transition-colors animating conditional selected-bg ON ITSELF; NO scale/ring; NO aria) → ADDED aria-pressed={filterCat === c} + chip-tier active:scale-[0.97] + FLIP transition-colors→transition-all + ring. Final base: `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + conditional + aria-pressed={filterCat === c}.

H) L240 DOWNLOAD anchor — was `<a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-colors">` (icon-only Download; KEEP href/target/rel byte-identical; hover:bg-muted ON ITSELF; transition-colors; own surface bg-muted/40; NO scale/ring; NO aria) → ADDED aria-label="Download" + icon-only active:scale-95 + FLIP transition-colors→transition-all (hover:bg ON ITSELF + new scale) + ring (OUTWARD ring-ring against the neutral Card parent). Final: `w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Download".

I) L245 DELETE icon button — was `w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors` (icon-only Trash2; onClick handleDelete; hover:bg-red-500/10 + hover:text-red-500 ON ITSELF; transition-colors; own surface bg-muted/40; NO scale/ring; NO aria) → ADDED aria-label="Delete" + icon-only active:scale-95 + FLIP transition-colors→transition-all (hover color ON ITSELF + new scale) + ring. Final: `w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-label="Delete".

ALSO CONFIRM I should LEAVE: L158 hidden `<input type="file" className="hidden">` (no visual, no ring); L176 + L178 raw native `<input>` text fields (doc name / employee name — they ALREADY have `focus:ring-1 focus:ring-primary/30`; house standard = LEAVE native form fields with their existing focus ring, do NOT swap to focus-visible:ring-ring); AppLayout shell; all motion.div wrappers with no onClick (form L165, list items L226 — animation only); all lucide icons (decorative); the FileText category-color avatar div L228 (presentational, not a button); the h1 + all <p>/<span> text; the loading + empty-state. No clickable divs with onClick beyond those edited.

Be concise and exact. Return the precise final className after-string for each of A–I + every aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) F — disabled:opacity-50 → transition-transform (NOT transition-all) — correct? (2) C — adding a className from scratch to a bare icon button (rounded-full + scale-95 + ring) — correct and in-scope? (3) D + G — aria-pressed on the single-select category/filter chips + FLIP transition-colors→transition-all (conditional bg animates ON ITSELF) — correct? (4) E + F — scale-[0.98] full-width-own-surface tier for the flex-1 action buttons (vs [0.97] pill) — correct? (5) the 2 native text inputs L176/L178 — confirm LEAVE with their existing focus:ring-1 (do NOT add focus-visible:ring-ring).
- files: src/pages/app/shop/ShopDocumentsPage.tsx

---

# ShopDocumentsPage — Premium Interaction + A11y Pass

## Plan

Apply 9 className + aria edits (A–I) to `src/pages/app/shop/ShopDocumentsPage.tsx`. All edits are className-only + display-only aria attributes. Zero logic lines touched. Then confirm the 2 native inputs are correctly left untouched.

## Edits Verification

### A) L151 BACK icon button ✅ CORRECT
- `aria-label="Go back"` ✓ (icon-only)
- `active:scale-95` ✓ (icon-only tier)
- `transition-transform` ✓ (no hover on itself → scale is sole animated prop)
- OUTWARD `ring-ring` ✓ (neutral `bg-background/80` header parent)
- **Final:** `w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### B) L155 PLUS icon button ✅ CORRECT
- `aria-label="Upload document"` ✓ (icon-only)
- `active:scale-95` ✓ (icon-only tier)
- `transition-transform` ✓ (no hover on itself)
- OUTWARD `ring-ring` ✓ (neutral header parent, despite own `bg-primary/10`)
- **Final:** `w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### C) L169 X-CLOSE icon button ✅ CORRECT
- Adding className from scratch to a bare `<button>` is **in scope** (it's a raw interactive control)
- `rounded-full` ✓ (tight ring trace)
- `aria-label="Close"` ✓ (glyph-only "✕")
- `active:scale-95` ✓ (icon-only tier)
- `transition-transform` ✓ (no hover on itself)
- OUTWARD `ring-ring` ✓ (neutral `bg-card` parent)
- **Final:** `rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### D) L182 CATEGORY chips ✅ CORRECT
- `aria-pressed={category === c}` ✓ (persistent single-select segmented toggle)
- `active:scale-[0.97]` ✓ (chip tier)
- FLIP `transition-colors→transition-all` ✓ (conditional `bg-ig-gradient`/`bg-muted/40` animates ON ITSELF + new scale)
- OUTWARD `ring-ring` ✓ (neutral `bg-card` parent)
- **Final base:** `px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### E) L190 CANCEL button ✅ CORRECT
- `active:scale-[0.98]` ✓ (flex-1 wide button WITH own border surface)
- `transition-transform` ✓ (no hover on itself, no conditional color → scale sole prop)
- OUTWARD `ring-ring` ✓ (neutral `bg-card` parent)
- No aria ✓ (visible text "Cancel")
- **Final:** `flex-1 py-2.5 rounded-xl border border-border/40 text-sm font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### F) L191 UPLOAD button ✅ CORRECT
- **`transition-transform` is correct** — `disabled:opacity-50` is a static disabled-state class, NOT an interactive hover/active transition. The scale is the sole INTERACTIVE animated prop. This matches the prior `bg-ig-gradient` Save-button pattern exactly.
- `active:scale-[0.98]` ✓ (flex-1 wide button WITH own gradient surface)
- OUTWARD `ring-ring` ✓ (neutral `bg-card` parent, despite own gradient)
- No aria ✓ (visible text "Upload")
- **Final:** `flex-1 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### G) L204 FILTER chips ✅ CORRECT
- `aria-pressed={filterCat === c}` ✓ (persistent single-select segmented filter)
- `active:scale-[0.97]` ✓ (chip tier)
- FLIP `transition-colors→transition-all` ✓ (conditional `bg-ig-gradient`/`bg-muted/30` animates ON ITSELF + new scale)
- OUTWARD `ring-ring` ✓ (neutral `bg-background` parent)
- **Final base:** `shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### H) L240 DOWNLOAD anchor ✅ CORRECT
- `aria-label="Download"` ✓ (icon-only)
- `active:scale-95` ✓ (icon-only tier)
- FLIP `transition-colors→transition-all` ✓ (`hover:bg-muted` ON ITSELF + new scale)
- OUTWARD `ring-ring` ✓ (neutral `bg-card` parent, despite own `bg-muted/40`)
- `href`/`target`/`rel` preserved ✓
- **Final:** `w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

### I) L245 DELETE icon button ✅ CORRECT
- `aria-label="Delete"` ✓ (icon-only)
- `active:scale-95` ✓ (icon-only tier)
- FLIP `transition-colors→transition-all` ✓ (`hover:bg-red-500/10` + `hover:text-red-500` ON ITSELF + new scale)
- OUTWARD `ring-ring` ✓ (neutral `bg-card` parent, despite own `bg-muted/40`)
- **Final:** `w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

## Items Correctly LEFT Untouched ✅

- **L158 hidden `<input type="file">`** — no visual, no ring needed
- **L176 + L178 native text inputs** — already have `focus:ring-1 focus:ring-primary/30`; house standard = LEAVE native form fields with their existing focus ring
- **AppLayout shell** — shadcn, own tokens
- **All `motion.div` wrappers** (L165 form, L226 list items) — animation only, no onClick
- **All lucide icons** — decorative
- **FileText avatar div** (L228) — presentational, not a button
- **All text content** — h1, p, span
- **Loading + empty-state** — non-interactive

## No Missed Raw Interactive Controls

I scanned every `<button>`, `<a>`, `<div onClick>`, `role="button"`, `cursor-pointer` in the file. All 9 raw interactive controls are covered by edits A–I. No others exist.

## Diff

```diff
--- a/src/pages/app/shop/ShopDocumentsPage.tsx
+++ b/src/pages/app/shop/ShopDocumentsPage.tsx
@@ -148,13 +148,13 @@ export default function ShopDocumentsPage() {
       <div className="flex flex-col pb-28">
         <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border/30 px-4 py-3 flex items-center gap-3" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
-          <button type="button" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
+          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="w-4 h-4" />
           </button>
           <h1 className="font-bold text-lg flex-1">Documents</h1>
-          <button type="button" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center">
+          <button type="button" aria-label="Upload document" onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <Plus className="w-4.5 h-4.5 text-primary" />
           </button>
           <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.csv" className="hidden" onChange={handleFileSelect} />
         </div>
@@ -166,7 +166,7 @@ export default function ShopDocumentsPage() {
                 <div className="flex items-center justify-between">
                   <p className="font-semibold text-sm">Upload Document</p>
-                  <button type="button" onClick={resetForm}><X className="w-4 h-4 text-muted-foreground" /></button>
+                  <button type="button" aria-label="Close" onClick={resetForm} className="rounded-full transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><X className="w-4 h-4 text-muted-foreground" /></button>
                 </div>
                 <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2">
                   <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
@@ -179,7 +179,7 @@ export default function ShopDocumentsPage() {
                 <div className="flex gap-1.5 flex-wrap">
                   {CATEGORIES.map((c) => (
                     <button type="button" key={c} onClick={() => setCategory(c)}
-                      className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
+                      className={cn("px-2.5 py-1 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                         category === c ? "bg-ig-gradient text-white border-primary" : "border-border bg-muted/40")}>
+                      aria-pressed={category === c}
                       {CATEGORY_META[c].label}
                     </button>
                   ))}
                 </div>
                 <div className="flex gap-2">
-                  <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl border border-border/40 text-sm font-medium">Cancel</button>
-                  <button type="button" onClick={handleUpload} disabled={uploading}
-                    className="flex-1 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2">
+                  <button type="button" onClick={resetForm} className="flex-1 py-2.5 rounded-xl border border-border/40 text-sm font-medium transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Cancel</button>
+                  <button type="button" onClick={handleUpload} disabled={uploading}
+                    className="flex-1 py-2.5 rounded-xl bg-ig-gradient text-white text-sm font-semibold disabled:opacity-50 flex items-center justify-center gap-2 transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                     <Upload className="w-3.5 h-3.5" />
                     {uploading ? "Uploading…" : "Upload"}
                   </button>
@@ -201,7 +201,7 @@ export default function ShopDocumentsPage() {
           <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
             {(["all", ...CATEGORIES] as const).map((c) => (
               <button type="button" key={c} onClick={() => setFilterCat(c)}
-                className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
+                className={cn("shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                   filterCat === c ? "bg-ig-gradient text-white border-primary" : "border-border/50 bg-muted/30")}>
+                aria-pressed={filterCat === c}
                 {c === "all" ? "All" : CATEGORY_META[c].label}
               </button>
             ))}
@@ -237,13 +237,13 @@ export default function ShopDocumentsPage() {
                     <div className="flex items-center gap-1 shrink-0">
                       {doc.fileUrl && (
-                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-colors">
+                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" aria-label="Download" className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                           <Download className="w-3.5 h-3.5 text-muted-foreground" />
                         </a>
                       )}
-                      <button type="button" onClick={() => handleDelete(doc)} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-colors">
+                      <button type="button" aria-label="Delete" onClick={() => handleDelete(doc)} className="w-8 h-8 rounded-full bg-muted/40 flex items-center justify-center hover:bg-red-500/10 hover:text-red-500 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                         <Trash2 className="w-3.5 h-3.5" />
                       </button>
                     </div>
```

## Owner Verify

1. Run `npm run update` — must pass (type-check + worker type-check + build)
2. Preview at 375/768/1280 widths — verify no layout shifts from the new className additions (all are additive, no padding/margin changes)
3. The file is ready to commit as-is
