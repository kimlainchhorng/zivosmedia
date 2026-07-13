# DeepSeek run — 2026-06-14T06:04:56.569Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/VoicemailsPage.tsx (visual voicemail inbox: search, All/Unread tabs, per-row play/pause audio + caller avatar + call-back/message actions + expandable transcript). RULES: className strings + display-only attributes (aria-*) ONLY; preserve ALL logic, onClick, navigate, setState, audio playback, Supabase calls byte-identical. Don't add a SECOND competing press effect; don't churn already-polished controls; don't renumber an existing active:scale.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/image surface AS THE PARENT = ring-white/70. A gradient/tinted-FILLED button (e.g. bg-ig-gradient) sitting ON a neutral parent still uses ring-ring (the outward ring renders against the neutral parent, not the fill).
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip active:scale-[0.97]; wide full-width row/card WITH its own bordered/filled surface active:scale-[0.98]; BARE full-width row NO surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop; transition-all when ALSO hover:bg/text/border. FLIP RULE: a control with transition-colors GAINING a NEW active:scale MUST flip to transition-all. transition-transform already includes transform → NO flip when only adding scale. If a control ALREADY has active:scale + a transition, append ring ONLY (keep its existing transition class + scale number; no flip).
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select segmented filter OR a two-way toggle whose on/off is bg-conveyed. aria-expanded on an inline disclosure/accordion. NOT aria-pressed on one-shot actions (nav, clear).
- No-op/don't-churn: if a control already ships active:scale + transition, append ring ONLY; keep its existing scale number + transition class.

CONTROLS (give me per control: exact final after-string of appended/changed classes, ring color + reason, press tier, transition class + whether a FLIP is needed, and any aria-* attr; flag any to LEAVE untouched):

A) L244 search Clear (X) icon button: `className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"` ALREADY `aria-label="Clear search"`, onClick setQuery(""). Icon-only, one-shot. HAS `transition-colors` + hover:text/bg. NO scale. Positioned absolute over the search `<input>` (bg-card) inside a neutral wrapper.

B) L258 Tab buttons ×2 (mapped over [All, Unread]): cn base `"flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"` + `tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted"`. onClick setTab(t.id). Single-select segmented filter, selection conveyed by bg (ig-gradient fill when active). Constant label words ("All"/"Unread") + a count badge `<span>` in each. ALREADY `transition-all`. NO scale. Parent is the neutral page column.

C) L323 per-row Play/Pause button: cn base `"shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all"` + `isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted"`. DYNAMIC `aria-label={isPlaying ? "Pause voicemail" : "Play voicemail"}`. onClick toggle(v) (media transport — starts/stops `new Audio()` playback; icon swaps Play↔Pause; bg flips to ig-gradient while playing). Icon-only. ALREADY active:scale-95 + transition-all. Parent is the neutral voicemail card (bg-card border). → ring color? Is this a two-way bg-conveyed toggle that should get `aria-pressed={isPlaying}` — OR is a media transport control with a DYNAMIC action-label better left WITHOUT aria-pressed (the label already announces state)? Decide.

D) L367 per-row "Call back" icon button: `className="h-8 w-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center active:scale-95 transition-all"` ALREADY `aria-label="Call back"`, onClick navigate("/chat"). Icon-only, one-shot. ALREADY active:scale-95 + transition-all. Parent is the neutral card.

E) L375 per-row "Message" icon button: `className="h-8 w-8 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center active:scale-95 transition-all"` ALREADY `aria-label="Message"`, onClick navigate("/chat"). Icon-only, one-shot. ALREADY active:scale-95 + transition-all. Parent is the neutral card.

F) L389 Transcript disclosure button: `className="w-full text-left rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary/60 transition-colors"` onClick toggleTranscript(v.id). Full-width button with its OWN filled surface (bg-secondary/40 rounded-xl). Expands/collapses the transcript — a ChevronDown (`rotate-180` when open) is shown ONLY when `shortTranscript` (transcription length > 120). When the transcript is short there's no chevron and the line-clamp/expand is a visual no-op, but `toggleTranscript` always flips the Set. HAS `transition-colors` + hover:bg. NO scale. Inside the card, nested at `pl-14`. → press tier? FLIP? aria-expanded candidate — and if so, should it be unconditional `aria-expanded={transcriptOpen}` or conditional on `shortTranscript`?

ALSO CONFIRM I should LEAVE these (ships own focus affordance / native / presentational): shadcn Back `<Button aria-label="Back" variant="ghost" size="icon">` L204; the search `<input type="search">` L236 (`focus:ring-2 focus:ring-rose-500/30`); the hero stat `motion.div` L217 (entrance anim, NO onClick); the voicemail row `motion.div` L310 (entrance anim + state-driven border/`ring-1 ring-ig-gradient/40` while playing — presentational, NOT a control); the caller `<img>`/initials avatar L338 + unread dot; the transcript `motion.p` L402; loading skeletons L277.

Be concise and exact. Return the precise final className after-string per control + any aria attr. Note B is one mapped button (single template edit hits both tabs).
- files: src/pages/VoicemailsPage.tsx

---

# Plan

**File:** `src/pages/VoicemailsPage.tsx`

**Scope:** Premium interaction + a11y token pass on 6 controls (A–F). All changes are className-only + display-only aria attributes. 0 logic lines touched.

---

## Control-by-control analysis

### A) Search Clear (X) — L244
- **Current:** `transition-colors` + hover:text/bg. NO scale.
- **Action:** FLIP `transition-colors`→`transition-all` + APPEND `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — outward against neutral search wrapper parent (bg-card)
- **Press tier:** icon-only → `scale-95`
- **Transition:** FLIP mandatory (gaining scale on a control with hover:bg/text)
- **Aria:** keep existing `aria-label="Clear search"` (icon-only, correct)
- **Final className:**
  ```
  "absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  ```

### B) Tab buttons ×2 — L258
- **Current:** `transition-all` (already covers transform). NO scale. Single-select segmented filter, bg-conveyed.
- **Action:** ADD `aria-pressed={tab === t.id}` + APPEND `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — outward against neutral page column parent
- **Press tier:** segmented filter chip → `[0.97]`
- **Transition:** NO FLIP — already `transition-all`
- **Aria:** `aria-pressed` correct (persistent single-select, bg-conveyed, constant label words; count badge in parens does NOT disqualify — matches LegalDisputesPage/RecommendationScoresPage precedent)
- **Final className:**
  ```
  cn(
    "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
  )
  ```

### C) Play/Pause — L323
- **Current:** `active:scale-95 transition-all` (already has scale + transition). Icon-only. Dynamic action-label.
- **Action:** RING-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — outward against neutral card parent (bg-card border). The ig-gradient fill when playing is the button's OWN surface, but the outward ring renders against the neutral card parent → `ring-ring` correct.
- **Press tier:** KEEP existing `active:scale-95` (don't renumber)
- **Transition:** NO FLIP — already `transition-all`
- **Aria:** **NO `aria-pressed`** — this is a media transport control with a DYNAMIC action-label ("Pause voicemail" / "Play voicemail"). The label already announces state. Adding `aria-pressed` would create a confusing double-announcement ("Pause voicemail, pressed"). Keep existing `aria-label` only.
- **Final className:**
  ```
  cn(
    "shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted",
  )
  ```

### D) Call back — L367
- **Current:** `active:scale-95 transition-all` (already has scale + transition). Icon-only. One-shot.
- **Action:** RING-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — outward against neutral card parent
- **Press tier:** KEEP existing `active:scale-95`
- **Transition:** NO FLIP
- **Aria:** keep existing `aria-label="Call back"` (icon-only, correct)
- **Final className:**
  ```
  "h-8 w-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  ```

### E) Message — L375
- **Current:** `active:scale-95 transition-all` (already has scale + transition). Icon-only. One-shot.
- **Action:** RING-ONLY append `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`
- **Ring:** `ring-ring` — outward against neutral card parent
- **Press tier:** KEEP existing `active:scale-95`
- **Transition:** NO FLIP
- **Aria:** keep existing `aria-label="Message"` (icon-only, correct)
- **Final className:**
  ```
  "h-8 w-8 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  ```

### F) Transcript disclosure — L389
- **Current:** `transition-colors` + hover:bg. NO scale. Full-width button with its OWN filled surface (bg-secondary/40 rounded-xl).
- **Action:** FLIP `transition-colors`→`transition-all` + APPEND `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + ADD `aria-expanded={transcriptOpen}`
- **Ring:** `ring-ring` — outward against the neutral card parent (the button is nested at `pl-14` inside the card, not flush to any overflow-hidden edge)
- **Press tier:** wide full-width row WITH its own filled surface → `[0.98]`
- **Transition:** FLIP mandatory (gaining scale on a control with hover:bg)
- **Aria:** `aria-expanded={transcriptOpen}` — **unconditional** (not conditional on `shortTranscript`). The button always toggles the Set, even when the visual chevron is absent. `aria-expanded` describes the disclosure behavior, not the visual indicator.
- **Final className:**
  ```
  "w-full text-left rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary/60 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  ```

---

## Controls to LEAVE untouched (confirmed)

- ✅ shadcn Back `<Button>` L204 — ships own focus tokens
- ✅ Search `<input>` L236 — `focus:ring-2 focus:ring-rose-500/30` (native input, already has focus style)
- ✅ Hero `motion.div` L217 — presentational entrance anim
- ✅ Voicemail row `motion.div` L310 — presentational (entrance anim + state-driven border/ring)
- ✅ Caller `<img>`/initials avatar L338 + unread dot — presentational
- ✅ Transcript `motion.p` L402 — presentational
- ✅ Loading skeletons L277 — presentational

---

## Diff

```diff
--- a/src/pages/VoicemailsPage.tsx
+++ b/src/pages/VoicemailsPage.tsx
@@ -241,7 +241,7 @@ export default function VoicemailsPage() {
             <button
               type="button"
               aria-label="Clear search"
               onClick={() => setQuery("")}
-              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
+              className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <X className="h-3.5 w-3.5" />
             </button>
@@ -253,6 +253,7 @@ export default function VoicemailsPage() {
           {tabs.map((t) => (
             <button
               key={t.id}
+              aria-pressed={tab === t.id}
               type="button"
               onClick={() => setTab(t.id)}
               className={cn(
@@ -260,7 +261,7 @@ export default function VoicemailsPage() {
                 "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
                 tab === t.id ? "bg-ig-gradient text-white shadow-sm" : "bg-secondary text-foreground hover:bg-muted",
-                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5",
+                "flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
               )}
             >
               <span>{t.label}</span>
@@ -320,7 +321,7 @@ export default function VoicemailsPage() {
                     <button
                       type="button"
                       aria-label={isPlaying ? "Pause voicemail" : "Play voicemail"}
                       onClick={() => toggle(v)}
                       className={cn(
-                        "shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all",
+                        "shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                         isPlaying ? "bg-ig-gradient text-white shadow-md shadow-rose-500/30" : "bg-secondary text-foreground hover:bg-muted",
                       )}
                     >
@@ -364,14 +365,14 @@ export default function VoicemailsPage() {
                     <button
                       type="button"
                       aria-label="Call back"
                       onClick={() => navigate("/chat")}
-                      className="h-8 w-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center active:scale-95 transition-all"
+                      className="h-8 w-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     >
                       <PhoneOutgoing className="h-3.5 w-3.5" />
                     </button>
                     <button
                       type="button"
                       aria-label="Message"
                       onClick={() => navigate("/chat")}
-                      className="h-8 w-8 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center active:scale-95 transition-all"
+                      className="h-8 w-8 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     >
                       <MessageSquare className="h-3.5 w-3.5" />
                     </button>
@@ -386,9 +387,10 @@ export default function VoicemailsPage() {
                     <button
                       type="button"
+                      aria-expanded={transcriptOpen}
                       onClick={() => toggleTranscript(v.id)}
-                      className="w-full text-left rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary/60 transition-colors"
+                      className="w-full text-left rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary/60 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                     >
```

---

## Verification

Run `npm run update` — must pass (type-check + worker type-check + production build). The diff touches only className strings and 2 aria attributes on 6 controls; 0 logic lines, 0 imports, 0 framer props changed.
