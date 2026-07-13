# MiMo run — 2026-06-14T01:37:05.528Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 27 — AMAPage
======================================================================

ROLE: You are a senior front-end reviewer. I am applying a className-ONLY interaction-token + a11y polish pass to a customer-facing React (Vite + Tailwind v4 + shadcn/ui + framer-motion) page. Decide the EXACT className/attribute changes for each interactive control. Be surgical.

HARD RULE (scope): className changes + tiny DISPLAY-ONLY attributes only (aria-label / aria-pressed / aria-expanded). NO logic, NO handlers, NO tabIndex/role/onKeyDown, NO state, NO routing, NO supabase, NO new framer props (do NOT add whileTap). If a control is keyboard-inaccessible because it lacks role/tabIndex, FLAG it for the owner.

TOKEN RULES (house style, parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button>/<a>/<Link> (NOT shadcn) get the full set: active:scale-[X] + transition-(all|transform) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Tier scales: wide/card [0.98]; chips/small/segmented-pill-tabs [0.97]; icon-only scale-95; full-width/menu-rows/wide-rows [0.99].
- transition-all when the control ALSO has hover:bg-*/hover:text-*/hover:opacity (color/opacity fade) or underline; transition-transform for pure icon-scale with no hover color. If transition-all already present, just append active:scale + ring (DON'T-CHURN). If a raw control has transition-colors AND a hover color AND we are adding active:scale, FLIP transition-colors -> transition-all (transition-colors won't ease a transform). If a raw control has an EXISTING valid active:scale, keep it (DON'T renumber to the nominal tier).
- shadcn <Button>/<Input>/<Textarea> already ship tokens -> DO NOT add tokens. RAW <input>/<textarea> that ALREADY carry their own focus:ring (e.g. focus:ring-2 focus:ring-rose-500/30) -> LEAVE AS-IS (never active:scale).
- ring-inset KEY CSS FACT: overflow-hidden clips an element's DESCENDANTS, not its OWN box-shadow/ring. ring-inset is needed when the focusable control sits FLUSH/a few px INSIDE a SEPARATE overflow-hidden rounded ancestor (outward ring would clip). A control with ample padding clearance (e.g. p-3/p-4) inside an overflow-hidden container does NOT need ring-inset.
- Toggle/segmented controls whose pressed-state is conveyed ONLY by background also get aria-pressed (display-only). Disclosure/expand-collapse controls get aria-expanded. Controls with visible text get their accessible name from text (no aria-label); icon-only controls need aria-label.

PAGE: src/pages/AMAPage.tsx (455 lines, /ama, useAuth, SwipeBackContainer). "Ask Me Anything" browser: live/upcoming/past tabs over a session list; each session card is an EXPAND/COLLAPSE disclosure (tap header -> AnimatePresence reveals the question list + an ask-form: textarea + Anonymous toggle + Ask submit). Backed by ama_sessions + ama_questions.

SKIP (confirm): Back shadcn <Button aria-label="Back" variant="ghost" size="icon"> L201 (ships tokens, labeled); the ask <textarea> L406 (RAW but ALREADY focus:outline-none focus:ring-2 focus:ring-rose-500/30 -> leave as-is); all presentational motion.div (hero L214, session-card wrapper L281, AnimatePresence expand region L363 — none has onClick) + the question-card <div>s L375 (no onClick) + all img/span/p.

FOUR controls:

(A) Tabs (live/upcoming/past), L233-247 — RAW <button type="button">, .map over tabs, onClick={() => setTab(t.id)}. cn() base = "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5" + (tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). transition-all ALREADY. Selection conveyed ONLY by bg. Visible label <span>{t.label}</span> ("Live"/"Upcoming"/"Past", CONSTANT per button) + a separate count-badge <span>{t.count}</span>. Parent `flex gap-2` (8px), NOT overflow-hidden.
Q-A: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the cn base (after transition-all) + add `aria-pressed={tab === t.id}` (segmented-pill-tab tier [0.97]; DON'T-CHURN transition-all; selection-by-bg-only -> aria-pressed; the count-badge changes but the LABEL is constant per button so aria-pressed still valid [CreatorSubscribers/FriendRequests precedent]; visible text -> NO aria-label; gap-2 not overflow-hidden -> normal OUTWARD ring)? Confirm.

(B) Session-card DISCLOSURE header, L291-359 — RAW <button type="button">, onClick={() => toggleExpand(s.id)}, className = "w-full text-left hover:bg-secondary/40 transition-colors", ALREADY aria-label={`${s.title}, ${isExpanded ? "collapse" : "expand"}`}. This is the EXPAND/COLLAPSE disclosure for the question region below it. It is a w-full button that is the FLUSH TOP child of its parent session-card motion.div `rounded-2xl bg-card border overflow-hidden` (L286-289) — fills it edge-to-edge, no padding on the wrapper. Has transition-colors + hover:bg-secondary/40, NO scale, NO ring.
Q-B1 (tokens): FLIP transition-colors -> transition-all (so the NEW active:scale eases; transition-colors won't transition a transform) + append `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring`. Wide/CARD tier [0.98] (it's a content-rich card with cover/title/topic/meta/description, ~100px tall — like the CreatorSubscribers card-main button, NOT a thin menu row), NOT [0.99]. ring-INSET because the w-full button is the flush top child of an overflow-hidden rounded-2xl card — a 2px OUTWARD ring's top/left/right edges (near the rounded corners) would be CLIPPED (CreatorSubscribers card-main / Concierge plan-rows / SavedPosts precedent). Confirm [0.98] + the flip + ring-inset.
Q-B2 (a11y — the judgment call): it's a disclosure, so I want to ADD `aria-expanded={isExpanded}` (the canonical disclosure-state attr; in-scope display-only). The existing aria-label HACKS the state into TEXT ("…, collapse"/"…, expand"). My LEAN = also TRIM the aria-label to just `{s.title}` so the announced name isn't redundant/conflicting with aria-expanded (SR would otherwise say "title, collapse … expanded" — the action-word "collapse" duplicates/contradicts the state). Net: aria-expanded={isExpanded} + aria-label={s.title}. This is the standard ARIA disclosure pattern, no info loss (SR: "title, button, collapsed/expanded"). ALTERNATIVE B2-keep = add aria-expanded but LEAVE the existing aria-label as-is (purely additive, zero text churn, but mildly redundant SR output). Which do you pick — B2-trim (my lean) or B2-keep? Or skip aria-expanded entirely (the label already conveys state)? Note trimming the aria-label is in-scope (aria-label is a display-only attr) and reads only existing data (no logic).

(C) Anonymous toggle, L415-424 — RAW <button type="button">, onClick={() => setAnonymous((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}. cn() base = "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold transition-all" + (anonymous[s.id] ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"). transition-all ALREADY. TOGGLE (anonymous on/off), selection conveyed ONLY by bg. Visible "Anonymous" text + EyeOff icon = accessible name. Sits in a `flex items-center justify-between` row inside the ask-form (`p-3` region inside the card's overflow-hidden — ~12px clearance).
Q-C: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into the cn base + add `aria-pressed={!!anonymous[s.id]}` (chip/small tier [0.97]; DON'T-CHURN transition-all; it's a TOGGLE conveyed by bg only -> aria-pressed; the `!!` coerces the possibly-undefined map value to a real boolean; visible text -> NO aria-label; p-3 clearance -> normal OUTWARD ring)? Confirm.

(D) Ask / submit button, L425-433 — RAW <button type="button">, onClick={() => submitQuestion(s.id)}, disabled={submittingId === s.id || (draft[s.id] ?? "").trim().length < 6}. className = "h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm". ALREADY active:scale-95 + transition-all + hover:opacity-90, NO ring. Content = Loader2/Send icon + visible "Ask" text = accessible name. Same `flex justify-between` row (right side), p-3 clearance.
Q-D: append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (DON'T-CHURN — already has active:scale-95 + transition-all eases hover:opacity-90; KEEP active:scale-95, do NOT renumber to [0.97] [existing valid scale, InterestsPage/FriendRequests precedent]; visible "Ask" text -> NO aria-label; disabled preserved — :active/:focus-visible don't fire while disabled; p-3 clearance -> normal OUTWARD ring)? Confirm.

============================================================
DELIVERABLE: For each control (A)(B)(C)(D) give the EXACT final className string + any attrs. Note where you DIVERGE and why. Resolve B1 (tier [0.98] + flip + ring-inset) and especially B2 (aria-expanded + trim-vs-keep aria-label) explicitly. Flag any keyboard/logic gaps for the owner. Keep it tight.
- files: src/pages/AMAPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Four controls, all raw `<button>`, zero shadcn overlap. The page is straightforward — one disclosure card pattern, one segmented-tab row, one toggle chip, one gradient CTA. The judgment call is on the disclosure header (B): aria-expanded + label trim.

**SKIP confirmed** — all 6 items (back Button, textarea, 3 presentational motion.divs, question-card divs, img/span/p) are correctly out of scope.

---

## Control-by-control — exact final state

### (A) Tabs — `cn()` base append + `aria-pressed`

**Before** (cn base):
```
"flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
```
**After:**
```
"flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**New attr** on `<button>`: `aria-pressed={tab === t.id}`

✅ **Agree, zero divergence.** DON'T-CHURN `transition-all` ✓; segmented-pill-tab tier `[0.97]` (same pattern as CreatorSubscribers active/ended tabs) ✓; `aria-pressed` for selection-by-bg-only ✓; count badge `(N)` changes but label constant per button (CreatorSubscribers precedent) ✓; visible text → NO aria-label ✓; `gap-2` not overflow-hidden → normal OUTWARD ring ✓.

---

### (B) Session-card disclosure — flip + tier + ring-inset + aria-expanded

**B1 — className:**

**Before:**
```
"w-full text-left hover:bg-secondary/40 transition-colors"
```
**After:**
```
"w-full text-left hover:bg-secondary/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
```

✅ **Agree on all three sub-points:**
- **FLIP `transition-colors` → `transition-all`** ✓ — adding `active:scale` demands a transition property that handles transforms; `transition-colors` won't ease it, and `transition-all` keeps the `hover:bg-secondary/40` color fade smooth too.
- **Wide/card tier `[0.98]`** ✓ — this is a content-rich card with cover image + title + topic + meta + description (~100px tall). It matches the CreatorSubscribers card-main precedent, NOT a thin menu row `[0.99]`.
- **ring-INSET** ✓ — the button is `w-full` and the direct flush child of the parent `motion.div className="rounded-2xl bg-card border overflow-hidden"` (L286). No padding on the wrapper between button edge and card boundary. A 2px outward ring's top-left/top-right edges near the `rounded-2xl` corners would be clipped by the parent's `overflow-hidden`. Exact precedent: CreatorSubscribers card-main, Concierge plan-rows, SavedPosts.

**B2 — aria-expanded + label trim:**

**Decision: B2-trim** (your lean).

**Before:**
```
aria-label={`${s.title}, ${isExpanded ? "collapse" : "expand"}`}
```
**After:**
```
aria-label={s.title}
aria-expanded={isExpanded}
```

**Reasoning:** The existing label hacks expand/collapse state into text because `aria-expanded` wasn't present. Adding `aria-expanded` makes the action-word in the label redundant and conflicting — SR would announce "title, collapse … expanded". Trimming to `{s.title}` gives the canonical disclosure pattern: "title, button, collapsed/expanded". No info loss (state now comes from the proper ARIA attr). The trim reads only existing data (`s.title`), purely a display-only attribute change, zero logic. This is cleaner than B2-keep (which would produce mildly redundant SR output).

---

### (C) Anonymous toggle — `cn()` base append + `aria-pressed`

**Before** (cn base):
```
"inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold transition-all"
```
**After:**
```
"inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
**New attr** on `<button>`: `aria-pressed={!!anonymous[s.id]}`

✅ **Agree, zero divergence.** DON'T-CHURN `transition-all` ✓; chip/small tier `[0.97]` ✓; toggle conveyed by bg only → `aria-pressed` ✓; `!!` coerces the possibly-`undefined` `Record<string, boolean>` value to a real `boolean` (the state type is `Record<string, boolean>`, so `anonymous[s.id]` is `boolean | undefined`, `!!undefined === false`) ✓; visible "Anonymous" text → NO aria-label ✓; `p-3` clearance inside the card's `overflow-hidden` → normal OUTWARD ring (the button has ~12px clearance from the card boundary, a 2px ring is comfortably inside) ✓.

---

### (D) Ask button — ring-only append

**Before:**
```
"h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
```
**After:**
```
"h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

✅ **Agree, zero divergence.** Ring-only ✓; DON'T-CHURN `active:scale-95` (existing valid, InterestsPage/FriendRequests precedent — do NOT renumber to `[0.97]`) ✓; kept `transition-all` (eases `hover:opacity-90`) ✓; visible "Ask" text → NO aria-label ✓; `disabled` preserved (`:active`/`:focus-visible` don't fire while disabled → no conflict) ✓; `p-3` clearance → normal OUTWARD ring ✓.

---

## Diff summary

| Control | Edits | Type |
|---------|-------|------|
| **(A)** Tabs | 1 className + 1 new `aria-pressed` | 2 ins / 1 del |
| **(B)** Disclosure | 1 className + 1 aria-label trim + 1 new `aria-expanded` | 3 ins / 2 del |
| **(C)** Anonymous | 1 className + 1 new `aria-pressed` | 2 ins / 1 del |
| **(D)** Ask | 1 className append | 1 ins / 1 del |
| **TOTAL** | **4 controls** | **8 ins / 5 del, +3 net** |

The +3 net lines are the three new standalone attribute lines (`aria-pressed` on A, `aria-expanded` on B, `aria-pressed` on C). All other edits are same-line className or same-line aria-label modifications.

Every `onClick` / `setTab` / `toggleExpand` / `setAnonymous` / `submitQuestion` / `setDraft` / `setSubmittingId` / `useQuery` / `supabase` / `useMemo` / `deriveStatus` / `formatRelative` / `cn` / `disabled` / `whileTap` (none) / `initial` / `animate` left **byte-identical** — all changes are className-string or display-only `aria-*` attrs only.

## Keyboard / logic gaps for the owner

**None to flag.** All 4 controls are real `<button>` elements (natively focusable, Enter/Space responsive). The textarea has its own focus ring. No clickable divs, no missing `role`/`tabIndex`.

## Responsive 375

- Tabs: `flex-1` × 3 in `gap-2` → ~110px each, comfortable.
- Disclosure header: `w-full` fills card, `p-3.5` inner, `flex items-start gap-3` → no crush.
- Anonymous + Ask row: `flex justify-between` inside `p-3` → Anonymous chip ~95px + gap + Ask ~80px = well within ~319px inner. No crush.

## Verify

Run `npm run update` — must pass (type-check + worker type-check + production build, TRUE EXIT 0) before moving to Done.
