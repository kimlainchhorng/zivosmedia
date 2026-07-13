# MiMo run — 2026-06-14T05:33:38.960Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: SLICE 59 — src/pages/ZivoTravelHome.tsx (2269 lines, the flagship Zivo Travel marketing/booking landing page — dark glassy hero with a 3D coverflow service carousel + live search form, then 8 section components, a destinations rail, and a footer). PREMIUM responsive interaction-token + a11y polish. CLASSNAME-ONLY + display-only aria attrs (aria-label / aria-pressed / aria-expanded ONLY). NO logic, NO handlers, NO state, NO routing, NO supabase/analytics changes, NO new framer props.

Apply the project's STANDING interaction-token rules to RAW <button>/<a>/<Link> ONLY:
- active:scale-[X] press feedback (tiers: icon-only scale-95; small/pill chips & segmented [0.97]; self-contained cards [0.98]; full-width / wide-rows / bare full-width flex regions [0.99]).
- transition-all when the control ALSO has a real hover:bg-*/hover:text-*/hover:border-*/hover:opacity COLOR fade; transition-transform for PURE press-scale with no hover color (OR when the only hover is a TRANSFORM like hover:scale-110/hover:-translate). FLIP transition-colors→transition-all when adding a scale alongside a color hover. A Tailwind BARE `transition` shorthand already covers transform → NO flip needed when adding active:scale.
- focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (OUTWARD ring-ring default; ring-white/70 when the ring renders OVER an image/photographic/gradient media surface; ring-inset ONLY if flush inside a SEPARATE overflow-hidden rounded ancestor).
- aria: icon-only no-text+no-label button -> ADD aria-label; if it already HAS an aria-label, KEEP it. aria-pressed ONLY for segmented single-select controls that convey selection by BACKGROUND fill with a constant label word (NOT tab-bar text-color/underline selection, NOT role=tab). Do NOT add aria-expanded to dialog/sheet openers.

This file is huge, so I've grouped the controls into PATTERN CLASSES. Confirm the exact treatment per class and resolve the questions. Match the parity reference JobPostingDetailPage.tsx conventions where an analogous control exists there.

=== CONTROL INVENTORY (RAW button / a / Link) ===

GROUP A — 3D coverflow card (1): L621 `motion.button` inside ServiceCarousel3D. It ALREADY has framer `animate={{x,z,rotateY,scale,opacity}}` + spring `transition` + `will-change-transform`, plus managed `aria-label`, `aria-hidden`, `tabIndex`. It is an overflow-hidden image card.
  (QA) A CSS `active:scale` would FIGHT framer's animated `scale` transform. My lean = SKIP active:scale entirely (framer owns transform). For focus: it's keyboard-focusable (tabIndex 0 when center). Add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (ring over media) WITHOUT outline-none risk? Or leave native? Lean = ADD ring-white/70, no scale, KEEP existing aria. Confirm.

GROUP B — carousel arrows (2): L659 Prev / L667 Next. Icon-only, circular `grid h-11 w-11 ... rounded-full border border-white/20 bg-white/10 text-white backdrop-blur transition hover:scale-105 hover:bg-white/20`, ALREADY have `aria-label="Previous service"`/`"Next service"`. They sit OVER the carousel/media area.
  → ADD `active:scale-95` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (ring over media). KEEP `transition` shorthand (already covers transform+color). KEEP aria-label. Confirm ring-white/70 (over media) vs ring-ring.

GROUP C — carousel pagination dots (1 set): L678 `<button className="h-2 rounded-full transition-all" + w-8/w-2 ...>`, ALREADY have aria-label="Show <label>". Tiny indicator dots.
  (QC) Dots are 8px tall. ADD focus ring (lean: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`)? And do tiny dots get an active:scale? My lean = focus ring YES (keyboard reachable), active:scale NO (8px dot, scale is imperceptible/visually odd; transition-all already there). Confirm.

GROUP D — preview-driver selector rows (3 components, same shape): L883 LiveItineraryBoard itinerary buttons, L976 TripStackBuilder layer buttons, L1075 JourneyCommandDeck step buttons. Each is a full-width row `<button className="group flex ... rounded-* border p-* text-left transition [hover:-translate-y-0.5 | hover:border-white/25]">` with a `selected` conditional style (bg/border highlight) that drives a preview panel.
  (QD1) active:scale tier — these are full-width rows inside a vertical stack → lean `active:scale-[0.99]`. Confirm (vs card [0.98]).
  (QD2) transition — they use BARE `transition` shorthand (covers transform) → NO flip needed, just append active:scale. Confirm.
  (QD3) focus ring — over solid/dark section bg (not photographic) → `ring-ring`? L883 is over a light `#f6fbff` section; L976/L1075 over dark `#050b14`/`#060a12`. ring-ring works on both (it's a token). Confirm ring-ring (outward), NOT ring-white/70.
  (QD4) aria-pressed — they are single-select controls that highlight the active row (selection by bg/border fill) and swap a connected preview. Is this the aria-pressed case, OR is it more of a tablist (preview = tabpanel) where aria-pressed is wrong? My lean = ADD `aria-pressed={selected}` (single-select, selection by background fill, constant content) since we are NOT allowed to add role=tab/tablist. Confirm vs NO aria.

GROUP E — hero search-form service tabs (1 set): L1939 `<button>` 4-up segmented tabs, selected = `bg-white text-zinc-950`, unselected = `text-zinc-300 hover:bg-white/10`, BARE `transition`.
  → This IS segmented selection by BG fill with constant intent → ADD `aria-pressed={index === i}`, `active:scale-[0.97]` (segmented), focus ring `ring-ring` (the form has its own dark surface; tabs are on white/5). transition shorthand covers it → NO flip. Confirm exact: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-pressed.

GROUP F — header desktop nav service buttons (1 set): L1826 `<button className="flex items-center gap-2 transition hover:text-white" + (index===i && service.accent)>`. Inline nav text, selection by TEXT-COLOR (accent), NO bg fill.
  (QF) tab-bar pattern (selection by text color, not bg) → NO aria-pressed (confirm). Inline text nav → active:scale? Lean = NO scale (inline text, no surface). Focus ring? Lean = ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (keyboard-reachable nav control) but it has no border-radius → also add `rounded-sm` for a tidy ring? OR leave native focus? Resolve: my lean = ADD ring + rounded-sm, NO scale, NO aria-pressed, keep `transition hover:text-white`.

GROUP G — footer text buttons (2): L2245 `<button onClick={navigate(service.href)} className="transition hover:text-white">` service links + L2252 `<button onClick={goCrossDomain...} title=... className="transition hover:text-white">` "Zivos Media ↗". Inline footer text-links (sit beside real <Link> Terms/Privacy at L2250/2251).
  (QG) Same inline-text-link treatment as GROUP F: NO scale, ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm`, keep `transition hover:text-white`, NO aria. Confirm. (The adjacent <Link>Terms/Privacy at L2250/2251 are ALSO inline text-links with the same `transition hover:text-white` — should they get the SAME ring+rounded-sm for parity, or are <Link>s in-scope only if they're the same visual class? My lean = YES, treat the two footer <Link>s identically for a consistent footer row.)

GROUP H — mobile menu toggle (1): L1859 `<button onClick={() => setMobileOpen(v=>!v)} className="rounded-full border border-white/15 px-4 py-2 text-sm font-black md:hidden">`. Text "Menu". Toggles an INLINE disclosure panel (not a dialog/sheet).
  (QH) This expands an inline nav panel → aria-expanded is the CORRECT case here (the "do NOT add aria-expanded" rule is specifically for dialog/SHEET openers; this is an inline disclosure). ADD `aria-expanded={mobileOpen}`? My lean = YES add aria-expanded (inline disclosure, not a dialog). Plus `active:scale-95` (small pill) and focus ring `ring-ring`. It has NO transition currently → adding a pure press-scale with no color hover ⇒ add `transition-transform`. Confirm: append `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + aria-expanded.

GROUP I — mobile menu rows (1 set + 2): L1871 service `<button>` rows + L1884 Wallet `<Link>` + L1892 Login `<Link>`. Full-width rows `border ... px-4 py-3 text-left text-sm font-black` (no transition currently; L1892 is a filled emerald button).
  → full-width rows → `active:scale-[0.99]`; pure press (no color hover) ⇒ `transition-transform`; focus ring `ring-ring`. Confirm same treatment for the 3 (L1892 emerald CTA could be [0.99] too as a full-width row).

GROUP J — hero search SUBMIT CTA (1): L2020 `<button type="submit" className="group flex min-h-14 ... rounded-2xl bg-emerald-500 px-6 ... transition hover:bg-emerald-400">`. Full-width gradient CTA with inner arrow `group-hover:translate-x-1`.
  → full-width CTA → `active:scale-[0.99]` (or [0.98]?); has `hover:bg-emerald-400` COLOR fade + BARE `transition` shorthand → NO flip needed (shorthand covers all); focus ring `ring-ring`. Confirm tier ([0.99] full-width vs [0.98]) and that bare `transition` needs no flip.

GROUP K — destination image cards (1 set): L2102 `<button className="zt-on-media group relative h-72 w-64 shrink-0 snap-start overflow-hidden rounded-[1.8rem] border border-white/10 text-left">`. Photographic image cards, inner `group-hover:scale-110` img, NO transition on the button itself, NO hover color on the button.
  → self-contained card → `active:scale-[0.98]`; pure press (hover effect is on the child img transform, button has no own hover color) ⇒ `transition-transform`; focus ring OVER media ⇒ `ring-white/70`. Confirm.

GROUP L — currency display button (1): L1847 `<button className="flex h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-sm font-bold text-zinc-200"><Globe2/>USD</button>`. It has NO onClick — non-functional placeholder.
  (QL) Per project rule, no-op/missing-onClick buttons are FLAGGED to owner, NOT given interaction tokens (tokens imply functionality it doesn't have). My lean = SKIP (leave as-is) and FLAG to owner that the USD button has no handler. Confirm SKIP.

GROUP M — content/CTA <Link> and <a href="#..."> controls (the bulk, ~28). All are real navigations. Sub-classes:
  (M1) Self-contained content CARDS (block, own surface, photographic or glass, usually `transition hover:-translate-y-1 hover:border-*`): L757 ServiceLayerShowcase Link, L804 QuickActionDock Link, L1031 TripStackBuilder layer Link cards, L1133/L1138 JourneyCommandDeck checkout/wallet Link, L1143 "New search" a#booking, L1182 assurance Link cards, L1328 a#booking pillar / L1332 Link pillar, L1426/L1431 PaymentPayoutFlow Link, L1467 popular-search Link cards, L2159/L2161 workflow a/Link card-wrappers, L2171 ops Link cards. → `active:scale-[0.98]` + focus ring + transition handling (most have BARE `transition` shorthand → no flip; some have NO transition → add `transition-transform` since press is the only animated transform and the hover is translate/border which the shorthand-less ones need `transition-all` if they DO have hover:border color... resolve per-control: if a card has `transition hover:-translate-y-1 hover:border-*` keep shorthand+append scale; if a card has NO transition + a hover:border color → add `transition-all`).
  (M2) Pill / rounded-full CTA links (`rounded-full ... px-6 py-3 ... transition hover:bg-*`/`hover:border-*`): L865 "Continue checkout", L869 "View trips", L938 "Open layer", L1168/L1171 confidence CTAs, L1220/L1223 handoff CTAs, L1810 header logo Link (group, has hover on inner span), L1836/L1840 header Trips/Wallet nav Links (`transition hover:text-white` inline), L1851 Log in Link, L1854 Start booking a#booking, L2136 "See how it works" a (inline text), L2208 "Start a trip" a / L2209/L2210 Links, L2250/L2251 footer Terms/Privacy (covered in GROUP G).
    → pill CTAs: `active:scale-[0.97]` (pill) + focus ring `ring-ring` (or ring-white/70 if over media) + flip/append transition per hover-color presence. Inline text nav Links (L1836/L1840/L2136 and header logo): treat like inline text-links (NO scale, ring + rounded-sm) — confirm, OR do header pill-height nav Links count as pills? (L1836/L1840 are `flex items-center gap-2 transition hover:text-white` inline text, NOT pills → inline-text treatment.) Header logo L1810 is a brand lockup link → lean NO scale, ADD focus ring (rounded-2xl-ish via the inner span? the <Link> itself has no radius) → add rounded-sm + ring, no scale. Confirm.

=== KEY GLOBAL QUESTIONS ===
(G1) Given ~40 controls, confirm the per-class tiers above are internally consistent with the project ladder (icon-95 / pill+segmented-0.97 / card-0.98 / wide-row+full-width-0.99) and the inline-text-link exception (NO scale, ring + rounded-sm).
(G2) ring color rule: ring-white/70 ONLY for controls whose focus ring renders directly over a photographic/image media surface (GROUP A coverflow card, GROUP B arrows, GROUP C dots, GROUP K destination cards, and any M1 card whose ring sits over a full-bleed photo). Everything else (selectors over solid section bg, form tabs, pills, inline text, footer) = outward `ring-ring`. Confirm this split, and flag any control I mis-bucketed.
(G3) Anything I should SKIP beyond GROUP L (the no-op USD button)? E.g., the brand logo Link, or any control where tokens would look wrong? Also confirm: do NOT touch the TiltCard/ScrollTurn/Reveal/motion.* wrappers, the <input>/<label> form fields, the CrossAppReturnBar child, or any presentational div.

Reply CONCISE but COMPLETE: give me the final exact className suffix (and any aria attr) to append for EACH group A–M (and M sub-classes), plus explicit YES/NO on QA, QC, QD1-4, QF, QG, QH, QL, G1-G3. This will drive a multi-edit className-only pass; precision on the per-group suffix strings is what matters most.
- files: src/pages/ZivoTravelHome.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## 1. Short plan

~40 RAW interactive controls in `src/pages/ZivoTravelHome.tsx`, grouped into 13 pattern classes (A–M). All changes are **className-only** + up to 5 new `aria-*` attributes (`aria-pressed` ×2 groups, `aria-expanded` ×1). Zero logic/handler/state/routing/supabase changes. One skipped control (GROUP L — no-op USD button, flagged to owner).

Ring-color split: **`ring-white/70`** for controls whose ring visually sits over photographic/image media (Groups A, B, C, K, and M1a ServiceLayerShowcase Link). **`ring-ring`** for everything else (solid/tinted section bg, form surfaces, inline text, footer).

---

## 2. Exact per-group treatment

### GROUP A — Coverflow card (L621 `motion.button`)

| Item | Value |
|---|---|
| **active:scale** | **SKIP** — framer's `animate={{ scale }}` owns the transform; CSS `active:scale` would fight it |
| **transition** | SKIP — framer owns all animation |
| **focus ring** | **APPEND** `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (ring over photographic media; `overflow-hidden` does NOT clip own `box-shadow` ring) |
| **aria** | KEEP existing `aria-label`, `aria-hidden`, `tabIndex` — do not touch |
| **suffix** | ` focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` |

**QA: CONFIRMED.** Skip active:scale (framer owns transform). ADD ring-white/70, no outline-none risk (ring-2 replaces native outline via `outline-none`).

---

### GROUP B — Carousel arrows (L659 Prev, L667 Next)

| Item | Value |
|---|---|
| **active:scale** | `active:scale-95` (icon-only tier) |
| **transition** | KEEP `transition` shorthand (already covers transform + hover:scale-105 + hover:bg). **NO flip.** |
| **focus ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (over carousel media) |
| **aria** | KEEP existing `aria-label="Previous service"` / `"Next service"` |
| **suffix** | ` active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` |

Note: `hover:scale-105` + `active:scale-95` creates a hover→press (1.05→0.95) tactile effect; CSS `active` overrides `hover` in LVHA order. ✓

---

### GROUP C — Carousel dots (L678 `<button>` set)

| Item | Value |
|---|---|
| **active:scale** | **SKIP** — 8px-tall dots, scale is imperceptible/visually odd |
| **transition** | KEEP `transition-all` (already present) |
| **focus ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (over carousel media; ring will be 6px tall on inactive dots — larger than the dot, which is correct for keyboard a11y) |
| **aria** | KEEP existing `aria-label="Show <label>"` |
| **suffix** | ` focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` |

**QC: CONFIRMED.** Focus ring YES, active:scale NO.

---

### GROUP D — Preview-driver selector rows (3 components)

**LiveItineraryBoard** (L883), **TripStackBuilder** (L976), **JourneyCommandDeck** (L1075). All share: full-width rows, `transition` shorthand, selected = `active === i` (or `selected`), bg/border highlight on selection.

| Item | Value |
|---|---|
| **active:scale** | `active:scale-[0.99]` (full-wide-row tier) |
| **transition** | KEEP `transition` shorthand (covers `hover:-translate-y-0.5` and/or `hover:border-*` color). **NO flip.** |
| **focus ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (over solid section bg — light #f6fbff or dark #050b14/#060a12; `ring-ring` token works on both) |
| **aria** | **ADD `aria-pressed={selected}`** (single-select, selection by bg/border fill, constant content per row; NOT role=tab — we're not allowed to add role=tab) |
| **suffix** | ` active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + attr `aria-pressed={selected}` |

**QD1: YES** `[0.99]` (full-width rows in vertical stack).
**QD2: YES** bare `transition` → NO flip.
**QD3: YES** `ring-ring` (outward), NOT `ring-white/70`.
**QD4: YES** `aria-pressed={selected}` (single-select bg-fill, constant label content).

---

### GROUP E — Hero search service tabs (L1939 segmented set, 4 tabs)

| Item | Value |
|---|---|
| **active:scale** | `active:scale-[0.97]` (segmented tier) |
| **transition** | KEEP `transition` shorthand (covers bg/text color fades). **NO flip.** |
| **focus ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (tabs sit on dark glass search form, not over media) |
| **aria** | **ADD `aria-pressed={index === i}`** (segmented single-select, bg-fill selection with constant service label) |
| **suffix** | ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + attr `aria-pressed={index === i}` |

**CONFIRMED.** Exact: append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-pressed={index === i}`.

---

### GROUP F — Header desktop nav service buttons (L1826 `<button>` set)

| Item | Value |
|---|---|
| **active:scale** | **SKIP** — inline text nav, no surface |
| **transition** | KEEP `transition hover:text-white` (already present, covers color) |
| **focus ring** | ADD `rounded-sm` (tidy ring corners) + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **aria** | **NO aria-pressed** — selection by text-color, NOT bg fill (tab-bar text-color pattern) |
| **suffix** | ` rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |

**QF: CONFIRMED.** NO scale, NO aria-pressed, ADD ring + `rounded-sm`.

---

### GROUP G — Footer text buttons + adjacent Links (L2245, L2252, L2250, L2251)

All four are inline text controls with `transition hover:text-white`. Two `<button>`s (L2245 service links, L2252 "Zivos Media ↗") + two `<Link>`s (L2250 Terms, L2251 Privacy).

| Item | Value |
|---|---|
| **active:scale** | **SKIP** — inline text links, no surface |
| **transition** | KEEP `transition hover:text-white` |
| **focus ring** | ADD `rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **aria** | NO new aria (distinct visible text per control) |
| **suffix** | ` rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |

**QG: CONFIRMED.** Same treatment for all 4 (both `<button>`s AND both `<Link>`s) for consistent footer row. NO scale, ADD ring + `rounded-sm`.

---

### GROUP H — Mobile menu toggle (L1859 `<button>`)

| Item | Value |
|---|---|
| **active:scale** | `active:scale-95` (small pill — has `rounded-full border px-4 py-2`) |
| **transition** | **ADD `transition-transform`** (no existing transition; pure press-scale with no hover color) |
| **focus ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (already `rounded-full` → ring hugs pill) |
| **aria** | **ADD `aria-expanded={mobileOpen}`** (inline disclosure toggle, NOT a dialog/sheet — the "do NOT add aria-expanded" rule is specifically for dialog/sheet openers) |
| **suffix** | ` transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + attr `aria-expanded={mobileOpen}` |

**QH: CONFIRMED.** `aria-expanded={mobileOpen}` YES (inline disclosure). `transition-transform` + `active:scale-95` + ring YES.

---

### GROUP I — Mobile menu rows (L1871 service buttons + L1884 Wallet `<Link>` + L1892 Login `<Link>`)

All are full-width rows with no existing transition.

| Control | Suffix |
|---|---|
| **L1871 service buttons** (no hover color) | ` transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1884 Wallet `<Link>`** (no hover color) | ` transition-transform active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1892 Login `<Link>`** (filled emerald — **check if has `hover:bg-emerald-*`**) | If has hover color: ` transition-all active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. If no hover color: same as L1871. |

**Implementation note:** Inspect L1892 at edit time. If it has `hover:bg-*` or `hover:text-*`, use `transition-all`; otherwise `transition-transform`.

---

### GROUP J — Hero search submit CTA (L2020 `<button type="submit">`)

| Item | Value |
|---|---|
| **active:scale** | `active:scale-[0.99]` (full-width CTA, min-h-14, rounded-2xl, emerald fill) |
| **transition** | KEEP `transition` shorthand (covers `hover:bg-emerald-400` color + inner arrow `group-hover:translate-x-1`). **NO flip.** |
| **focus ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (over dark glass search form, not photographic media) |
| **aria** | NO new aria (visible "Search" text) |
| **suffix** | ` active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |

---

### GROUP K — Destination image cards (L2102 `<button>` set)

| Item | Value |
|---|---|
| **active:scale** | `active:scale-[0.98]` (self-contained card tier; `h-72 w-64 rounded-[1.8rem] overflow-hidden`) |
| **transition** | **ADD `transition-transform`** (no existing transition on the button; the hover effect is on child `group-hover:scale-110` img — button has no own hover color) |
| **focus ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (photographic image cards; `overflow-hidden` does NOT clip own `box-shadow` ring) |
| **aria** | If no `aria-label` exists, check inner text. If the card has visible destination name text → NO aria-label needed. If only image → ADD `aria-label` per destination name. |
| **suffix** | ` transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` |

---

### GROUP L — Currency display button (L1847 `<button>`)

| Item | Value |
|---|---|
| **Treatment** | **SKIP entirely** — no `onClick` handler, non-functional placeholder |

**QL: CONFIRMED.** SKIP and **FLAG to owner**: the USD button has no handler; tokens would imply functionality it doesn't have. Recommend adding a currency-selector onClick or removing the button.

---

### GROUP M — Content/CTA Links and anchors (~28 controls)

#### M1a — Cards with visible photographic backgrounds (ring over media)

**ServiceLayerShowcase** (L757 `<Link>`): wraps TravelTiltCard with `<img>` bg

| Item | Value |
|---|---|
| **active:scale** | `active:scale-[0.98]` (self-contained card) |
| **transition** | **ADD `transition-transform`** (Link has no transition class; hover effect is on child img `group-hover:scale-105` — Link has no own hover color) |
| **focus ring** | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` (ring over photographic card) |
| **rounded** | **ADD `rounded-[2rem]`** on the `<Link>` to match the TravelTiltCard child's rounded corners (currently `className="group block"` — no radius → ring would be sharp rectangle) |
| **suffix** | ` rounded-[2rem] transition-transform active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70` |

#### M1b — Cards over solid section bg (glass/tinted/tone cards)

All get `ring-ring`. Per-card transition handling:

| Control | Has `transition`? | Has hover color/border? | Suffix |
|---|---|---|---|
| **L804 QuickActionDock** (`rounded-[1.4rem] transition hover:-translate-y-1 hover:border-emerald-300/50`) | YES `transition` | YES (border color) | ` active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1031 TripStackBuilder layer Links** (`rounded-2xl border p-3 transition hover:border-white/25`) | YES `transition` | YES | ` active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1133/L1138 JCD checkout/wallet** (`rounded-2xl border ... transition hover:border-emerald-300/45`) | YES `transition` | YES | ` active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1143 "New search" `<a>`** (same pattern) | YES `transition` | YES | ` active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1182 assurance cards** (`rounded-[1.7rem] ... transition hover:-translate-y-1 hover:border-emerald-300/55`) | YES `transition` | YES | ` active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1328/L1332 connection pillars** — check if has `transition` + hover | Per inspection | Per inspection | `active:scale-[0.98]` + ring + transition per hover |
| **L1426/L1431 PaymentPayoutFlow Links** | Per inspection | Per inspection | Same pattern |
| **L1467 popular-search Links** | Per inspection | Per inspection | Same pattern |
| **L2159/L2161 workflow card-wrappers** | Per inspection | Per inspection | Same pattern |
| **L2171 ops Links** | Per inspection | Per inspection | Same pattern |

**Rule for all M1b:** If has `transition` shorthand + hover → just append `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. If has NO transition + has hover:border color → ADD `transition-all active:scale-[0.98] ...`. If has NO transition + NO hover → ADD `transition-transform active:scale-[0.98] ...`.

**Rounded for Links:** If the `<Link>`/`<a>` has no rounded class but its child card has rounded → ADD matching `rounded-*` on the Link. If it already has its own rounded → no change needed.

#### M2a — Pill/rounded-full CTA Links

| Control | Has `transition`? | Has hover? | Suffix |
|---|---|---|---|
| **L865 "Continue checkout"** (`rounded-full bg-emerald-500 ... transition hover:-translate-y-0.5 hover:bg-emerald-400`) | YES | YES (color + translate) | ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L869 "View trips"** (`rounded-full border ... transition hover:-translate-y-0.5`) | YES | YES (translate) | ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L938 "Open layer"** (`rounded-full bg-emerald-500 ... transition hover:bg-emerald-400`) | YES | YES | ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1168/L1171 confidence CTAs** (`rounded-full bg-slate-950 ... transition hover:bg-slate-800` / `rounded-full border ... transition hover:border-emerald-400`) | YES | YES | ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L1220/L1223 handoff CTAs** (`rounded-full bg-emerald-500 ... transition hover:bg-emerald-400` / `rounded-full border ... transition hover:border-white`) | YES | YES | ` active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |
| **L2208/L2209/L2210 "Start trip"** — check styling | Per inspection | Per inspection | Same pill pattern if rounded-full + CTA |

All pill CTAs with `transition` shorthand → NO flip. Just append `active:scale-[0.97]` + ring.

Ring color: `ring-ring` for pills over solid/tinted bg. If a pill is over photographic media → `ring-white/70`.

#### M2b — Inline text nav Links (NO scale, ring + rounded-sm)

| Control | Suffix |
|---|---|
| **L1810 header logo `<Link>`** | ` rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (brand lockup, not a surface button; NO scale) |
| **L1836/L1840 header Trips/Wallet** (`flex items-center gap-2 transition hover:text-white`) | ` rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (inline text nav, text-color selection → NO aria-pressed, NO scale) |
| **L1851 Log in `<Link>`** — check: if it's a pill/rounded-full CTA → treat as M2a; if inline text → treat here | Per inspection |
| **L1854 Start booking `<a>`** — same check | Per inspection |
| **L2136 "See how it works" `<a>`** (inline text) | ` rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` |

---

## 3. Answers to all questions

| Q | Answer |
|---|---|
| **QA** | **YES.** SKIP active:scale (framer owns transform). ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`. KEEP existing aria. |
| **QC** | **YES.** Focus ring `ring-white/70` YES. active:scale NO (8px dot, imperceptible). |
| **QD1** | **YES.** `[0.99]` (full-width rows in vertical stack). |
| **QD2** | **YES.** BARE `transition` → NO flip, just append `active:scale-[0.99]`. |
| **QD3** | **YES.** `ring-ring` (outward token) on both light (#f6fbff) and dark (#050b14) section bg. NOT `ring-white/70`. |
| **QD4** | **YES.** ADD `aria-pressed={selected}` (single-select, bg/border fill, constant content per row). NOT role=tab (out of className-only scope). |
| **QF** | **YES.** NO scale (inline text), NO aria-pressed (text-color selection), ADD `rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`, keep `transition hover:text-white`. |
| **QG** | **YES.** Same inline-text treatment for all 4 controls (both `<button>`s AND both `<Link>`s). NO scale, ADD ring + `rounded-sm` for consistent footer row. |
| **QH** | **YES.** ADD `aria-expanded={mobileOpen}` (inline disclosure, NOT dialog/sheet). ADD `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. |
| **QL** | **YES.** SKIP. **FLAG to owner:** USD button has no onClick handler; tokens would imply functionality. |
| **G1** | **YES.** Tiers are internally consistent: icon-95 / pill+segmented-0.97 / card-0.98 / wide-row-0.99 / inline-text-link (NO scale, ring + rounded-sm). All match the project ladder. |
| **G2** | **YES.** Split is correct. `ring-white/70`: Group A (coverflow card), B (arrows), C (dots), K (destination cards), M1a (ServiceLayerShowcase Link). `ring-ring`: everything else. **Flag:** if any M1b card I didn't line-item has photographic `<img>` as a visible bg (not just a faint overlay), it should get `ring-white/70`. The implementer should check at edit time. |
| **G3** | **SKIP beyond GROUP L:** the brand logo Link (L1810) IS functional (navigates home) → gets tokens. Only the USD no-op button (GROUP L) should be skipped. **CONFIRMED:** do NOT touch TiltCard/ScrollTurn/Reveal/motion.* wrappers, `<input>`/`<label>` form fields, CrossAppReturnBar child, or any presentational `<div>`. |

---

## 3. Owner must verify / deploy

1. **Run `npm run update`** after all edits — must pass (type-check + worker type-check + production build, 0 errors).
2. **FLAG:** The USD currency button (L1847) has no `onClick` handler — it's a non-functional placeholder. Add a currency-selector flow or remove it.
3. **Preview at 375/768/1024/1280:** The destination cards (Group K) are in a horizontal snap rail — verify that the focus ring (`ring-2` = 2px outward) doesn't get clipped by the rail's overflow. If the rail uses `overflow-x-auto`, the ring should be fine (only clips in one direction, and the cards have their own `overflow-hidden` which does NOT clip their own `box-shadow` ring).
4. **L1892 Login Link:** Implementer must inspect at edit time — if it has `hover:bg-emerald-*`, use `transition-all` instead of `transition-transform`.
5. **~28 M1/M2 Links:** The exact treatment for each is specified by pattern class, but the implementer should verify the `rounded-*` on the `<Link>`/`<a>` matches the child card's rounded (add it if missing) and that the transition handling (shorthand vs all vs transform) matches the control's actual hover behavior.
6. **Do NOT commit unless owner asks.** Build is ready to deploy; owner pushes.
