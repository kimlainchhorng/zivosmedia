# DeepSeek run — 2026-06-14T00:37:10.463Z

- model: deepseek-chat
- task: SLICE 21 — LIVE-AUDIO CLUSTER: AudioRoomsPage + AudioSpacesPage
==============================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to two customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) pages. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase. If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner — do NOT add the keyboard logic yourself.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width / menu-rows / wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-* (color fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring.
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens to them.
- framer-motion motion.button WITH whileTap -> focus RING ONLY (CSS active:scale is DEAD under motion's inline transform). A motion.button WITHOUT whileTap -> CSS active:scale is LIVE and may be kept/used.
- Non-interactive div/span/img with no onClick -> NOTHING.
- A clickable <div> (incl. shadcn <Badge> and shadcn <Card>, which render divs) with onClick but NO tabIndex/role is keyboard-inaccessible -> add active:scale (NO ring — a ring is dead CSS without role/tabIndex), add aria-pressed ONLY IF it is a toggle/selection (not a nav action), and FLAG the keyboard gap to owner. (This is the established "BadgesPage precedent.")
- ring-inset only inside overflow-hidden rounded parents where a plain outward ring would clip.

============================================================
FILE 1: src/pages/AudioRoomsPage.tsx (203 lines, /audio-rooms)
============================================================
SKIP: Back (shadcn Button L110). Three controls to review:

(A) Segmented tab "Live", L136 — RAW <button type="button">, onClick={() => setTab("live")}, cn() base = "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5", selected branch "bg-ig-gradient text-white shadow-sm" vs unselected "bg-secondary text-foreground hover:bg-muted". Selection conveyed only by bg. transition-all ALREADY present. Parent is <div className="flex gap-2"> (NOT overflow-hidden).
(B) Segmented tab "Past", L140 — RAW <button type="button">, onClick={() => setTab("ended")}, cn() base = "flex-1 h-10 rounded-xl text-xs font-bold transition-all ...", same selected/unselected bg pattern. transition-all ALREADY present.
(C) Room card, L161-195 — motion.button WITH whileTap={{ scale: 0.985 }}, onClick={() => navigate(`/voice-rooms/${r.id}`)}, className = cn("w-full text-left rounded-2xl bg-card border p-3.5 hover:bg-secondary/40 transition-colors", isLive ? "border-rose-500/30" : "border-border"). It IS a real focusable <button> (motion.button renders native <button>). NOT overflow-hidden.

Q-A/B: For the two tabs, add aria-pressed={tab === "live"} / aria-pressed={tab === "ended"} + append " active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" to the cn base (transition-all already there, so just append)? Confirm [0.97] segmented tier + normal outward ring (parent not overflow-hidden).
Q-C: For the room card (motion.button WITH whileTap) — append ONLY " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (ring only; whileTap owns the press-scale; keep transition-colors since there's no CSS transform to animate)? Confirm. Normal outward ring (card not overflow-hidden)?

============================================================
FILE 2: src/pages/AudioSpacesPage.tsx (271 lines, /spaces)
============================================================
SKIP: every shadcn <Button> (Leave/Raise-hand/Mute/Back/Create/Go-Live/Cancel/Start-one), shadcn <Input> (title), shadcn <Badge> that is presentational with NO onClick (LIVE pills L126/L256, topic tag L255), avatars, non-onClick motion.div wrappers. Three control TYPES to review:

(D) Topic filter chips, L204-209 — shadcn <Badge variant={selectedTopic === topic ? "default":"outline"} className="cursor-pointer whitespace-nowrap shrink-0" onClick={() => setSelectedTopic(topic)}> (renders a <div>, NO role/tabIndex -> keyboard-inaccessible; selection conveyed only by variant bg). Parent <div className="flex gap-2 overflow-x-auto no-scrollbar">.
(E) Create-form topic chips, L219-221 — shadcn <Badge variant={newTopic === t ? "default":"outline"} className="cursor-pointer" onClick={() => setNewTopic(t)}> (renders a <div>, NO role/tabIndex; selection by variant bg). Parent <div className="flex gap-2 flex-wrap">.
(F) Space card, L250-266 — shadcn <Card className="p-4 cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => { setActiveSpace(space); setIsMuted(true); setHandRaised(false); }}> (renders a <div>, NO role/tabIndex -> keyboard-inaccessible). This is a NAVIGATION action (opens the space), NOT a toggle.

Q-D/E: Confirm BadgesPage precedent for both Badge clusters: add aria-pressed={selectedTopic === topic} / aria-pressed={newTopic === t} + append " transition-all active:scale-[0.97]" to className, and NO focus ring (dead CSS on a <div>). Yes/no + tweak.
Q-F: For the space <Card onClick> (a clickable <div>, NAV action not toggle): change transition-colors -> transition-all + append active:scale-[0.98], NO ring (dead CSS on <div>), and NO aria-pressed (it's navigation, not a selection toggle)? Or do you prefer to leave the Card untouched? Justify.
Q-G: Confirm I should FLAG to owner that ALL of (D), (E), (F) are keyboard-inaccessible (clickable <div>s needing tabIndex={0} + role="button" + onKeyDown) — out of scope for this className-only pass.

============================================================
DELIVERABLE: For each control (A)-(F) give the EXACT final className string + any attrs. Note where you DIVERGE from my proposed answers and why. Keep it tight.
- files: src/pages/AudioRoomsPage.tsx, src/pages/AudioSpacesPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 21 — LIVE-AUDIO CLUSTER: AudioRoomsPage + AudioSpacesPage

## Plan

Apply className-only interaction tokens + display-only a11y attributes to 6 controls across 2 files, following the established house style from `JobPostingDetailPage.tsx`.

## Proposed Changes

### FILE 1: `src/pages/AudioRoomsPage.tsx`

**Control A — "Live" tab (L136)**
- Add `aria-pressed={tab === "live"}`
- Append ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `cn()` base

**Control B — "Past" tab (L140)**
- Add `aria-pressed={tab === "ended"}`
- Append ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `cn()` base

**Control C — Room card (L161-195)**
- Append ` focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `cn()` base (ring only — `whileTap` owns the press-scale)

### FILE 2: `src/pages/AudioSpacesPage.tsx`

**Control D — Topic filter chips (L204-209)**
- Add `aria-pressed={selectedTopic === topic}`
- Append ` transition-all active:scale-[0.97]` to className
- NO focus ring (dead CSS on `<div>`)

**Control E — Create-form topic chips (L219-221)**
- Add `aria-pressed={newTopic === t}`
- Append ` transition-all active:scale-[0.97]` to className
- NO focus ring (dead CSS on `<div>`)

**Control F — Space card (L250-266)**
- Change `transition-colors` → `transition-all`
- Append ` active:scale-[0.98]`
- NO ring (dead CSS on `<div>`)
- NO `aria-pressed` (navigation, not toggle)

---

## Exact Diffs

### `src/pages/AudioRoomsPage.tsx`

**L136 — Live tab:**
```diff
-<button type="button" onClick={() => setTab("live")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5", tab === "live" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
+<button type="button" onClick={() => setTab("live")} aria-pressed={tab === "live"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "live" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
```

**L140 — Past tab:**
```diff
-<button type="button" onClick={() => setTab("ended")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "ended" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Past</button>
+<button type="button" onClick={() => setTab("ended")} aria-pressed={tab === "ended"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "ended" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Past</button>
```

**L161 — Room card:**
```diff
-<motion.button
-  key={r.id}
-  type="button"
-  initial={{ opacity: 0, y: 4 }}
-  animate={{ opacity: 1, y: 0 }}
-  transition={{ delay: Math.min(idx, 12) * 0.03 }}
-  whileTap={{ scale: 0.985 }}
-  onClick={() => navigate(`/voice-rooms/${r.id}`)}
-  className={cn("w-full text-left rounded-2xl bg-card border p-3.5 hover:bg-secondary/40 transition-colors", isLive ? "border-rose-500/30" : "border-border")}
->
+<motion.button
+  key={r.id}
+  type="button"
+  initial={{ opacity: 0, y: 4 }}
+  animate={{ opacity: 1, y: 0 }}
+  transition={{ delay: Math.min(idx, 12) * 0.03 }}
+  whileTap={{ scale: 0.985 }}
+  onClick={() => navigate(`/voice-rooms/${r.id}`)}
+  className={cn("w-full text-left rounded-2xl bg-card border p-3.5 hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isLive ? "border-rose-500/30" : "border-border")}
+>
```

### `src/pages/AudioSpacesPage.tsx`

**L204-209 — Topic filter chips:**
```diff
-<Badge key={topic} variant={selectedTopic === topic ? "default" : "outline"} className="cursor-pointer whitespace-nowrap shrink-0"
+<Badge key={topic} variant={selectedTopic === topic ? "default" : "outline"} className="cursor-pointer whitespace-nowrap shrink-0 transition-all active:scale-[0.97]"
+  aria-pressed={selectedTopic === topic}
   onClick={() => setSelectedTopic(topic)}>
```

**L219-221 — Create-form topic chips:**
```diff
-<Badge key={t} variant={newTopic === t ? "default" : "outline"} className="cursor-pointer" onClick={() => setNewTopic(t)}>{t}</Badge>
+<Badge key={t} variant={newTopic === t ? "default" : "outline"} className="cursor-pointer transition-all active:scale-[0.97]" aria-pressed={newTopic === t} onClick={() => setNewTopic(t)}>{t}</Badge>
```

**L250-266 — Space card:**
```diff
-<Card key={space.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
+<Card key={space.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-all active:scale-[0.98]"
   onClick={() => { setActiveSpace(space); setIsMuted(true); setHandRaised(false); }}>
```

---

## Answers to Your Questions

**Q-A/B (tabs):** ✅ Confirmed. `[0.97]` segmented tier. Normal outward ring (parent `flex gap-2` is NOT overflow-hidden). `transition-all` already present → just append. `aria-pressed` correct (selection conveyed only by bg).

**Q-C (room card):** ✅ Confirmed. Ring only — `whileTap={{ scale: 0.985 }}` owns the press-scale. Keep `transition-colors` (no CSS transform to animate). Normal outward ring (card NOT overflow-hidden).

**Q-D/E (Badge chips):** ✅ Confirmed. BadgesPage precedent applies exactly: `aria-pressed` + `transition-all active:scale-[0.97]`, NO ring (dead CSS on `<div>`). Both are selection toggles → `aria-pressed` is correct.

**Q-F (space Card):** ✅ Confirmed. `transition-colors` → `transition-all` + `active:scale-[0.98]`. NO ring (dead CSS on `<div>`). NO `aria-pressed` (navigation, not toggle). This is the correct treatment — the Card is a navigation action (opens the space), not a selection toggle.

**Q-G (keyboard flag):** ✅ Confirmed. Flag all three (D, E, F) as keyboard-inaccessible clickable `<div>`s needing `tabIndex={0}` + `role="button"` + `onKeyDown` — out of scope for this className-only pass.

---

## Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + build)
2. **Preview at `/audio-rooms` and `/spaces`** on the travel host or localhost
3. **Verify:**
   - Tab press-scale feels correct (Live/Past tabs)
   - Room card focus ring appears on keyboard tab (AudioRoomsPage)
   - Topic chips respond to touch with scale (AudioSpacesPage)
   - Space cards respond to touch with scale (AudioSpacesPage)
4. **Known keyboard gaps (owner fix needed):**
   - `AudioSpacesPage`: Topic filter chips (D), create-form topic chips (E), and space cards (F) are clickable `<div>`s — keyboard users cannot reach/activate them. Fix: add `tabIndex={0}` + `role="button"` + `onKeyDown` to each, then add `focus-visible:ring` in a follow-up.
