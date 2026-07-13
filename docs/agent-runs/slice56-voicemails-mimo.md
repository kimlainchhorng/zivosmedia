# MiMo run — 2026-06-14T06:06:19.145Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Six controls need edits (A–F); seven leave untouched. Two FLIPs (A, F), three don't-churn ring-only appends (C, D, E), one template append (B). Two new aria attrs (B: `aria-pressed`; F: conditional `aria-expanded`). Zero logic lines.

---

## Per-control decisions

### A) Search Clear (X) — `transition-colors` → FLIP → `transition-all`

| | |
|---|---|
| **Press tier** | icon-only → `active:scale-95` |
| **Transition** | **FLIP** `transition-colors` → `transition-all` (gaining scale + has `hover:text`/`hover:bg`) |
| **Ring** | `ring-ring` — parent is the search input wrapper (`bg-card`) → neutral |
| **Aria** | keep existing `aria-label="Clear search"` |

**Before** (L244):
```
"absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-colors"
```
**After:**
```
"absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full text-muted-foreground hover:text-foreground hover:bg-secondary flex items-center justify-center transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### B) Tab buttons ×2 — APPEND into `transition-all`

| | |
|---|---|
| **Press tier** | segmented filter → `active:scale-[0.97]` |
| **Transition** | **APPEND** — `transition-all` already present, no flip |
| **Ring** | `ring-ring` — parent is neutral page column; the `bg-ig-gradient` is the button's OWN surface, not the parent |
| **Aria** | **ADD** `aria-pressed={tab === t.id}` (persistent single-select segmented filter, constant label words, selection conveyed by bg) |

**Before** (L258 cn first arg):
```
"flex-1 h-10 rounded-xl text-xs font-bold transition-all inline-flex items-center justify-center gap-1.5"
```
**After:**
```
"flex-1 h-10 rounded-xl text-xs font-bold transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring inline-flex items-center justify-center gap-1.5"
```
Also add `aria-pressed={tab === t.id}` to the `<button>` element.

---

### C) Play/Pause — DON'T-CHURN ring-only

| | |
|---|---|
| **Press tier** | already `active:scale-95` — keep |
| **Transition** | already `transition-all` — keep |
| **Ring** | **APPEND** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`; `ring-ring` — parent is neutral voicemail card (`bg-card border`) |
| **Aria** | **NO `aria-pressed`** — media transport (Play/Pause) with a DYNAMIC action-label (`"Play voicemail"` ↔ `"Pause voicemail"`). The label already announces state. `aria-pressed` + changing action-label = confusing SR announce "Pause voicemail, pressed". This matches media transport convention (push button, not toggle). |

**Before** (L230 cn first arg):
```
"shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all"
```
**After:**
```
"shrink-0 h-11 w-11 rounded-full inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### D) Call back — DON'T-CHURN ring-only

| | |
|---|---|
| **Press tier** | already `active:scale-95` — keep |
| **Transition** | already `transition-all` — keep |
| **Ring** | `ring-ring` — parent is neutral card |
| **Aria** | keep existing `aria-label="Call back"` |

**Before** (L367):
```
"h-8 w-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center active:scale-95 transition-all"
```
**After:**
```
"h-8 w-8 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-600 dark:text-emerald-400 inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### E) Message — DON'T-CHURN ring-only

| | |
|---|---|
| **Press tier** | already `active:scale-95` — keep |
| **Transition** | already `transition-all` — keep |
| **Ring** | `ring-ring` — parent is neutral card |
| **Aria** | keep existing `aria-label="Message"` |

**Before** (L375):
```
"h-8 w-8 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center active:scale-95 transition-all"
```
**After:**
```
"h-8 w-8 rounded-full bg-secondary hover:bg-muted text-foreground inline-flex items-center justify-center active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

---

### F) Transcript disclosure — `transition-colors` → FLIP → `transition-all`

| | |
|---|---|
| **Press tier** | wide full-width row with its OWN filled surface (`bg-secondary/40 rounded-xl`) → `active:scale-[0.98]` |
| **Transition** | **FLIP** `transition-colors` → `transition-all` (gaining scale + has `hover:bg`) |
| **Ring** | `ring-ring` — the button sits inside a `bg-card border` card → outward ring renders against neutral card |
| **Aria** | **ADD** `aria-expanded={shortTranscript ? transcriptOpen : undefined}` — **conditional** because when the transcript is ≤ 120 chars there's no line-clamp, no chevron, and toggling is a visual no-op; `aria-expanded` would be misleading on a button that doesn't actually collapse content. When `shortTranscript` is falsy, `undefined` removes the attr entirely. |

**Before** (L389):
```
"w-full text-left rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary/60 transition-colors"
```
**After:**
```
"w-full text-left rounded-xl bg-secondary/40 px-3 py-2 hover:bg-secondary/60 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Also add `aria-expanded={shortTranscript ? transcriptOpen : undefined}` to the `<button>` element.

---

## LEAVE UNTOUCHED (confirmed)

| Control | Reason |
|---|---|
| shadcn Back `<Button>` L204 | Ships own focus/scale tokens; already `aria-label="Back"` |
| search `<input type="search">` L236 | Native input with own `focus:ring-2 focus:ring-rose-500/30` |
| hero stat `motion.div` L217 | Entrance anim, no onClick — presentational |
| voicemail row `motion.div` L310 | Entrance anim + state-driven `ring-1 ring-ig-gradient/40` while playing — presentational, NOT a control |
| caller `<img>`/initials avatar L338 + unread dot | Presentational |
| transcript `motion.p` L402 | Presentational |
| loading skeletons L277 | Presentational |

---

## Summary counts

| Metric | Count |
|---|---|
| className edits | 6 (A, B template, C, D, E, F) |
| FLIP (`transition-colors` → `transition-all`) | 2 (A, F) |
| Don't-churn ring-only appends | 3 (C, D, E) |
| Fresh `active:scale` additions | 3 (A `95`, B `[0.97]`, F `[0.98]`) |
| Kept existing scales | 3 (C, D, E all `95`) |
| `focus-visible:ring` additions | 6 |
| `aria-pressed` additions | 1 (B) |
| `aria-expanded` additions | 1 (F, conditional) |
| Logic lines touched | 0 |

---

## Owner verify

After applying, run:
```bash
npm run update
```
Must exit 0 (type-check + worker type-check + production build). Then preview at 375/768/1280: search, tab switching, play/pause, call-back/message, transcript expand/collapse with both long and short transcriptions.
