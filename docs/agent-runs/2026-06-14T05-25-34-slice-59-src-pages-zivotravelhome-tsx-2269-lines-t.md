# DeepSeek run — 2026-06-14T05:25:34.250Z

- model: deepseek-chat
- task: SLICE 59 — src/pages/ZivoTravelHome.tsx (2269 lines, the flagship Zivo Travel marketing/booking landing page — dark glassy hero with a 3D coverflow service carousel + live search form, then 8 section components, a destinations rail, and a footer). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs (aria-label / aria-pressed / aria-expanded ONLY). NO logic, NO handlers, NO state, NO routing, NO supabase/analytics changes, NO new framer props.

Apply the project's STANDING interaction-token rules to RAW <button>/<a>/<Link> ONLY:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips & segmented [0.97]; self-contained cards [0.98]; full-width / wide-rows / bare full-width flex regions [0.99]).
- transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:border-*/hover:opacity COLOR fade; transition-transform for PURE press-scale with no hover color (OR when the only hover is a TRANSFORM like hover:scale-110/hover:-translate). FLIP transition-colors→transition-all when adding a scale alongside a color hover. A Tailwind BARE `transition` shorthand already covers transform → NO flip needed when adding active:scale.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring default; ring-white/70 when the ring renders OVER an image/photographic/gradient media surface; ring-inset ONLY if flush inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only no-text+no-label button -> ADD aria-label; if it already HAS an aria-label, KEEP it. aria-pressed ONLY for segmented single-select controls that convey selection by BACKGROUND fill with a constant label word (NOT tab-bar text-color/underline selection, NOT role=tab). Do NOT add aria-expanded to dialog/sheet openers.

This file is huge, so I've grouped the controls into PATTERN CLASSES. Confirm the exact treatment per class and resolve the questions. Match the parity reference JobPostingDetailPage.tsx conventions where an analogous control exists there.

=== CONTROL INVENTORY (RAW button / a / Link) ===

GROUP A — 3D coverflow card (1): L621 `motion.button` inside ServiceCarousel3D. It ALREADY has framer `animate={{x,z,rotateY,scale,opacity}}` + spring `transition` + `will-change-transform`, plus managed `aria-label`, `aria-hidden`, `tabIndex`. It is an overflow-hidden image card.
  (QA) A CSS `active:scale` would FIGHT framer's animated `scale` transform. My lean = SKIP active:scale entirely (framer owns transform). For focus: it's keyboard-focusable (tabIndex 0 when center). Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (ring over media) WITHOUT outline-none risk? Or leave native? Lean = ADD ring-white/70, no scale, KEEP existing aria. Confirm.

GROUP B — carousel arrows (2): L659 Prev / L667 Next. Icon-only, circular `grid h-11 w-11 ... rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20`, ALREADY have `aria-label="Previous service"`/`"Next service"`. They sit OVER the carousel/media area.
  → ADD `active:scale-95` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (ring over media). KEEP `transition` shorthand (already covers transform+color). KEEP aria-label. Confirm ring-white/70 (over media) vs ring-ring.

GROUP C — carousel pagination dots (1 set): L678 `<button className="h-2 rounded-full transition-all" + w-8/w-2 ...>`, ALREADY have aria-label="Show <label>". Tiny indicator dots.
  (QC) Dots are 8px tall. ADD focus ring (lean: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`)? And do tiny dots get an active:scale? My lean = focus ring YES (keyboard reachable), active:scale NO (8px dot, scale is imperceptible/visually odd; transition-all already there). Confirm.

GROUP D — preview-driver selector rows (3 components, same shape): L883 LiveItineraryBoard itinerary buttons, L976 TripStackBuilder layer buttons, L1075 JourneyCommandDeck step buttons. Each is a full-width row `<button className="group flex ... rounded-* border p-* text-left transition [hover:-translate-y-0.5 | hover:border-white/25]">` with a `selected` conditional style (bg/border highlight) that drives a preview panel.
  (QD1) active:scale tier — these are full-width rows inside a vertical stack → lean `active:scale-[0.99]`. Confirm (vs card [0.98]).
  (QD2) transition — they use BARE `transition` shorthand (covers transform) → NO flip needed, just append active:scale. Confirm.
  (QD3) focus ring — over solid/dark section bg (not photographic) → `ring-ring`? L883 is over a light `#f6fbff` section; L976/L1075 over dark `#050b14`/`#060a12`. ring-ring works on both (it's a token). Confirm ring-ring (outward), NOT ring-white/70.
  (QD4) aria-pressed — they are single-select controls that highlight the active row (selection by bg/border fill) and swap a connected preview. Is this the aria-pressed case, OR is it more of a tablist (preview = tabpanel) where aria-pressed is wrong? My lean = ADD `aria-pressed={selected}` (single-select, selection by background fill, constant content) since we are NOT allowed to add role=tab/tablist. Confirm vs NO aria.

GROUP E — hero search-form service tabs (1 set): L1939 `<button>` 4-up segmented tabs, selected = `bg-white text-zinc-950`, unselected = `text-zinc-300 hover:bg-white/10`, BARE `transition`.
  → This IS segmented selection by BG fill with constant intent → ADD `aria-pressed={index === i}`, `active:scale-[0.97]` (segmented), focus ring `ring-ring` (the form has its own dark surface; tabs are on white/5). transition shorthand covers it → NO flip. Confirm exact: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-pressed.

GROUP F — header desktop nav service buttons (1 set): L1826 `<button className="flex items-center gap-2 transition hover:text-white" + (index===i && service.accent)>`. Inline nav text, selection by TEXT-COLOR (accent), NO bg fill.
  (QF) tab-bar pattern (selection by text color, not bg) → NO aria-pressed (confirm). Inline text nav → active:scale? Lean = NO scale (inline text, no surface). Focus ring? Lean = ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (keyboard-reachable nav control) but it has no border-radius → also add `rounded-sm` for a tidy ring? OR leave native focus? Resolve: my lean = ADD ring + rounded-sm, NO scale, NO aria-pressed, keep `transition hover:text-white`.

GROUP G — footer text buttons (2): L2245 `<button onClick={navigate(service.href)} className="transition hover:text-white">` service links + L2252 `<button onClick={goCrossDomain...} title=... className="transition hover:text-white">` "Zivos Media ↗". Inline footer text-links (sit beside real <Link> Terms/Privacy at L2250/2251).
  (QG) Same inline-text-link treatment as GROUP F: NO scale, ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm`, keep `transition hover:text-white`, NO aria. Confirm. (The adjacent <Link>Terms/Privacy at L2250/2251 are ALSO inline text-links with the same `transition hover:text-white` — should they get the SAME ring+rounded-sm for parity, or are <Link>s in-scope only if they're the same visual class? My lean = YES, treat the two footer <Link>s identically for a consistent footer row.)

GROUP H — mobile menu toggle (1): L1859 `<button onClick={() => setMobileOpen(v=>!v)} className="rounded-full border border-white/15 px-4 py-2 text-sm font-black md:hidden">`. Text "Menu". Toggles an INLINE disclosure panel (not a dialog/sheet).
  (QH) This expands an inline nav panel → aria-expanded is the CORRECT case here (the "do NOT add aria-expanded" rule is specifically for dialog/SHEET openers; this is an inline disclosure). ADD `aria-expanded={mobileOpen}`? My lean = YES add aria-expanded (inline disclosure, not a dialog). Plus `active:scale-95` (small pill) and focus ring `ring-ring`. It has NO transition currently → adding a pure press-scale with no color hover ⇒ add `transition-transform`. Confirm: append `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-expanded.

GROUP I — mobile menu rows (1 set + 2): L1871 service `<button>` rows + L1884 Wallet `<Link>` + L1892 Login `<Link>`. Full-width rows `border ... px-4 py-3 text-left text-sm font-black` (no transition currently; L1892 is a filled emerald button).
  → full-width rows → `active:scale-[0.99]`; pure press (no color hover) ⇒ `transition-transform`; focus ring `ring-ring`. Confirm same treatment for the 3 (L1892 emerald CTA could be [0.99] too as a full-width row).

GROUP J — hero search SUBMIT CTA (1): L2020 `<button type="submit" className="group flex min-h-14 ... rounded-2xl bg-emerald-500 px-6 ... transition hover:bg-emerald-400">`. Full-width gradient CTA with inner arrow `group-hover:translate-x-1`.
  → full-width CTA → `active:scale-[0.99]` (or [0.98]?); has `hover:bg-emerald-400` COLOR fade + BARE `transition` shorthand → NO flip needed (shorthand covers all); focus ring `ring-ring`. Confirm tier ([0.99] full-width vs [0.98]) and that bare `transition` needs no flip.

GROUP K — destination image cards (1 set): L2102 `<button className="zt-on-media group relative h-72 w-64 shrink-0 snap-start overflow-hidden rounded-[1.8rem] border border-white/10 text-left">`. Photographic image cards, inner `group-hover:scale-110` img, NO transition on the button itself, NO hover color on the button.
  → self-contained card → `active:scale-[0.98]`; pure press (hover effect is on the child img transform, button has no own hover color) ⇒ `transition-transform`; focus ring OVER media ⇒ `ring-white/70`. Confirm.

GROUP L — currency display button (1): L1847 `<button className="flex h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-zinc-200"><Globe2/>USD</button>`. It has NO onClick — non-functional placeholder.
  (QL) Per project rule, no-op/missing-onClick buttons are FLAGGED to owner, NOT given interaction tokens (tokens imply functionality it doesn't have). My lean = SKIP (leave as-is) and FLAG to owner that the USD button has no handler. Confirm SKIP.

GROUP M — content/CTA <Link> and <a href="#..."> controls (the bulk, ~28). All are real navigations. Sub-classes:
  (M1) Self-contained content CARDS (block, own surface, photographic or glass, usually `transition hover:-translate-y-1 hover:border-*`): L757 ServiceLayerShowcase Link, L804 QuickActionDock Link, L1031 TripStackBuilder layer Link cards, L1133/L1138 JourneyCommandDeck checkout/wallet Link, L1143 "New search" a#booking, L1182 assurance Link cards, L1328 a#booking pillar / L1332 Link pillar, L1426/L1431 PaymentPayoutFlow Link, L1467 popular-search Link cards, L2159/L2161 workflow a/Link card-wrappers, L2171 ops Link cards. → `active:scale-[0.98]` + focus ring + transition handling (most have BARE `transition` shorthand → no flip; some have NO transition → add `transition-transform` since press is the only animated transform and the hover is translate/border which the shorthand-less ones need `transition-all` if they DO have hover:border color... resolve per-control: if a card has `transition hover:-translate-y-1 hover:border-*` keep shorthand+append scale; if a card has NO transition + a hover:border color → add `transition-all`).
  (M2) Pill / rounded-full CTA links (`rounded-full ... px-6 py-3 ... transition hover:bg-*`/`hover:border-*`): L865 "Continue checkout", L869 "View trips", L938 "Open layer", L1168/L1171 confidence CTAs, L1220/L1223 handoff CTAs, L1810 header logo Link (group, has hover on inner span), L1836/L1840 header Trips/Wallet nav Links (`transition hover:text-white` inline), L1851 Log in Link, L1854 Start booking a#booking, L2136 "See how it works" a (inline text), L2208 "Start a trip" a / L2209/L2210 Links, L2250/L2251 footer Terms/Privacy (covered in GROUP G).
    → pill CTAs: `active:scale-[0.97]` (pill) + focus ring `ring-ring` (or ring-white/70 if over media) + flip/append transition per hover-color presence. Inline text nav Links (L1836/L1840/L2136 and header logo): treat like inline text-links (NO scale, ring + rounded-sm) — confirm, OR do header pill-height nav Links count as pills? (L1836/L1840 are `flex items-center gap-2 transition hover:text-white` inline text, NOT pills → inline-text treatment.) Header logo L1810 is a brand lockup link → lean NO scale, ADD focus ring (rounded-2xl-ish via the inner span? the <Link> itself has no radius) → add rounded-sm + ring, no scale. Confirm.

=== KEY GLOBAL QUESTIONS ===
(G1) Given ~40 controls, confirm the per-class tiers above are internally consistent with the project ladder (icon-95 / pill+segmented-0.97 / card-0.98 / wide-row+full-width-0.99) and the inline-text-link exception (NO scale, ring + rounded-sm).
(G2) ring color rule: ring-white/70 ONLY for controls whose focus ring renders directly over a photographic/image media surface (GROUP A coverflow card, GROUP B arrows, GROUP C dots, GROUP K destination cards, and any M1 card whose ring sits over a full-bleed photo). Everything else (selectors over solid section bg, form tabs, pills, inline text, footer) = outward `ring-ring`. Confirm this split, and flag any control I mis-bucketed.
(G3) Anything I should SKIP beyond GROUP L (the no-op USD button)? E.g., the brand logo Link, or any control where tokens would look wrong? Also confirm: do NOT touch the TiltCard/ScrollTurn/Reveal/motion.* wrappers, the <input>/<label> form fields, the CrossAppReturnBar child, or any presentational div.

Reply CONCISE but COMPLETE: give me the final exact className suffix (and any aria attr) to append for EACH group A–M (and M sub-classes), plus explicit YES/NO on QA, QC, QD1-4, QF, QG, QH, QL, G1-G3. This will drive a multi-edit className-only pass; precision on the per-group suffix strings is what matters most.
- files: src/pages/ZivoTravelHome.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 59 — ZivoTravelHome.tsx Premium Interaction + A11y Polish

## Plan

Apply the project's standing interaction-token rules to all RAW `<button>`, `<Link>`, and `<a>` controls in `src/pages/ZivoTravelHome.tsx`. The file has ~40 interactive controls across 13 pattern groups (A–M). Each gets:
- `active:scale-[X]` press feedback (tiered by control type)
- `transition-all` or `transition-transform` (flip `transition-colors`→`transition-all` when adding scale alongside a color hover; keep bare `transition` shorthand as-is since it already covers transform)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (outward; `ring-white/70` when over photographic/media surfaces)
- `aria-pressed` for segmented single-select controls with background-fill selection
- `aria-expanded` for the mobile menu toggle (inline disclosure, not a dialog)

## Answers to Key Questions

**QA (GROUP A — coverflow card):** YES, SKIP `active:scale` entirely (framer owns transform via `animate={{scale}}`). ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (ring over media). KEEP existing `aria-label`/`aria-hidden`/`tabIndex`.

**QC (GROUP C — pagination dots):** YES, ADD focus ring `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`. NO `active:scale` (8px dot, imperceptible). KEEP `transition-all`.

**QD1 (GROUP D — preview-driver rows):** `active:scale-[0.99]` (full-width rows in vertical stack). Confirm.

**QD2 (GROUP D):** BARE `transition` shorthand → NO flip needed, just append `active:scale`. Confirm.

**QD3 (GROUP D):** `ring-ring` (outward) — solid section bg, not photographic. Confirm.

**QD4 (GROUP D):** ADD `aria-pressed={selected}` — single-select, selection by bg/border fill, constant content. NOT a tablist (no role=tab). Confirm.

**QF (GROUP F — header nav text buttons):** NO `aria-pressed` (text-color selection, not bg fill). NO `active:scale` (inline text, no surface). ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm`. Confirm.

**QG (GROUP G — footer text buttons):** Same as GROUP F: NO scale, ADD ring + `rounded-sm`. YES, treat the adjacent `<Link>` Terms/Privacy identically for consistency. Confirm.

**QH (GROUP H — mobile menu toggle):** YES, ADD `aria-expanded={mobileOpen}` (inline disclosure, not a dialog). ADD `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Confirm.

**QL (GROUP L — currency display button):** SKIP (no-op, no `onClick`). FLAG to owner. Confirm.

**G1 (Tier consistency):** YES, the per-class tiers are internally consistent:
- Icon-only: `scale-95`
- Pill/chip/segmented: `[0.97]`
- Self-contained card: `[0.98]`
- Full-width row/wide CTA: `[0.99]`
- Inline text-link: NO scale, ring + `rounded-sm`

**G2 (Ring color split):** YES, `ring-white/70` for controls over photographic/media surfaces (A, B, C, K, and M1 cards with full-bleed photos). `ring-ring` for everything else (solid section bg, form tabs, pills, inline text, footer). Confirm.

**G3 (Skip list):** YES, skip: GROUP L (no-op USD button), brand logo `<Link>` (L1810 — decorative brand lockup, NO scale, just ring + `rounded-sm`), all `motion.*` wrappers, `<input>`/`<label>` form fields, `CrossAppReturnBar` child, all presentational `div`/`span`/`img`. Confirm.

## Per-Group Exact Suffixes

### GROUP A — Coverflow card (L621)
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
```
NO `active:scale`. KEEP existing `aria-label`/`aria-hidden`/`tabIndex`.

### GROUP B — Carousel arrows (L659, L667)
```
active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
```
KEEP existing `transition` shorthand + `aria-label`.

### GROUP C — Pagination dots (L678)
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
```
NO `active:scale`. KEEP `transition-all` + `aria-label`.

### GROUP D — Preview-driver rows (L883, L976, L1075)
```
active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
ADD `aria-pressed={selected}`. KEEP existing `transition` shorthand.

### GROUP E — Hero search-form service tabs (L1939)
```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
ADD `aria-pressed={index === i}`. KEEP existing `transition` shorthand.

### GROUP F — Header desktop nav service buttons (L1826)
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm
```
NO `active:scale`. NO `aria-pressed`. KEEP `transition hover:text-white`.

### GROUP G — Footer text buttons + Links (L2245, L2252, L2250, L2251)
```
focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm
```
NO `active:scale`. KEEP `transition hover:text-white`.

### GROUP H — Mobile menu toggle (L1859)
```
transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
ADD `aria-expanded={mobileOpen}`.

### GROUP I — Mobile menu rows (L1871, L1884, L1892)
```
transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
NO `aria-pressed` (navigation, not selection).

### GROUP J — Hero search submit CTA (L2020)
```
active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
KEEP existing `transition` shorthand (covers all). Tier: `[0.99]` (full-width CTA).

### GROUP K — Destination image cards (L2102)
```
transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70
```
NO `transition` flip (no hover color on button itself; hover effect is on child img).

### GROUP L — Currency display button (L1847)
SKIP entirely. FLAG to owner: no `onClick` handler.

### GROUP M — Content/CTA `<Link>` and `<a>` controls

**M1 — Self-contained content cards (L757, L804, L1031, L1133, L1138, L1143, L1182, L1328, L1332, L1426, L1431, L1467, L2159, L2161, L2171):**
```
active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
If card has `transition hover:-translate-y-1 hover:border-*`: KEEP existing `transition` shorthand, just append scale + ring.
If card has NO `transition` + `hover:border-*` color: FLIP to `transition-all` (or add `transition-all` if no transition class exists).

**M2 — Pill/rounded-full CTA links (L865, L869, L938, L1168, L1171, L1220, L1223, L1810, L1836, L1840, L1851, L1854, L2136, L2208, L2209, L2210, L2250, L2251):**
- Pill CTAs with `rounded-full ... px-6 py-3 ... transition hover:bg-*`/`hover:border-*`:
  ```
  active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
  ```
  KEEP existing `transition` shorthand.

- Inline text nav Links (L1836, L1840, L2136 — `transition hover:text-white` inline text):
  ```
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm
  ```
  NO `active:scale`.

- Header logo Link (L1810 — brand lockup):
  ```
  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm
  ```
  NO `active:scale`.

## Diff

```diff
--- a/src/pages/ZivoTravelHome.tsx
+++ b/src/pages/ZivoTravelHome.tsx
@@ -618,7 +618,7 @@ function ServiceCarousel3D({
             <motion.button
               key={service.id}
               type="button"
               onClick={() => (isCenter ? onLaunch(service) : onSelect(i))}
-              className="zt-on-media absolute inset-y-2 left-0 right-0 mx-auto w-[268px] overflow-hidden rounded-[2rem] border border-white/15 text-left shadow-[0_44px_90px_rgba(2,6,23,0.55)] will-change-transform sm:w-[320px]"
+              className="zt-on-media absolute inset-y-2 left-0 right-0 mx-auto w-[268px] overflow-hidden rounded-[2rem] border border-white/15 text-left shadow-[0_44px_90px_rgba(2,6,23,0.55)] will-change-transform sm:w-[320px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
               style={{ zIndex: slot.zIndex, transformStyle: "preserve-3d" }}
               animate={{ x: slot.x, z: slot.z, rotateY: slot.rotateY, scale: slot.scale, opacity: slot.opacity }}
               transition={{ type: "spring", stiffness: 120, damping: 18 }}
@@ -656,7 +656,7 @@ function ServiceCarousel3D({
       <button
         type="button"
         onClick={() => go(-1)}
-        className="absolute left-1 top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20"
+        className="absolute left-1 top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
         aria-label="Previous service"
       >
         <ChevronLeft className="h-5 w-5" />
@@ -664,7 +664,7 @@ function ServiceCarousel3D({
       <button
         type="button"
         onClick={() => go(1)}
-        className="absolute right-1 top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20"
+        className="absolute right-1 top-1/2 z-[60] grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
         aria-label="Next service"
       >
         <ChevronRight className="h-5 w-5" />
@@ -675,7 +675,7 @@ function ServiceCarousel3D({
           <button
             key={service.id}
             type="button"
             onClick={() => onSelect(i)}
-            className={cn("h-2 rounded-full transition-all", i === index ? "w-8 bg-white" : "w-2 bg-white/40")}
+            className={cn("h-2 rounded-full transition-all", i === index ? "w-8 bg-white" : "w-2 bg-white/40") + " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"}
             aria-label={`Show ${service.label}`}
           />
         ))}
@@ -880,7 +880,7 @@ function LiveItineraryBoard({ onSelectService }: { onSelectService: (next: numbe
                   <button
                     key={item.title}
                     type="button"
                     onClick={() => selectLayer(i)}
-                    className={cn(
-                      "group flex items-center justify-between gap-3 rounded-[1.35rem] border p-4 text-left shadow-sm transition hover:-translate-y-0.5",
-                      selected ? "border-emerald-400/50 bg-white shadow-[0_18px_45px_rgba(16,185,129,0.12)]" : "border-slate-900/10 bg-white/70 hover:bg-white",
-                    )}
+                    className={cn(
+                      "group flex items-center justify-between gap-3 rounded-[1.35rem] border p-4 text-left shadow-sm transition hover:-translate-y-0.5 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
+                      selected ? "border-emerald-400/50 bg-white shadow-[0_18px_45px_rgba(16,185,129,0.12)]" : "border-slate-900/10 bg-white/70 hover:bg-white",
+                    )}
+                    aria-pressed={selected}
                   >
                     <span className="flex min-w-0 items-center gap-3">
                       <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl", selected ? item.service.chip : "bg-slate-100 text-slate-700")}>
@@ -973,7 +973,7 @@ function TripStackBuilder({ onSelectService }: { onSelectService: (next: number)
                 <button
                   key={item.layer}
                   type="button"
                   onClick={() => selectTripLayer(i)}
-                  className={cn(
-                    "group flex items-center justify-between rounded-2xl border p-3 text-left transition",
-                    selected ? "border-emerald-300/55 bg-emerald-300/10" : "border-white/10 bg-white/[0.04] hover:border-white/25",
-                  )}
+                  className={cn(
+                    "group flex items-center justify-between rounded-2xl border p-3 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
+                    selected ? "border-emerald-300/55 bg-emerald-300/10" : "border-white/10 bg-white/[0.04] hover:border-white/25",
+                  )}
+                  aria-pressed={selected}
                 >
                   <span className="flex min-w-0 items-center gap-3">
                     <span className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10", item.service.accent)}>
@@ -1072,7 +1072,7 @@ function JourneyCommandDeck() {
                 <button
                   key={step.title}
                   type="button"
                   onClick={() => setActive(i)}
-                  className={cn(
-                    "group flex items-center gap-4 rounded-2xl border p-4 text-left transition",
-                    selected ? "border-emerald-300/55 bg-emerald-300/10 shadow-[0_18px_50px_rgba(16,185,129,0.12)]" : "border-white/10 bg-white/[0.04] hover:border-white/25",
-                  )}
+                  className={cn(
+                    "group flex items-center gap-4 rounded-2xl border p-4 text-left transition active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
+                    selected ? "border-emerald-300/55 bg-emerald-300/10 shadow-[0_18px_50px_rgba(16,185,129,0.12)]" : "border-white/10 bg-white/[0.04] hover:border-white/25",
+                  )}
+                  aria-pressed={selected}
                 >
                   <span className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-white shadow-lg", step.accent)}>
                     <StepIcon className="h-5 w-5" />
@@ -1823,7 +1823,7 @@ function ZivoTravelHome() {
               {services.map((service, i) => (
                 <button
                   key={service.id}
                   type="button"
                   onClick={() => setActiveService(i)}
-                  className={cn("flex items-center gap-2 transition hover:text-white", i === activeService && service.accent)}
+                  className={cn("flex items-center gap-2 transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm", i === activeService && service
