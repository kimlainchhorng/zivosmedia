# MiMo run — 2026-06-14T00:31:43.697Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: You are a senior React / Tailwind / framer-motion reviewer. Please review one file from a React + Vite + TypeScript web app (also wrapped with Capacitor for iOS and Android). We are doing a small accessibility-and-polish pass: adding keyboard focus rings, press feedback, and ARIA labels to interactive controls. Reference style file: src/pages/hubs/JobPostingDetailPage.tsx.

File under review: src/pages/NotificationsPage.tsx (a notifications feed, ~867 lines).

Scope guardrail: only CSS className changes and a few display-only attributes are in scope (aria-label, aria-pressed, aria-expanded, aria-haspopup, and framer-motion whileTap / whileHover). Please keep all data fetching, navigation targets, click handlers, and list/filter logic exactly as they are. If you notice a logic or content issue, just list it under "Owner flags" for later — no need to change it.

House conventions to apply consistently:
- Focus ring appended to every interactive control: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset).
- A control that sits flush inside an overflow-hidden rounded parent should use focus-visible:ring-inset so the ring corners are not clipped. A control whose own element is the rounded one (parent not overflow-hidden) uses a normal outward ring.
- Press-scale tiers: icon-only -> active:scale-95; medium chip -> active:scale-[0.98]; large full-width card -> active:scale-[0.99]; small inline text link -> active:scale-[0.97] + rounded-sm.
- transition-transform when press-scale is the only animated property; transition-all when there is also a hover:bg / hover:border / underline that should animate together.
- aria-label only on icon-only controls (no visible text). Controls with visible text get no aria-label. Use aria-pressed on toggle/filter tabs.

Important framer-motion detail: on a motion.button that has whileTap, a CSS active:scale does nothing (motion's inline transform wins), so for those add the focus ring only (plus aria-label / aria-pressed as needed) and do NOT add active:scale. Raw <button>/<a> elements do honor active:scale, so they get the full set. shadcn <Button>/<Input>/<Badge> already include these tokens — leave them alone (an icon-only shadcn Button still needs an aria-label, but if it already has one, skip it).

Here is my proposed control inventory — please verify each, and correct me if I mislabeled motion-vs-raw, the tier, the inset choice, or the aria:
1. FriendRequestCard accept — motion.button @L76, whileTap 0.85, onClick onAccept, icon-only Check. Plan: ring only + aria-label "Accept friend request".
2. FriendRequestCard decline — motion.button @L83, whileTap 0.85, onClick onDecline, icon-only X. Plan: ring only + aria-label "Decline friend request".
3. SocialNotifItem button — raw <button> @L118, rich avatar+text content, classes "w-full flex items-center gap-3 p-3 text-left touch-manipulation". It fills a GlassCard3D wrapper that is "relative overflow-hidden rounded-2xl". Plan: add transition-transform + active:scale-[0.99] + ring with ring-inset. No aria-label (has visible text).
4. Header back — raw <button> @L487, onClick navigate(-1), icon-only ArrowLeft, already has aria-label "Go back", classes include "transition-colors hover:bg-muted". Parent header card is not overflow-hidden. Plan: add active:scale-95 + outward ring, and switch transition-colors -> transition-all so the hover background and the press-scale animate together. Agree?
5. Header settings — shadcn Button, size icon, already has aria-label. Plan: skip.
6. Header mark-all-read — shadcn Button, size sm, has visible text/icon. Plan: skip.
7. Category tabs (x7) — motion.button @L548, whileHover {scale 1.05, y -1} + whileTap 0.92, onClick setActiveTab, cn() base "... transition-colors touch-manipulation" with an active branch. They sit in a p-1.5 padded overflow-x-auto row inside a GlassCard3D; the active tab already shows an outward ring-1 ring-primary/20 with no clipping. Plan: ring only + aria-pressed={isActive}, outward ring. Agree, or would you use ring-inset because of the horizontal scroll?
8. Quick-action "Mark all" — raw <button> @L596, onClick handleMarkAllRead, already has active:scale-[0.98], icon + visible text, parent grid not overflow-hidden. Plan: add transition-transform + outward ring. No aria-label.
9. Quick-action "Clear read" — raw <button> @L605, same shape. Plan: add transition-transform + outward ring.
10. Quick-action "Rules" — raw <button> @L614, onClick navigate, active:scale-[0.98]. Plan: add transition-transform + outward ring.
11. Manage-notifications CTA — raw <button> @L844, onClick navigate, already has active:scale-[0.99] transition-transform, fills a GlassCard3D that is overflow-hidden rounded-2xl. Plan: add ring with ring-inset only. No aria-label (visible text).
Presentational, leave alone: GlassCard3D wrapper divs; the swipeable row's drag motion.divs (the inner NotificationItem is a separate component, out of scope); the weekly-summary stat motion.divs (whileHover only, no onClick); empty-state icon motion.divs.

Please answer these questions explicitly:
Q1. Is ring-inset the right call for #3 and #11 (both fill an overflow-hidden rounded card)?
Q2. For the category tabs (#7), outward ring or ring-inset, given the overflow-x-auto row? Which renders cleanly for the first and last tab at the scroll extremes?
Q3. For header back (#4), switch transition-colors to transition-all — yes or no?
Q4. Are the aria-labels "Accept friend request" / "Decline friend request" good, or would you include the sender's name? (Keep it a plain static string either way.)
Q5. At a 375px-wide screen, any concerns with the 7-tab overflow-x-auto row (each tab min-w-[4.9rem]) or the grid grid-cols-3 quick-action row? The accept/decline buttons and tabs are ~36px — note small tap targets as a flag only; the repo uses this size on purpose, so do not resize.

Output, please:
A) A short per-control table: control #, agree or corrected label, and the exact final className string (or "ring only + aria") with the exact attribute additions.
B) Direct answers to Q1–Q5.
C) Any motion-vs-raw / tier / inset corrections.
D) Owner flags (things to note but not change here).
Be precise and give exact strings I can paste.
- files: src/pages/NotificationsPage.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me carefully review the NotificationsPage.tsx file and the proposed control inventory. I need to verify each control, check motion-vs-raw labels, tiers, inset choices, and aria attributes.

Let me go through the file systematically:

**Control #1: FriendRequestCard accept**
Looking at L76 area: `<motion.button whileTap={{ scale: 0.85 }} onClick={onAccept} className="w-9 h-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-lg shadow-rose-500/25 touch-manipulation hover:opacity-90 transition-opacity">`
- ✅ motion.button with whileTap → ring only, no active:scale
- Icon-only (Check icon) → needs aria-label
- Parent: `relative rounded-2xl overflow-hidden` (the FriendRequestCard outer div) BUT the button is inside `<div className="relative z-10 p-4 flex items-center gap-3">` which is NOT overflow-hidden. The outer `<div className="relative rounded-2xl overflow-hidden shadow-md ring-1 ring-border/20">` IS overflow-hidden. The button sits at 16px inset from the card edge via `p-4`, so the ring should clear. → outward ring (no ring-inset needed, the 4px ring extent fits in 16px padding)
- Plan: ring only + aria-label "Accept friend request" ✅

**Control #2: FriendRequestCard decline**
L83: `<motion.button whileTap={{ scale: 0.85 }} onClick={onDecline} className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shadow-sm touch-manipulation hover:bg-destructive/10 hover:text-destructive transition-colors">`
- ✅ motion.button with whileTap → ring only
- Icon-only (X icon) → needs aria-label
- Same parent structure as #1 → outward ring
- Plan: ring only + aria-label "Decline friend request" ✅

**Control #3: SocialNotifItem button**
L118: `<button type="button" onClick={onClick} className="w-full flex items-center gap-3 p-3 text-left touch-manipulation">`
- ✅ Raw <button>
- Rich content (avatar + text) → no aria-label needed
- Parent: `<GlassCard3D glow={!notif.is_read}>` which renders `<div className="relative overflow-hidden rounded-2xl ...">` → the button fills this card, so it IS flush inside an overflow-hidden rounded parent
- The button has `p-3` = 12px padding. The card is `rounded-2xl` = 16px radius. A ring-inset would keep the ring inside the button bounds so the card's `overflow-hidden` doesn't clip it at the corners. Without ring-inset, the ring extends ~4px outward from the button edge — the button is `p-3` (12px) inside the card, so 4px ring would be at 8px from the card edge, well within the 16px corner radius. Actually wait — the ring extends outward from the button edge, and the button is flush with the card content area (p-3 from the inner content div, but the outer div is overflow-hidden). 

Let me reconsider. The GlassCard3D structure:
```
<div className="relative overflow-hidden rounded-2xl border ...">
  <div className="relative z-10">{children}</div>
</div>
```
The children are rendered inside `<div className="relative z-10">`. The SocialNotifItem renders the `<button>` as a direct child. There's no padding on that z-10 div. The button itself has `p-3`.

So the button fills the entire z-10 div which is flush with the card's content area. The card has `overflow-hidden rounded-2xl`. The button has no margin/inset from the card edge. The ring extends ~4px outward from the button's border-box, which means it extends into the card's rounded corners. At the card's corners (16px radius), the ring would be clipped.

Wait, actually the button doesn't have `rounded-*` itself. So the ring follows the button's rectangular shape. The card is rounded. The ring would extend 4px beyond the button's rectangular edge at the corners, hitting the card's rounded corner area where `overflow-hidden` clips.

Actually, the button is the full-width content area. The card is `rounded-2xl` (16px). The button has no border-radius. So at the card corners, there's already visual clipping of the button itself (the button's square corners are hidden by the card's overflow-hidden). The ring would extend 4px beyond the button and be clipped at the same corner radius.

For a button that fills an overflow-hidden rounded container, `ring-inset` would keep the ring INSIDE the button's box, which means it would render as a rectangular ring inside the rounded card — that could look odd at the corners too.

Hmm, let me think about this differently. The key question is: will the ring be clipped in a visually ugly way?

Option A: Outward ring (no inset). The ring extends 4px beyond the button. Since the button is flush with the card's overflow-hidden boundary, the ring gets clipped at the card's rounded corners. At the top-left corner, for example, the 4px ring extends into the 16px-radius curve and gets cut off. This produces a slightly clipped ring at the corners.

Option B: ring-inset. The ring renders 4px inside the button's box. The ring is entirely within the button, which is entirely within the card. No clipping. But the ring is inset, so it's visible as a thin line inside the button content area.

I think `ring-inset` is the right call here. The user's plan says `ring-inset` and I agree.

For press scale: `active:scale-[0.99]` is correct for a full-width card-like button. `transition-transform` since the scale is the only animated property (no hover:bg on this button itself — the hover effects are on the parent motion.div).

Wait, looking at the button more carefully: `className="w-full flex items-center gap-3 p-3 text-left touch-manipulation"` — there's NO transition at all currently. So we need to add `transition-transform` for the press-scale to animate.

Plan: add `transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` ✅

**Control #4: Header back**
L487: `<button type="button" onClick={() => navigate(-1)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground transition-colors hover:bg-muted" aria-label="Go back">`
- ✅ Raw <button>
- Already has aria-label "Go back" ✅
- Icon-only (ArrowLeft) → already labeled ✅
- Parent: the header card `<div className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">` — NOT overflow-hidden. So outward ring is correct.
- `transition-colors` → `transition-all` because we're adding active:scale (needs transform to animate alongside the hover:bg)
- The button has `rounded-xl` → normal outward ring (its own element is the rounded one)

Plan: `transition-colors` → `transition-all`, add `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅

**Control #5: Header settings** — shadcn Button with aria-label → skip ✅
**Control #6: Header mark-all-read** — shadcn Button with visible text → skip ✅

**Control #7: Category tabs (x7)**
L548: `<motion.button whileHover={{ scale: 1.05, y: -1 }} whileTap={{ scale: 0.92 }} onClick={() => setActiveTab(tab.value)} className={cn("relative flex min-w-[4.9rem] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition-colors touch-manipulation", isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")}>`
- ✅ motion.button with whileTap → ring only, no active:scale
- Has visible text (tab.label) + icon → no aria-label needed
- But selection state conveyed only by bg → needs aria-pressed
- Parent: `overflow-x-auto p-1.5` inside a GlassCard3D which is `overflow-hidden rounded-2xl`
- The tabs sit inside `p-1.5` (6px padding) inside the GlassCard3D's z-10 div. The GlassCard3D's outer div is `overflow-hidden rounded-2xl`. The ring extends 4px outward from the tab's rounded-xl edge. At 6px inset from the card's overflow boundary... the ring would be at 2px from the overflow boundary, and the card corner is 16px radius. At the first/last tab near the edge, the ring might clip slightly.

Actually wait, let me reconsider the GlassCard3D structure again:
```
<div className="relative overflow-hidden rounded-2xl border ...">
  <div className="relative z-10">{children}</div>
</div>
```
The children go into the z-10 div with NO padding. The category tab bar content is:
```
<div className="flex gap-1.5 overflow-x-auto p-1.5 no-scrollbar">
  {tabs.map(tab => <motion.button ... />)}
</div>
```

So the flex container has `p-1.5` (6px padding). The motion.button tabs are 6px from the GlassCard3D's edge. The button itself is `rounded-xl` (12px). The ring extends 4px outward. So the ring's outer edge is 6px - 4px = 2px from the card's overflow-hidden boundary. At a 16px card corner radius, the ring is well inside the curved area. But at the very corner of the first/last tab, the ring's 4px extent going into the corner curve... 

Actually, I think the key issue is simpler. The tabs are inside an `overflow-x-auto` container. This means the tab row itself can scroll horizontally. The `overflow-x-auto` on the flex container creates a scroll box, NOT the GlassCard3D. The GlassCard3D has `overflow-hidden` which clips at its boundary. The tabs are inside the scroll container which is inside the GlassCard3D.

For the first tab (leftmost) and last tab (rightmost): they're 6px from the GlassCard3D edge. A 4px outward ring would extend 4px from the button, putting it at 2px from the card edge. The card's 16px radius corner means at that point, the corner curve hasn't started much — the ring should be visible but might get very slightly clipped at the extreme corner pixels.

`ring-inset` would avoid any clipping entirely but would change the visual appearance (ring inside the button instead of outside).

I think **outward ring is fine** — the 6px padding from the card edge means the ring clears the card boundary for the most part, and any minor corner clipping is acceptable (the tabs scroll so they're not always at the extremes). The user asked about this specifically.

Actually, rethinking: the question is about the first/last tab at scroll extremes. When scrolled to the start, the first tab's left edge is at the left edge of the scroll container, which has `p-1.5`. So the first tab is 6px from the scroll container's left edge. The scroll container fills the GlassCard3D's content area. The GlassCard3D has `overflow-hidden rounded-2xl`.

At the corners, a 16px radius means the visible corner starts about 2px in from the edge at the very tip. So a ring that's 6px from the card edge (at the button boundary) and extends 4px outward to 2px from the card edge... it would be very close but not really clipped because the 16px radius at 2px from the edge barely curves.

I'll say **outward ring is fine**, no ring-inset needed. The 6px padding provides sufficient clearance.

**Control #8: Quick-action "Mark all"**
L596: `<button type="button" onClick={handleMarkAllRead} className="rounded-2xl border border-border/55 bg-card px-3 py-2.5 text-left shadow-sm active:scale-[0.98]">`
- ✅ Raw <button>
- Has visible text "Mark all" + "Read" → no aria-label
- Already has `active:scale-[0.98]` ✅
- Missing: `transition-transform` (for the scale to animate) and focus ring
- Parent: `grid grid-cols-3 gap-2` → not overflow-hidden → outward ring
- The button has `rounded-2xl` → normal ring

Plan: add `transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅

**Control #9: Quick-action "Clear read"**
L605: Same shape as #8. `className="rounded-2xl border border-border/55 bg-card px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"`
- Same treatment ✅

**Control #10: Quick-action "Rules"**
L614: `className="rounded-2xl border border-border/55 bg-card px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"`
- Same treatment ✅

**Control #11: Manage-notifications CTA**
L844: `<button type="button" onClick={() => navigate("/account/notifications")} className="w-full p-4 text-left flex items-center gap-3 active:scale-[0.99] transition-transform">`
- ✅ Raw <button>
- Has visible text → no aria-label
- Already has `active:scale-[0.99] transition-transform` ✅
- Parent: `<GlassCard3D className="shadow-xl">` which is `overflow-hidden rounded-2xl`
- The button fills the card. Has `p-4` (16px) from the card edge. Ring extends 4px outward. At 16px padding from the edge, the ring at 12px from the overflow boundary is well within the 16px corner radius. Actually wait — the button itself has no border-radius. So the ring is rectangular and extends 4px beyond. But the card is rounded. At the corners, the button's square corner is already being clipped by the card's overflow-hidden. The ring extending 4px further would be even more clipped.

Hmm, but actually, `p-4` means the button's content is 16px from the card edge, but the BUTTON itself starts at the card's z-10 div edge (no margin on the button). Wait, looking again:

```html
<GlassCard3D className="shadow-xl">
  <button type="button" ... className="w-full p-4 text-left flex items-center gap-3 ...">
```

GlassCard3D renders:
```html
<div className="relative overflow-hidden rounded-2xl border ...">
  <div className="relative z-10">{children}</div>
</div>
```

The button is the direct child of z-10. The button has `w-full` and `p-4`. The button fills the z-10 div entirely. The button has NO border-radius itself.

So the button is flush with the card's rectangular content area. The card clips the button's corners with its `rounded-2xl overflow-hidden`. The ring extends 4px outward from the button, hitting the card's overflow-hidden clip at the rounded corners.

This means `ring-inset` IS the right call — it keeps the ring inside the button's box, preventing any clipping at the card's rounded corners.

Actually wait, I need to reconsider. The button has `p-4` — that's internal padding, not margin. The button's border-box is flush with the z-10 div. The ring extends from the button's border-box. So yes, `ring-inset` is correct for #11.

The user's plan for #11 says: "add ring with ring-inset only" ✅

Now let me answer the specific questions:

**Q1. Is ring-inset the right call for #3 and #11?**
Yes, for both. Both buttons fill an overflow-hidden rounded-2xl parent with no margin. The outward ring would extend beyond the button boundary and get clipped by the parent's overflow-hidden at the rounded corners. ring-inset keeps the ring entirely within the button's box.

**Q2. For the category tabs (#7), outward ring or ring-inset?**
The tabs sit inside a `p-1.5` (6px) padding inside the GlassCard3D. At scroll extremes, the first/last tab is 6px from the card edge. The 4px outward ring extends to 2px from the card edge. With a 16px corner radius, the actual clipping at 2px from the edge is negligible (the curve barely started). Outward ring is the right call — it looks correct and ring-inset would be visually worse (ring floating inside the tab with the existing ring-1 ring-primary/20). The horizontal scroll container doesn't affect ring rendering since overflow-x-auto only clips content that overflows horizontally, and the tabs are within the scroll viewport.

**Q3. For header back (#4), switch transition-colors to transition-all?**
Yes. Adding `active:scale-95` means the transform needs to animate. `transition-colors` only animates color/background changes. `transition-all` covers both the hover:bg fade and the press-scale.

**Q4. Are the aria-labels good or include sender's name?**
Plain static strings "Accept friend request" and "Decline friend request" are good. Including the sender's name would require dynamic interpolation (not a pure className/display-only change). The friend's name is already visible in the adjacent text. Keep the plain strings.

**Q5. 375px concerns?**
- 7 tabs at `min-w-[4.9rem]` (≈78.4px each) + gaps = ~570px total → overflow-x-auto handles this fine, scrollable
- `grid grid-cols-3` quick-action row with `gap-2` → 3 equal columns in the max-w-2xl container (343px at 375px with px-4) ≈109px each — fine
- 36px accept/decline buttons and tabs are below 44px WCAG guideline — flag only

Now let me construct the per-control table and the exact className changes.

Let me write out the exact before/after for each control:

**#1 FriendRequestCard accept (motion.button)**
Before: `className="w-9 h-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-lg shadow-rose-500/25 touch-manipulation hover:opacity-90 transition-opacity"`
After: `className="w-9 h-9 rounded-xl bg-ig-gradient text-white flex items-center justify-center shadow-lg shadow-rose-500/25 touch-manipulation hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
Add: `aria-label="Accept friend request"`

**#2 FriendRequestCard decline (motion.button)**
Before: `className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shadow-sm touch-manipulation hover:bg-destructive/10 hover:text-destructive transition-colors"`
After: `className="w-9 h-9 rounded-xl bg-muted text-muted-foreground flex items-center justify-center shadow-sm touch-manipulation hover:bg-destructive/10 hover:text-destructive transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
Add: `aria-label="Decline friend request"`

**#3 SocialNotifItem button (raw <button>)**
Before: `className="w-full flex items-center gap-3 p-3 text-left touch-manipulation"`
After: `className="w-full flex items-center gap-3 p-3 text-left touch-manipulation transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"`

**#4 Header back (raw <button>)**
Before: `className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground transition-colors hover:bg-muted"`
After: `className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background text-foreground transition-all hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

**#5 Header settings** — skip
**#6 Header mark-all-read** — skip

**#7 Category tabs (motion.button × 7)**
Before base: `cn("relative flex min-w-[4.9rem] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition-colors touch-manipulation", isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")`
After base: `cn("relative flex min-w-[4.9rem] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", isActive ? "bg-primary/10 text-primary ring-1 ring-primary/20" : "text-muted-foreground hover:text-foreground hover:bg-muted/50")`
Add: `aria-pressed={isActive}`

Wait, I need to be careful about the ring interaction. The active tab already has `ring-1 ring-primary/20`. Adding `focus-visible:ring-2 focus-visible:ring-ring` would use Tailwind's focus-visible variant. The existing `ring-1 ring-primary/20` is always on (for the active state). On focus-visible, the `focus-visible:ring-2 focus-visible:ring-ring` would apply. In Tailwind, `ring-1` sets `--tw-ring-width: 1px` and `focus-visible:ring-2` sets `--tw-ring-width: 2px` with `focus-visible` specificity. Since both use the same CSS custom property `--tw-ring-width`, the focus-visible variant would win when the element is focused (higher specificity via the pseudo-class), showing a 2px ring-ring color. When not focused but active, it shows the 1px ring-primary/20. This should work correctly.

Actually, I need to double-check. Tailwind ring utilities:
- `ring-1` → `--tw-ring-offset-shadow: ...; --tw-ring-shadow: ...; box-shadow: ...;` (always applied)
- `focus-visible:ring-2` → same but only on focus-visible

When both apply, the focus-visible one overrides because of CSS specificity (pseudo-class selector > no pseudo-class). So on focus-visible, you get ring-2 ring-ring; when unfocused and active, you get ring-1 ring-primary/20. 

**#8 Quick-action "Mark all" (raw <button>)**
Before: `className="rounded-2xl border border-border/55 bg-card px-3 py-2.5 text-left shadow-sm active:scale-[0.98]"`
After: `className="rounded-2xl border border-border/55 bg-card px-3 py-2.5 text-left shadow-sm active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

**#9 Quick-action "Clear read" (raw <button>)**
Before: same as #8
After: same as #8

**#10 Quick-action "Rules" (raw <button>)**
Before: same as #8
After: same as #8

**#11 Manage-notifications CTA (raw <button>)**
Before: `className="w-full p-4 text-left flex items-center gap-3 active:scale-[0.99] transition-transform"`
After: `className="w-full p-4 text-left flex items-center gap-3 active:scale-[0.99] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"`

Now let me think about any corrections to the user's plan:

1. ✅ All motion-vs-raw labels are correct
2. ✅ All tiers are correct
3. For #3: The user says "add transition-transform + active:scale-[0.99] + ring with ring-inset" — I agree. But let me verify: `transition-transform` is correct because the press-scale is the only animated property on this button (no hover:bg).
4. For #7: The user asks about ring-inset vs outward. I say outward (the tabs have 6px padding from the card edge, sufficient clearance).

Wait, I want to re-examine #3 more carefully. The SocialNotifItem button is inside GlassCard3D:
```jsx
<GlassCard3D glow={!notif.is_read}>
  <button type="button" onClick={onClick} className="w-full flex items-center gap-3 p-3 text-left touch-manipulation">
```

GlassCard3D:
```jsx
<div className={`relative overflow-hidden rounded-2xl border border-border/50 bg-card shadow-sm ${className}`}>
  {glow && <div className="pointer-events-none absolute ..."/>}
  <div className="relative z-10">{children}</div>
</div>
```

The button is a child of `<div className="relative z-10">`. This div has no padding. The button is `w-full` with `p-3`. The button's border-box fills the z-10 div, which fills the GlassCard3D's content box. The GlassCard3D has `overflow-hidden rounded-2xl`.

So the button is flush with the card's content area. The card's overflow-hidden clips at the rounded corners. The outward ring extends beyond the button into the clipped area.

Actually, let me think about this differently. The `z-10` div is inside the GlassCard3D div. The GlassCard3D div has padding: no, it doesn't. It has `border` which adds to the box model, but no padding. The z-10 div fills the GlassCard3D's content box (inside border). The button fills the z-10 div.

At the GlassCard3D's corners (rounded-2xl = 16px), the content is clipped. The button's rectangular corners are clipped to the card's rounded shape. A 4px outward ring on the button would extend 4px beyond the button's rectangular edge, but those pixels are outside the card's overflow-hidden boundary and would be clipped.

However, at the card corners, the clipping curve is 16px radius. The ring extends 4px out. At the very corner of the button (which corresponds to the very corner of the card), the ring's outer edge is 4px from the card's content box edge, entering the 16px-radius curve. The ring would be slightly clipped at the very tips of the corners.

But with `ring-inset`, the ring is entirely inside the button's box, so no clipping at all. This is cleaner.

I agree with the user's plan: `ring-inset` for #3 and #11.

Now, one more thing to check: does the SocialNotifItem button have any transition? Currently: `className="w-full flex items-center gap-3 p-3 text-left touch-manipulation"` — NO transition. So we need to add `transition-transform` for the press-scale to animate. ✅ The user's plan accounts for this.

For #4, let me verify: the header card `<div className="rounded-2xl border border-border/60 bg-card px-4 py-3 shadow-sm">` — no `overflow-hidden`. The button is `rounded-xl` itself. So the button's own rounded corners define the ring boundary, and the ring extends outward into the non-overflow-hidden parent. Outward ring is correct. ✅

Let me also check for any controls the user might have missed.

Going through the file line by line:

- The `PullToRefresh` wrapper — not a control
- `SEOHead` — not a control
- Background divs — decorative
- Header: back button (#4), settings (#5), mark-all-read (#6) — covered
- Category tabs (#7) — covered
- Quick-action grid (#8, #9, #10) — covered
- Swipe text — plain `<p>` — not interactive
- FriendRequestCard: accept (#1), decline (#2) — covered
- DegradedDataBanner — separate component, out of scope
- LoadFailureCard — separate component, out of scope
- SwipeableNotificationRow — wraps NotificationItem (separate component), the drag motion.div is presentational
- SocialNotifItem button (#3) — covered
- Weekly summary stat cards — `motion.div` with `whileHover` only, no `onClick` — not interactive ✅
- Manage-notifications CTA (#11) — covered
- Empty state icons — `motion.div` presentational ✅

The user's inventory looks exhaustive. Let me check if the DegradedDataBanner has a Retry button rendered in THIS file... Looking at the code:

```jsx
<DegradedDataBanner
  className="py-1"
  message="Showing cached notifications. Refresh failed."
  onRetry={() => void handlePullRefresh()}
  trackingContext="notifications"
/>
```

The DegradedDataBanner is a separate component — it handles its own Retry button internally. Out of scope. ✅

Similarly LoadFailureCard is a separate component. ✅

MobileBottomNav — separate component. ✅

The `Badge` inside the category tabs and the friend request count — shadcn Badge, already tokenized. ✅

What about the `Badge` in the header showing unread count? It's shadcn, not interactive. ✅

I think the inventory is correct. Let me also note:

- The weekly summary stat `motion.div`s have `whileHover={{ scale: 1.03, y: -1 }}` but no `onClick` — they're decorative/informational, not interactive. Correct to skip.

Now let me think about whether I should note anything about the `transition-colors` on #1 and #2.

#1 has `transition-opacity` (for `hover:opacity-90`). Since it's a motion.button, no active:scale is added, and the whileTap handles the press feedback. The `transition-opacity` is fine for the hover opacity change. No change needed. ✅

#2 has `transition-colors` (for `hover:bg-destructive/10 hover:text-destructive`). Same — motion.button, no active:scale added. `transition-colors` handles the hover changes. No change needed. ✅

One thing I notice: the user's plan for #8, #9, #10 says "add transition-transform + outward ring." But the buttons already have `active:scale-[0.98]`. They're missing `transition-*` — currently there's NO transition class on them. So the press-scale would snap without animation. Adding `transition-transform` is correct so the scale animates smoothly.

Wait, actually I should check: is there a Tailwind config that might add transitions globally? Unlikely. The buttons have no transition class. Adding `transition-transform` is needed.

Let me also verify the exact `cn()` call for #7. The user says the base is `"... transition-colors touch-manipulation"`. Looking at the code:

```jsx
className={cn(
  "relative flex min-w-[4.9rem] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition-colors touch-manipulation",
  isActive 
    ? "bg-primary/10 text-primary ring-1 ring-primary/20" 
    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
)}
```

The focus ring should go in the BASE string (first arg to cn), not in the conditional args. This way it applies to both active and inactive tabs.

After:
```jsx
className={cn(
  "relative flex min-w-[4.9rem] items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-[11px] font-bold transition-colors touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  isActive 
    ? "bg-primary/10 text-primary ring-1 ring-primary/20" 
    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
)}
```

And add: `aria-pressed={isActive}`

This should work correctly. The `ring-1 ring-primary/20` on the active tab and the `focus-visible:ring-2 focus-visible:ring-ring` both use the `--tw-ring-*` custom properties. When the element is both active AND focused, the focus-visible variant has higher specificity (pseudo-class selector) and its `ring-2` will win over the always-on `ring-1`. When active but not focused, the `ring-1 ring-primary/20` shows. When focused but not active, the `ring-2 ring-ring` shows.

Actually wait, I want to double check this. In Tailwind:

`ring-1` generates: `--tw-ring-inset: ; --tw-ring-offset-width: 0px; --tw-ring-offset-color: #fff; --tw-ring-offset-shadow: 0 0 0 var(--tw-ring-offset-width) var(--tw-ring-offset-color); --tw-ring-shadow: 0 0 0 calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color); box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow), var(--tw-shadow, 0 0 #0000);`

`ring-primary/20` sets `--tw-ring-color: hsl(var(--primary) / 0.2);`

`focus-visible:ring-2` generates the same but with `2px` and only on `:focus-visible`.

When both `ring-1` and `focus-visible:ring-2` are present:
- Normal state: `box-shadow` uses `ring-1` → 1px ring with `--tw-ring-color`
- Focus-visible state: `focus-visible:ring-2` overrides `--tw-ring-shadow` and `box-shadow` → 2px ring

But what color? `ring-primary/20` sets `--tw-ring-color: hsl(var(--primary) / 0.2)` unconditionally. `focus-visible:ring-ring` should set `--tw-ring-color: hsl(var(--ring))` only on focus-visible.

Hmm, in Tailwind v3/v4, the `ring-ring` utility sets `--tw-ring-color: var(--ring)`. If it's wrapped in `focus-visible:`, it only applies on focus-visible. But `ring-primary/20` sets it always. So:

- Unfocused: `--tw-ring-color` = `hsl(var(--primary) / 0.2)` (from `ring-primary/20`)
- Focus-visible: `--tw-ring-color` = `var(--ring)` (from `focus-visible:ring-ring`, higher specificity due to pseudo-class)

Wait, actually CSS custom properties don't have specificity in the traditional sense. Setting `--tw-ring-color` with a `:focus-visible` selector means that on focus-visible, the custom property value changes. But if the `ring-primary/20` is also setting `--tw-ring-color` without a pseudo-class, both rules exist. The one with the pseudo-class has higher specificity for the declaration block.

Actually, in Tailwind, the utilities are regular CSS declarations. `ring-primary/20` adds:
```css
.ring-primary\/20 { --tw-ring-color: hsl(var(--primary) / 0.2); }
```

`focus-visible:ring-ring` adds:
```css
.focus-visible\:ring-ring:focus-visible { --tw-ring-color: var(--ring); }
```

When both classes are present and the element is in `:focus-visible` state, the `.focus-visible\:ring-ring:focus-visible` selector has higher specificity than `.ring-primary\/20`, so `--tw-ring-color` = `var(--ring)`. When not in `:focus-visible`, only `ring-primary/20` applies, so `--tw-ring-color` = `hsl(var(--primary) / 0.2)`.

So:
- Unfocused active tab: 1px ring with
