# MiMo run — 2026-06-14T04:22:26.486Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/PlaylistsPage.tsx (a music/video playlist manager reached by in-app navigation; `SwipeBackContainer` + `SEOHead noIndex`; `useAuth` + one real `useQuery` `["playlists", user?.id]` from `playlists` .eq("user_id", user.id).order("updated_at",desc); `creating`/`title`/`description`/`isPublic`/`editingId`/`editTitle` useState; create/rename/togglePublic/delete `useMutation`s; `totalTracks` useMemo. Layout: sticky header [shadcn back Button + Music badge + "Playlists" title + shadcn "New" Button]; a gradient "Your library" summary banner motion.div [bg-ig-gradient, NO onClick]; an AnimatePresence create-form motion.div [shown when `creating`: a RAW icon-only Cancel(X) button + a RAW title input + a RAW description textarea + a native checkbox + a shadcn Create Button]; loading skeleton grid; empty-state card [shadcn create Button]; then a 2-col grid of playlist-card motion.div tiles [entrance anim, NO onClick on the motion.div itself]. Each tile is `relative rounded-2xl overflow-hidden bg-card border` and contains: (1) a big RAW cover-open button [`w-full aspect-square`, navigates to /sounds?playlist=, holds the cover img OR a bg-ig-gradient fallback + a dark gradient scrim + the title/track-count text OR an inline rename input + a Play overlay + a Public/Private badge], and (2) an absolutely-positioned `top-2 right-2` cluster of 3 RAW icon-only overlay action buttons [Rename / TogglePublic / Delete] floating over the cover.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: every useState/setState, the `useQuery`, all 4 useMutation mutationFns/onSuccess/onError, `totalTracks`, every onClick + the inline-input onKeyDown/onChange/stopPropagation/confirm()/navigate. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press; transition-opacity when only opacity animates. If a control ALREADY ships transition-all, append the ring (don't re-flip).
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-90 / active:opacity-80), KEEP it and do NOT renumber or manufacture a different scale.
- aria-label only on icon-only / image-only controls. aria-pressed on a persistent toggle with selection conveyed by bg; NOT on a one-shot action.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale / transition, keep it.

RING COLOR: --ring resolves to BLACK in this app; bg-ig-gradient is a warm gradient. A control whose OUTWARD ring renders against a neutral bg-card/bg-background uses ring-ring; a control whose ring renders ON a gradient/image surface (or whose OUTWARD ring renders against gradient/image) uses ring-white/70. A gradient/image-FILLED flush-edge button inside an overflow-hidden card uses ring-inset + ring-white/70.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button>/<input>/<textarea> (plain HTML) ships NO tokens. A RAW input/textarea with an EXISTING focus:ring-* is don't-churn -> leave.

MY PLANNED EDITS (please confirm each is right, or correct it):

A. Create-form Cancel (X) button (L212, RAW, ICON-ONLY X, ALREADY aria-label="Cancel", onClick={() => setCreating(false)}, className "h-8 w-8 rounded-full hover:bg-secondary flex items-center justify-center text-muted-foreground" — HAS hover:bg color fade, NO transition/scale/ring; sits in the bg-card create form):
   plan: APPEND `transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (FRESH transition-all — hover:bg-secondary color fade; icon tier scale-95; KEEP aria-label; OUTWARD ring-ring on neutral bg-card).

B. Playlist cover-open button (L295, RAW, the big tile button, onClick={() => navigate(`/sounds?playlist=${p.id}`)}, ALREADY aria-label={`Open playlist ${p.title}`}, className "w-full aspect-square relative active:opacity-80 transition-opacity" — HAS active:opacity-80 [opacity press affordance] + transition-opacity, NO ring; its content is a cover <img> OR a bg-ig-gradient fallback fill; it is a FLUSH `w-full aspect-square` child of the tile motion.div which is `relative rounded-2xl overflow-hidden bg-card border`):
   plan: APPEND `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (RING-INSET — flush edge child of a rounded overflow-hidden parent, an outward ring would be clipped; ring-white/70 — the inset ring renders ON the button's own image/gradient fill, white for reliable contrast over arbitrary cover imagery; KEEP active:opacity-80 [pre-existing press affordance -> NO manufactured scale]; KEEP transition-opacity; KEEP aria-label).

C. Rename overlay button (L344, RAW, ICON-ONLY Pencil, ALREADY aria-label={`Rename ${p.title}`}, onClick={(e) => { e.stopPropagation(); setEditingId(p.id); setEditTitle(p.title); }}, className "h-7 w-7 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 active:scale-90 transition-all" — HAS hover:bg + active:scale-90 + transition-all, NO ring; absolutely positioned top-2 right-2, 8px inset, floating OVER the cover image):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` ring-only (OUTWARD — the button is 8px-inset from the card edge so an outward 2px ring is NOT clipped by the overflow-hidden card; ring-white/70 — the outward ring renders against the cover image/gradient surface behind the button, white for contrast over arbitrary imagery; KEEP active:scale-90 [pre-existing, do NOT renumber to scale-95]; KEEP transition-all [already present -> no flip]; KEEP aria-label).

D. Toggle-public overlay button (L352, RAW, ICON-ONLY Lock/Globe, ALREADY aria-label={p.is_public ? "Make private" : "Make public"}, onClick stopPropagation + togglePublicMutation, className identical pattern to C "h-7 w-7 ... hover:bg-black/60 active:scale-90 transition-all"):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` ring-only (same rationale as C; KEEP active:scale-90 + transition-all + aria-label; this is a one-shot action toggle that immediately fires a mutation + flips the icon -> NO aria-pressed [the icon itself conveys state, not a persistent pressed-style bg]).

E. Delete overlay button (L360, RAW, ICON-ONLY Trash2, ALREADY aria-label={`Delete ${p.title}`}, onClick stopPropagation + confirm() + deleteMutation, className "h-7 w-7 ... hover:bg-destructive/80 active:scale-90 transition-all"):
   plan: APPEND `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` ring-only (same rationale as C; KEEP active:scale-90 + transition-all + aria-label; one-shot action -> NO aria-pressed).

TWO FOCUS-INDICATOR EDGE CASES I want your verdict on:

F (QUESTION Q-F). The inline rename input (L311, RAW <input type="text">, conditionally rendered when isEditing, autoFocus, on a `bg-white/95` pill at the bottom of the cover, className "w-full h-7 px-2 rounded-md bg-white/95 text-foreground text-xs font-bold focus:outline-none" — it REMOVES the native outline via `focus:outline-none` but adds NO replacement ring -> a focus-indicator gap). Should I (a) APPEND `focus-visible:ring-2 focus-visible:ring-ring` (it already strips the outline; on the white/95 pill a black ring-ring is clearly visible; minimal a11y fix), (b) leave it (transient autofocused edit-mode input, low risk), or (c) something else? It already has `focus:outline-none` (note: `focus:` not `focus-visible:`). Pick the most consistent option.

G (QUESTION Q-G). The "Public" native checkbox in the create form (L238, RAW <input type="checkbox">, className "h-4 w-4 rounded border-border" — NO `focus:outline-none`, so it KEEPS the browser-native focus outline). Per don't-churn + the fact that native checkboxes ship a native focus indicator, my plan is to LEAVE it untouched (do NOT add a focus-visible:ring — a native checkbox is not a button and already has a visible native focus state). Confirm leave, or correct.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- Header back shadcn <Button aria-label="Back"> L166, "New" shadcn <Button> L176, Create shadcn <Button> L248, empty-state create shadcn <Button> L274: all ship tokens -> leave.
- Create-form title <input> L221 + description <textarea> L229: RAW but ALREADY focus:outline-none focus:ring-2 focus:ring-rose-500/30 -> valid existing focus ring -> don't-churn -> leave.
- Summary banner motion.div L189, create-form motion.div L204, playlist-tile motion.div L288: entrance anim, NO onClick -> presentational -> leave.
- The Play overlay div L333, the Public/Private badge span L336, the cover img + gradient fallback, all icons + text: decorative.

QUESTIONS:
Q1. Cancel X (A): FRESH transition-all + active:scale-95 + OUTWARD ring-ring (on bg-card) + KEEP aria-label — correct?
Q2. Cover-open button (B): the KEY ring call — RING-INSET + ring-white/70 (flush edge child of overflow-hidden rounded card, image/gradient fill) + KEEP active:opacity-80 (NO manufactured scale) + KEEP transition-opacity + KEEP aria-label — correct? Or should the cover button use an OUTWARD ring / ring-ring instead?
Q3. The 3 overlay action buttons (C/D/E): ring-white/70 (OUTWARD, since they're 8px-inset so not clipped, and the ring renders over the cover image) + KEEP active:scale-90 (no renumber) + KEEP transition-all (no flip) + KEEP aria-label + NO aria-pressed (one-shot actions; D's toggle conveys state via the swapped icon, not a pressed bg) — correct? Or should these be ring-inset, or ring-ring?
Q4 (Q-F). The inline rename input (F): add ring-ring, or leave? Pick the most consistent option.
Q5 (Q-G). The native Public checkbox (G): leave (native focus indicator) — confirm?
Q6. Confirm the 4 shadcn Buttons, the title input + description textarea (existing focus:ring), and all 3 motion.divs (presentational) are handled correctly.
Q7. At 375px, does the header (back + title + New), the create form, and the 2-col playlist grid (each tile aspect-square with a bottom title pill + a 9x9 Play overlay + a 3-button h-7 w-7 overlay cluster at top-right) lay out without crushing or the 3 overlay buttons overflowing the tile? And at iPad 768/1024 + desktop 1280 within max-w-2xl (2-col grid)?

Please answer Q1-Q7 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/PlaylistsPage.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
The user wants me to review their planned edits for `src/pages/PlaylistsPage.tsx` — a premium interaction polish pass. Let me carefully analyze each planned edit against the design token system and the patterns established across 40+ prior slices.

Let me work through each question:

**Q1. Cancel X (A): FRESH transition-all + active:scale-95 + OUTWARD ring-ring (on bg-card) + KEEP aria-label**

The Cancel button has `hover:bg-secondary` — so `transition-all` is correct (it needs to ease the hover color fade alongside the new scale). `active:scale-95` is the icon-only tier. The button sits inside the `bg-card` create form — an outward `ring-ring` renders against the neutral bg-card. `aria-label="Cancel"` is already present.

→ **Correct.** No changes needed.

**Q2. Cover-open button (B): RING-INSET + ring-white/70 + KEEP active:opacity-80 + KEEP transition-opacity + KEEP aria-label**

This is the KEY judgment call. The button is `w-full aspect-square` — a flush edge child of the tile `motion.div` which is `relative rounded-2xl overflow-hidden bg-card border`. The overflow-hidden on the parent means an outward ring would be clipped.

Wait, actually — the button IS the cover. It fills the entire `aspect-square` area of the tile. The tile is `rounded-2xl overflow-hidden`. So the button is flush with the tile edges. An outward ring would be partially clipped by the parent's `overflow-hidden` + `rounded-2xl`.

For `ring-inset` + `ring-white/70`: The ring renders inside the button, on top of whatever the cover content is (image or gradient). White/70 provides good contrast over arbitrary imagery. This is correct.

The button already has `active:opacity-80` (opacity-based press) + `transition-opacity`. Per the NO-OP / pre-existing-press policy, we KEEP these and do NOT manufacture a scale.

→ **Correct.** No changes needed.

**Q3. The 3 overlay action buttons (C/D/E): ring-white/70 (OUTWARD) + KEEP active:scale-90 + KEEP transition-all + KEEP aria-label + NO aria-pressed**

These are `absolute top-2 right-2` buttons floating over the cover. They are `h-7 w-7 rounded-full`. The card is `rounded-2xl overflow-hidden`.

The question is: would an outward ring be clipped? The buttons are positioned at `top-2 right-2` (8px from the top-right corner). The parent has `overflow-hidden` + `rounded-2xl` (presumably 16px border radius). At 8px from the corner, the button center is roughly at (card-width - 8 - 3.5px, 8 + 3.5px) = (card-width - 11.5, 11.5). With `rounded-2xl` (16px radius), at 11.5px from the edge the curve is still clipping... let me think more carefully.

Actually, `rounded-2xl` is `border-radius: 1rem` = 16px. The `overflow-hidden` clips anything outside the rounded rectangle. The button is at `top-2 right-2` (8px inset). The button itself is `h-7 w-7` = 28px. So the button spans from (card-width-8-28, 8) to (card-width-8, 8+28) = (card-width-36, 8) to (card-width-8, 36).

For the top-right corner with 16px radius: at y=8 (8px from top), the clipping edge is at x = card-width - 16 + sqrt(16² - (16-8)²) = card-width - 16 + sqrt(256-64) = card-width - 16 + sqrt(192) ≈ card-width - 16 + 13.86 = card-width - 2.14.

So at y=8, the clip edge is ~2.14px from the right edge. The button's right edge is at card-width-8, so the button extends 8-2.14 = ~5.86px past the clip edge at that y-coordinate. But the button's top-right corner would be at (card-width-8, 8) — which is well inside the 16px radius clip at y=8 (clip at card-width-2.14). So the button's right edge at y=8 is at card-width-8, and the clip at that y is at card-width-2.14. Since card-width-8 < card-width-2.14, the button IS inside the clip at y=8.

Wait, I'm confusing myself. Let me reconsider. The overflow-hidden clips content to the element's padding box with rounded corners. The clipping creates a rounded rectangle. Points INSIDE this rectangle are visible; points outside are clipped.

For the top-right corner with radius 16px: the clip boundary follows a quarter-circle centered at (card-width-16, 16) with radius 16. Any point where sqrt((x-(card-width-16))² + (y-16)²) > 16 is clipped.

The button's top-right corner is at (card-width-8, 8). Distance from clip center = sqrt((card-width-8-(card-width-16))² + (8-16)²) = sqrt(8² + 8²) = sqrt(128) ≈ 11.3. Since 11.3 < 16, this point is INSIDE the clip. ✓

The button's bottom-right corner is at (card-width-8, 36). Distance = sqrt(8² + (36-16)²) = sqrt(64+400) = sqrt(464) ≈ 21.5. Since 21.5 > 16, this point is OUTSIDE the clip. ✗

Wait, that means the bottom-right corner of the button IS clipped by the parent's overflow-hidden + rounded-2xl. Hmm, but that's the tile `motion.div` with `relative rounded-2xl overflow-hidden bg-card border` — and the cover button is `w-full aspect-square`. The cover button fills the entire square. The overlay button cluster at `absolute top-2 right-2` is also inside the same overflow-hidden container.

So actually, the bottom portion of the right-side overlay buttons MIGHT be clipped by the rounded corner. But wait — the rounded corner is at the BOTTOM of the tile too. At the TOP-right, with the button at top-2, the concern is the top-right corner of the tile.

Let me recalculate. Top-right corner clip: center at (tile-width-16, 16), radius 16. The overlay button's top-right corner (card-width-8, 8): distance = sqrt(8²+8²)=11.3 < 16 ✓. The overlay button's top-left corner (card-width-36, 8): distance = sqrt(36²+8²)=sqrt(1296+64)=sqrt(1360)≈36.9 > 16 ✗. 

Wait, that can't be right either. The button top-left at (card-width-36, 8) — distance from clip center (card-width-16, 16): sqrt((36-16)²+(16-8)²)=sqrt(400+64)=sqrt(464)≈21.5 > 16. So the top-left corner of the button IS clipped too?

That seems extreme. Let me reconsider — `rounded-2xl` = 16px border radius. The tile's aspect ratio is determined by its content (the cover button is `aspect-square`, so the tile is square). If the tile is, say, 180px wide and 180px tall:

Top-right clip center: (180-16, 16) = (164, 16). Overlay button spans (180-36, 8) to (180-8, 36) = (144, 8) to (172, 36).

At (144, 8): distance from (164, 16) = sqrt(20²+8²)=sqrt(464)≈21.5 > 16 → CLIPPED
At (172, 8): distance from (164, 16) = sqrt(8²+8²)=11.3 < 16 → visible
At (144, 36): distance from (164, 16) = sqrt(20²+20²)=sqrt(800)≈28.3 > 16 → CLIPPED
At (172, 36): distance from (164, 16) = sqrt(8²+20²)=sqrt(464)≈21.5 > 16 → CLIPPED

So... the bottom-right corner of the overlay button IS in the rounded-2xl clip zone? Hmm. But the tile's aspect ratio from the cover button is `aspect-square`. At 375px viewport with max-w-2xl, px-4, gap-3, 2 columns: each tile is about (375 - 16 - 16 - 12) / 2 = 343/2 ≈ 165.5px wide.

With 165px tile: overlay button at (165-36, 8) to (165-8, 36) = (129, 8) to (157, 36). Clip center at (149, 16).

At (129, 8): dist from (149, 16) = sqrt(20²+8²) = 21.5 > 16 → CLIPPED
At (157, 8): dist from (149, 16) = sqrt(8²+8²) = 11.3 < 16 → visible
At (157, 36): dist from (149, 16) = sqrt(8²+20²) = 21.5 > 16 → CLIPPED

So yes, the bottom portion of the overlay buttons near the right edge IS potentially clipped by the rounded corner. But this is a visual layout issue that exists regardless of my ring addition — the buttons themselves are already partially in the clip zone. The UI designer presumably intended these to float inside the tile, and the 8px inset from edges is enough that the buttons look fine visually even if the very corners are clipped.

For the focus ring: adding an outward ring would make the clipping more visible (the ring extends 2px outward from the 28px button, making it effectively 32px, which exacerbates the clipping). So maybe ring-inset would be better for these overlay buttons too?

But wait — the user's plan says "OUTWARD — the button is 8px-inset from the card edge so an outward 2px ring is NOT clipped by the overflow-hidden card." This is wrong based on my analysis. At the rounded corner, 8px inset is NOT enough to keep an outward ring unclipped.

However, this is a nuanced geometry issue. In practice, the clipping of the ring at the corner might be barely noticeable — it would just make the ring slightly truncated at the rounded corner. The alternative (ring-inset) would put the ring ON TOP of the semi-transparent overlay button content, which is also not ideal.

Actually, let me reconsider the practical impact. The overlay buttons are `bg-black/40 backdrop-blur-sm` — semi-transparent black glass. The buttons are small (28px) and at 8px from the edge. The overflow-hidden with rounded-2xl does clip at the corners, but:

1. The cover button (B) fills the entire square and is `relative` — it provides the context for the overlay buttons.
2. The tile itself is `rounded-2xl overflow-hidden bg-card border` — the bg-card and border define the tile boundary.
3. The overlay buttons are absolutely positioned inside this tile.

In real-world visual terms, the slight clip at the rounded corner is likely invisible to users because:
- The button content (Pencil/Lock/Trash icon at 12px) is centered in the 28px button
- The ring extends to 32px effective width
- At the rounded corner, maybe 1-2px of the ring is clipped
- This is purely cosmetic for the focus indicator

Given the practical insignificance of the clip and the fact that ring-inset would overlay the button content, I think OUTWARD ring-white/70 is the right call — the clip is negligible. BUT I should flag it as a nuance.

Actually, wait. Let me re-examine. The user says these are "8px-inset from the card edge." But the card edge at the top-right corner curves inward. At 8px from the TOP and 8px from the RIGHT, the actual distance from the rounded edge depends on the radius.

For a 16px radius corner, at the point (8px from right, 8px from top), the distance to the curve is 16 - sqrt(8² + 8²) = 16 - 11.3 = 4.7px. So there's about 4.7px of clearance from the button's top-right corner to the curve. An outward ring adds 2px, leaving ~2.7px clearance. The bottom-right corner of the button (8px from right, 36px from top = 20px below the clip center) — distance to curve = 16 - sqrt(8² + 20²) = 16 - 21.5 = -5.5. NEGATIVE. So the button's bottom-right area IS inside the clip zone.

This means the bottom-right corner of the button IS clipped, and the outward ring there would be clipped too. But this is the same whether or not we add a ring — the button itself is already in the clip zone at its bottom-right.

I think the right answer is: **ring-inset is more correct** for these overlay buttons, since they're inside an overflow-hidden rounded container and partially in the clip zone. But ring-inset over the semi-transparent bg-black/40 button... the ring would be white/70 which would show up fine against the dark semi-transparent background.

Actually, you know what — let me look at this from the pattern perspective. In the 40+ prior slices, what pattern was used for absolutely-positioned overlay buttons inside rounded overflow-hidden cards?

From the rulebook examples, I see patterns like:
- Flush edge child of overflow-hidden → ring-inset
- 8px+ inset from edge → outward ring

But the analysis shows that 8px is NOT enough at a 16px radius corner. The threshold for "not clipped with an outward 2px ring" would need to be about 16 - sqrt(16²-16² + ...) — actually this depends on the specific geometry.

For a simpler heuristic: if the button's farthest corner from the rounded clip center is within the radius, it's safe. The button's farthest corner from the top-right clip center (tile-width-16, 16) is the button's bottom-left at (tile-width-36, 36): distance = sqrt(20²+20²)=28.3 >> 16. So yes, that corner is clipped.

OK, I think the most honest assessment is:

1. The overlay buttons ARE partially clipped by the rounded-2xl overflow-hidden corner — this is an existing layout fact, not something we're introducing.
2. An outward ring would be clipped slightly more — but the clip is at the corner of the button, and the button content (icons) are centered, so the visual impact is minimal.
3. ring-inset would avoid the clip issue but renders ON TOP of the semi-transparent button face.
4. In practice, the focus ring appears only on keyboard focus, which is a momentary state — perfect geometric purity is less important than visibility.

I'll recommend keeping the outward ring but flagging the clip nuance. Or, for maximum correctness, ring-inset + ring-white/70 (the inset ring on bg-black/40 would be a subtle white line inside the button — visible and geometrically clean).

Hmm, actually I think the user's instinct to use outward is fine. Let me look at this more carefully...

The tiles at mobile (375px) are ~165px. At desktop 1280px with max-w-2xl (672px), tiles are (672-12)/2 = 330px. At 330px, the rounded-2xl is still 16px radius. The button at top-2 right-2 (8px) from a 330px tile:

Button top-right corner (322, 8): dist from (314, 16) = sqrt(8²+8²)=11.3 < 16 ✓
Button bottom-right corner (322, 36): dist from (314, 16) = sqrt(8²+20²)=21.5 > 16 ✗

Still clipped at the bottom-right of the button, regardless of tile size (since it depends on the inset and radius, not the tile width). So this is a consistent issue.

OK, my recommendation: I'll suggest **ring-inset + ring-white/70** for the 3 overlay buttons (C/D/E) as well, for geometric consistency. The ring renders inside the 28px button face, which is bg-black/40 — the white/70 ring is clearly visible against this semi-transparent dark background. And it avoids any clip issues.

Wait, but the user specifically asked "Or should these be ring-inset, or ring-ring?" — they're open to correction.

Let me reconsider. Looking at prior slices for the exact same pattern... Actually, I recall from the AGENTS.md and task board that there were car-dealership pages with overlay buttons. Let me think about what pattern was used there.

From the task board: `PublicCarDealershipDetailPage` had similar overlay action buttons on vehicle cards. Without seeing the exact diff, the established pattern for overlay buttons on image cards in this repo seems to be outward ring with ring-white/70.

But the geometric analysis shows the clip is real. I think the right call is:

**For C/D/E: ring-inset + ring-white/70** — since the buttons sit inside an overflow-hidden rounded container and are close enough to the rounded corner that an outward ring would be clipped, ring-inset is geometrically safer. The inset ring on bg-black/40 with white/70 is visible.

Actually, I just realized something. Let me re-read the user's analysis:

> OUTWARD — the button is 8px-inset from the card edge so an outward 2px ring is NOT clipped by the overflow-hidden card

The user's reasoning is that 8px inset is enough. But as I calculated, at the rounded corner, 8px from each axis gives only ~4.7px clearance from the curve, and the button extends ~28px down, putting its bottom portion well into the clipped zone. So the user's premise is incorrect.

However — this is a VERY subtle point. And in practice, the clip happens at the bottom-right of the 28px button, which is 28px below the top-2 position = 30px from the top. At that height, the rounded corner is fully resolved (the corner radius is only 16px, so at 30px we're past the curve). The clip actually only affects the right edge of the button near the TOP of the button.

Wait, let me re-examine. At y=8 (button top), the clip edge from the right is at: x_right_clip = tile_width - 16 + sqrt(16² - (16-8)²) = tile_width - 16 + sqrt(192) = tile_width - 16 + 13.86 = tile_width - 2.14.

So at y=8, the clip cuts off anything beyond tile_width - 2.14 from the left. The button's right edge is at tile_width - 8. Since tile_width - 8 < tile_width - 2.14, the button is INSIDE the clip at y=8. ✓

At y=16 (16px from top = the clip center height), the clip edge from the right is at: tile_width - 16 + 16 = tile_width. At the clip center height, the full width is available. ✓

At y=0 (top of tile), the clip edge from the right is at: tile_width - 16 + sqrt(16² - 16²) = tile_width - 16. So at y=0, everything within 16px of the right edge is clipped. ✓

At y=8, we have tile_width - 2.14 as the clip edge. The button's right edge at tile_width - 8 is inside. ✓

What about the outward ring? The ring extends 2px outward. So the ring's right edge would be at tile_width - 6. At y=8, the clip is at tile_width - 2.14. tile_width - 6 < tile_width - 2.14. So the ring IS inside the clip at y=8. ✓

What about at y=6 (ring's top edge, button top minus 2px for outward ring)? Clip at y=6: sqrt(16² - (16-6)²) = sqrt(256-100) = sqrt(156) ≈ 12.49. Clip edge at tile_width - 16 + 12.49 = tile_width - 3.51. Ring's right edge at tile_width - 6 < tile_width - 3.51. ✓ Still inside.

At y=4 (ring top minus 2 more): sqrt(16² - 12²) = sqrt(112) ≈ 10.58. Clip at tile_width - 5.42. Ring right at tile_width - 6 < tile_width - 5.42. ✓ Barely inside.

At y=3: sqrt(16² - 13²) = sqrt(87) ≈ 9.33. Clip at tile_width - 6.67. Ring right at tile_width - 6 > tile_width - 6.67. ✗ CLIPPED!

At y=2 (button top - 2 for ring): sqrt(16² - 14²) = sqrt(60) ≈ 7.75. Clip at tile_width - 8.25. Ring right at tile_width - 6 > tile_width - 8.25. ✗ CLIPPED.

So the outward ring IS clipped at the top-right corner area (y=2-3 region). The clip is small (a few pixels) but real.

Given this analysis, I should correct the user's claim. The most technically correct option is **ring-inset** for C/D/E as well. However, the clipping is only at the very top-right corner of the ring and is a few pixels — in practice, the ring is still mostly visible. The alternative, ring-inset, puts the ring inside the button face (on top of the semi-transparent bg-black/40), which is slightly less clean visually but geometrically correct.

I think I'll recommend ring-inset for consistency with B, since these are all inside the same overflow-hidden rounded container. The user asked "Or should these be ring-inset, or ring-ring?" — so they're open to this correction.

For ring-inset on C/D/E: the button is bg-black/40 (semi-transparent dark) — a white/70 inset ring would be clearly visible. ✓

Let me now finalize all my answers:

**Q1 (A):** ✅ Correct. FRESH transition-all (hover:bg-secondary) + active:scale-95 (icon tier) + OUTWARD ring-ring (neutral bg-card form) + KEEP aria-label.

**Q2 (B):** ✅ Correct. RING-INSET + ring-white/70 (flush edge child of overflow-hidden rounded parent, ring renders on image/gradient fill) + KEEP active:opacity-80 (pre-existing press) + KEEP transition-opacity + KEEP aria-label.

**Q3 (C/D/E):** ❌ Correction needed. The user says "OUTWARD — the button is 8px-inset from the card edge so an outward 2px ring is NOT clipped." My geometric analysis shows the outward ring IS slightly clipped at the top-right corner of each button (the 16px rounded-2xl corner clips ~1-3px of the ring in the corner region). The correct call is **ring-inset + ring-white/70** (consistent with B — all four tile-internal buttons are inside the same overflow-hidden rounded-2xl container). The inset ring on bg-black/40 backdrop-blur-sm is visible (white/70 against dark semi-transparent). KEEP active:scale-90 (pre-existing, no renumber) + KEEP transition-all (already present) + KEEP aria-label + NO aria-pressed (all three are one-shot actions; D toggles via mutation + icon swap, not a pressed bg).

Wait, actually — ring-inset on C/D/E means the ring renders inside the 28px button, over the bg-black/40 content. Is that aesthetically good? The icon is 12px centered, the ring would be a 2px white/70 line inside the 28px rounded circle — it would look like a subtle inner glow. That's actually pretty nice for a glass overlay button.

But there's another consideration. For B, the cover button, ring-inset is chosen because it's a FLUSH edge child (fills the entire tile). For C/D/E, they're 8px-inset — they're NOT flush edge children. The rule says "Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent." C/D/E are NOT flush edge children — they're 8px inset. So by the literal rule, they should be outward.

Hmm, but the geometric reality is that the outward ring gets clipped. The rule is a heuristic, and the geometry defeats it here because the buttons are near a rounded corner.

I think the right answer is nuanced: the buttons are technically not flush-edge children, so the literal rule says outward. But geometric analysis shows slight clipping. However, the clipping is only 1-3px at the corner of the ring, and the ring is still mostly visible. In practice, this is negligible.

I'll recommend keeping the user's plan (outward ring-white/70) but flagging the slight corner clip as a cosmetic note. This is consistent with the literal rule (not a flush edge child) and the practical impact is minimal. The alternative (ring-inset) is also defensible but technically violates the "flush edge child" prerequisite.

Actually, you know what, let me look at this differently. The CLIP comes from the parent tile's rounded-2xl overflow-hidden. The buttons are 8px from the edges. The question is whether an outward ring on a small button near a rounded corner gets clipped. My analysis says yes, by ~1-3px. But this is a focus-ring-only state (keyboard users only). The ring would appear as a slightly truncated circle at the top-right — still clearly visible and recognizable as a focus indicator.

I'll go with: **correct the user's reasoning** (their premise that "8px inset = not clipped" is wrong for rounded-2xl corners) but **keep the same prescription** (outward ring-white/70) because the clipping is cosmetic-negligible and the literal rule (not a flush edge child) supports outward.

Hmm, but that's a confusing recommendation. Let me just be clear: "Your reasoning has a flaw but your prescription is still correct, here's why."

OK let me finalize:

**Q1:** ✅ Correct as planned.

**Q2:** ✅ Correct as planned.

**Q3:** Partially correct. The ring color (ring-white/70) and all KEEP decisions are correct. The OUTWARD vs ring-inset call: I'll recommend **ring-inset + ring-white/70** instead of outward, for geometric correctness. While C/D/E are not "flush edge children" in the strictest sense (8px inset), they ARE inside the same overflow-hidden rounded-2xl container, and an outward ring would be slightly clipped at the top-right corner. ring-inset on bg-black/40 is visually clean. The rest (KEEP active:scale-90, KEEP transition-all, KEEP aria-label, NO aria-pressed) is all correct.

Actually wait, I keep going back and forth. Let me make a final decision.

The literal rule: "Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent."

C/D/E are NOT flush — they're 8px inset. So the literal rule says outward. The geometry says the outward ring gets 1-3px clipped at the corner. But the ring is still 95%+ visible.

The precedent from B: B IS a flush edge child, so ring-inset is clearly correct for B.

I'll go with: **keep outward ring-white/70 for C/D/E** (literal rule applies — not flush edge children). Note the geometric clip as a cosmetic footnote. This is the most consistent application of the rules.

Final answer:

**Q1:** ✅ Correct.
**Q2:** ✅ Correct.
**Q3:** ✅ Correct (outward ring-white/70). The "8px inset = not clipped" reasoning is slightly imprecise (the rounded-2xl corner does clip ~1-3px of the ring at the very corner), but the literal rule supports outward (not a flush edge child), and the cosmetic clip is negligible on a keyboard-only focus indicator. KEEP everything else.
**Q4:** ADD `focus-visible:ring-2 focus-visible:ring-ring` — the input already strips the native outline (`focus:outline-none`) and has no replacement ring. On the `bg-white/95` pill, ring-ring (black) is clearly visible. This is the most consistent option (a). Minimal fix: append `focus-visible:ring-2 focus-visible:ring-ring` (it already has `focus:outline-none`, so just adding the ring).
**Q5:** ✅ Leave the native checkbox untouched. Native checkboxes ship a browser-native focus indicator. Don't-churn.
**Q6:** ✅ All correct.
**Q7:** Need to analyze responsive layout.

For Q7:
At 375px: max-w-2xl mx-auto px-4 → inner width = 375 - 32 = 343px. Grid 2-col gap-3 → each tile = (343-12)/2 = 165.5px.

Header: back (40px) + gap-12 (12px) + flex-1 title area + gap-12 (12px) + New button (~80px with icon + "New" text + px-3 + h-9). Total = 40 + 12 + flex + 12 + 80 = 144 + flex. At 375px with px-4 (32px), available = 343px → flex = 343-144 = 199px for the title. Fits. ✓

Create form: stacked inputs, no horizontal crush. ✓

2-col grid: each tile 165.5px aspect-square. The cover button fills the square. The Play overlay is h-9 w-9 (36px) at bottom-3 right-3 — inside the 165px tile, fine. The overlay action cluster is 3× h-7 w-7 (28px) + gap-1 (4px) = 28+4+28+4+28 = 92px at top-2 right-2. 92px < 165px. Fits. ✓

But wait — does the 92px cluster overflow? At top-2 right-2, the cluster spans from (165-8-92, 8) to (165-8, 36) = (65, 8) to (157, 36). At the rounded corner (16px radius), is any of this clipped? As calculated earlier, the top-right corner (157, 8) has distance 11.3 from clip center — inside. The top-left corner (65, 8) is far from any clip edge. ✓

What about the title text below the title/track-count at bottom-3 left-3 right-3? The text is below the Play overlay (bottom-3 right-3). The title is left-3, the Play button is right-3 — they share the bottom-3 row. At 165px wide: left-3 = 12px left margin, right-3 = 12px right margin, Play button = 36px. Text area = 165 - 12 - 12 - 36 = 105px. At text-sm (14px) with line-clamp-1, 105px fits "Playlist Name" easily. ✓

At 768/1024 (iPad): still within max-w-2xl (672px). Grid 2-col = 330px tiles. Even more room. ✓

At 1280 (desktop): max-w-2xl = 672px. Same. ✓

The overlay buttons' small text (no text, just icons) and the 2-col grid scale well. ✓

OK, now let me write up the final response.

Wait, one more thing — for Q4 (the inline rename input). The user says:

> className "w-full h-7 px-2 rounded-md bg-white/95 text-foreground text-xs font-bold focus:outline-none" — it REMOVES the native outline via focus:outline-none but adds NO replacement ring -> a focus-indicator gap

The user's plan (a) is to append `focus-visible:ring-2 focus-visible:ring-ring`. This is correct. The input already has `focus:outline-none` — we just need to add the ring. Note that the existing `focus:outline-none` uses `focus:` (not `focus-visible:`), which means it strips the outline on click too. The ring we're adding uses `focus-visible:` (keyboard only). So on mouse click: outline-none (from existing class), no ring (focus-visible doesn't trigger on mouse). On keyboard focus: outline-none + ring appears. This is the standard pattern.

Should we also change `focus:outline-none` to `focus-visible:outline-none`? The user said "className-only" pass and "keep ALL logic byte-identical." Changing `focus:` to `focus-visible:` is a className change but it alters the visual behavior (mouse-click focus would show the default browser outline). This is a don't-churn situation — the `focus:outline-none` is pre-existing and we shouldn't change it. Just append the ring.

Actually wait — `focus:outline-none` removes the outline on ALL focus (mouse + keyboard). If we add `focus-visible:ring-2`, the ring appears only on keyboard focus. On mouse click: no outline, no ring. On keyboard: no outline, ring. This is the standard accessible pattern. ✓

But there's a subtle issue: `focus:outline-none` vs `focus-visible:outline-none`. If we're adding `focus-visible:ring-2 focus-visible:ring-ring`, should the outline-none also be `focus-visible:` to avoid removing the outline on mouse click? Well, the existing code already removes it on mouse click, and that's a pre-existing behavior we don't change. Just append. ✓

Final answer: append `focus-visible:ring-2 focus-visible:ring-ring` to the existing className. The `focus:outline-none` stays as-is.

One more consideration: the input is on a `bg-white/95` pill overlaying the cover image. `ring-ring` (--ring = black) on a white/95 background is clearly visible. ✓

OK, I'm confident in all my answers now. Let me write the response.

Let me also count the total edits:
- A: 1 className change (Cancel X)
- B: 1 className change (cover-open)
- C: 1 className change (Rename)
- D: 1 className change (Toggle-public)
- E: 1 className change (Delete)
- F: 1
