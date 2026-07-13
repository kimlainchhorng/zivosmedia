# MiMo run — 2026-06-14T03:51:35.322Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/GroupOrdersPage.tsx (a "group food-order sessions" dashboard reached by in-app navigation; `useAuth` + two real `useQuery` [["group-orders-me", user?.id] from `group_order_sessions` .eq("host_user_id", user.id).order("created_at",desc); ["group-orders-restaurants", ids] from `restaurants` .in("id", ids)]; `tab` useState<"all"|"open"|"completed">; `restaurantIds`/`restaurantMap`/`stats`/`filtered` useMemo; `copyInvite(code)` helper [navigator.clipboard + sonner toast]. Layout: sticky header [shadcn back Button + UtensilsCrossed badge + "Group Orders" title]; a gradient "Hosting" stat banner motion.div [bg-ig-gradient, NO onClick]; a 3-button segmented filter row [RAW buttons: All (n) / Open (n) / Done]; loading skeletons; empty-state card; then a list of session-row motion.div cards [entrance anim, NO onClick] each holding a restaurant logo/icon tile + name/status-badge/Host-badge + created/deadline meta + an invite-code <code> + a RAW icon-only Copy button.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the two `useQuery`, every `setTab`, `copyInvite`, `restaurantIds`/`restaurantMap`/`stats`/`filtered` useMemo, `navigate(-1)`, `formatRelative`, `STATUS_META`. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press. If a control ALREADY ships transition-all, append the ring (don't re-add/re-flip). If a control ships transition-colors AND a NEW active:scale transform is being added -> FLIP to transition-all (so the new transform is eased too). If transition-colors is present but the press is framer whileTap (not a CSS transform) -> KEEP transition-colors.
- aria-label only on icon-only / image-only controls (a control with rich descriptive visible child text does NOT get an aria-label). aria-pressed on a segmented/toggle control with a persistent on/off selected state; NOT on a one-shot action or navigation.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale, keep it rather than re-adding/re-flipping.

RING COLOR: --ring resolves to BLACK in this app; bg-ig-gradient is a warm gradient. A control whose OUTWARD ring renders against a neutral bg-card/bg-background uses ring-ring; a control whose ring renders ON a gradient surface uses ring-white/70.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML) ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. The 3 segmented filter tabs, lines ~154-156 (RAW <button>, onClick={() => setTab("all"|"open"|"completed")}, visible text "All ({stats.total})" / "Open ({stats.open})" / "Done" [the count is dynamic data, not a state label], cn() base "flex-1 h-10 rounded-xl text-xs font-bold transition-all" + active/inactive conditional bg [bg-ig-gradient text-white shadow-sm vs bg-secondary text-foreground hover:bg-muted]; parent row flex gap-2 on the neutral page bg):
   plan: ADD `aria-pressed={tab === "all"|"open"|"completed"}` to each + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to each cn() base (transition-all already present -> APPEND-only, don't re-flip). Segmented-filter-chip tier -> [0.97]. aria-pressed valid (selection conveyed by bg; the visible text is a label+count, the SELECTED state is bg-only). NO aria-label (visible text). OUTWARD ring-ring (tabs sit on neutral page bg). NO role="tab"/aria-selected — these are plain toggle-filter buttons, not an ARIA tablist (aria-pressed is the correct pattern).

2. Copy-invite button, line ~211 (RAW icon-only Copy glyph, aria-label="Copy invite code", onClick={() => copyInvite(s.invite_code)}, className "h-7 w-7 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center transition-colors" — HAS hover:bg-muted color fade + transition-colors, NO scale/ring):
   plan: FLIP `transition-colors`->`transition-all` + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. FLIP required — the existing transition-colors eases the hover:bg-muted fade but NOT the new active:scale transform, so transition-all (superset) eases both. Icon-only tier -> active:scale-95. KEEP aria-label="Copy invite code". NO aria-pressed (one-shot copy action). OUTWARD ring-ring (the button sits in a bg-card session-row, not overflow-hidden).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- Header back button, line ~128 (shadcn <Button aria-label="Back" variant="ghost" size="icon">): ships tokens, labeled.
- Hosting stat banner motion.div (line ~141): entrance anim, NO onClick -> presentational.
- Session-row motion.div cards (line ~178): entrance anim, NO onClick -> presentational (only the inner Copy button is interactive).
- restaurant logo <img> / UtensilsCrossed fallback, the invite-code <code>, all status-badge/Host-badge <span>, all ArrowLeft/Users/Sparkles/Clock/UtensilsCrossed/Crown/Hourglass/Lock/CheckCircle2/XCircle/Copy icons: decorative.

QUESTIONS:
Q1. The 3 segmented filter tabs (#1): aria-pressed (NOT role=tab/aria-selected) + append-only (transition-all already) + active:scale-[0.97] + OUTWARD ring-ring — correct & consistent with the segmented-filter precedent? Is aria-pressed right even though the visible label includes a dynamic count?
Q2. Copy-invite button (#2): FLIP transition-colors->transition-all + active:scale-95 (icon-only) + ring-ring + KEEP aria-label, NO aria-pressed — correct?
Q3. The banner + session-row motion.divs (#leave): confirm presentational (NO onClick -> leave, no ring on the cards).
Q4. At 375px, do the gradient banner, the 3-button segmented row (flex gap-2, three flex-1 h-10 buttons), and the session cards (logo 40px + flex-1 text column with wrapping badges + invite-code + Copy button) lay out without crushing? And at iPad 768/1024 + desktop 1280 within max-w-2xl?

Please answer Q1-Q4 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/GroupOrdersPage.tsx

---

## Review: GroupOrdersPage — Interaction Polish

### Short plan

Two edits, both RAW `<button>`s that ship zero tokens today. Everything else is correctly left untouched. Your plan is **fully correct and consistent** with the established precedent. Details below.

---

### Q1 — Segmented filter tabs: ✅ Correct as planned

**aria-pressed (NOT role=tab/aria-selected):** Correct. These are plain toggle-filter buttons, not an ARIA tablist. The precedent is the **AffiliateLinksPage** category chips (`aria-pressed={activeCategory === c}` + `active:scale-[0.97]` + ring), not the **ContactRequestsPage** tabs which already had `role="tab"` + `aria-selected` (and correctly kept those instead of adding aria-pressed).

**aria-pressed with dynamic count in visible label:** Valid. The *selected state* is conveyed only by the bg gradient — the visible text is "All (7)" / "Open (3)" / "Done" where the parenthetical is dynamic data, not a state indicator. Screen readers correctly announce "All seven, toggle button, pressed" vs "All seven, toggle button, not pressed."

**Append-only (transition-all already present):** Correct. The inactive state has `hover:bg-muted` which transition-all already eases — no flip needed.

**active:scale-[0.97] + OUTWARD ring-ring:** Correct. Segmented-filter-chip tier. Neutral page bg behind the flex row, not inside a gradient card.

### Q2 — Copy-invite button: ✅ Correct as planned

**FLIP transition-colors → transition-all:** Correct. Per the token system rules: *"If a control ships transition-colors AND a NEW active:scale transform is being added → FLIP to transition-all."* The new CSS `active:scale-95` needs easing alongside the existing `hover:bg-muted` fade. This is a RAW `<button>` (not framer whileTap), so the "KEEP transition-colors for framer press" exception does NOT apply.

**active:scale-95 (icon-only):** Correct. `h-7 w-7` with only a Copy icon glyph.

**KEEP aria-label="Copy invite code", NO aria-pressed:** Correct. Icon-only → keep label. One-shot copy action → not a toggle.

**OUTWARD ring-ring:** Correct. Button sits in a `p-3.5` cell inside a `rounded-2xl bg-card border border-border p-3.5` card — NOT `overflow-hidden` → ring renders against bg-card (neutral) → ring-ring.

### Q3 — Presentational elements left untouched: ✅ Confirmed

- **Header back Button** (shadcn `<Button aria-label="Back">`): ships built-in tokens + labeled → leave.
- **Hosting stat banner motion.div**: `initial/animate` entrance, NO `onClick` → presentational → leave.
- **Session-row motion.div cards**: `initial/animate` entrance, NO `onClick` → presentational (only the inner Copy `<button>` is a control) → leave.
- **Logo `<img>`, UtensilsCrossed fallback, `<code>`, all `<span>` badges, all icons**: decorative/non-interactive → leave.

### Q4 — Responsive: ✅ Clean at all breakpoints

| Viewport | Inner width | Layout check |
|----------|-------------|-------------|
| **375px** | ~343px (`px-4`) | Banner: column text, wraps naturally. Segmented row: `flex gap-2` → 343 - 16 = 325px ÷ 3 ≈ 108px each, `flex-1 h-10` → fits. Session card: `p-3.5` → ~329px inner; logo 40px + gap 12px + flex-1 text (~277px); name + badges `flex-wrap` → wraps if needed; code `px-2` + Copy `h-7 w-7` (28px) → fits. |
| **768px** | ~672px (`max-w-2xl`) | Same layout, more breathing room → clean. |
| **1024px** | ~672px | Same → clean. |
| **1280px** | ~672px | Same → clean. |

**Sub-44px tap targets (FLAG, repo-wide compact pattern):** Copy button `h-7 w-7` ≈ 28px. Not fixing in this pass.

---

### Exact diffs — 2 edits, 5 className lines + 3 new attributes

**Edit 1: Filter tab "All"** (~line 154)

```tsx
// BEFORE
<button type="button" onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>

// AFTER
<button type="button" aria-pressed={tab === "all"} onClick={() => setTab("all")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "all" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>All ({stats.total})</button>
```

**Edit 2: Filter tab "Open"** (~line 155)

```tsx
// BEFORE
<button type="button" onClick={() => setTab("open")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "open" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Open ({stats.open})</button>

// AFTER
<button type="button" aria-pressed={tab === "open"} onClick={() => setTab("open")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "open" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Open ({stats.open})</button>
```

**Edit 3: Filter tab "Done"** (~line 156)

```tsx
// BEFORE
<button type="button" onClick={() => setTab("completed")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all", tab === "completed" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Done</button>

// AFTER
<button type="button" aria-pressed={tab === "completed"} onClick={() => setTab("completed")} className={cn("flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", tab === "completed" ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted")}>Done</button>
```

**Edit 4: Copy-invite button** (~line 211)

```tsx
// BEFORE
<button type="button" aria-label="Copy invite code" onClick={() => copyInvite(s.invite_code)} className="h-7 w-7 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center transition-colors">

// AFTER
<button type="button" aria-label="Copy invite code" onClick={() => copyInvite(s.invite_code)} className="h-7 w-7 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

---

### Summary diff counts

| Metric | Count |
|--------|-------|
| className `−`/`+` line swaps | **4** (3 tabs + 1 copy) |
| New `aria-pressed` attributes | **3** (each tab) |
| `aria-label` changed | **0** (copy button's already present, kept) |
| Rings added | **4** (all `ring-ring`) |
| `active:scale-[0.97]` added | **3** (tabs — segmented-filter tier) |
| `active:scale-95` added | **1** (copy — icon-only tier) |
| `transition-all` preserved (append-only) | **3** (tabs — already had it) |
| `transition-colors` → `transition-all` flipped | **1** (copy — new scale needs easing) |
| `ring-inset` | **0** (no overflow-hidden ancestors) |
| Logic lines touched | **0** |

---

### What the owner must verify / deploy

1. Run `npm run update` — must exit 0 (type-check + worker type-check + production build).
2. Preview at `/group-orders` at 375/768/1280 — verify the 3-tab segmented row tappable press-scale + the per-card Copy icon press-scale + focus rings visible on Tab.
3. Sub-44px tap target flag: Copy button `h-7 w-7` ≈ 28px (repo-wide compact pattern — out of scope for this pass).
4. Auth-gated page — preview requires a signed-in user with `group_order_sessions` rows (else empty-state renders).
