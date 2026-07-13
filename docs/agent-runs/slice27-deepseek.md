# DeepSeek run — 2026-06-14T01:35:12.394Z

- model: deepseek-chat
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

# AMAPage — Interaction Token + A11y Polish Plan

## Summary

4 controls, all raw `<button>` elements. 3 get className-only appends (A, C, D). Control B (the disclosure header) gets the most attention: tokens + `aria-expanded` + trimmed `aria-label`. No logic changes, no new framer props, no keyboard gaps to flag.

---

## Proposed Changes

### File: `src/pages/AMAPage.tsx`

#### (A) Tabs — L233-247

**Before:**
```tsx
className={cn(
  "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
  tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
className={cn(
  "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
aria-pressed={tab === t.id}
```

**Rationale:** Segmented-pill tab tier `[0.97]`. DON'T-CHURN `transition-all`. Selection by bg only → `aria-pressed`. Visible label constant per button → no `aria-label`. `gap-2` parent not overflow-hidden → normal outward ring.

---

#### (B) Session-card disclosure header — L291-359

**Before:**
```tsx
<button
  type="button"
  onClick={() => toggleExpand(s.id)}
  className="w-full text-left hover:bg-secondary/40 transition-colors"
  aria-label={`${s.title}, ${isExpanded ? "collapse" : "expand"}`}
>
```

**After:**
```tsx
<button
  type="button"
  onClick={() => toggleExpand(s.id)}
  className="w-full text-left hover:bg-secondary/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
  aria-label={s.title}
  aria-expanded={isExpanded}
>
```

**B1 (tokens) — confirmed:**
- **Tier `[0.98]`** — wide/card tier. This is a content-rich card (~100px tall with cover/title/topic/meta/description), not a thin menu row. Matches CreatorSubscribers card-main precedent.
- **Flip `transition-colors` → `transition-all`** — the new `active:scale` is a transform; `transition-colors` won't ease it. `transition-all` also keeps the `hover:bg-secondary/40` fade smooth.
- **`ring-inset`** — the button is the flush top child of `rounded-2xl bg-card border overflow-hidden` (L286-289). A 2px outward ring's top/left/right edges near the rounded corners would be clipped. Matches CreatorSubscribers card-main / Concierge plan-rows / SavedPosts precedent.

**B2 (a11y) — my lean: TRIM the aria-label + add aria-expanded**

The existing `aria-label` hacks the disclosure state into text ("…, collapse"/"…, expand"). This is non-standard and creates redundant/conflicting announcements when `aria-expanded` is present (SR would say "title, collapse … expanded" — the action-word "collapse" duplicates the state).

**Net change:** `aria-label={s.title}` + `aria-expanded={isExpanded}`. The SR now announces: "title, button, collapsed/expanded" — the canonical disclosure pattern. No info loss (the title is still the accessible name; the state is conveyed by `aria-expanded`).

This is in-scope: `aria-label` is a display-only attribute, and we're only reading existing data (`s.title`).

---

#### (C) Anonymous toggle — L415-424

**Before:**
```tsx
className={cn(
  "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold transition-all",
  anonymous[s.id] ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
```

**After:**
```tsx
className={cn(
  "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
  anonymous[s.id] ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
)}
aria-pressed={!!anonymous[s.id]}
```

**Rationale:** Chip/small tier `[0.97]`. DON'T-CHURN `transition-all`. Toggle conveyed by bg only → `aria-pressed`. Visible "Anonymous" text → no `aria-label`. `p-3` clearance inside the card → normal outward ring. The `!!` coerces the possibly-undefined map value to a real boolean.

---

#### (D) Ask / submit button — L425-433

**Before:**
```tsx
className="h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
```

**After:**
```tsx
className="h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

**Rationale:** Ring-only append. DON'T-CHURN — already has `active:scale-95` (keep, don't renumber to `[0.97]` — InterestsPage/FriendRequests precedent) + `transition-all` (eases `hover:opacity-90`). Visible "Ask" text → no `aria-label`. `disabled` preserved — `:active`/`:focus-visible` don't fire while disabled. `p-3` clearance → normal outward ring.

---

## Diff

```diff
--- a/src/pages/AMAPage.tsx
+++ b/src/pages/AMAPage.tsx
@@ -233,10 +233,11 @@
             <button
               key={t.id}
               type="button"
               onClick={() => setTab(t.id)}
               className={cn(
-                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
+                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                 tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
               )}
+              aria-pressed={tab === t.id}
             >
               <span>{t.label}</span>
               <span className={cn("text-[10px] font-extrabold px-1.5 py-0.5 rounded-full", tab === t.id ? "bg-white/20" : "bg-background/60")}>
@@ -288,9 +289,10 @@
                   <button
                     type="button"
                     onClick={() => toggleExpand(s.id)}
-                    className="w-full text-left hover:bg-secondary/40 transition-colors"
-                    aria-label={`${s.title}, ${isExpanded ? "collapse" : "expand"}`}
+                    className="w-full text-left hover:bg-secondary/40 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
+                    aria-label={s.title}
+                    aria-expanded={isExpanded}
                   >
                     {/* Cover */}
                     {s.cover_url && (
@@ -412,10 +414,11 @@
                                 <button
                                   type="button"
                                   onClick={() => setAnonymous((prev) => ({ ...prev, [s.id]: !prev[s.id] }))}
                                   className={cn(
-                                    "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold transition-all",
+                                    "inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[10px] font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                                     anonymous[s.id] ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
                                   )}
+                                  aria-pressed={!!anonymous[s.id]}
                                 >
                                   <EyeOff className="h-2.5 w-2.5" /> Anonymous
                                 </button>
@@ -423,7 +426,7 @@
                                   type="button"
                                   onClick={() => submitQuestion(s.id)}
                                   disabled={submittingId === s.id || (draft[s.id] ?? "").trim().length < 6}
-                                  className="h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm"
+                                  className="h-8 px-4 rounded-full bg-ig-gradient text-white text-xs font-bold inline-flex items-center gap-1.5 disabled:opacity-50 hover:opacity-90 active:scale-95 transition-all shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                 >
                                   {submittingId === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                                   Ask
```

---

## Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + production build).
2. **Preview at `/ama`** — verify:
   - Tabs: press scale works, ring appears on keyboard focus, `aria-pressed` toggles correctly in devtools.
   - Session cards: tap to expand/collapse, ring appears on keyboard focus (inset, fully visible), `aria-expanded` toggles in devtools.
   - Anonymous toggle: press scale works, `aria-pressed` toggles.
   - Ask button: ring appears on keyboard focus (existing `active:scale-95` preserved).
3. **No keyboard gaps to flag** — all 4 controls are real `<button>` elements (natively focusable; added rings are functional, not dead CSS). The only non-`<button>` interactive surfaces (the `<textarea>`) was correctly left alone per the skip rule.
4. **Owner flag (established repo compact pattern):** sub-44px tap targets — Anonymous toggle `h-7` (28px), Ask button `h-8` (32px), tabs `h-10` (40px). The disclosure header is full-width so its tap target is fine.
