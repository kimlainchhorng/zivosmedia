# DeepSeek run — 2026-06-14T12:26:15.964Z

- model: deepseek-chat
- task: TASK: Premium interaction-token + a11y className pass for src/pages/ReservationPage.tsx (customer-facing restaurant table-booking flow — mobile, dark-aware bg-background, header image, sticky shadcn CTA).

STRICT CONSTRAINTS — className-only + tiny display-only aria attrs (aria-label / aria-pressed / aria-expanded ONLY). NO logic, NO handlers, NO state, NO routing, NO new framer props, NO tabIndex/role/onKeyDown. Do NOT touch shadcn <Button> (Reserve CTA L312, Add-to-calendar L328, Back-to-Eats L359), <Input>, <Label>, CrossServiceCTAs.

INTERACTION-TOKEN RULES (parity ref src/pages/hubs/JobPostingDetailPage.tsx):
- RAW <button> get: active:scale-[X] + a transition utility + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring.
- Scale tiers: icon-only = scale-95; small/pill chips & segmented = [0.97]; self-contained selectable cards = [0.98]; full-width/wide rows = [0.99].
- transition: bare `transition` shorthand already covers transform → APPEND active:scale. transition-transform for pure press-scale with NO hover color. FLIP transition-colors->transition-all only when adding scale alongside a color hover with transition-colors. If button already has `transition-all`, just APPEND active:scale (no flip).
- ring: outward ring-ring default; ring-white/70 when ring renders OVER a photographic/image/gradient media surface; ring-inset only when flush inside a SEPARATE overflow-hidden rounded ancestor.
- aria: aria-pressed for toggle buttons whose selected state is BACKGROUND/BORDER-fill-conveyed with constant label content — applies to single-select pickers. icon-only button with no visible text + no aria-label -> ADD aria-label; with one -> KEEP.

CONTROL INVENTORY (3 raw <button>; everything else = shadcn Button/Input/Label = SKIP):

1. L163 Back button (icon-only ChevronLeft). HAS aria-label "Back". onClick={() => navigate(-1)}. Sits OVER the header h-44 <img> media + gradient overlay. className: `absolute left-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white`. NO prior transition, NO hover color. QUESTION: icon scale-95 + ring-white/70 (over image) + transition-transform, keep aria-label?

2. L210 party-size chip (MAPPED x8). Single-select, bg-conveyed `party === n ? "bg-ig-gradient text-white border-primary shadow" : "bg-card border-border/60 text-foreground"`. onClick={() => setParty(n)}. Visible number text. STATIC base: `min-w-[44px] h-11 px-4 rounded-xl border text-sm font-bold transition-all touch-manipulation` (has transition-all). QUESTION: small chip [0.97] + ring-ring + aria-pressed={party === n}, just append scale (no flip)?

3. L233 time-slot chip (MAPPED x13). Single-select, bg-conveyed `time === t ? "bg-ig-gradient text-white border-primary shadow" : "bg-card border-border/60 text-foreground"`. onClick={() => setTime(t)}. Visible time text. STATIC base: `h-11 rounded-xl border text-sm font-semibold transition-all touch-manipulation`. QUESTION: small chip [0.97] + ring-ring + aria-pressed={time === t}, just append scale?

DELIVERABLE: For EACH of the 3 controls give the EXACT className delta (what to append/flip) and any aria attr. Answer the lettered QUESTIONS. Confirm ring color per control (ring-white/70 over header image for #1 vs outward ring-ring for chips). Confirm scale tiers. Confirm aria-pressed on the single-select chips. Be concise — per-control list. Do NOT rewrite the file.
- files: src/pages/ReservationPage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

# Plan

**File:** `src/pages/ReservationPage.tsx`

**Controls to edit (3 raw `<button>`s):**

1. **L163 Back button** — icon-only, over header image → `scale-95` + `ring-white/70` + `transition-transform`
2. **L210 party-size chip** (×8, mapped) — single-select chip → `[0.97]` + `ring-ring` + `aria-pressed`
3. **L233 time-slot chip** (×13, mapped) — single-select chip → `[0.97]` + `ring-ring` + `aria-pressed`

**No logic, no shadcn `<Button>`, no `<Input>`, no `<Label>`, no `CrossServiceCTAs` touched.**

---

# Proposed Diff

```diff
--- a/src/pages/ReservationPage.tsx
+++ b/src/pages/ReservationPage.tsx
@@ -160,7 +160,7 @@ export default function ReservationPage() {
         <button type="button"
           onClick={() => navigate(-1)}
           style={{ top: 'calc(var(--zivo-safe-top,0px) + 0.75rem)' }}
-          className="absolute left-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
+          className="absolute left-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
           aria-label="Back"
         >
           <ChevronLeft className="w-5 h-5" />
@@ -196,7 +196,7 @@ export default function ReservationPage() {
                 {PARTY_SIZES.map((n) => (
                   <button type="button"
                     key={n}
                     onClick={() => setParty(n)}
-                    className={`min-w-[44px] h-11 px-4 rounded-xl border text-sm font-bold transition-all touch-manipulation ${
+                    className={`min-w-[44px] h-11 px-4 rounded-xl border text-sm font-bold transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                       party === n
                         ? "bg-ig-gradient text-white border-primary shadow"
                         : "bg-card border-border/60 text-foreground"
                     }`}
+                    aria-pressed={party === n}
                   >
                     {n}
@@ -219,7 +219,7 @@ export default function ReservationPage() {
                 {TIMES.map((t) => (
                   <button type="button"
                     key={t}
                     onClick={() => setTime(t)}
-                    className={`h-11 rounded-xl border text-sm font-semibold transition-all touch-manipulation ${
+                    className={`h-11 rounded-xl border text-sm font-semibold transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                       time === t
                         ? "bg-ig-gradient text-white border-primary shadow"
                         : "bg-card border-border/60 text-foreground"
                     }`}
+                    aria-pressed={time === t}
                   >
                     {t}
```

---

# Answers to Questions

| # | Control | Scale tier | Ring color | Transition | Aria | Flip? |
|---|---------|-----------|------------|------------|------|-------|
| 1 | Back button (L163) | `scale-95` (icon) | `ring-white/70` (over image) | `transition-transform` (no prior transition, no hover color) | Keep `aria-label="Back"` | No flip (no `transition-colors` to flip) |
| 2 | Party-size chip (L210) | `[0.97]` (small chip) | `ring-ring` (outward, neutral bg) | Already `transition-all` → just append scale | Add `aria-pressed={party === n}` | No flip (already `transition-all`) |
| 3 | Time-slot chip (L233) | `[0.97]` (small chip) | `ring-ring` (outward, neutral bg) | Already `transition-all` → just append scale | Add `aria-pressed={time === t}` | No flip (already `transition-all`) |

**Key decisions:**
- **#1 ring-white/70** — the button sits directly over the header `<img>` photographic media + gradient overlay, so `ring-ring` (which resolves to `hsl(var(--ring))` = a dark tone) would be invisible against the dark overlay. `ring-white/70` is the correct over-media ring.
- **#2/#3 ring-ring (outward)** — the chips sit in a `flex-wrap gap-2` / `grid grid-cols-4 gap-2` container with no `overflow-hidden` ancestor, so outward rings render cleanly.
- **#2/#3 aria-pressed** — single-select, background/border conveys selection, constant label content (number/time text). Correct house pattern per `JobPostingDetailPage` reference.

---

# Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker type-check + build).
2. **Preview at 375px** — verify:
   - Back button ring is visible (white on dark overlay)
   - Party-size chips wrap correctly in `flex-wrap gap-2`
   - Time-slot chips fit in `grid-cols-4` at 375 (13 items → 4 columns = 4 rows, should be fine)
3. **No logic changes** — all `onClick`/`setParty`/`setTime`/`navigate`/`useState`/`submit` are untouched.
4. **No shadcn components touched** — the sticky CTA `<Button>` (L312), Add-to-calendar `<Button>` (L328), Back-to-Eats `<Button>` (L359), `<Input>`, `<Label>`, `CrossServiceCTAs` are all left as-is.
