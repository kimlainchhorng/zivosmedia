# MiMo run — 2026-06-14T02:21:23.475Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Two controls, both textbook applications of the established house patterns:

| Control | Pattern | Change |
|---------|---------|--------|
| **(A) Tabs** (L174, `RAW <button>` × 3) | Segmented-pill-tab → `[0.97]` + `aria-pressed` (EmojiPacksPage/CollabsPage flex-1 tab precedent) | Append 3 tokens to `cn()` base string + add `aria-pressed` attr |
| **(B) Gift row** (L220, `motion.button` × N) | `motion.button` + `whileTap` → RING-ONLY (ForumsPage forum-row precedent, byte-identical base className) | Append 2 tokens to className string |

SKIP list confirmed exhaustive. Soft flag confirmed correct (logic, not display).

---

## Proposed diff

**File:** `src/pages/GiftHistoryPage.tsx`

### (A) Tabs — L174–189

**Before:**
```tsx
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**After:**
```tsx
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              aria-pressed={tab === t.id}
              className={cn(
                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
```

**Rationale:**
- `[0.97]` tier (segmented-pill-tab, equal-width `flex-1` buttons)
- `transition-all` already present → **append only, DON'T-CHURN**
- `aria-pressed={tab === t.id}` — selection conveyed ONLY by background; label WORD constant per button ("All"/"Received"/"Sent"); count badge varies → valid (AMAPage/CollabsPage/EmojiPacksPage precedent)
- Rich visible text (`<span>{t.label}</span>` + count `<span>`) → **NO `aria-label`**
- Parent `div` = `flex gap-2` inside `max-w-2xl mx-auto px-4` — **NOT** `overflow-hidden` → **OUTWARD ring**, no `ring-inset`
- `hover:bg-muted` on inactive tabs is a color fade → `transition-all` (already there) covers it correctly alongside the new scale

**Diff:** 1 attr line added (`aria-pressed`), 1 line edited (className string — tokens appended to the base portion).

---

### (B) Gift row — L220–274

**Before:**
```tsx
                <motion.button
                  key={g.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => g.message_id && navigate(`/chat`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left"
                >
```

**After:**
```tsx
                <motion.button
                  key={g.id}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  whileTap={{ scale: 0.985 }}
                  onClick={() => g.message_id && navigate(`/chat`)}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:bg-secondary/40 transition-colors text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
```

**Rationale:**
- `motion.button` + `whileTap={{ scale: 0.985 }}` → CSS `active:scale` is **DEAD** under framer's inline transform → **RING-ONLY**, no `active:scale`
- **KEEP `whileTap`** (don't-churn — it already provides tactile press)
- **KEEP `transition-colors`** — do NOT flip to `transition-all` (`whileTap` owns the transform; adding `transition:transform` via `transition-all` would fight framer's inline transform → jitter; ForumsPage/NotificationsPage/PlacesPage/ProfileViewsPage `motion.button`-row precedent)
- `hover:bg-secondary/40` is a color fade → `transition-colors` eases it correctly (it only covers color, not transform — which is exactly what we want since framer owns the transform)
- Rich visible child text (Received/Sent badge + gift name + meta chips + coin total) → **NO `aria-label`**
- `rounded-2xl` row in `space-y-2` stack, parent `max-w-2xl mx-auto px-4` — **NOT** `overflow-hidden` → **OUTWARD ring**, no `ring-inset`
- Base className is **byte-identical** to ForumsPage forum-row — same treatment confirmed

**Diff:** 1 line edited (className string — 2 tokens appended).

---

## SKIP list (confirmed exhaustive)

| Control | Location | Reason |
|---------|----------|--------|
| Back `<Button>` | L132 | shadcn — ships tokens, has `aria-label="Back"` |
| Net-banner `motion.div` | L146 | No `onClick` — presentational |
| Skeleton `div`s | L194 | Non-interactive |
| Empty-state `div` | L201 | Non-interactive |
| No-match `<p>` | L211 | Non-interactive |
| All `<span>`, `<p>`, icons | Throughout | Display/decorative text |

---

## SOFT FLAG (do not fix — logic, out of className+display-only scope)

The gift row's `onClick={() => g.message_id && navigate('/chat')}` has two issues:

1. **No-op affordance:** Rows WITHOUT a `message_id` render as a full interactive `motion.button` (cursor pointer, whileTap animation, focus ring after this pass) that does absolutely nothing on click or Enter. The button should arguably be a plain `<div>` when there's no message to navigate to, or the handler should do something else (e.g., navigate to the gift detail).

2. **Generic navigation:** Even when `message_id` exists, it navigates to `/chat` (the chat hub), not to the specific conversation thread. The handler could deep-link to `/chat/${g.message_id}` or similar.

Both are **handler/logic concerns** — correctly flagged as owner territory, not fixed in this className-only pass.

---

## Verification checklist for the applying agent

1. **Apply** the 2 edits above to `src/pages/GiftHistoryPage.tsx` (1 attr line added, 1 className line edited for tabs; 1 className line edited for gift row).
2. **Run `npm run update`** — must be TRUE EXIT 0 (type-check + worker type-check + build).
3. **Diff guard:** `git diff src/pages/GiftHistoryPage.tsx` should show exactly **1 added line** (`aria-pressed`) + **2 edited lines** (both className strings, tokens appended), **0 deleted lines**. Net +1 line.
4. **Logic untouched:** `onClick`, `setTab`, `navigate`, `whileTap`, `useQuery`, `useMemo`, `giftEmoji`, `formatRelative`, `formatCount` — all byte-identical.
5. **Preview at 375/768/1280** (optional — page is auth-gated; tabs + rows visible once gifts exist).
6. **Don't commit** — owner commits & deploys.
