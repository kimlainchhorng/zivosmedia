# DeepSeek run — 2026-06-14T12:21:22.018Z

- model: deepseek-chat
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

# ServicesPage Premium Interaction + A11y Pass — Review

## Short Plan

Apply the house-standard interaction tokens (focus rings, press scales, aria attrs) to 10 raw interactive control groups in `src/pages/app/ServicesPage.tsx`. All edits are className + display-only aria only — zero logic lines touched.

## Verdict Per Group

| Group | Line | Control | Verdict | Final className/aria |
|-------|------|---------|---------|---------------------|
| **A** | L268 | Back `<button>` (icon-only) | ✅ **CORRECT** | `aria-label="Back"` + `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. DON'T-CHURN (kept `active:scale-95 transition-all`). OUTWARD ring-ring on page bg. |
| **B** | L304 | Search-clear X `<button>` (icon-only) | ✅ **CORRECT** | `aria-label="Clear search"` + `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. FLIP `transition-colors`→`transition-all` correct (new scale + bg animates). Icon-only tier `scale-95`. |
| **C** | L134 | PromoBanner `motion.button` | ✅ **CORRECT** | Ring-only: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. `whileTap` already presses → no 2nd CSS scale. Visible text → no aria-label. No flip (already `transition-all`). |
| **D** | L328 | Quick-launch `motion.button` ×6 | ✅ **CORRECT** | `rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. Ring-only (whileTap present). `rounded-2xl` is invisible on these (no bg/border) — acceptable, gives ring a radius. |
| **E** | L351 | Favorites-strip `motion.button` ×N | ✅ **CORRECT** | `rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. Ring-only (whileTap present). Same `rounded-2xl` rationale as D. |
| **F** | L364 | Favorites-strip remove-heart `<button>` | ✅ **CORRECT** | `transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` added. Icon-only tier `scale-95`. KEPT `aria-label="Remove from favorites"`. No flip (no prior transition to flip). |
| **G** | L432 | Service-grid `motion.button` ×N | ✅ **CORRECT** | `rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended to STATIC cn() arg. Ring-only (whileTap 0.92 present). Same `rounded-2xl` rationale. |
| **H** | L450 | Favorite-heart `<button>` (nested) | ✅ **CORRECT** | `active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended to STATIC cn() arg. FLIP `transition-opacity`→`transition-all` correct (opacity AND scale animate). Icon-only tier `scale-95`. KEPT dynamic `aria-label`. |
| **I** | L557 | Waitlist "Close" `<button>` | ✅ **CORRECT** | `rounded-md transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. Text-link tier `[0.97]`. Visible text → no aria-label. |
| **J** | L576 | Waitlist submit `<button disabled>` | ✅ **CORRECT** | Ring-only: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` appended. DON'T-CHURN (kept `active:scale-[0.98] transition-transform`). Visible text → no aria-label. |

## Key Questions Answered

1. **All 10 correct?** ✅ Yes — every group follows the house standard.

2. **B — scale-95 + FLIP to transition-all?** ✅ Correct. The X button had `transition-colors` (for `hover:bg-muted-foreground/30`). Adding `active:scale-95` means both color AND scale animate → `transition-all` is the right superset.

3. **C — PromoBanner ring-only + no aria-label?** ✅ Correct. `whileTap={{ scale: 0.97 }}` is already a press → no competing CSS `active:scale`. Visible title+subtitle text → no aria-label needed.

4. **F/H — adding `active:scale-95` to nested hearts?** ✅ Correct. These are **independent icon-only buttons** inside a parent `motion.button`. The parent's `whileTap` doesn't cascade to child buttons. Each heart needs its own press scale. H's FLIP `transition-opacity`→`transition-all` is correct (opacity for show/hide + new scale).

5. **D/E/G — adding `rounded-2xl` to framer whileTap controls?** ✅ Acceptable. These controls have no `bg`/`border`/`shadow`, so `rounded-2xl` is invisible — it only gives the focus ring a matching radius. No layout impact.

6. **Missed controls?** ✅ None. All raw `<button>`s covered. shadcn `<Input>`, `<Sheet*>`, `ZivoMobileNav`, raw email `<input>`, `<Badge>`, lucide icons, decorative divs all correctly SKIPPED.

7. **SKIP list correct?** ✅ Yes — all confirmed non-raw or form-field carveouts.

## Guard Tally

| Metric | Count |
|--------|-------|
| className edits | 10 |
| New `aria-label` | 2 (A, B) |
| New `aria-pressed` | 0 |
| New `aria-expanded` | 0 |
| `focus-visible:ring` | 10 (all OUTWARD `ring-ring`) |
| `ring-inset` | 0 |
| `active:scale` new | 4 (B `95`, F `95`, H `95`, I `[0.97]`) |
| Ring-only (DON'T-CHURN) | 5 (A, C, D, E, G, J) |
| FLIPs | 2 (B `transition-colors→all`, H `transition-opacity→all`) |
| `rounded-2xl` added | 3 (D, E, G) |
| Logic lines touched | 0 |

## Diff

```diff
--- a/src/pages/app/ServicesPage.tsx
+++ b/src/pages/app/ServicesPage.tsx
@@ -265,7 +265,7 @@ function PromoBanner({
           <button type="button"
             aria-label="Back"
             onClick={() => navigate(-1)}
-            className="w-10 h-10 rounded-full bg-muted/60 backdrop-blur-md border border-border/40 flex items-center justify-center active:scale-95 transition-all duration-200 hover:bg-muted"
+            className="w-10 h-10 rounded-full bg-muted/60 backdrop-blur-md border border-border/40 flex items-center justify-center active:scale-95 transition-all duration-200 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
           >
             <ArrowLeft className="w-[18px] h-[18px] text-foreground" />
           </button>
@@ -301,7 +301,7 @@ function PromoBanner({
             <button type="button"
               aria-label="Clear search"
               onClick={() => setSearchQuery("")}
-              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-colors"
+              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               <X className="w-3 h-3 text-muted-foreground" />
             </button>
@@ -325,7 +325,7 @@ function PromoBanner({
                 key={s.label}
                 type="button"
                 onClick={() => navigate(s.href)}
-                className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation"
+                className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-md`}>
                   <img src={s.image} alt={s.label} className="w-9 h-9 object-contain" loading="lazy" decoding="async" />
@@ -348,7 +348,7 @@ function PromoBanner({
                 key={s.href + "-fav"}
                 type="button"
                 onClick={() => handleServiceClick(s)}
-                className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation relative"
+                className="flex-shrink-0 flex flex-col items-center gap-2 touch-manipulation relative rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
                 <div className="w-16 h-16 rounded-2xl bg-card border border-primary/20 flex items-center justify-center shadow-sm relative">
                   {s.image ? (
@@ -361,7 +361,7 @@ function PromoBanner({
                     type="button"
                     aria-label="Remove from favorites"
                     onClick={(e) => toggleFavorite(s.href, e)}
-                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-card border border-border/40 shadow-sm"
+                    className="absolute -top-1.5 -right-1.5 w-5 h-5 flex items-center justify-center rounded-full bg-card border border-border/40 shadow-sm transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                   >
                     <Heart className="w-3 h-3 fill-rose-500 text-rose-500" />
                   </button>
@@ -429,7 +429,7 @@ function PromoBanner({
                     }}
                     className={cn(
                       "flex flex-col items-center gap-2 touch-manipulation relative group rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
-                      service.comingSoon && "opacity-60"
+                      service.comingSoon && "opacity-60",
                     )}
                   >
                     {/* Favorite heart */}
@@ -447,7 +447,7 @@ function PromoBanner({
                         "absolute -top-1 -right-1 z-20 w-5 h-5 flex items-center justify-center rounded-full bg-card/80 backdrop-blur-sm border border-border/30 shadow-sm transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                         favorites.includes(service.href)
                           ? "opacity-100"
-                          : "opacity-0 group-hover:opacity-100 focus:opacity-100"
+                          : "opacity-0 group-hover:opacity-100 focus:opacity-100",
                       )}
                     >
                       <Heart className={cn(
@@ -554,7 +554,7 @@ function PromoBanner({
               </div>
               <button type="button" onClick={() => setWaitlistService(null)}
-                className="text-sm text-primary font-semibold">Close</button>
+                className="text-sm text-primary font-semibold rounded-md transition-transform active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Close</button>
             </div>
           ) : (
             <div className="space-y-4">
@@ -573,7 +573,7 @@ function PromoBanner({
                 disabled={!waitlistEmail.trim() || waitlistLoading}
                 onClick={async () => {
                   if (!waitlistEmail.trim()) return;
                   setWaitlistLoading(true);
                   try {
                     const { error } = await supabase.functions.invoke("service-waitlist-submit", { body: {
                       email: waitlistEmail,
                       service: waitlistService,
                       user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
                     } });
                     if (error) throw error;
                   } catch {
                     toast.error("Couldn't join waitlist. Please try again.");
                     setWaitlistLoading(false);
                     return;
                   }
                   setWaitlistLoading(false);
                   setWaitlistSubmitted(true);
                 }}
-                className="w-full h-12 rounded-2xl bg-foreground text-background font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform"
+                className="w-full h-12 rounded-2xl bg-foreground text-background font-bold text-sm disabled:opacity-50 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
               >
```

## Owner Verification

1. **Run `npm run update`** — must pass (type-check + worker + build).
2. **Preview at 375/768/1280** — verify all controls render correctly with rings.
3. **Note:** The `rounded-2xl` additions on D/E/G are invisible (no bg/border) — purely for ring radius. No layout impact.
4. **Flag:** The nested heart buttons (F, H) sit inside parent `motion.button`s — the parent's `whileTap` does NOT cascade, so the child's own `active:scale-95` is correct and non-competing.
