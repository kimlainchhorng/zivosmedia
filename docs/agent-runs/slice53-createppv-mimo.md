# MiMo run — 2026-06-14T05:45:24.822Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

9 controls to touch, 5 aria attrs to add. All edits are className-only (no logic lines).

| # | Control | Treatment | Ring color | Press tier | Transition | Aria |
|---|---------|-----------|------------|------------|------------|------|
| A | Back icon | FRESH | `ring-ring` (neutral header) | icon `95` | FRESH `transition-all` (hover:bg) | — (already labeled) |
| B | Free-for-subs toggle | RING-ONLY | `ring-ring` (neutral page) | keep `[0.99]` | keep `transition-colors`, no flip | ADD `aria-pressed={freeForSubscribers}` |
| C | Schedule toggle | RING-ONLY | `ring-ring` | keep `[0.99]` | keep `transition-colors`, no flip | ADD `aria-pressed={scheduled}` |
| D | Price chips ×5 | FLIP | `ring-ring` | segmented `[0.97]` | FLIP `transition-colors`→`transition-all` | ADD `aria-pressed={priceUsd === p}` |
| E | Empty dropzone | FLIP | `ring-ring` | wide `[0.98]` | FLIP `transition-colors`→`transition-all` | — |
| F | Remove (X) | FRESH | `ring-white/70` (over image) | icon `95` | FRESH `transition-all` | ADD `aria-label="Remove"` |
| G | Set-preview strip | FRESH | `ring-white/70` (over image) | `[0.98]` (own surface) | FRESH `transition-all` | ADD `aria-pressed={isPreview}` |
| H | Add-more tile | FRESH | `ring-ring` | wide `[0.98]` | FRESH `transition-all` (hover:border) | — |
| I | Publish button | RING-ONLY | `ring-ring` (neutral page, not fill) | keep `[0.98]` | keep `transition-all` | — |

**9 className edits · 5 aria attrs (`aria-pressed`×4, `aria-label`×1) · 0 logic lines · 0 ring-inset**

**LEAVE untouched:** title input (focus:border-rose-500/60), description textarea (same), price wrapper (focus-within:border-rose-500/60), datetime input (focus:border-violet-500/60), hidden file input, hero motion.div, switch-knob motion.divs, thumbnail img/Video tiles.

---

## Diff — `src/pages/CreatePPVPostPage.tsx`

### A) Back icon — FRESH `transition-all` + `active:scale-95` + ring

```diff
-            className="p-2 -ml-2 rounded-full hover:bg-muted/50"
+            className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### B) Free-for-subs toggle — RING-ONLY + `aria-pressed`

```diff
           <button
             type="button"
             onClick={() => setFreeForSubscribers((v) => !v)}
+            aria-pressed={freeForSubscribers}
             className={cn(
-              "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99]",
+              "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

### C) Schedule toggle — RING-ONLY + `aria-pressed`

```diff
         <button
           type="button"
           onClick={() => setScheduled((v) => !v)}
+          aria-pressed={scheduled}
           className={cn(
-            "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99]",
+            "w-full flex items-center gap-3 p-3 rounded-2xl border-2 transition-colors text-left active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

### D) Price chips ×5 — FLIP + scale + ring + `aria-pressed`

```diff
               <button
                 key={p}
                 type="button"
                 onClick={() => setPriceUsd(p)}
+                aria-pressed={priceUsd === p}
                 className={cn(
-                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors",
+                  "px-2.5 py-1 rounded-full text-[11px] font-bold border transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

### E) Empty dropzone — FLIP + scale + ring

```diff
-              className="mt-1 w-full h-32 rounded-2xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-2 transition-colors"
+              className="mt-1 w-full h-32 rounded-2xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-2 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### F) Remove (X) — FRESH + `aria-label` + `ring-white/70`

```diff
                       <button
                         type="button"
                         onClick={() => removeItem(idx)}
-                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
+                        aria-label="Remove"
+                        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

### G) Set-preview strip — FRESH + `aria-pressed` + `ring-white/70`

```diff
                       <button
                         type="button"
                         onClick={() => setPreviewIdx(idx)}
+                        aria-pressed={isPreview}
                         className={cn(
-                          "absolute bottom-1 left-1 right-1 text-[9px] font-extrabold rounded-md py-1 uppercase tracking-wide",
+                          "absolute bottom-1 left-1 right-1 text-[9px] font-extrabold rounded-md py-1 uppercase tracking-wide transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
```

### H) Add-more tile — FRESH `transition-all` + scale + ring

```diff
-                  className="aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-1"
+                  className="aspect-square rounded-xl border-2 border-dashed border-border bg-card hover:border-rose-500/40 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### I) Publish button — RING-ONLY

```diff
             "w-full h-13 rounded-2xl font-extrabold text-[15px] py-3.5 flex items-center justify-center gap-2 transition-all active:scale-[0.98]",
+            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
```

*(Three-arg `cn()` — the ring tokens go in a separate string arg so the two conditional base strings stay clean.)*

---

## Verify / deploy

1. `npm run update` → must exit 0 (type-check + worker type-check + production build).
2. Visual spot-check at 375 / 768 / 1280 — all 5 price chips fit in one row at 375 (~36px × 5 + 4 × 6px gap = 204px < 343px); toggles, dropzones, thumbnails, publish all lay out clean.
3. Keyboard-tab through every control — verify the ring appears only on `:focus-visible` and is outward (not inset) except F/G where it's `ring-white/70` over the media tile.
4. Owner commits; do not push.
