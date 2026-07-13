# MiMo run — 2026-06-14T12:26:44.069Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Plan

Three controls, three edits. All are `className`-only + tiny `aria-pressed` additions on the two mapped chip arrays. No logic, no handlers, no flips, no structural changes. shadcn `<Button>`/`<Input>`/`<Label>`/`CrossServiceCTAs` are untouched.

---

## Per-control verdict

### 1. Back button (L163) — icon-only over media

| Attribute | Value | Rationale |
|-----------|-------|-----------|
| Scale tier | `scale-95` | Icon-only button |
| Ring color | `ring-white/70` | Renders directly over the `h-44` photographic `<img>` |
| Transition | `transition-transform` (fresh) | No prior transition; pure press + ring, no hover colour |
| aria | Keep existing `aria-label="Back"` | Already present |
| Flip | None | No prior transition to flip |

**className before:**
```
className="absolute left-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white"
```

**className after:**
```
className="absolute left-3 w-10 h-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
```

No other changes on this element.

---

### 2. Party-size chip (L210, mapped ×8) — small pill chip

| Attribute | Value | Rationale |
|-----------|-------|-----------|
| Scale tier | `[0.97]` | Small pill/chip with visible label |
| Ring color | `ring-ring` OUTWARD | Chips in `flex flex-wrap gap-2` on neutral `bg-background`; no overflow-hidden ancestor |
| Transition | Already `transition-all` → no flip | Just append scale + ring |
| aria | **Add** `aria-pressed={party === n}` | Single-select bg-conveyed; constant visible label ("1", "2+", etc.) |
| Flip | None | `transition-all` already covers transform |

**On the `<button>` element, add one attr:**
```
aria-pressed={party === n}
```

**STATIC cn() base before:**
```
className={`min-w-[44px] h-11 px-4 rounded-xl border text-sm font-bold transition-all touch-manipulation ${
```

**STATIC cn() base after:**
```
className={`min-w-[44px] h-11 px-4 rounded-xl border text-sm font-bold transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

---

### 3. Time-slot chip (L233, mapped ×13) — small pill chip

| Attribute | Value | Rationale |
|-----------|-------|-----------|
| Scale tier | `[0.97]` | Small pill/chip with visible label |
| Ring color | `ring-ring` OUTWARD | Chips in `grid grid-cols-4 gap-2` on neutral `bg-background`; no overflow-hidden ancestor |
| Transition | Already `transition-all` → no flip | Just append scale + ring |
| aria | **Add** `aria-pressed={time === t}` | Single-select bg-conveyed; constant visible label (time string) |
| Flip | None | `transition-all` already covers transform |

**On the `<button>` element, add one attr:**
```
aria-pressed={time === t}
```

**STATIC cn() base before:**
```
className={`h-11 rounded-xl border text-sm font-semibold transition-all touch-manipulation ${
```

**STATIC cn() base after:**
```
className={`h-11 rounded-xl border text-sm font-semibold transition-all touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
```

---

## Guard tally

| Metric | Count |
|--------|-------|
| className edits | 3 |
| New `aria-pressed` | 2 (#2, #3) |
| New `aria-label` | 0 (#1 pre-existing kept) |
| `ring-ring` OUTWARD | 2 (#2, #3) |
| `ring-white/70` | 1 (#1 — over `<img>` media) |
| `ring-inset` | 0 |
| `active:scale` new | 3 (`scale-95` ×1, `[0.97]` ×2) |
| FLIPs | 0 |
| Fresh transitions | 1 (`transition-transform` on #1) |
| `transition-all` kept | 2 (#2, #3) |
| Logic lines touched | 0 |

## Owner verify

1. **Run `npm run update`** — must pass (type-check + worker + build). Both `aria-pressed` expressions are simple `===` comparisons inside template-literal className strings — TypeScript-safe.
2. **Preview at 375px** — back button renders over the cover image (confirm `ring-white/70` is visible against the photo); party/time chips scroll/wrap cleanly; ring is outward and not clipped by any ancestor.
3. **Keyboard tab** — the Back button, then party chips, then time chips should show the focus-visible ring. The Back button's ring should appear white-ish over the image.
4. shadcn `<Button>` (Reserve CTA L312, Add-to-calendar L328, Back-to-Eats L359), `<Input>`, `<Label>`, `<CrossServiceCTAs>` — **untouched**.
