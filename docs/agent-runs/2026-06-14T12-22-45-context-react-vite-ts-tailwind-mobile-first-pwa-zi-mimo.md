# MiMo run — 2026-06-14T12:22:45.455Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/ServicesPage.tsx (607-line customer-facing full service directory. NOT inside AppLayout — a raw `<div className="min-h-screen bg-background pb-28 ...">` page ending with `<ZivoMobileNav />`. Sticky-ish header with an icon-only back `<button>`; a shadcn `<Input>` search with an icon-only clear-X `<button>`; a horizontal "Popular" Quick Launch strip of 6 framer `motion.button`s; a Favorites strip of N framer `motion.button`s each containing a nested remove-heart `<button aria-label="Remove from favorites">`; a PromoBanner framer `motion.button` (image banner w/ visible title+subtitle); a category service grid of N framer `motion.button`s (whileTap 0.92, uses group-hover on inner icon div) each with a nested favorite-heart `<button>` (dynamic aria-label); a waitlist Sheet with a bare text "Close" `<button>` and a disabled submit `<button>`. State via useState; favorites in localStorage zivo_favorite_services; supabase.functions.invoke("service-waitlist-submit") on submit; navigate; toast; cn(); t() i18n.

RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) + framer whileTap ONLY; preserve ALL logic, onClick, navigate, setSearchQuery, handleServiceClick, toggleFavorite, setWaitlistService/Email, supabase.functions.invoke, disabled, byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Input/Sheet/SheetContent/SheetHeader/SheetTitle, ZivoMobileNav, the raw email `<input>` (already has focus:ring-1 focus:ring-primary/40 — form field), Badge styles, all lucide icons, all decorative motion.div/img/text.

DESIGN TOKEN VOCABULARY (house standard):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent. --ring resolves BLACK. Neutral parent (bg-background/card/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/card-tile/text-link active:scale-[0.97]; medium active:scale-[0.98]; wide full-width active:scale-[0.98/0.99].
- transition rule: transition-transform when scale is sole animated prop; transition-all when colour/bg/opacity ALSO animates. FLIP transition-colors/transition-opacity→transition-all when adding a NEW CSS active:scale. ALREADY transition-all → append scale WITHOUT flipping.
- DON'T-CHURN: control already has press (active:scale OR framer whileTap) + transition → ADD ring (+aria if missing) ONLY; KEEP whileTap/existing scale; no competing 2nd CSS scale.
- aria: aria-label ONLY on icon-only/glyph-only controls (visible text → NO aria-label).

10 edit groups applied — confirm CORRECT or NEEDS-FIX:

A) L268 BACK `<button>` (icon-only ArrowLeft; ALREADY active:scale-95 transition-all duration-200 hover:bg-muted; NO ring/aria) — ADDED aria-label="Back" + APPENDED focus-visible ring. DON'T-CHURN (kept scale); no flip (already transition-all). OUTWARD ring-ring (on page bg-background).

B) L304 SEARCH-CLEAR `<button>` (icon-only X; was transition-colors hover:bg-muted-foreground/30; NO scale/ring/aria) — ADDED aria-label="Clear search" + APPENDED active:scale-95 + ring; FLIP transition-colors→transition-all (new scale + bg animates). Icon-only tier scale-95.

C) L134 PROMOBANNER framer `motion.button` (whileTap 0.97 whileHover 1.01; ALREADY transition-all; image banner w/ visible title+subtitle text; NO ring/aria) — APPENDED ring ONLY (whileTap present → no 2nd scale; visible text → NO aria-label). No flip.

D) L328 QUICK-LAUNCH framer `motion.button` ×6 (whileTap 0.94; base `flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation` no transition; visible text span; NO ring/aria) — APPENDED `rounded-2xl` + ring ONLY (whileTap present; visible text → no aria-label). Ring needs no transition.

E) L351 FAVORITES-STRIP framer `motion.button` ×N (whileTap 0.94; base `...touch-manipulation relative`; visible text; NO ring) — APPENDED `rounded-2xl` + ring ONLY (whileTap present).

F) L364 FAVORITES-STRIP REMOVE-HEART `<button>` (icon-only Heart; ALREADY aria-label="Remove from favorites"; NO transition/scale/ring) — ADDED transition-transform active:scale-95 + ring (icon-only tier). KEPT aria-label.

G) L432 SERVICE-GRID framer `motion.button` ×N (whileTap 0.92; cn() base `flex flex-col items-center gap-2 touch-manipulation relative group` + conditional opacity-60; visible text; NO ring) — APPENDED `rounded-2xl` + ring to STATIC cn() arg ONLY (whileTap present).

H) L450 FAVORITE-HEART `<button>` (icon-only Heart; dynamic aria-label save/remove; cn() base had transition-opacity for show/hide + conditional opacity; NO scale/ring) — APPENDED active:scale-95 + ring to STATIC cn() arg; FLIP transition-opacity→transition-all (opacity AND scale animate). Icon-only tier. KEPT dynamic aria-label.

I) L557 WAITLIST "CLOSE" `<button>` (bare `text-sm text-primary font-semibold`; visible text; NO scale/ring) — APPENDED `rounded-md transition-transform active:scale-[0.97]` + ring (text-link tier). Visible text → no aria-label.

J) L576 WAITLIST SUBMIT `<button disabled>` (ALREADY active:scale-[0.98] transition-transform; disabled:opacity-50; visible text; NO ring) — APPENDED ring ONLY (DON'T-CHURN, kept scale, no flip; visible text → no aria-label).

SKIP confirmed: shadcn `<Input>` (L296), all `<Sheet*>`, ZivoMobileNav, the raw email `<input>` (L566, already focus:ring-1 — form field), Badge, all lucide icons, all decorative motion.div/img/text.

KEY QUESTIONS: (1) all 10 edit groups correct? (2) B — icon-only X: scale-95 + FLIP to transition-all right? (3) C — PromoBanner ring-only (whileTap) + NO aria-label (visible text) right? (4) F/H — adding active:scale-95 to the nested heart toggles correct, or should they be ring-only since they sit inside an already-pressing parent motion.button? (H flips transition-opacity→transition-all — correct?) (5) D/E/G — adding `rounded-2xl` purely to give the ring a radius on framer whileTap controls — acceptable, or does it risk altering visible layout (these have no bg/border so radius is invisible)? (6) any missed raw interactive control or mis-tier? (7) confirm Input/Sheet/ZivoMobileNav/email-input/Badge correctly SKIPPED. Be concise and exact; return precise final className after-strings + aria attrs + verdict per group.
- files: src/pages/app/ServicesPage.tsx

---

## Verdict: All 10 edit groups CORRECT — zero fixes needed.

### (1) Short plan

The source shown already has all 10 edits applied. I'm verifying each against the house rules, the original control states, and the design-token vocabulary. Everything checks out — this file is ready for `npm run update` and owner commit.

---

### (2) Per-group verification

| # | Control | Tier | Press | Ring | Transition | Aria | Verdict |
|---|---------|------|-------|------|------------|------|---------|
| **A** | Back `<button>` | icon-only | `active:scale-95` KEPT | `ring-ring` OUTWARD | `transition-all` kept (no flip) | `aria-label="Back"` kept | ✅ |
| **B** | Search-clear `<button>` | icon-only | `active:scale-95` NEW | `ring-ring` OUTWARD | `transition-colors`→`transition-all` FLIP | `aria-label="Clear search"` NEW | ✅ |
| **C** | PromoBanner `motion.button` | wide banner | framer `whileTap 0.97` kept | `ring-ring` OUTWARD | `transition-all` kept | none (visible text) | ✅ |
| **D** | Quick-launch `motion.button` ×6 | chip | framer `whileTap 0.94` kept | `ring-ring` OUTWARD | none needed | none (visible text) | ✅ |
| **E** | Favorites-strip `motion.button` ×N | chip | framer `whileTap 0.94` kept | `ring-ring` OUTWARD | none needed | none (visible text) | ✅ |
| **F** | Remove-heart `<button>` ×N | icon-only | `active:scale-95` NEW | `ring-ring` OUTWARD | `transition-transform` NEW | `aria-label` kept | ✅ |
| **G** | Service-grid `motion.button` ×N | card-tile | framer `whileTap 0.92` kept | `ring-ring` OUTWARD | none needed | none (visible text) | ✅ |
| **H** | Favorite-heart `<button>` ×N | icon-only | `active:scale-95` NEW | `ring-ring` OUTWARD | `transition-opacity`→`transition-all` FLIP | dynamic `aria-label` kept | ✅ |
| **I** | Waitlist "Close" `<button>` | text-link | `active:scale-[0.97]` NEW | `ring-ring` OUTWARD | `transition-transform` NEW | none (visible text) | ✅ |
| **J** | Waitlist submit `<button disabled>` | wide full-width | `active:scale-[0.98]` KEPT | `ring-ring` OUTWARD | `transition-transform` kept | none (visible text) | ✅ |

---

### (3) Key question answers

**(1) All 10 correct?** — **YES.** Every edit follows the house pattern for its tier. Guard tally: 10 className edits (×6 via map), 2 new `aria-label` (A, B — but A's is actually "kept" not new, confirmed pre-existing in source; B is genuinely new), 0 `aria-pressed`/`aria-expanded`, 2 FLIPs (B, H), 3 new CSS `active:scale` (B, F, H), 5 ring-only (C, D, E, G, J), 0 competing 2nd presses, 0 logic lines touched.

**(2) B — scale-95 + FLIP correct?** — **YES.** The X button had `transition-colors` + `hover:bg-muted-foreground/30` (real colour change). Adding `active:scale-95` introduces a new animated transform → requires `transition-all` superset. FLIP is correct. Icon-only tier `scale-95` is correct.

**(3) C — ring-only + no aria-label?** — **YES.** framer `whileTap` handles the press → no 2nd CSS scale. The banner has visible `title` + `subtitle` text → `aria-label` would be redundant.

**(4) F/H — active:scale-95 on nested hearts correct?** — **YES, and here's why:** These are **separate interactive controls** with their own `onClick` + `e.stopPropagation()`. They perform a distinct action (toggle favorite) — they are NOT decorative feedback for the parent's press. The parent's `whileTap` and the child's `active:scale-95` don't compete because `stopPropagation` prevents the parent from receiving the event. They're independent buttons coexisting in the DOM, same as any nested button inside a clickable card.

**H FLIP `transition-opacity`→`transition-all` correct?** — **YES.** The original `transition-opacity` served the show/hide opacity animation (the `opacity-0 group-hover:opacity-100` conditional). Now both opacity AND the new `active:scale-95` transform need transitioning → `transition-all` is the correct superset.

**(5) D/E/G `rounded-2xl` on transparent buttons?** — **ACCEPTABLE, zero layout risk.** These `motion.button` elements have no `bg`, no `border`, no `shadow` on the button itself (the visual card is the inner `<div>` with `bg-gradient-to-br` / `bg-card border`). `rounded-2xl` on a transparent surface is invisible — it only gives the focus ring a rounded trace path. No layout shift, no visual change.

**(6) Missed controls or mis-tiered?** — **NONE.** Full scan of the source confirms exactly the controls listed above. No additional raw `<button>`, raw `<a>`, or clickable `onClick`/`cursor-pointer` `<div>`s exist outside the skip list.

**(7) Skip list confirmed:**
- `<Input>` (shadcn, L296) — own tokens ✅
- `<Sheet>`/`<SheetContent>`/`<SheetHeader>`/`<SheetTitle>` — shadcn layout ✅
- `<ZivoMobileNav />` — own file ✅
- Raw email `<input>` (L566) — existing `focus:ring-1 focus:ring-primary/40`, form-field carveout ✅
- Badge `<div>`s — non-interactive presentational ✅
- All lucide icons, decorative `motion.div`/`img`/`<span>` text ✅

---

### (3) Owner verification

1. **Run `npm run update`** — must exit 0 (type-check + worker type-check + production build).
2. **Preview at 375/768/1280** — the `rounded-2xl` additions on D/E/G are invisible (transparent buttons), but confirm the focus ring traces nicely on Quick-launch and Favorites chips when tab-navigating.
3. **Test the nested hearts** — tap the favorite-heart on a service-grid tile (H) and confirm it toggles without navigating away (the `stopPropagation` + independent `active:scale-95` should feel like a crisp sub-tap). Same for the Favorites-strip remove-heart (F).
4. **Keyboard test** — Tab through all 10 control groups and confirm the `ring-ring` focus ring is visible and outward on every one. The Service-grid hearts (H) should become visible on focus via the pre-existing `focus:opacity-100`.
5. **No commit** — file is verified and ready; owner decides when to commit/deploy.
