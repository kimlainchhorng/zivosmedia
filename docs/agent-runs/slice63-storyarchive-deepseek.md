# DeepSeek run — 2026-06-14T06:56:48.564Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/StoryArchivePage.tsx (297-line "Archive" — an Instagram-style archive of a user's EXPIRED stories: REAL Supabase useQuery ["story-archive", user.id] reading `stories` where user_id=me AND expires_at<now (schema-drift fallback via isStorySafetySchemaDriftError); AUTH-aware via useAuth; sticky header [shadcn ghost icon Back + ig-gradient Archive title] + a "Your memories" gradient banner + a horizontally-scrolling FILTER-chip row [All/Photos/Videos/Text single-select] + a 3-col media GRID of story tiles + a tap-to-open fixed PREVIEW overlay (the selected story media + a shadcn "Repost as story" Button + a text "Close" button)). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState (setActiveFilter/setSelectedId), the useQuery/Supabase query, handleRepost, byte-identical. Don't add a SECOND competing press effect (framer whileTap vs CSS active:scale). Don't churn already-polished controls. Don't churn shadcn <Button> (ships own focus/scale tokens). Don't renumber an existing scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. `focus-visible:ring-inset` ONLY when the control is a flush edge child of a rounded overflow-hidden PARENT (so an outward box-shadow ring would be clipped), OR a flush tile in a near-gapless grid where an outward ring would overlap neighbors.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT (or effectively rendering over adjacent media in a flush grid) = ring-white/70.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99]; media/image grid TILE — see your call.
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border OR an existing active:bg/opacity color wash. FLIP RULE: a control with transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. If a control ALREADY has transition-all, append scale/ring without flipping. If a control ALREADY has framer whileTap, append the focus ring ONLY (NO CSS active:scale — that's the "second competing press").
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter/tab OR a two-way toggle whose on/off is bg-conveyed. aria-expanded on a disclosure trigger that reveals/hides UI. NOT aria-pressed on one-shot actions (nav, set-value, open-preview, close).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier, transition class + whether a FLIP is needed, ring-inset vs outward + reason, and any aria-* attr; flag any to LEAVE):

A) L149 FILTER chip button (raw `<button>`, mapped over ["All","Photos","Videos","Text"], single-select filter, selection bg-conveyed `bg-ig-gradient text-white shadow-sm` [active] vs `bg-secondary text-foreground hover:bg-muted` [inactive], onClick setActiveFilter(f)): base via cn 1st arg `shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5`. ALREADY has transition-all, NO scale/focus/aria. Parent = horizontal flex chip row on bg-background (neutral). → plan: ADD `aria-pressed={activeFilter === f}` (persistent single-select segmented filter, bg-conveyed) + APPEND into cn 1st arg `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented filter tier [0.97]; NO flip — transition-all already present; OUTWARD ring-ring — the ig-gradient is the chip's OWN active fill, ring renders against the neutral parent row). Confirm aria-pressed + tier + ring + no-flip.

B) L206 GRID story TILE (`motion.button`, mapped over `filtered`, ALREADY `whileTap={{ scale: 0.96 }}`, ALREADY `aria-label={`Open archived story from ${formatDate(...)}`}`, one-shot `onClick={() => setSelectedId(s.id)}` opens the preview overlay): base `relative aspect-[9/16] bg-muted overflow-hidden active:opacity-80 transition-opacity`. Has whileTap + transition-opacity + active:opacity wash, NO focus/scale-CSS. Parent = `grid grid-cols-3 gap-[2px] sm:gap-1` (NEAR-GAPLESS 2px media grid); tile renders photo/video/text-story media. → plan: **ring-ONLY append** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-???` (whileTap IS the press → NO CSS active:scale [no double-press]; the focus ring needs no transition; NO new aria — already labeled). OPEN QUESTIONS for you: (1) ring COLOR — ring-ring (literal neutral grid parent bg-background) vs **ring-white/70** (the tile is an IMAGE/media surface and with only gap-[2px] an outward ring renders over adjacent media tiles)? (2) ring-inset vs OUTWARD — in a near-gapless 3-col grid an outward 2px ring would bleed onto neighbor tiles; is **ring-inset** warranted (ring sits cleanly INSIDE the media tile) even though the tile is not inside a rounded overflow-hidden PARENT (its OWN overflow-hidden clips descendants, not its box-shadow)? Decide ring color + inset-vs-outward for a flush media-grid tile.

C) L285 "Close" text button (raw `<button>`, full-width text "Close" inside the PREVIEW overlay, one-shot `onClick={() => setSelectedId(null)}` closes the overlay): base `mt-2 w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 transition-colors`. Has transition-colors + hover:text, NO rounded/scale/focus/aria. Parent = preview overlay `bg-background/95 backdrop-blur-xl` (neutral). → plan: FLIP transition-colors→transition-all + APPEND `rounded-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; FLIP — transition-colors + hover:text gaining a NEW scale; `rounded-md` so the ring has corners on an otherwise unrounded full-width text button; OUTWARD ring-ring neutral overlay; NO aria — one-shot close). Confirm tier + FLIP + rounded-md + ring + no-aria.

ALSO CONFIRM I should LEAVE these: the shadcn ghost-icon Back `<Button>` L109 (aria-label="Back" already, ships own focus/scale tokens); the shadcn "Share your first story" `<Button>` L187 (empty-state CTA, own tokens); the shadcn "Repost as story" `<Button>` L279 (own tokens); SwipeBackContainer / SEOHead (wrappers/non-visual); the "Your memories" gradient banner motion.div L125 + the preview overlay backdrop motion.div L247 + inner motion.div L253 (entrance/overlay anim, the backdrop's onClick={()=>setSelectedId(null)} is a dismiss handler on a non-button div — LEAVE, structural); Film/Type/Eye/Archive icons + media img/video (decorative/media).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note A/B are mapped templates (single edit hits every chip / every tile); C is one. Resolve B's two open questions (ring color + inset-vs-outward) explicitly.
- files: src/pages/StoryArchivePage.tsx

---

# Plan

Three controls to edit in `src/pages/StoryArchivePage.tsx`:

**A) L149 FILTER chip** — Add `aria-pressed` + `active:scale-[0.97]` + focus ring. No flip needed (already `transition-all`).

**B) L206 GRID story tile** — Ring-ONLY (whileTap is the press). **ring-inset + ring-white/70** because it's a flush media grid tile.

**C) L285 "Close" button** — FLIP `transition-colors`→`transition-all` + `active:scale-[0.97]` + `rounded-md` + focus ring. No aria (one-shot close).

---

# Diff

```diff
--- a/src/pages/StoryArchivePage.tsx
+++ b/src/pages/StoryArchivePage.tsx
@@ -146,7 +146,7 @@ export default function StoryArchivePage() {
                 <button
                   key={f}
                   type="button"
                   onClick={() => setActiveFilter(f)}
                   className={cn(
                     "shrink-0 px-3.5 py-2 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5",
                     activeFilter === f
                       ? "bg-ig-gradient text-white shadow-sm"
                       : "bg-secondary text-foreground hover:bg-muted",
+                    "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   )}
+                  aria-pressed={activeFilter === f}
                 >
                   <Icon className="h-3.5 w-3.5" />
                   {f}
@@ -203,7 +203,7 @@ export default function StoryArchivePage() {
                 <motion.button
                   key={s.id}
                   type="button"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   transition={{ delay: Math.min(idx, 12) * 0.02 }}
                   whileTap={{ scale: 0.96 }}
                   onClick={() => setSelectedId(s.id)}
-                  className="relative aspect-[9/16] bg-muted overflow-hidden active:opacity-80 transition-opacity"
+                  className="relative aspect-[9/16] bg-muted overflow-hidden active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70"
                   aria-label={`Open archived story from ${formatDate(s.created_at)}`}
                 >
                   {isText ? (
@@ -282,7 +282,7 @@ export default function StoryArchivePage() {
             <button
               type="button"
               onClick={() => setSelectedId(null)}
-              className="mt-2 w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 transition-colors"
+              className="mt-2 w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 transition-all rounded-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               Close
             </button>
```

---

# Per-control breakdown

## A) FILTER chip (L149) — mapped template

**Final className after-string** (appended to cn 1st arg):
```
active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- **Ring color:** `ring-ring` — neutral parent row on `bg-background`
- **Press tier:** `[0.97]` — segmented filter chip
- **Transition:** No flip — already `transition-all`
- **Ring:** OUTWARD — chip has its own rounded-full surface, not flush in a clipped container
- **Aria:** `aria-pressed={activeFilter === f}` — persistent single-select segmented filter, bg-conveyed

## B) GRID story tile (L206) — mapped template

**Final className** (replaces existing):
```
relative aspect-[9/16] bg-muted overflow-hidden active:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/70
```

- **Ring color:** `ring-white/70` — the tile IS a media surface (photo/video/text-story background); with only `gap-[2px]` between tiles, an outward ring would render over adjacent media tiles
- **Press tier:** N/A — whileTap IS the press → ring-ONLY, no CSS `active:scale`
- **Transition:** No flip — ring needs no transition
- **Ring:** **ring-inset** — in a near-gapless `gap-[2px]` 3-col grid, an outward 2px box-shadow ring would bleed onto neighbor tiles. `ring-inset` renders the ring cleanly inside the tile's own bounds. The tile's own `overflow-hidden` clips descendants, not its box-shadow, so `ring-inset` works correctly here.
- **Aria:** Already present — no change

## C) "Close" button (L285) — single instance

**Final className** (replaces existing):
```
mt-2 w-full text-xs font-semibold text-muted-foreground hover:text-foreground py-1.5 transition-all rounded-md active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- **Ring color:** `ring-ring` — neutral `bg-background/95 backdrop-blur-xl` overlay parent
- **Press tier:** `[0.97]` — small inline text-link
- **Transition:** **FLIP** `transition-colors`→`transition-all` — `hover:text-foreground` + new scale both animate
- **Ring:** OUTWARD — full-width text button, no overflow clipping
- **Aria:** None — one-shot close action

## LEAVE (confirmed)

- shadcn ghost-icon Back `<Button>` L109 — own tokens
- shadcn "Share your first story" `<Button>` L187 — own tokens
- shadcn "Repost as story" `<Button>` L279 — own tokens
- SwipeBackContainer / SEOHead — wrappers/non-visual
- "Your memories" banner motion.div L125 — presentational
- Preview overlay backdrop motion.div L247 + inner motion.div L253 — structural (backdrop's `onClick` dismiss is on a non-button div)
- All icons + media — decorative/media

---

# Owner verify

1. Run `npm run update` — must pass (0 TS errors, worker types, production build)
2. Preview at 375px width: verify filter chips scroll horizontally, grid tiles render without ring overlap, preview overlay opens/closes
3. Verify `aria-pressed` on filter chips announces correctly (single-select, bg-conveyed)
4. Verify `ring-inset` on grid tiles doesn't clip content (the 2px inset ring sits inside the `aspect-[9/16]` tile, over the media — acceptable for a flush grid)
