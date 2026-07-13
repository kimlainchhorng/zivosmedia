# MiMo run — 2026-06-14T11:11:22.386Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/AiCreativeSuite.tsx (263-line merchant **AI Smart-Reel Creator** on its OWN `min-h-screen bg-background pb-24` shell (NOT inside `<AppLayout>`): a sticky header with a shadcn ghost Back Button; Step 1 = a 3-col grid of photo-upload dropzone buttons (each wraps a hidden file `<input>` + shows either an uploaded `<img>` or an Upload icon + a "Photo N" label span); Step 2 = a 3-col grid of vibe `motion.button` cards (Modern/Luxury/Fun, single-select); Step 3 = a shadcn `<Textarea>` prompt; a full-width shadcn Generate Button; an AnimatePresence result Card with a 3-photo collage + shadcn "Save Draft" (blob download) + "Continue to Reel" (navigate) Buttons. `useState`/`useRef`/`useMemo`; `URL.createObjectURL`; sonner toast; framer-motion `motion`/`AnimatePresence`). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + whileTap ONLY; preserve ALL logic, onClick, navigate, useState/useRef/useMemo, setState, onChange, createObjectURL, blob-download, disabled byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/CardContent/CardHeader/CardTitle/Textarea (own tokens); LEAVE hidden native file <input> (onChange logic, already has aria-label).

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tiles active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO a hover:/active: bg/text(color)/border/opacity pseudo ON THE ELEMENT ITSELF. FLIP transition-colors->transition-all when adding a scale to an element that ALSO has a hover color/border pseudo.
- DON'T-CHURN: control ALREADY has press (whileTap) + transition-all -> add ring (+aria) ONLY; KEEP whileTap, do NOT add a competing CSS active:scale, do NOT downgrade transition-all.
- aria: aria-label ONLY on icon-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle (marks EXACT selected value). aria-expanded on a disclosure.

TWO edits applied — confirm CORRECT or NEEDS-FIX:

A) L135 photo-upload **dropzone** button (×3 via map) — card-tile dropzone; was `w-full h-28 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 transition-colors overflow-hidden` (hover:border pseudo on element, NO scale/ring/aria). The button content provides an accessible name (an `<img alt={slot.label}>` when filled, or an Upload icon + a "Photo N" span when empty) → NO aria-label added. **FLIPPED `transition-colors`→`transition-all`** (has hover:border-primary/50 pseudo + adding scale) **+ `active:scale-[0.97]` (card-tile tier) + ring**. After: `w-full h-28 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden`. NOTE on ring direction: the button itself is `overflow-hidden` (clips its OWN child img), but the focus ring is on THIS button and renders OUTWARD against its parent (a `space-y-1.5` div in CardContent, neutral) — the button is NOT a flush edge child of a rounded overflow-hidden PARENT → OUTWARD `ring-ring`, NOT `ring-inset`.

B) L165 vibe **`motion.button`** (×3 via map) — **DON'T-CHURN** (already `whileTap={{scale:0.96}}` + `transition-all`); persistent single-select toggle (selectedVibe === v.id), visible text (vibe label) so NO aria-label, had NO ring/aria. Before className: `rounded-xl p-3 text-left border transition-all ${selectedVibe === v.id ? "border-primary bg-primary/5" : "border-border/40"}`. ADDED `aria-pressed={selectedVibe === v.id}` + ring into the static part ONLY: `rounded-xl p-3 text-left border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${...}`. KEPT `whileTap` 0.96, KEPT `transition-all`, NO competing CSS `active:scale`. OUTWARD `ring-ring`.

SKIP confirmed: L101 Back shadcn `<Button aria-label="Back" variant="ghost" size="icon">`; L126 hidden native file `<input aria-label={...} onChange>` (logic, hidden); L190 `<Textarea>` (shadcn); L202 Generate shadcn `<Button disabled={...}>`; L240 "Save Draft" shadcn `<Button variant="outline">` (onClick blob-download = logic); L251 "Continue to Reel" shadcn `<Button>` (onClick navigate = logic); all `<Card>`/`CardContent`/`CardHeader`/`CardTitle`; the AnimatePresence result collage divs (presentational, no onClick); all lucide icons (decorative); the "Veo Pending" gradient chip is a plain `<span>` (no onClick); all text.

KEY QUESTIONS: (1) both edits correct (A FLIP transition-colors→transition-all + card-tile scale-[0.97] + OUTWARD ring on the overflow-hidden dropzone; B DON'T-CHURN add aria-pressed + ring, keep whileTap + transition-all)? (2) for A — is it correct to NOT add aria-label given the button has content-derived accessible name (img alt / "Photo N" span), or should it get an explicit aria-label like "Upload Photo N"? (3) did I miss any raw interactive control or mis-tier any? Be concise and exact; return precise final className after-strings + aria attrs.
- files: src/pages/app/shop/AiCreativeSuite.tsx

---

## Audit: AiCreativeSuite.tsx — Both edits CORRECT ✅

### (1) Per-edit verification

**A) Photo-upload dropzone button (L135):** ✅ CORRECT

| Attribute | Verdict |
|---|---|
| `transition-colors` → `transition-all` FLIP | ✅ Required — element has `hover:border-primary/50` pseudo ON ITSELF + adding `active:scale-[0.97]` |
| `active:scale-[0.97]` | ✅ Card-tile tier — grid-col tile in `grid grid-cols-3`, has own visual surface (`border-2 border-dashed`) |
| Ring OUTWARD (`ring-ring`, not `ring-inset`) | ✅ Button itself is `overflow-hidden` (clips child img), but the ring is ON this button rendering outward into its parent (`space-y-1.5` div in CardContent) — NOT a flush edge child of a rounded overflow-hidden parent |
| No `aria-label` | ✅ Content-derived name present: `<img alt={slot.label}>` when filled, Upload icon + `<span>Photo N</span>` when empty. Both provide an accessible name. |

Final after-string:
```
w-full h-28 rounded-xl border-2 border-dashed border-border/60 hover:border-primary/50 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring overflow-hidden
```

**B) Vibe motion.button (L165):** ✅ CORRECT

| Attribute | Verdict |
|---|---|
| DON'T-CHURN | ✅ Already `whileTap={{scale:0.96}}` + `transition-all` → add ring + `aria-pressed` ONLY; keep `whileTap`, no competing CSS `active:scale` |
| `aria-pressed={selectedVibe === v.id}` | ✅ Persistent single-select toggle (3 vibes), marks EXACT selected value |
| No `aria-label` | ✅ Visible text (label + description span) provides accessible name |
| Ring OUTWARD | ✅ Inside `grid grid-cols-3 gap-2` → CardContent → Card. Not a flush edge child of overflow-hidden parent |

Final after-string (static part):
```
rounded-xl p-3 text-left border transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
Plus dynamic: `${selectedVibe === v.id ? "border-primary bg-primary/5" : "border-border/40"}`

---

### (2) Full interactive-control scan — zero misses

| Line | Control | Verdict |
|---|---|---|
| L101 | Back `<Button aria-label="Back" variant="ghost" size="icon">` | SKIP — shadcn, already has `aria-label` |
| L126 | Hidden `<input type="file" aria-label={...}>` | SKIP — hidden native, already has `aria-label`, `onChange` logic |
| L135 | Photo upload `<button>` | ✅ EDITED (A) |
| L165 | Vibe `<motion.button>` | ✅ EDITED (B) |
| L190 | `<Textarea>` | SKIP — shadcn own tokens |
| L202 | Generate `<Button disabled={...}>` | SKIP — shadcn, visible text |
| L240 | "Save Draft" `<Button variant="outline" onClick={blob-download}>` | SKIP — shadcn, `onClick` = logic |
| L251 | "Continue to Reel" `<Button onClick={navigate}>` | SKIP — shadcn, `onClick` = logic |

**No other raw `<button>`, `<a>`, clickable `onClick` divs, or `role="button"`/`cursor-pointer` divs.** The "Veo Pending" gradient chip is a plain `<span>`. The result collage divs are presentational. All lucide icons decorative.

---

### (3) Guard-grep tally

| Metric | Count |
|---|---|
| className edits | 2 (A + B) |
| New aria attributes | 1 (`aria-pressed` on B; no `aria-label` added — A has content-derived name) |
| `focus-visible:ring` | 2 |
| `ring-ring` (OUTWARD) | 2 |
| `ring-inset` | 0 |
| `active:scale-[0.97]` new | 1 (A) |
| FLIPs | 1 (A: `transition-colors` → `transition-all`) |
| DON'T-CHURN preserved | 1 (B: `whileTap` 0.96 kept) |
| Competing 2nd press added | 0 |
| `disabled` touched | 0 |
| Logic lines touched | 0 |

**VERDICT: Zero corrections. Both edits are textbook-pattern correct. File is ready to commit as-is.**
