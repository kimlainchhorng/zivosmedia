# MiMo run — 2026-06-14T06:27:26.870Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/NotificationCenterPage.tsx (707-line notification inbox: sticky header with Back + "Mark all read" + a horizontally-scrolling segmented TAB filter [All/Unread/Social/Orders/Travel/Jobs/Live/Creator/Wellness/Alerts/System]; a date-grouped list of notification rows; chat-type rows expose inline Reply / Preview-profile / Mute action icon buttons + a Delete icon button; an inline reply panel [text input + Cancel + Send]; a mute-duration dropdown of chips; a "Load more" Button). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, hooks (useMutedThreads/useAllowMessageRequests/useQuery), supabase queries/realtime, mutate/insert, byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient/tinted-FILLED button sitting ON a neutral parent still uses ring-ring (the outward ring renders against the neutral parent, not the fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border. FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale + a transition, append ring ONLY (keep its existing transition class + scale number; no flip — do NOT renumber the scale).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, clear, set-value, send, delete). A toggle with a DYNAMIC action-label ("Mute"/"Unmute") should NOT also get aria-pressed (double-announcement).

CONTROLS (give me per control: exact final after-string of appended classes, ring color + reason, press tier [keep existing or renumber?], transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched):

A) L405 TAB filter buttons (raw `<button>`, mapped over TABS, single-select segmented filter; selection bg-conveyed via `bg-ig-gradient text-white border-primary` else `bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70`). Static base: `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation`. Has transition-all, NO scale, NO focus-visible. onClick setActiveTab(tab.key). In a `overflow-x-auto scrollbar-hide` row; PARENT is the neutral sticky header (bg-background/95). Constant label per tab. → my plan: ADD aria-pressed={isActive} + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the static base (segmented-filter tier [0.97]; NO flip — transition-all already present; OUTWARD ring-ring — bg-ig-gradient is the button's OWN selected fill, ring renders against neutral header parent). Confirm.

B) L529 Reply icon button (raw `<button>`, icon-only, ALREADY `aria-label="Reply"`): `h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all`. ALREADY active:scale-90 + transition-all + hover:bg. One-shot (opens reply). → ring-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (keep active:scale-90 — do NOT renumber to 95; no flip; ring color? own fill bg-primary/10 tint on neutral row parent). Confirm ring color.

C) L544 Preview-profile icon button (raw `<button>`, icon-only, ALREADY `aria-label="Preview profile"`): `h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center`. ALREADY active:scale-90 + transition-all. One-shot (opens profile sheet). → ring-ONLY append (keep scale-90; ring-ring neutral row parent). Confirm.

D) L551 Mute/Unmute icon button (raw `<button>`, icon-only, DYNAMIC `aria-label={rowMuted ? "Unmute" : "Mute"}`). cn base: `h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all` + conditional (`rowMuted ? "bg-muted text-foreground" : "text-muted-foreground"`). ALREADY active:scale-90 + transition-all. Two-way toggle, muted state bg-conveyed AND dynamic action-label. → ring-ONLY append into cn first arg (keep scale-90). aria QUESTION: it's a two-way bg-conveyed toggle BUT has a dynamic action-label — does the dynamic-label rule (like play/pause) mean NO aria-pressed? Decide aria-pressed vs none.

E) L571 Delete icon button (raw `<button>`, icon-only, ALREADY `aria-label="Delete notification"`): `p-1.5 rounded-lg hover:bg-destructive/10 transition-colors`. Has transition-colors, NO scale, NO focus-visible. One-shot destructive. → my plan: FLIP transition-colors→transition-all + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier 95; flip required — transition-colors gaining a new scale; OUTWARD ring-ring neutral row parent; NO aria-pressed — one-shot destructive). Confirm.

F) L617 Cancel text button (raw `<button>`, in reply panel): `shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground`. NO transition, NO scale, NO focus-visible. Small inline text-link, one-shot (closes reply). Has hover:text color. → my plan: APPEND `active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (small inline text-link tier [0.97]; transition-all because scale + hover:text both animate; no existing transition class so no "flip" — just add transition-all; OUTWARD ring-ring neutral DialogContent/panel parent; NO aria). Confirm tier + transition.

G) L624 Send-reply icon button (raw `<button>`, icon-only, ALREADY `aria-label="Send reply"`): `shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all`. ALREADY active:scale-90 + transition-all. One-shot send. → ring-ONLY append (keep scale-90; OUTWARD ring color? bg-ig-gradient own fill on neutral panel parent). Confirm ring color.

H) L649 Mute-duration chips (raw `<button>`, mapped over MUTE_DURATIONS, in the mute dropdown): `h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center`. NO transition, NO scale, NO focus-visible. Medium chip, one-shot (set mute duration). Has hover:bg. → my plan: APPEND `active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (medium chip tier [0.98]; transition-all because scale + hover:bg; no existing transition → add transition-all, no flip; OUTWARD ring-ring neutral parent; NO aria — one-shot set-value). Confirm.

ALSO CONFIRM I should LEAVE these: shadcn back `<Button aria-label="Back" variant="ghost" size="icon">` L381; shadcn "Mark all read" `<Button variant="ghost" size="sm">` L392; shadcn "Load more" `<Button variant="outline">` L676 (all ship their own focus/scale tokens); the L481 row container (plain `<div onClick>` cursor-pointer hover:bg-accent/40 — NOT keyboard-focusable, has no role/tabIndex; adding a focus ring would be inert and adding tabIndex/role is a structural change beyond a display-only pass — LEAVE + flag?); the L599 reply `<input>` (raw input with its OWN existing `focus:ring-2 focus:ring-primary/40` — already styled; converting focus:→focus-visible:ring-ring would recolor + change trigger semantics, a churn — LEAVE + flag?); the row motion.div (entrance/layout anim, the onClick lives on the inner div), skeletons, empty-state, Badge, BellOff status icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note A/H are mapped templates (single edit hits all instances); B/C/D/E/F/G one each.
- files: src/pages/NotificationCenterPage.tsx

---

## Plan

8 controls (A–H) edited; 6 LEAVE untouched (3 shadcn Buttons, 1 plain-div row click area, 1 input, 1 motion.div + decorations). All edits are className + display-only attributes. Zero logic changes.

---

## Exact per-control verdict + after-strings

**A) Tab filter buttons (mapped, L405)**
- **aria-pressed={isActive}** added (persistent single-select segmented filter, constant labels, bg-conveyed selection)
- APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- Ring: **ring-ring** (bg-ig-gradient is button's OWN selected fill; parent is neutral `bg-background/95` header)
- Transition: **no flip** — `transition-all` already present
- Tier: segmented-filter `[0.97]`
- Final static base: `` `shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ``

**B) Reply icon button (L529)**
- **Ring-ONLY append** (already `active:scale-90` + `transition-all` → no flip, no renumber)
- Ring: **ring-ring** (own fill `bg-primary/10` tint on neutral row parent)
- Final: `h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**C) Preview-profile icon button (L544)**
- **Ring-ONLY append** (already `active:scale-90` + `transition-all`)
- Ring: **ring-ring** (neutral row parent; no own fill)
- Final: `h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**D) Mute/Unmute icon button (L551)**
- **Ring-ONLY append** into cn first arg (already `active:scale-90` + `transition-all`)
- **NO aria-pressed** — two-way toggle with DYNAMIC action-label ("Mute"/"Unmute") → double-announcement risk per rule
- Ring: **ring-ring** (muted state `bg-muted` is neutral; unmuted has no fill; parent is neutral row)
- Final cn first arg: `"h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

**E) Delete icon button (L571)**
- **FLIP** `transition-colors` → `transition-all` (gaining NEW `active:scale-95`)
- Ring: **ring-ring** (neutral row parent)
- NO aria-pressed (one-shot destructive)
- Final: `p-1.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**F) Cancel text button (L617)**
- APPEND `active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no existing transition → add `transition-all`, no flip)
- Ring: **ring-ring** (neutral reply-panel parent)
- Tier: small inline text-link `[0.97]`
- Final: `shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**G) Send-reply icon button (L624)**
- **Ring-ONLY append** (already `active:scale-90` + `transition-all`)
- Ring: **ring-ring** (bg-ig-gradient is button's OWN fill; parent is neutral reply panel)
- Final: `shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**H) Mute-duration chips (mapped, L649)**
- APPEND `active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no existing transition → add `transition-all`, no flip)
- Ring: **ring-ring** (neutral parent — `bg-muted/70` is the chip's own neutral fill, parent grid inside card)
- Tier: medium chip `[0.98]`
- Final: `h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

---

## Diff — `src/pages/NotificationCenterPage.tsx`

### A) Tab filter buttons (mapped — single edit hits all instances)

**Before:**
```tsx
<button type="button"
  key={tab.key}
  onClick={() => setActiveTab(tab.key)}
  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation ${
    isActive
      ? "bg-ig-gradient text-white border-primary"
      : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70"
  }`}
>
```

**After:**
```tsx
<button type="button"
  key={tab.key}
  onClick={() => setActiveTab(tab.key)}
  aria-pressed={isActive}
  className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    isActive
      ? "bg-ig-gradient text-white border-primary"
      : "bg-muted/40 text-muted-foreground border-border/40 hover:bg-muted/70"
  }`}
>
```

### B) Reply icon button

**Before:**
```tsx
className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all"
```

**After:**
```tsx
className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### C) Preview-profile icon button

**Before:**
```tsx
className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center"
```

**After:**
```tsx
className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground active:scale-90 transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### D) Mute/Unmute icon button — cn first arg

**Before:**
```tsx
className={cn(
  "h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all",
  rowMuted ? "bg-muted text-foreground" : "text-muted-foreground"
)}
```

**After:**
```tsx
className={cn(
  "h-8 w-8 rounded-full flex items-center justify-center hover:bg-muted active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  rowMuted ? "bg-muted text-foreground" : "text-muted-foreground"
)}
```

### E) Delete icon button

**Before:**
```tsx
className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors"
```

**After:**
```tsx
className="p-1.5 rounded-lg hover:bg-destructive/10 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### F) Cancel text button

**Before:**
```tsx
className="shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground"
```

**After:**
```tsx
className="shrink-0 h-9 px-3 text-[12px] font-medium text-muted-foreground hover:text-foreground active:scale-[0.97] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### G) Send-reply icon button

**Before:**
```tsx
className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all"
```

**After:**
```tsx
className="shrink-0 h-9 w-9 rounded-full bg-ig-gradient text-white flex items-center justify-center disabled:opacity-40 active:scale-90 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### H) Mute-duration chips (mapped — single edit hits all instances)

**Before:**
```tsx
className="h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center"
```

**After:**
```tsx
className="h-8 px-3 rounded-full bg-muted/70 hover:bg-muted text-foreground text-[12px] font-medium flex items-center justify-center active:scale-[0.98] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

## LEAVE untouched (confirmed)

- **L381** shadcn back `<Button aria-label="Back" variant="ghost" size="icon">` — ships own focus/scale tokens
- **L392** shadcn "Mark all read" `<Button variant="ghost" size="sm">` — ships tokens
- **L676** shadcn "Load more" `<Button variant="outline">` — ships tokens
- **L481** plain `<div onClick cursor-pointer hover:bg-accent/40>` — NOT keyboard-focusable, no role/tabIndex. Adding a focus ring would be inert; adding tabIndex+role is structural. **FLAG:** owner may want to convert this to a `<button>` or add `tabIndex={0}` + `role="button"` + `onKeyDown` for keyboard accessibility — that's a structural change beyond display-only.
- **L599** reply `<input>` with existing `focus:ring-2 focus:ring-primary/40` — already styled. **FLAG:** owner may want to standardize on `focus-visible:ring-ring` across all inputs repo-wide (semantic change to trigger + color, not a per-file churn).
- **motion.div** row container — entrance/layout anim, not a control
- **Skeletons, empty-state, Badge, BellOff icons** — decorative/non-interactive

---

## Guard-grep expectations (post-apply)

| Token | Count |
|---|---|
| `focus-visible:ring-2` | 8 (A+B+C+D+E+F+G+H) |
| `aria-pressed` | 1 (A only) |
| `active:scale-90` kept | 4 (B+C+D+G — not renumbered) |
| `active:scale-95` new | 1 (E) |
| `active:scale-[0.97]` new | 3 (A+F+CANCEL… wait, A+F = 2) |
| `active:scale-[0.98]` new | 1 (H) |
| `transition-colors` → `transition-all` FLIP | 1 (E) |
| `ring-ring` | 8 (all neutral parents) |
| `ring-white/70` | 0 |

Corrected:
- `active:scale-90` kept: 4 (B, C, D, G)
- `active:scale-95` new: 1 (E)
- `active:scale-[0.97]` new: 2 (A, F)
- `active:scale-[0.98]` new: 1 (H)
- FLIPs: 1 (E only)

## Verification

Run `npm run update` — must exit 0. The page is auth-aware (user-scoped notifications) so preview requires sign-in; rely on the green gate + the guard-clean 8-className/1-aria/0-logic diff.
