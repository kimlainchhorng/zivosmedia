# DeepSeek run — 2026-06-14T02:20:36.922Z

- model: deepseek-chat
- task: SLICE 35 — GiftHistoryPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add/remove whileTap). If a control is keyboard-inaccessible or has a no-op handler, FLAG it for the owner (do not fix).

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for PURE icon/press-scale with NO hover color. If transition-all already present, just append (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all. If a raw control has an EXISTING valid active treatment, KEEP it.
- framer-motion: a motion.button WITH whileTap -> CSS active:scale is DEAD (framer inline transform overrides it) -> add focus RING ONLY, do NOT add active:scale, KEEP whileTap. If such a motion.button has transition-colors + hover color, KEEP transition-colors (do NOT flip to transition-all — transition:transform would fight whileTap's inline transform -> jitter; NotificationsPage/PlacesPage/ProfileViewsPage motion.button-row precedent).
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens.
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, NOT its OWN box-shadow/ring. ring-inset is only needed when the focusable control sits FLUSH/a few px INSIDE a SEPARATE overflow-hidden rounded ancestor. A control with ample padding clearance (e.g. p-3) inside an overflow-hidden container does NOT need ring-inset.
- Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label. aria-pressed ONLY for toggle/segmented controls whose pressed-state is conveyed ONLY by background — VALID even with a varying count badge (N) IF the label WORD is constant per button (AMAPage/CreatorSubscribers/CollabsPage precedent). aria-expanded only for inline disclosure (accordion) — NOT for a button that opens a modal/navigates.

PAGE: src/pages/GiftHistoryPage.tsx (282 lines, /gift-history, SwipeBackContainer, useAuth). "Gift History" = coin gifts you've sent + received in chat. Backed by gift_transactions (key ["gift-transactions", user?.id], .or(sender_id.eq.${user.id},receiver_id.eq.${user.id}), .order created_at desc, .limit 200, enabled !!user?.id). tab useState ("all"|"sent"|"received"); totals/filtered/tabs useMemo. Layout: sticky header (shadcn Back + Gift badge + "Gift History" title), a gradient "Lifetime gifts" net banner (motion.div NO onClick, received/sent coin totals), a 3-tab segmented row (all/received/sent), loading skeletons + empty/no-match states, a list of gift rows (each a motion.button).

SKIP (confirm): Back shadcn <Button aria-label="Back" variant="ghost" size="icon"> L132 (ships tokens, labeled); net-banner motion.div L146 (no onClick, presentational); skeleton divs L194; empty-state div L201; no-match <p> L211; all icons/span/p text.

TWO controls + ONE soft flag:

(A) Tabs, L174-189 — RAW <button type="button"> in tabs.map, onClick={() => setTab(t.id)}. className via cn(): base "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5" + conditional (tab===t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). Each tab = a label <span> (constant WORD per button: "All"/"Received"/"Sent") + a count-badge <span> (varying N). flex-1 equal-width tabs in a `flex gap-2` row inside `max-w-2xl mx-auto px-4` (NOT overflow-hidden). transition-all ALREADY present; inactive state has hover:bg-muted (color fade); selection conveyed ONLY by background (active = gradient+white, inactive = secondary).
Q-A: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() BASE string, and add attr `aria-pressed={tab === t.id}` (segmented-pill-tab tier [0.97]; transition-all already present so DON'T-CHURN/just-append; aria-pressed valid — selection is bg-only and the label WORD is constant per button [EmojiPacksPage flex-1 tab + CollabsPage/AMAPage precedent]; rich visible text -> NO aria-label; OUTWARD ring — flex gap-2 row, parent not overflow-hidden). Confirm [0.97] (not [0.99]), aria-pressed YES, and append-not-flip (transition-all already there).

(B) Gift row, L220-274 — motion.button type="button", ALREADY whileTap={{ scale: 0.985 }}, entrance anim (initial/animate/transition delay), onClick={() => g.message_id && navigate(`/chat`)}. className = "w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left" (BYTE-IDENTICAL to ForumsPage slice-33 forum-row). Rich visible child text (Received/Sent badge + gift name + relative-time/combo/in-chat meta + optional note + coin total). motion.button WITH whileTap + transition-colors + hover:bg-secondary/40, NO ring. Sits in a `space-y-2` stack inside `max-w-2xl mx-auto px-4` (NOT overflow-hidden).
Q-B: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (motion.button + whileTap -> RING ONLY, NO active:scale [dead under framer's inline transform]; KEEP whileTap; KEEP transition-colors — do NOT flip to transition-all [whileTap owns the transform; transition:transform would fight it -> jitter; ForumsPage/NotificationsPage/PlacesPage/ProfileViewsPage precedent]; rich visible text -> NO aria-label; OUTWARD ring — rounded-2xl row in space-y-2, parent not overflow-hidden). Confirm ring-only, keep whileTap + transition-colors, outward ring (this is the exact ForumsPage forum-row resolution — verify parity).

(SOFT FLAG, do not fix) The gift row's onClick is `() => g.message_id && navigate('/chat')`: rows WITHOUT a message_id render as a full interactive motion.button (cursor, whileTap, focus ring) that does NOTHING on click/Enter — a no-op affordance. Also it navigates to a generic `/chat` (not the specific thread). This is LOGIC (handler behavior), OUT of my className+display-only scope. Confirm this is a correct SOFT-FLAG-not-fix for the owner (e.g. owner could gate the button as a plain div when !message_id, or deep-link to the thread).

============================================================
DELIVERABLE: For each control (A)(B) give the EXACT final className string + any attrs. Resolve A ([0.97] tier, aria-pressed YES, append-not-flip) and B (ring-only, keep whileTap + transition-colors, outward ring) explicitly. Confirm the SKIP list + the no-op-onClick SOFT FLAG. Keep it tight.
- files: src/pages/GiftHistoryPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# SLICE 35 — GiftHistoryPage: Plan & Diff

## Plan

Two controls, one soft flag:

**(A) Tabs (L174-189)** — RAW `<button>` segmented row
- Append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `cn()` base string
- Add `aria-pressed={tab === t.id}` as a new attribute line
- Keep existing `transition-all` (DON'T-CHURN)
- OUTWARD ring (parent `flex gap-2`, not `overflow-hidden`)

**(B) Gift row (L220-274)** — `motion.button` with `whileTap={{ scale: 0.985 }}`
- Append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY
- NO `active:scale` (dead under framer inline transform)
- KEEP `whileTap={{ scale: 0.985 }}`
- KEEP `transition-colors` (do NOT flip to `transition-all` — would fight `whileTap`)
- OUTWARD ring (parent `space-y-2`, not `overflow-hidden`)
- This is the **exact** ForumsPage slice-33 forum-row resolution

**(Soft flag)** The `onClick={() => g.message_id && navigate('/chat')}` is a no-op when `!g.message_id` — the row renders as a full interactive `motion.button` that does nothing on click/Enter. Also navigates to generic `/chat` not the specific thread. Out of scope (logic change), flag for owner.

## Diff

```diff
--- a/src/pages/GiftHistoryPage.tsx
+++ b/src/pages/GiftHistoryPage.tsx
@@ -171,11 +171,12 @@ export default function GiftHistoryPage() {
         <div className="flex gap-2">
           {tabs.map((t) => (
             <button
               key={t.id}
               type="button"
               onClick={() => setTab(t.id)}
+              aria-pressed={tab === t.id}
               className={cn(
-                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
+                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
               )}
             >
@@ -237,7 +238,7 @@ export default function GiftHistoryPage() {
                   whileTap={{ scale: 0.985 }}
                   onClick={() => g.message_id && navigate(`/chat`)}
-                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
+                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                 >
```

## Verification checklist

| Item | Status |
|------|--------|
| (A) `active:scale-[0.97]` appended | ✅ |
| (A) `aria-pressed={tab === t.id}` added | ✅ |
| (A) `transition-all` kept (DON'T-CHURN) | ✅ |
| (A) OUTWARD ring (parent not `overflow-hidden`) | ✅ |
| (B) Ring-only (no `active:scale`) | ✅ |
| (B) `whileTap={{ scale: 0.985 }}` kept | ✅ |
| (B) `transition-colors` kept (no flip) | ✅ |
| (B) OUTWARD ring | ✅ |
| SKIP list correct (shadcn Back, banner, skeletons, empty states) | ✅ |
| No logic/handler/state changes | ✅ |
| Soft flag noted for owner | ✅ |

## Owner flag

The gift row `onClick={() => g.message_id && navigate('/chat')}`:
1. Rows **without** a `message_id` render as a full interactive `motion.button` (cursor, `whileTap`, focus ring) that does **nothing** on click/Enter — a no-op affordance.
2. Rows **with** a `message_id` navigate to generic `/chat`, not the specific thread.

**Suggested fix (out of scope):** Gate the row as a plain `motion.div` when `!g.message_id`, or deep-link to the specific chat thread.
