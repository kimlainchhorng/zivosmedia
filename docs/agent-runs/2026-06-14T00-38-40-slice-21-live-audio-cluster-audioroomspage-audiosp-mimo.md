# MiMo run — 2026-06-14T00:38:40.226Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

**6 controls across 2 files.** All changes are className-only + display-only `aria-*` attrs. Zero logic/handler/state changes.

| Control | File | Type | Action |
|---------|------|------|--------|
| (A) "Live" tab | AudioRoomsPage | raw `<button>`, segmented | `aria-pressed` + `[0.97]` + ring |
| (B) "Past" tab | AudioRoomsPage | raw `<button>`, segmented | `aria-pressed` + `[0.97]` + ring |
| (C) Room card | AudioRoomsPage | `motion.button` + `whileTap` | **ring only** |
| (D) Topic filter chips | AudioSpacesPage | shadcn Badge → `<div>`, toggle | `aria-pressed` + `[0.97]`, NO ring |
| (E) Create-form topic chips | AudioSpacesPage | shadcn Badge → `<div>`, toggle | `aria-pressed` + `[0.97]`, NO ring |
| (F) Space card | AudioSpacesPage | shadcn Card → `<div>`, nav action | `transition-all` + `[0.98]`, NO ring, NO `aria-pressed` |

---

## Exact diffs

### FILE 1: `src/pages/AudioRoomsPage.tsx`

**(A) "Live" tab — line ~136**

```diff
- <button type="button" onClick={() => setTab("live")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5", tab === "live" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
+ <button type="button" onClick={() => setTab("live")} aria-pressed={tab === "live"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "live" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
```

**Rationale:** Segmented toggle-button. `transition-all` already present (covers both `hover:bg` color fade + new `active:scale` transform). `[0.97]` chip/segmented tier. Normal outward ring — parent `flex gap-2` is NOT `overflow-hidden`.

**(B) "Past" tab — line ~140**

```diff
- <button type="button" onClick={() => setTab("ended")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "ended" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
+ <button type="button" onClick={() => setTab("ended")} aria-pressed={tab === "ended"} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "ended" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>
```

**Rationale:** Identical pattern to (A). Same tier, same ring treatment.

**(C) Room card — the `motion.button` className, line ~172**

```diff
- className={cn("w-full text-left rounded-2xl bg-card border p-3.5 hover:bg-secondary/40 transition-colors", isLive ? "border-rose-500/30" : "border-border")}
+ className={cn("w-full text-left rounded-2xl bg-card border p-3.5 hover:bg-secondary/40 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isLive ? "border-rose-500/30" : "border-border")}
```

**Rationale:** `motion.button` WITH `whileTap={{ scale: 0.985 }}` → CSS `active:scale` is DEAD → **ring only**. Keep `transition-colors` (not `transition-all`) — `transition-colors` handles the `hover:bg-secondary/40` background-color fade; the focus ring (box-shadow) appears/disappears instantly since `transition-colors` doesn't cover `box-shadow`, which is **correct** for focus feedback. Real `<button>` (natively focusable). Normal outward ring — card is NOT `overflow-hidden`.

---

### FILE 2: `src/pages/AudioSpacesPage.tsx`

**(D) Topic filter chips — lines ~204-209**

```diff
- <Badge key={topic} variant={selectedTopic === topic ? "default" : "outline"} className="cursor-pointer whitespace-nowrap shrink-0"
-   onClick={() => setSelectedTopic(topic)}>
+ <Badge key={topic} variant={selectedTopic === topic ? "default" : "outline"} className="cursor-pointer whitespace-nowrap shrink-0 transition-all active:scale-[0.97]"
+   aria-pressed={selectedTopic === topic}
+   onClick={() => setSelectedTopic(topic)}>
```

**Rationale:** BadgesPage precedent. shadcn `<Badge>` renders a `<div>` — keyboard-inaccessible, so NO ring (dead CSS). `aria-pressed` conveys toggle selection. `[0.97]` chip tier. Parent is `overflow-x-auto` (not `overflow-hidden`) but ring is correctly omitted per the clickable-`<div>` rule regardless.

**(E) Create-form topic chips — lines ~219-221**

```diff
- <Badge key={t} variant={newTopic === t ? "default" : "outline"} className="cursor-pointer" onClick={() => setNewTopic(t)}>
+ <Badge key={t} variant={newTopic === t ? "default" : "outline"} className="cursor-pointer transition-all active:scale-[0.97]" aria-pressed={newTopic === t} onClick={() => setNewTopic(t)}>
```

**Rationale:** Identical pattern to (D). Same BadgesPage precedent.

**(F) Space card — lines ~250-251**

```diff
- <Card key={space.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-colors"
+ <Card key={space.id} className="p-4 cursor-pointer hover:bg-accent/50 transition-all active:scale-[0.98]"
```

**Rationale:** shadcn `<Card>` renders a `<div>` — keyboard-inaccessible → NO ring (dead CSS). This is a **navigation action** (opens the space), NOT a toggle → NO `aria-pressed`. `transition-colors` → `transition-all` so the new `active:scale-[0.98]` animates alongside the `hover:bg-accent/50` color fade. `[0.98]` wide/card tier (full-width card, same tier as the JobPostingDetailPage close-gig / apply buttons).

---

## Summary of my decisions & where I confirm your proposals

| Control | Your Q | My answer | Divergence |
|---------|--------|-----------|------------|
| **(A/B)** | `aria-pressed` + append `[0.97]` + ring to cn base, `transition-all` already present | ✅ **Confirmed exactly** | None |
| **(C)** | Ring only, keep `transition-colors`, normal outward ring | ✅ **Confirmed exactly** | None |
| **(D/E)** | BadgesPage precedent: `aria-pressed` + `transition-all active:scale-[0.97]`, NO ring | ✅ **Confirmed exactly** | None |
| **(F)** | `transition-colors`→`transition-all` + `active:scale-[0.98]`, NO ring, NO `aria-pressed` | ✅ **Confirmed exactly** | None |
| **(G)** | Flag keyboard inaccessibility for (D)(E)(F) | ✅ **Confirmed** | None |

**Zero divergences.** All your proposed treatments are correct per house convention.

---

## Owner flags (out of scope — NOT fixed)

1. **(D), (E) — Badge filter chips are keyboard-inaccessible:** shadcn `<Badge>` renders a `<div>` with `onClick` but no `tabIndex`/`role`/`onKeyDown`. Keyboard users cannot reach or activate the topic filters on either page. **Owner fix:** add `tabIndex={0}` + `role="button"` + `onKeyDown={(e) => e.key === 'Enter' && setSelectedTopic(topic)}` / `setNewTopic(t)`, after which a `focus-visible:ring` can be added in a follow-up. Same BadgesPage precedent flag (slice 18).

2. **(F) — Space Card is keyboard-inaccessible:** shadcn `<Card>` renders a `<div>` with `onClick` but no `tabIndex`/`role`/`onKeyDown`. Keyboard users cannot open a space. **Owner fix:** add `tabIndex={0}` + `role="button"` + `onKeyDown={(e) => e.key === 'Enter' && setActiveSpace(space)}` (and the other setters), after which a `focus-visible:ring` can follow.

3. **Sub-44px tap targets:** Badge chips and Card padding are compact — same system-wide established pattern, not a regression from this pass.

---

## Verification

After applying the diff, run:
```bash
npm run update
```
Must exit 0 (type-check + worker type-check + production build). **Preview caveat:** AudioRoomsPage needs populated `audio_rooms` rows for room cards to render; AudioSpacesPage needs populated `live_streams` rows for space cards and Badge filters, plus auth for the create form. Empty local DB → previewable states are the empty-state cards (whose only control is a shadcn `<Button>`, already token-covered). Per established protocol, reliance on green gate + clean 6-control className-only diff + byte-identical token patterns verified live on 18+ prior slices.
