# MiMo run — 2026-06-14T04:09:59.920Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and tell me whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/ReceiptsPage.tsx (a past-payments / receipts list reached by in-app navigation; `useAuth` + one real `useQuery` [["receipts", user?.id] from `receipts` .eq("user_id", user.id).order("created_at",desc) + a secondary ride_requests lookup to attach bakong refs]; `query`/`activeType` useState; `types`/`filtered` derived; `totalSpent`/`formatCents`/`formatTotals`/`formatDate`/`getTypeIcon` utils; `openPdf(pdfPath,type)` helper [supabase.functions.invoke("get-receipt-signed-url") OR storage.createSignedUrl OR window.open for http, + sonner toast]. Layout: sticky header [shadcn back Button + Receipt badge + "Receipts" title + shadcn Filter Button]; a gradient "Total spent" summary banner motion.div [bg-ig-gradient, NO onClick]; a search `<input type="search">` [RAW, existing focus:ring-rose-500/30]; a horizontal-scroll type-chip row [RAW buttons, types.map, "All"/per-type WORD]; loading skeletons; empty + no-match states; then a list of receipt-row motion.div cards [entrance anim, NO onClick] each holding a gradient type-icon tile + type/reference/date text + a formatted amount + a small inline RAW "PDF" download button.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the `useQuery`, every `setActiveType`/`setQuery`, `openPdf`, `types`/`filtered`, all formatter utils, `navigate(-1)`. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we are applying consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset when the control is a flush edge child of a rounded overflow-hidden parent.
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the only animated property; transition-all when there is also a hover:bg/hover:text/hover:opacity that should animate alongside the press; transition-opacity when the only animated property is opacity. If a control ALREADY ships transition-all, append the ring (don't re-flip).
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (e.g. active:opacity-80 / active:opacity-60), KEEP it and do NOT manufacture an active:scale.
- aria-label only on icon-only / image-only controls (rich descriptive visible child text -> NO aria-label). aria-pressed on a segmented/toggle control with a persistent on/off selected state; NOT on a one-shot action or navigation.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale, keep it.

RING COLOR: --ring resolves to BLACK in this app; bg-ig-gradient is a warm gradient. A control whose OUTWARD ring renders against a neutral bg-card/bg-background uses ring-ring; a control whose ring renders ON a gradient surface uses ring-white/70. Note: a control with gradient TEXT (text-ig-gradient) but a transparent/neutral background renders its OUTWARD ring against the neutral parent -> ring-ring.

COMPONENT-TYPE RULES we follow:
- shadcn <Button>/<Input>/<Textarea> ship built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> (plain HTML) ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it):

1. The type-filter chips, line ~245 (RAW <button> in types.map, onClick={() => setActiveType(t)}, visible text = the type WORD {t} ["All" or a per-type word, capitalized], cn() base "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all capitalize" + active/inactive conditional bg [bg-ig-gradient text-white shadow-sm vs bg-secondary text-foreground hover:bg-muted]; HAS transition-all, NO scale/ring/aria-pressed; parent row flex gap-2 overflow-x-auto on neutral page bg):
   plan: ADD `aria-pressed={activeType === t}` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the cn() base (append-not-flip, transition-all already present; segmented-filter tier [0.97]; aria-pressed valid [toggle-filter, NOT role=tab, selection conveyed by bg, constant WORD per chip]; NO aria-label [visible text]; OUTWARD ring-ring [chips on neutral page bg; overflow-x-auto doesn't clip box-shadow]).

2. The inline "PDF" download button, line ~310 (RAW, ALREADY aria-label={`Download receipt ${r.reference_id}`}, onClick={() => openPdf(r.pdf_path, r.type)}, visible content = Download icon + "PDF" text, className "mt-1 text-[11px] font-bold text-ig-gradient inline-flex items-center gap-0.5 hover:opacity-80 active:opacity-60" — gradient TEXT on transparent bg, HAS hover:opacity-80 + active:opacity-60 [opacity-based press affordance, NOT scale], NO transition class, NO ring; sits in a bg-card receipt-row card, NOT overflow-hidden):
   plan: APPEND `transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded` (ADD transition-opacity to EASE the existing hover:opacity-80 + active:opacity-60 fades [currently un-eased snaps; the only animated property is opacity -> transition-opacity not transition-all]; ADD `rounded` so the focus ring isn't a sharp rectangle around the tiny inline element; KEEP active:opacity-60 [pre-existing press affordance -> NO manufactured active:scale]; KEEP aria-label; NO aria-pressed [one-shot download action]; OUTWARD ring-ring [gradient TEXT but transparent bg -> outward ring renders against the neutral bg-card parent, NOT a gradient fill]).

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- Header back button, line ~193 (shadcn <Button aria-label="Back" variant="ghost" size="icon">): ships tokens, labeled.
- Header Filter button, line ~208 (shadcn <Button aria-label="Filter" variant="ghost" size="icon">): ships tokens, labeled -> leave token-wise, BUT FLAG: it has NO onClick (v1 placeholder).
- Search `<input type="search">`, line ~232 (RAW, ALREADY focus:outline-none focus:ring-2 focus:ring-rose-500/30): valid existing focus ring -> don't-churn -> leave.
- Summary banner motion.div (line ~217): entrance anim, NO onClick -> presentational.
- Receipt-row motion.div cards (line ~292): entrance anim, NO onClick -> presentational (only the inner PDF button is interactive).
- gradient type-icon tile, all amount/type/reference/date text, all icons: decorative.

QUESTIONS:
Q1. Type-filter chips (#1): aria-pressed (NOT role=tab) + append-only (transition-all already) + active:scale-[0.97] + OUTWARD ring-ring — correct & consistent with the segmented-filter precedent (AffiliateLinks/BrandDeals category chips)?
Q2. PDF download button (#2): the key call — ADD transition-opacity (to ease the existing hover:opacity-80/active:opacity-60) + rounded + ring + KEEP active:opacity-60 (NO manufactured active:scale, since an opacity press affordance already exists) + KEEP aria-label + OUTWARD ring-ring (gradient text, transparent bg) — correct? OR should I (a) use transition-all instead of transition-opacity, (b) skip the transition entirely and append ring-only, (c) also add active:scale-[0.97] (small-inline-text-link tier) ALONGSIDE the existing active:opacity-60? Please pick the most consistent option.
Q3. Confirm the Filter shadcn Button (leave token-wise + flag missing onClick), the search input (existing focus:ring -> leave), and both motion.divs (presentational) are handled correctly.
Q4. At 375px, does the header (back + title + Filter), the gradient summary banner (long multi-currency "Total spent" string with break-words), the search input, the overflow-x type-chip row, and the receipt card (icon 44px + flex-1 text + amount + PDF button) lay out without crushing? And at iPad 768/1024 + desktop 1280 within max-w-2xl?

Please answer Q1-Q4 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/ReceiptsPage.tsx

---

## Review — ReceiptsPage.tsx premium interaction + a11y pass

### Inventory (exhaustive full-file read)

| # | Control | Type | Notes | Verdict |
|---|---------|------|-------|---------|
| 1 | Header back | shadcn `<Button aria-label="Back" variant="ghost" size="icon">` | Ships tokens, labeled | **LEAVE** |
| 2 | Header Filter | shadcn `<Button aria-label="Filter" variant="ghost" size="icon">` | Ships tokens, labeled — **FLAG: no `onClick` (v1 placeholder)** | **LEAVE + FLAG** |
| 3 | Summary banner | `motion.div` with entrance anim, NO `onClick` | Presentational | **LEAVE** |
| 4 | Search `<input type="search">` | RAW, ALREADY `focus:outline-none focus:ring-2 focus:ring-rose-500/30` | Valid existing focus ring | **LEAVE** (don't-churn) |
| 5 | **Type-filter chips** | RAW `<button>` in `types.map`, `onClick={() => setActiveType(t)}`, visible WORD `{t}`, `cn()` base has `transition-all`, conditional bg, NO scale/ring/aria-pressed | **EDIT #1** |
| 6 | Loading skeletons | Non-interactive | — | **LEAVE** |
| 7 | Empty-state card | Non-interactive | — | **LEAVE** |
| 8 | No-match `<p>` | Non-interactive | — | **LEAVE** |
| 9 | Receipt-row cards | `motion.div` entrance anim, NO `onClick` | Presentational | **LEAVE** |
| 10 | **PDF download button** | RAW, ALREADY `aria-label`, `text-ig-gradient` on transparent bg, `hover:opacity-80` + `active:opacity-60`, NO transition, NO ring | **EDIT #2** |
| 11 | Type-icon tile, amounts, type/ref/date text, all icons | Decorative | — | **LEAVE** |

---

### Answers Q1–Q4

**Q1 — Type-filter chips: ✅ Correct and consistent.**

`aria-pressed` (NOT `role="tab"`) + append-not-flip (`transition-all` already present) + `active:scale-[0.97]` segmented-filter tier + OUTWARD `ring-ring` (chips on neutral page bg; `overflow-x-auto` does not clip `box-shadow`). Byte-identical to the GroupOrdersPage / MarketplaceOrdersPage / TransactionsPage segmented-filter precedent.

**Q2 — PDF download button: ✅ Your `transition-opacity` plan is correct. Pick (the original plan).**

Reasoning for each sub-question:

- **(a) `transition-all`?** No. The only animated properties are `hover:opacity-80` and `active:opacity-60` — both pure opacity. `transition-opacity` is the precise match per the token system ("transition-opacity when the only animated property is opacity"). Using `transition-all` would add unnecessary transform/color/… easing overhead for nothing.

- **(b) Ring-only, skip transition?** No. The existing `hover:opacity-80` / `active:opacity-60` currently snap without easing — adding `transition-opacity` gives tactile smoothness to the fade, which is part of the interaction polish.

- **(c) Also add `active:scale-[0.97]`?** No. Per the NO-OP / pre-existing-press policy: the button already ships `active:opacity-60` as its press affordance. Manufacturing a scale on top of an existing opacity press is mixing two affordances — keep the opacity, don't churn. (Also: at `text-[11px]` + 12px icon, a `[0.97]` scale would be imperceptible, matching the BugReports `<a>` link precedent.)

- **`rounded`** — needed so the focus ring isn't a sharp rectangle around the tiny inline element. Same rationale as the BugReports `<a>` links.

- **KEEP `aria-label`** — already present, icon-only Download + minimal "PDF" text.

- **OUTWARD `ring-ring`** — gradient TEXT (`text-ig-gradient`) but transparent/neutral bg → the outward ring renders against the neutral `bg-card` parent, NOT a gradient fill → `ring-ring`.

**Q3 — All skips confirmed correct.**

- Filter shadcn Button: leave token-wise + **FLAG** (no `onClick` — v1 placeholder, product decision for the owner).
- Search input: existing `focus:ring-rose-500/30` is a valid focus indicator → don't-churn → leave.
- Summary banner `motion.div`: entrance anim, no `onClick` → presentational → leave.
- Receipt-row `motion.div` cards: entrance anim, no `onClick` → presentational (only the inner PDF button is interactive) → leave.

**Q4 — Responsive 375/768/1024/1280: ✅ Clean.**

- **Header**: `flex gap-3 px-4 py-3` → back 40px + 12px gap + flex-1 title column + 12px gap + Filter 40px = 104px fixed + flexible. At 375px (~367px inner), plenty of room.
- **Summary banner**: `p-5` + `text-2xl sm:text-3xl font-bold break-words` — handles multi-currency "Total spent" strings (e.g. "$1,234.56 + ៛500,000 KHR") with word-breaking. ✓
- **Search input**: `w-full h-11` within `px-4` → ~343px at 375. ✓
- **Type chips**: `flex gap-2 overflow-x-auto scrollbar-hide` with `shrink-0` chips → horizontal scroll, no crush. ✓
- **Receipt card**: `flex items-center gap-3 p-3.5` → icon `shrink-0 h-11 w-11` (44px) + 12px gap + `flex-1 min-w-0` text (truncated reference line) + `text-right shrink-0` amount + PDF button. Inner width at 375: 375 − 32 (outer `px-4`) − 28 (card `p-3.5×2`) = 315px. 44 + 12 = 56px fixed, leaving 259px for text + amount. Amount ~60px + PDF ~40px + 12px gap = 112px, leaving ~147px for text — `truncate` handles overflow. ✓
- **768/1024/1280**: all within `max-w-2xl` (672px) centered → more room, unchanged. ✓

---

### Proposed diff (exact before/after)

**File:** `src/pages/ReceiptsPage.tsx`

**Edit 1 — Type-filter chips (L~245):**

Before:
```tsx
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all capitalize",
                  activeType === t
                    ? "bg-ig-gradient text-white shadow-sm"
                    : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
```

After:
```tsx
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                aria-pressed={activeType === t}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all capitalize active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  activeType === t
                    ? "bg-ig-gradient text-white shadow-sm"
                    : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
```

**Edit 2 — PDF download button (L~310):**

Before:
```tsx
                    <button
                      type="button"
                      onClick={() => openPdf(r.pdf_path, r.type)}
                      className="mt-1 text-[11px] font-bold text-ig-gradient inline-flex items-center gap-0.5 hover:opacity-80 active:opacity-60"
                      aria-label={`Download receipt ${r.reference_id}`}
                    >
```

After:
```tsx
                    <button
                      type="button"
                      onClick={() => openPdf(r.pdf_path, r.type)}
                      className="mt-1 text-[11px] font-bold text-ig-gradient inline-flex items-center gap-0.5 hover:opacity-80 active:opacity-60 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
                      aria-label={`Download receipt ${r.reference_id}`}
                    >
```

---

### Diff summary

| Metric | Count |
|--------|-------|
| className line swaps | **2** (1 chips cn() base append, 1 PDF button append) |
| New `aria-pressed` | **1** (chips map → renders N per `types.length`) |
| New `aria-label` | **0** (PDF button already had one) |
| `active:scale` added | **1** (`[0.97]` segmented on chips) |
| `active:scale` preserved | **0** (PDF has `active:opacity-60` — kept, no scale) |
| Transitions added | **2** (`transition-opacity` on PDF; chips already had `transition-all`) |
| Transitions flipped | **0** |
| `ring-inset` | **0** |
| Logic lines touched | **0** |

### Owner must verify

1. **`npm run update`** — must pass (type-check + worker type-check + production build).
2. **Filter button** — has no `onClick` (v1 placeholder). Product decision: wire it to a type-filter popover / route or remove the icon.
3. **`supabase as any` casts** — type-workarounds for live schema; clean up when types regenerate.
4. **Sub-44px tap targets** (repo-wide) — chips `py-1.5` ~28px, PDF button `text-[11px]` ~16px tall. Flag, don't fix in this pass.
