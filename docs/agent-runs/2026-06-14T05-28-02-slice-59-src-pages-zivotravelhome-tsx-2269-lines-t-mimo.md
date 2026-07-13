# MiMo run — 2026-06-14T05:28:02.521Z

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

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
This is a massive task - applying premium interaction tokens and a11y improvements to ZivoTravelHome.tsx, a 2269-line file. Let me carefully work through each group the task defines and provide precise answers.

Let me analyze each group systematically:

**GROUP A — 3D coverflow card (motion.button at L621)**
- Already has framer `animate={{x,z,rotateY,scale,opacity}}` with spring transition
- CSS `active:scale` would fight framer's animated scale → SKIP active:scale
- It IS keyboard focusable (tabIndex 0 when center)
- It's over photographic media (image cards) → ring-white/70
- Already has aria-label → KEEP
- QA: SKIP active:scale, ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`

**GROUP B — carousel arrows (L659 Prev, L667 Next)**
- Icon-only, already have aria-label
- Already have `transition hover:scale-105 hover:bg-white/20` — bare `transition` covers transform
- Over media → ring-white/70
- ADD `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`
- KEEP `transition` shorthand (already covers transform+color)

**GROUP C — carousel pagination dots**
- Already have aria-label
- Already have `transition-all`
- Over media → ring-white/70
- ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`
- NO active:scale (8px dot, imperceptible)
- QC: YES ring, NO scale

**GROUP D — preview-driver selector rows**
- L883 LiveItineraryBoard, L976 TripStackBuilder, L1075 JourneyCommandDeck
- Full-width rows with `transition hover:-translate-y-0.5` (LiveItinerary) or `transition` (TripStack, Journey)
- Single-select, selection by bg/border fill, constant content
- QD1: `active:scale-[0.99]` (full-width rows in vertical stack)
- QD2: BARE `transition` shorthand → NO flip needed, just append scale
- QD3: Over solid/dark section bg → `ring-ring` (outward)
- QD4: ADD `aria-pressed` — single-select, selection by bg/border fill, constant content label

Wait, let me reconsider QD4. The task says "aria-pressed ONLY for segmented single-select controls that convey selection by BACKGROUND fill with a constant label word (NOT tab-bar text-color/underline selection, NOT role=tab)."

These selector rows DO convey selection by background/border fill. But the content is NOT a constant label word — each button has different route/detail/price content. However, the precedent in the codebase uses aria-pressed for segmented filters where each button has a visible constant label (like "All (n)" / "Active (n)"). 

Looking more carefully: the itinerary buttons have varying content (title, route, price) but the selection state IS communicated by background fill. The "constant label" rule is about not adding aria-pressed when the label itself changes to indicate state (like tabs that change text color). Here the labels are static per button — they don't change based on selection. The background change signals "selected."

Actually, the more important consideration is whether these are truly segmented-pool selectors or something more like accordion/toggle panels. Looking at the code:
- LiveItineraryBoard: clicking a row selects it and shows a connected preview panel
- TripStackBuilder: same pattern
- JourneyCommandDeck: same pattern

This is very similar to the LeaderboardsPage board-selector pills — single-select pool where bg conveys selection. The difference is these are full-width rows rather than pills, but the pattern is the same.

I'll say ADD `aria-pressed`. Each button has visible content that acts as its persistent label.

**GROUP E — hero search-form service tabs**
- 4-up segmented tabs, selected = bg fill
- BARE `transition`
- Over dark surface → `ring-ring`
- YES this is segmented → ADD `aria-pressed={index === i}`
- ADD `active:scale-[0.97]` (segmented tier)
- ADD focus ring `ring-ring`

**GROUP F — header desktop nav service buttons**
- Inline text, selection by TEXT-COLOR (accent), NO bg fill
- tab-bar pattern → NO aria-pressed
- Inline text nav → NO scale
- ADD focus ring `ring-ring` + `rounded-sm`
- QF: ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm`, NO scale, NO aria-pressed

**GROUP G — footer text buttons + adjacent Links**
- Inline footer text-links
- Same treatment as GROUP F: NO scale, ADD ring + rounded-sm
- QG: YES treat the footer Links (Terms/Privacy) identically for parity

**GROUP H — mobile menu toggle**
- Toggles inline disclosure panel (not dialog/sheet)
- ADD `aria-expanded={mobileOpen}` (inline disclosure, correct case)
- Small pill → `active:scale-95`
- No transition currently → ADD `transition-transform` (pure press, no color hover)
- ADD focus ring `ring-ring`
- QH: YES `aria-expanded`, `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

**GROUP I — mobile menu rows**
- Service buttons + Wallet Link + Login Link
- Full-width rows → `active:scale-[0.99]`
- No transition currently, no hover color → `transition-transform`
- Focus ring `ring-ring`

**GROUP J — hero search submit CTA**
- Full-width emerald gradient CTA with `hover:bg-emerald-400`
- BARE `transition` → covers transform+color, NO flip
- Full-width → `active:scale-[0.99]`
- Focus ring `ring-ring`

Wait, this is `min-h-14` with `rounded-2xl bg-emerald-500 px-6` — it's a full-width submit button. `active:scale-[0.99]` for full-width rows. Yes.

**GROUP K — destination image cards**
- Photographic image cards with `overflow-hidden`
- Self-contained card → `active:scale-[0.98]`
- No transition on button itself, hover is on child img transform → `transition-transform`
- Over media → `ring-white/70`
- But wait — the button HAS `overflow-hidden`. The task says "ring-inset ONLY if flush inside a SEPARATE overflow-hidden rounded ancestor." The button IS the overflow-hidden element itself — it's not inside a separate one. So ring-white/70 outward. Actually, let me think... `overflow-hidden` on the button itself. An outward ring (via `ring-2 ring-white/70`) uses box-shadow which is NOT clipped by `overflow-hidden` on the same element. So outward ring-white/70 is fine.

**GROUP L — currency display button**
- No onClick → SKIP, flag to owner
- QL: SKIP confirmed

**GROUP M — content/CTA Link and a# controls**

Let me work through each M subclass:

**M1 — Self-contained content CARDS:**
Most have `transition hover:-translate-y-1 hover:border-*` (bare `transition` shorthand)
- Self-contained card → `active:scale-[0.98]`
- `transition` shorthand covers transform → NO flip
- Most are over solid/neutral bg → `ring-ring`
- Some over media (photographic) → `ring-white/70` — need to check each

Let me go through each M1 control:
- L757 ServiceLayerShowcase Link: `group block` wrapping TravelTiltCard with photographic images. The link wraps a card with `overflow-hidden` and images. But the `<Link>` itself doesn't have overflow-hidden. The ring on the Link renders outside the card visually? No — the Link has no visual boundary of its own, the card child has. The ring would render around the Link's border box. Since the Link has no border/bg, the ring would be around the inline/block layout area. Actually, looking at the code: `<Link to={item.href} className="group block">` — no border-radius, no overflow-hidden. The child TravelTiltCard has `overflow-hidden rounded-[2rem]`. The Link itself has no radius → add `rounded-[2rem]` + `ring-white/70`? Hmm, but the Link doesn't have its own visual surface. The focus ring would be rectangular around the block without a radius.

Actually, for card-wrapping Links, the established pattern (from CreatorDashboardPage group I/K) is to add `rounded-[20px]` on the Link + focus ring. But these cards have different radii.

Let me reconsider. The task says for M1: "Self-contained content CARDS (block, own surface, photographic or glass)". These are Links wrapping content cards. The pattern should be:
- Add matching border-radius to the Link so the ring hugs the card
- Add focus ring
- Add active:scale-[0.98]
- Transition handling per hover state

For photographic cards (ServiceLayerShowcase, destination cards), use ring-white/70. For glass/solid bg cards, use ring-ring.

Let me be more precise per control. Actually, the task is asking me to provide exact className suffixes per group. Let me be efficient and group them.

Let me go through M1 controls:

1. **L757 ServiceLayerShowcase `<Link>`** — `group block` wrapping TravelTiltCard with `overflow-hidden rounded-[2rem]` and photographic bg. The Link has no className. Need to add: `rounded-[2rem] active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70`. The hover is on the CHILD (img `group-hover:scale-105`), not on the Link itself. So `transition-transform` for the press. But wait — does the child's `transition duration-700 group-hover:scale-105` mean the parent Link needs `transition-all`? No — the child has its own `transition` for the hover effect. The Link just needs the press. `transition-transform` for the Link's own `active:scale`.

Hmm, actually I need to look more carefully. The Link currently has `className="group block"` — no transition at all. Adding `active:scale-[0.98]` to the Link means the entire card (including the photographic content) will scale on press. The child has `group-hover:scale-105` on the img. Since the Link has no hover color of its own, only press-scale, we need `transition-transform`. But the child already has its own `transition duration-700`. The Link's `transition-transform` would only affect the Link's own transform (active:scale). This is fine.

But wait — there's a complication. The child TravelTiltCard has `overflow-hidden`. If the Link has `active:scale-[0.98]`, the Link (parent) scales, not the card child. The ring on the Link renders outside the Link's border-box... but the child card has its own overflow-hidden. The ring should render fine since it's on the Link element, not the card.

OK, for the ring — the Link wraps a photographic card. The ring renders on the Link element. Since the content is photographic, `ring-white/70`. The Link needs a border-radius to hug the card shape → `rounded-[2rem]` matching the child.

2. **L804 QuickActionDock `<Link>`** — `group flex min-h-28 items-center gap-4 rounded-[1.4rem] border border-slate-900/8 bg-white/72 p-4 text-left transition hover:-translate-y-1 hover:border-emerald-300/50`. Self-contained card with its own surface. Has `transition` shorthand + hover translate + hover:border color. `transition` already covers transform → NO flip. ADD `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Over white/neutral bg → ring-ring.

3. **L1031 TripStackBuilder layer `<Link>` cards** — Inside the dark section. `group rounded-2xl border p-3 transition` with `hover:border-white/25`. Has `transition` shorthand → NO flip. ADD `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Over dark section bg → ring-ring.

4. **L1133/L1138 JourneyCommandDeck checkout/wallet `<Link>`** — `group rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-emerald-300/45`. Has `transition` → NO flip. ADD `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`. Over dark section.

5. **L1143 "New search" `<a href="#booking">`** — same as above. Same treatment.

6. **L1182 assurance `<Link>` cards** — `group block h-full rounded-[1.7rem] border border-slate-900/10 bg-white/82 p-5 shadow-... transition hover:-translate-y-1 hover:border-emerald-300/55`. Has `transition` shorthand. Over white/neutral bg. ADD `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

7. **L1328 a#booking pillar / L1332 Link pillar** — These are in the TravelConnectionHub section. Need to check exact classes. The file is truncated but from the data arrays these would be connection pillars. Over white bg section. ADD `active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`.

8. **L1426/L1431 PaymentPayoutFlow Link** — Would need to check exact classes. Presumably similar card pattern.

9. **L1467 popular-search Link cards** — Similar quick-action style.

10. **L2159/L2161 workflow a/Link card-wrappers** — Workflow step cards.

11. **L2171 ops Link cards** — Ops grid cards.

For all M1 cards: `active:scale-[0.98]` + focus ring + transition handling. Over photographic media → ring-white/70; over solid bg → ring-ring.

**M2 — Pill / rounded-full CTA links:**

Sub-categories:
- **Pill CTAs with `rounded-full ... px-6 py-3 ... transition hover:bg-*`**: L865 "Continue checkout", L869 "View trips", L938 "Open layer", L1168/L1171 confidence CTAs, L1220/L1223 handoff CTAs, L1851 Log in Link, L1854 Start booking a#booking, L2208/L2209/L2210 footer "Start a trip" links.
  - Pill tier → `active:scale-[0.97]`
  - Has `transition` shorthand → NO flip
  - Over solid/neutral bg → `ring-ring`
  - Some over dark sections → still `ring-ring` (token, not contextual)

- **Header logo Link L1810** — brand lockup. No scale, ADD focus ring.
- **Header Trips/Wallet nav Links L1836/L1840** — `flex items-center gap-2 transition hover:text-white` inline text. Inline-text treatment → NO scale, ADD ring + rounded-sm.
- **L2136 "See how it works" a** — inline text anchor. NO scale, ring + rounded-sm.
- **L2250/L2251 footer Terms/Privacy** — covered in GROUP G, same treatment.

Now let me think about the M2 controls that have photographic/gradient backgrounds:
- L1810 header logo — over dark header with floating images. The logo itself is text/icon, not photographic. Ring-ring.
- L2208/L2209/L2210 "Start a trip" — in footer area. Ring-ring.

For the emerald pill CTAs that are over dark sections (L1168/L1171 in AppHandoffPanel which has ambientImage bg with overlay, L1220/L1223 in some other section), the surface is dark with a subtle overlay but NOT photographic in the control's immediate vicinity. Ring-ring.

OK, I think I have enough to provide a comprehensive answer. Let me organize this.

Actually, wait — I need to reconsider some details:

For GROUP D QD4 (aria-pressed), let me look at the actual button content more carefully:

L883 LiveItineraryBoard itinerary buttons:
```jsx
<button key={item.title} type="button" onClick={() => selectLayer(i)}
  className={cn("group flex items-center justify-between gap-3 rounded-[1.35rem] border p-4 text-left shadow-sm transition hover:-translate-y-0.5",
    selected ? "border-emerald-400/50 bg-white shadow-[0_18px_45px_rgba(16,185,129,0.12)]" : "border-slate-900/10 bg-white/70 hover:bg-white")}>
```

Each button contains: icon tile, title (like "Air"), route (like "JFK -> Paris CDG"), and price. The visible content is NOT a constant label word — it varies per item. But this is true of the leaderboards page pills too (each has a board name). The key is that each button's content is STATIC (doesn't change based on selection state). The selection is conveyed by background fill.

The aria-pressed rule says "segmented single-select controls that convey selection by BACKGROUND fill with a constant label word." The "constant label word" part... In the leaderboards precedent, each pill has a constant name. Here each row has a title that's constant for that button. The "word" is just the identifier — "Air", "Stay", "Drive", "Bus" for the itinerary; "Air layer", "Stay layer", etc. for the trip stack.

I think aria-pressed IS appropriate here. Each button has a persistent identity/label, selection is by bg fill. ADD `aria-pressed`.

But wait — I should double-check. The rows contain MORE than just a label (icon, title, route, price). But the accessible name can be derived from the visible text. The aria-pressed indicates whether this specific option is currently selected, which is the correct semantic.

For the journeyCommandDeck steps, each button has: icon, title ("Search live inventory"), and body text. Same pattern — single-select, bg fill. ADD aria-pressed.

OK, let me also reconsider GROUP H more carefully:

```jsx
<button onClick={() => setMobileOpen(v=>!v)} className="rounded-full border border-white/15 px-4 py-2 text-sm font-black md:hidden">
```

This toggles an inline panel (not a dialog/sheet). The rule says "Do NOT add aria-expanded to dialog/sheet openers" — this is explicitly NOT a dialog/sheet. An inline disclosure panel is the correct use case for `aria-expanded`. ADD `aria-expanded={mobileOpen}`.

Now, for the mobile menu rows (GROUP I), let me check:
- L1871 service buttons: these navigate (close menu + set index). They're one-shot actions, not toggles. No aria-pressed.
- L1884 Wallet Link: navigation. No aria.
- L1892 Login Link: navigation. No aria.

For GROUP I, the treatment is:
- `active:scale-[0.99]` (full-width rows)
- `transition-transform` (pure press, no color hover — unless I'm wrong about no hover?)

Actually, let me re-read: "L1871 service `<button>` rows" — I need to check if they have hover states. The task says "no transition currently." If they have no hover color and no transition, then `transition-transform` for pure press. If they DO have hover bg, then `transition-all`.

Since the task says "no transition currently" for GROUP I, I'll go with `transition-transform`.

For L1892 (Login button), it's described as "filled emerald button" — if it has `hover:bg-emerald-400` or similar, it would need `transition-all`. But the task says no transition currently... let me assume it follows the same pattern.

Actually, I don't have the exact code for GROUP H and I since the file is truncated. I'll have to work from the task's description.

Let me now compile the final answer.

Actually, re-reading the task one more time for GROUP M1:

The task says for M1 cards: "most have BARE `transition` shorthand → no flip; some have NO transition → add `transition-transform` since press is the only animated transform and the hover is translate/border which the shorthand-less ones need `transition-all` if they DO have hover:border color"

So the rule is:
- If a card has `transition` shorthand + hover effects → keep shorthand, append scale. NO flip needed.
- If a card has NO transition + hover:border color → add `transition-all` (to ease both the new press-scale AND the existing hover:border color)
- If a card has NO transition + no hover color → add `transition-transform` (pure press)

OK let me write up the comprehensive answer now. This is going to be long but precise.

Let me re-examine the specific line numbers since I need to be accurate. The file content provided is partial/truncated, so I'll reference the groups as defined by the task.

For the Ring color determination:
- ring-white/70: GROUP A (coverflow media card), GROUP B (arrows over media), GROUP C (dots over media), GROUP K (destination image cards), and M1 controls where the ring renders directly over photographic/media surfaces
- ring-ring: everything else (selectors over solid section bg, form tabs, pills, inline text, footer, dark section bg)

The key question is which M1 cards sit over photographic media. Looking at:
- L757 ServiceLayerShowcase: photographic bg → ring-white/70
- L804 QuickActionDock: white/neutral bg → ring-ring
- L1031 TripStackBuilder layer links: dark section bg → ring-ring
- L1133/L1138 JourneyCommandDeck: dark section bg → ring-ring
- L1143: dark section → ring-ring
- L1182 TravelConfidenceBand: white bg section → ring-ring
- L1328/L1332 TravelConnectionHub: white bg → ring-ring
- L1426/L1431 PaymentPayoutFlow: need to check. Presumably dark section with gradient overlays but not photographic → ring-ring
- L1467 popular-search: likely white/neutral bg → ring-ring
- L2159/L2161 workflow: likely dark section → ring-ring
- L2171 ops: likely dark section → ring-ring

So the only M1 card with ring-white/70 is L757 ServiceLayerShowcase (photographic bg). All others are ring-ring.

Actually wait, I need to re-check. The ServiceLayerShowcase cards have photographic images as backgrounds with overlays. The Link wraps the entire card. The ring renders around the Link element, which contains the photographic card. So the ring IS over photographic content → ring-white/70.

For destination cards (GROUP K), they're explicitly image cards → ring-white/70.

Let me now write the final comprehensive response.

One more thing — for the carousel arrows (GROUP B), the current className includes `transition hover:scale-105 hover:bg-white/20`. The bare `transition` shorthand already covers transform. Adding `active:scale-95` needs no flip. The `hover:scale-105` is a transform hover, not a color hover, but `transition` already covers it. Confirmed: NO flip.

For the GROUP E search form tabs, they have `transition` and `hover:bg-white/10` on unselected. The `transition` shorthand covers both color and transform. Adding `active:scale-[0.97]` needs no flip. Confirmed.

Now for the actual diff output. Since this is a 2269-line file with ~40+ controls, I should provide:
1. A clear per-group specification of what to append
2. NOT a line-by-line diff (too verbose for this size), but exact className suffix strings and aria attributes

Let me structure this as a table/specification document that Claude or Codex can use to make the edits.

Actually, re-reading the task request: "Reply CONCISE but COMPLETE: give me the final exact className suffix (and any aria attr) to append for EACH group A–M (and M sub-classes), plus explicit YES/NO on QA, QC, QD1-4, QF, QG, QH, QL, G1-G3."

Perfect, that's exactly what I'll do.

Let me think about one more edge case for GROUP M1. The task mentions "hover:-translate-y-1" as a hover effect on some cards. This is a TRANSFORM hover, not a color hover. So:
- Cards with `transition hover:-translate-y-1 hover:border-*`: the `transition` shorthand covers both the transform AND the border color. Adding `active:scale-[0.98]` needs no flip. ✓
- Cards with just `transition hover:-translate-y-1`: same, no flip needed. ✓
- Cards with NO transition + `hover:border-*` color: need `transition-all` to ease both. ✓
- Cards with NO transition + no hover: need `transition-transform` for pure press. ✓

Now for the answer. Let me be very precise.

Actually, I realize I should double-check one thing about GROUP D. The LiveItineraryBoard buttons at L883 — looking at the code:

```jsx
className={cn(
  "group flex items-center justify-between gap-3 rounded-[1.35rem] border p-4 text-left shadow-sm transition hover:-translate-y-0.5",
  selected ? "border-emerald-400/50 bg-white shadow-[0_18px_45px_rgba(16,185,129,0.12)]" : "border-slate-900/10 bg-white/70 hover:bg-white",
)}
```

The base has `transition` (bare shorthand) + `hover:-translate-y-0.5`. The selected state changes bg and border. The unselected state has `hover:bg-white`.

Since `transition` is bare shorthand, it covers transform. Adding `active:scale-[0.99]` → no flip. ✓

For TripStackBuilder L976:
```jsx
className={cn(
  "group flex items-center justify-between rounded-2xl border p-3 text-left transition",
  selected ? "border-emerald-300/55 bg-emerald-300/10" : "border-white/10 bg-white/[0.04] hover:border-white/25",
)}
```

Base has `transition`. Unselected has `hover:border-white/25`. Bare `transition` covers transform + border-color. Adding `active:scale-[0.99]` → no flip. ✓

For JourneyCommandDeck L1075:
```jsx
className={cn(
  "group flex items-center gap-4 rounded-2xl border p-4 text-left transition",
  selected ? "border-emerald-300/55 bg-emerald-300/10 shadow-[0_18px_50px_rgba(16,185,129,0.12)]" : "border-white/10 bg-white/[0.04] hover:border-white/25",
)}
```

Same pattern. ✓

All GROUP D: bare `transition` → append `active:scale-[0.99]` + ring + aria-pressed. No flip.

Now, what about the section backgrounds for GROUP D?
- L883 LiveItineraryBoard: `bg-[#f6fbff]` (light blue-white) → ring-ring
- L976 TripStackBuilder: `bg-[#050b14]` (near-black) → ring-ring
- L1075 JourneyCommandDeck: `bg-[#060a12]` (near-black) → ring-ring

All ring-ring. ✓

For the M2 pill CTAs, let me list the specific ones:
- L865 "Continue checkout" `<Link>`: `inline-flex min-h-12 items-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-black text-slate-950 shadow-[...] transition hover:-translate-y-0.5 hover:bg-emerald-400` — pill, has transition, over light section → `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring`

- L869 "View trips" `<Link>`: `inline-flex min-h-12 items-center gap-2 rounded-full border border-slate-900/12 bg-white/78 px-5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5` — pill, has transition, over light section → same

- L938 "Open layer" `<Link>`: `inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 text-sm font-black text-slate-950 shadow-[...] transition hover:bg-emerald-400` — pill, has transition, over dark section → same ring-ring

- L1168/L1171 confidence CTAs: Would be the "View my trips" and "Get support" links in TravelConfidenceBand. They have `rounded-full bg-slate-950 px-6 py-3 ... transition hover:bg-slate-800` and `rounded-full border ... transition hover:border-emerald-400`. Over white/light section → ring-ring

- L1220/L1223 handoff CTAs: "Open trips" and "Wallet & cash-out" in AppHandoffPanel. Over dark section with ambientImage overlay → still ring-ring (the control sits on its own surface)

- L1851 Log in Link: Would be in the header. Over dark header → ring-ring

- L1854 Start booking a#booking: Header CTA. Over dark header → ring-ring

- L2208/L2209/L2210 footer "Start a trip": Over dark footer → ring-ring

- L2250/L2251 footer Terms/Privacy: Covered in GROUP G — inline text links, ring + rounded-sm, no scale

For the header logo L1810: This is `<Link>` wrapping a brand lockup (likely icon + "ZIVO TRAVEL" text). It's not a pill CTA. It's a brand element. Lean: NO scale, ADD `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + appropriate border-radius. Since the Link likely has no radius, add `rounded-sm`. Over dark header.

Actually, I should think about whether the header logo needs a focus ring at all. It IS a navigational link, so it should be keyboard-reachable with a visible focus indicator. ADD ring. The task confirms: "brand lockup link → lean NO scale, ADD focus ring (rounded-2xl-ish via the inner span? the <Link> itself has no radius) → add rounded-sm + ring, no scale."

For header Trips/Wallet L1836/L1840: `flex items-center gap-2 transition hover:text-white` — inline text nav. ADD ring + rounded-sm, NO scale. Over dark header → ring-ring.

For L2136 "See how it works": inline text anchor. Same treatment.

Now let me finalize everything and write the response.

One thing I want to note: for the `rounded-sm` addition on inline text links (GROUP F, G, and some M2), the purpose is to give the focus ring a tidy rounded shape instead of sharp corners. `rounded-sm` = 2px radius. This is the established pattern.

For card-wrapping Links in M1, I need to add a border-radius that matches the child card so the ring hugs the card edge. For example:
- ServiceLayerShowcase L757: child has `rounded-[2rem]` → add `rounded-[2rem]` to Link
- QuickActionDock L804: Link already has `rounded-[1.4rem]` ✓
- TripStackBuilder layer L1031: Link already has `rounded-2xl` ✓
- JourneyCommandDeck L1133/L1138: Link already has `rounded-2xl` ✓
- TravelConfidenceBand L1182: Link already has `rounded-[1.7rem]` ✓

For the ones that already have border-radius on the Link itself, just add the ring. For the ServiceLayerShowcase where the Link is just `group block` with no radius, I need to add the matching radius.

OK I think I have everything. Let me write the final response now.

Wait, I need to double check one thing. For GROUP M1, the ServiceLayerShowcase Link at L757:

```jsx
<Link to={item.href} className="group block">
  <TravelTiltCard className="zt-on-media relative h-[520px] overflow-hidden rounded-[2rem] border ...">
```

The Link has no radius. If I add `rounded-[2rem]` to the Link, and the child has `overflow-hidden rounded-[2rem]`, the ring on the Link will have the same shape. But the Link itself doesn't have overflow-hidden, so content won't clip. The ring (box-shadow) renders outside the border-box. This should work.

But wait — `rounded-[2rem]` on the Link + `overflow-hidden` on the child — the child clips its own content. The Link's rounded corners just affect its own border-box shape for the ring. This is the standard pattern from CreatorDashboardPage group I/K where `rounded-[20px]` was added to bare Links wrapping cards.

Actually, I realize there might be an issue. If the Link has `rounded-[2rem]` but no `overflow-hidden`, and the child has `overflow-hidden rounded-[2rem]`, the ring on the Link will be rounded but the Link's content (the child card) has its own overflow-hidden. The visual result should be correct — the ring hugs the card's rounded shape.

But actually, there's a subtle issue: if the Link has `overflow-hidden`, it would clip the child's entrance animations and decorative elements that might overflow. So DON'T add overflow-hidden to the Link — just the border-radius for the ring shape.

OK, final answer time. Let me also make sure I answer the global questions G1-G3 clearly.

G1: Confirm per-class tiers are internally consistent with the project ladder:
- icon-only: scale-95 (GROUP B arrows, GROUP H mobile toggle)
- pill/segmented: [0.97] (GROUP E search tabs, M2 pill CTAs)
- self-contained cards: [0.98] (GROUP K, M1 cards)
- full-width rows/bare flex: [0.99] (GROUP D selectors, GROUP I menu rows, GROUP J submit CTA)
- inline text-links: NO scale (GROUP F, G, some M2)
✓ Internally consistent.

G2: Ring color split:
- ring-white/70: GROUP A (coverflow media), GROUP B (arrows over media), GROUP C (dots over media), GROUP K (destination image cards), M1 L757 ServiceLayerShowcase (photographic bg)
- ring-ring: everything else
✓ Confirmed. No mis-bucketed controls that I can see.

G3: What to SKIP beyond GROUP L:
- GROUP L (USD no-op button): SKIP, FLAG to owner
- TiltCard/ScrollTurn/Reveal/motion.* wrappers: DO NOT touch ✓
- <input>/<label> form fields: DO NOT touch ✓
- CrossAppReturnBar child: DO NOT touch ✓
- Presentational divs: DO NOT touch ✓
- Any other no-op/placeholder buttons: SKIP if found

I should also note: the brand logo Link is NOT skipped — it gets ring only. Any child components that ship their own tokens are out of scope.

OK, now let me write the actual response. I'll be comprehensive but organized.

One more consideration: for the `aria-pressed` on GROUP D, I
