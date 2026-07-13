# MiMo run — 2026-06-14T05:10:40.168Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Please review one React + TypeScript page for a premium-feel interaction polish pass and confirm whether my planned per-control edits are complete and consistent. This is a focused accessibility + tactile-feedback pass only.

FILE: src/pages/QRProfilePage.tsx (a "QR Profile" share-and-scan page reached by in-app navigation; useNavigate; useAuth user; reads `profiles` for the user's name/avatar/share_code; a 2-tab switcher ["My Code" | "Scan"] with a framer layoutId sliding pill; AnimatePresence tab panels; a QRScannerModal. Two sub-components: MyCodeTab [a QR card + a readOnly profile-link input with a Copy button + Save QR / Share action buttons + a desktop Tips list] and ScanTab [an animated scan-frame card + an "Open camera" button + a "How it works" list]. plain <div className="min-h-screen bg-background"> root, NO SwipeBackContainer.)

SCOPE GUARDRAIL (important): the only changes in this pass are Tailwind className strings and display-only attributes (aria-label, aria-pressed, framer-motion whileTap if warranted). Keep ALL logic byte-identical: the supabase profiles read, the copyLink/downloadQR/handleScan/goBack logic, the activeTab/copied/scannerOpen state + setters, the swipe handlers, the navigator.share/clipboard calls, the QRCodeSVG props, every onClick. Only advise on className tokens, whileTap, and aria-* attributes.

DESIGN TOKEN SYSTEM we apply consistently across the app:
- Focus ring (append to every focusable interactive control that lacks one): focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (no ring-offset). Use focus-visible:ring-inset ONLY when the control is a flush edge child of a rounded overflow-hidden parent (so an outward ring would be clipped).
- Press-scale tiers: icon-only button -> active:scale-95 ; small inline text-link -> active:scale-[0.97] ; medium chip/pill -> active:scale-[0.98] ; segmented filter chip -> active:scale-[0.97] ; wide full-width row/card -> active:scale-[0.99].
- transition class: transition-transform when scale is the ONLY animated property; transition-all when ALSO a hover:bg/text/border/opacity; transition-opacity when only opacity. NOTE: Tailwind's bare `transition` utility already includes transform in its property list, so a control shipping `transition` (shorthand) that gains an active:scale needs NO flip. FLIP RULE applies only to `transition-colors` (which excludes transform) GAINING a new active:scale -> flip to transition-all.
- NO-OP / pre-existing-press policy: if a control already ships a press affordance (active:scale-*), KEEP it and do NOT renumber and do NOT add a SECOND competing scale.
- aria-label ONLY on icon-only / image-only controls (visible text -> NO aria-label). aria-pressed ONLY on a PERSISTENT two-way toggle/segmented control whose on/off selection is conveyed by bg; NOT on a one-shot action, NOT when role=tab semantics would be the idiomatic choice.
- Don't-churn: if a control already has a valid focus ring / aria-label / press-scale / transition, keep it. A RAW <input> already shipping focus:ring-* -> leave.

RING COLOR: --ring resolves to BLACK. An OUTWARD ring renders against the control's PARENT surface (not the control's own fill). A control whose outward ring renders against a neutral bg-card/bg-background/bg-muted parent uses ring-ring; a control whose ring renders ON a gradient/image surface uses ring-white/70. NOTE: a dark-FILLED button (e.g. bg-foreground) sitting on a NEUTRAL parent still uses ring-ring, because the OUTWARD ring renders against the neutral parent, not the button's own fill. ring-inset requires an overflow-hidden ancestor.

COMPONENT-TYPE RULES we follow:
- shadcn <Button> ships built-in tokens -> leave untouched.
- A framer-motion motion.div with an entrance/loop initial/animate and NO onClick is presentational -> leave untouched.
- A RAW <button> ships NO tokens.

MY PLANNED EDITS (please confirm each is right, or correct it). NOTE: all 6 RAW <button>s already ship press scales + transitions EXCEPT the 2 tabs; the universal gap is the FOCUS RING:

A. Header Back (L175, RAW, ICON-ONLY ArrowLeft, ALREADY aria-label="Back" KEEP, className "flex h-10 w-10 ... rounded-2xl text-foreground transition hover:bg-muted active:scale-95" — ALREADY `transition` [shorthand, covers transform] + hover:bg + active:scale-95, NO ring; sits in the neutral sticky header):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-95 pre-existing; KEEP `transition` — no flip [shorthand already covers transform]; OUTWARD ring-ring on neutral header; KEEP aria-label).

B. Tab switcher buttons (L204, RAW ×2 "My Code"/"Scan", CONSTANT labels + icon, onClick={() => setActiveTab(tab)}, selection conveyed by a framer `layoutId="qr-tab-pill"` sliding pill [motion.span absolute inset-0 bg-background] BEHIND the text, cn() base "relative flex flex-1 ... rounded-xl py-2.5 ... transition-colors duration-200" + conditional text-color only — HAS transition-colors [text color only], NO scale/ring/aria; the 2 tabs sit inside a `rounded-2xl bg-muted/50 p-1 ring-1 ring-border/25` container [NOT overflow-hidden], flex-1 with gap-1 between them):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NO press-scale — tab-bar idiom [a sliding-pill segmented tab control, not a chip]; NO aria-pressed — selection is a tab pattern, idiomatic ARIA would be role=tab+aria-selected which is OUT of this minimal className+display-only scope, and aria-pressed would mislead; NO aria-label — visible constant text; KEEP transition-colors — NO new transform added so NO flip; OUTWARD ring-ring — the container is NOT overflow-hidden + has p-1 padding so a 2px outward ring is NOT clipped and renders against the neutral bg-muted/50, and the gap-1 between tabs leaves room).
   QUESTION Q-B1: OUTWARD ring-ring (container not overflow-hidden, p-1 padding) vs ring-inset (adjacent flex-1 neighbors)? My read: OUTWARD ring-ring — no overflow-hidden ancestor + p-1 + gap-1 means not clipped/not bleeding. Confirm or correct.
   QUESTION Q-B2: NO press-scale + NO aria-pressed for this sliding-pill tab control — confirm.

C. Copy link button (L410, RAW, ICON-ONLY Copy/Check, ALREADY aria-label="Copy link" KEEP, className "flex h-8 w-8 ... rounded-xl text-muted-foreground transition hover:bg-muted hover:text-foreground active:scale-95" — ALREADY `transition` + hover:bg + active:scale-95, NO ring; sits inside a `rounded-xl bg-muted/40 px-3 py-2.5` input row [NOT overflow-hidden], inset within its padding):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-95; KEEP `transition`; OUTWARD ring-ring — inset within the bg-muted/40 row padding, not clipped, neutral surface; KEEP aria-label).

D. Save QR button (L444, RAW, ICON + VISIBLE TEXT "Save QR", onClick={onDownload}, className "flex h-12 ... rounded-2xl border border-border/60 bg-card ... transition hover:bg-muted active:scale-[0.98]" — ALREADY `transition` + hover:bg + active:scale-[0.98], NO ring; sits in a `grid grid-cols-2 gap-3` on the page bg):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-[0.98]; KEEP `transition`; OUTWARD ring-ring on neutral page bg; NO aria-label — visible text).

E. Share button (L450, RAW, ICON + VISIBLE TEXT "Share", onClick={onShare}, className "flex h-12 ... rounded-2xl bg-foreground ... text-background ... transition hover:bg-foreground/90 active:scale-[0.98]" — DARK bg-foreground fill, ALREADY `transition` + hover:bg + active:scale-[0.98], NO ring; in the same grid on the page bg):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-[0.98]; KEEP `transition`; OUTWARD ring-ring — the bg-foreground is the button's OWN dark fill, the outward ring renders against the neutral page bg parent -> ring-ring; NO aria-label — visible text).

F. Open camera button (L538, RAW, ICON + VISIBLE TEXT "Open camera", onClick={onOpenCamera}, className "mt-6 flex h-12 ... rounded-2xl bg-foreground px-6 ... text-background ... transition hover:bg-foreground/90 active:scale-[0.98]" — DARK bg-foreground fill, ALREADY `transition` + hover:bg + active:scale-[0.98], NO ring; centered within a `rounded-3xl border bg-card overflow-hidden` scan-frame section's px-6 padding, NOT flush to the section edge):
   plan: APPEND ring-ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (KEEP active:scale-[0.98]; KEEP `transition`; OUTWARD ring-ring — centered within the section's px-6 padding so not flush/not clipped despite the section overflow-hidden, renders against neutral bg-card; NO aria-label — visible text).

G. (QUESTION) readOnly profile-link <input> (L404, value={profileUrl} readOnly, ALREADY aria-label="Profile link", className "min-w-0 flex-1 truncate bg-transparent text-sm font-semibold text-foreground outline-none" — has `outline-none` but NO focus ring replacement; it's a readOnly URL-display input you can focus + select to copy; sits inside the same `rounded-xl bg-muted/40 px-3 py-2.5` row as the Copy button):
   QUESTION Q-G: should this readOnly input GAIN a focus ring (it's focusable but `outline-none` strips the native indicator with no replacement — a keyboard-focus gap)? My read: YES, append `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset` (ring-inset because it's a flush-ish field inside the bg-muted/40 row; neutral surface -> ring-ring). OR is a readOnly display-only input out of scope (don't-churn / not a primary control)? Confirm ADD ring vs LEAVE.

CONTROLS I PLAN TO LEAVE UNTOUCHED (please confirm):
- The animated QR-icon header badge motion.div L182 (loop anim, NO onClick -> presentational) -> leave.
- The swipe-indicator dots motion.div L236 + the active-tab pill motion.span L215 + the QR breathing-glow motion.div L363 + the scan-frame corner-brackets/center-pulse/sweep-line motion.divs + the "How it works" list motion.divs L570 (all loop/entrance anim, NO onClick -> presentational/decorative) -> leave.
- All icons/text/the Tips list/the QRCodeSVG/the VerifiedBadge + the QRScannerModal child component -> decorative/out-of-file-scope.

QUESTIONS:
Q1. Back (A), Copy (C): APPEND ring-only + KEEP existing active:scale-95 + `transition` (no flip) + KEEP aria-labels + OUTWARD ring-ring — correct?
Q2. Tabs (B): APPEND ring-only + NO scale + NO aria-pressed + KEEP transition-colors (Q-B1 OUTWARD ring-ring vs inset; Q-B2 no-scale/no-aria-pressed for a sliding-pill tab) — confirm or correct.
Q3. Save QR (D), Share (E), Open camera (F): APPEND ring-only + KEEP active:scale-[0.98] + `transition` + OUTWARD ring-ring (dark bg-foreground fill on E/F still -> ring-ring on the neutral parent) + NO aria-label — correct?
Q4. readOnly input (G, Q-G): ADD a focus ring (ring-inset ring-ring) vs LEAVE as out-of-scope display input — your call?
Q5. Confirm the leave-untouched list (all presentational/loop motion.divs, the QRCodeSVG, VerifiedBadge, QRScannerModal child, all icons/text/Tips) is handled correctly.
Q6. At 375px, does the header (Back + animated badge + title/subtitle), the 2-tab switcher, the QR card (gradient header + breathing QR), the profile-link row (input + Copy), the 2-col Save/Share grid, and the Scan tab (scan frame + Open camera + How-it-works) lay out without crushing? And at iPad 768/1024 + desktop 1280 (content capped at max-w-2xl mx-auto, with a lg: two-column grid in both tabs — any concern)?

Please answer Q1-Q6 and give me the corrected className strings + confirm the aria attributes. Keep all logic unchanged. Thank you.
- files: src/pages/QRProfilePage.tsx

---

## Plan

A ring-only focus-visible pass on 7 interactive controls (6 RAW `<button>`s + 1 RAW `<input>`). Every control already ships the correct press-scale and transition except the 2 tab buttons (which are ring-only by design). The universal gap is the **focus ring**: all 7 have no `focus-visible` indicator. This is a pure APPEND — zero transition flips, zero scale additions/changes, zero new `aria-*` attributes, zero logic lines touched.

---

## Answers to Q1–Q6

### Q1 — Back (A) & Copy (C): **✅ Confirmed, exactly as planned.**

Both already ship `transition` (Tailwind shorthand — includes `transform` in its property list, so NO flip needed), `active:scale-95`, `hover:bg`, and their `aria-label`. Ring-only append. Outward `ring-ring` on neutral parent surfaces (sticky header for A, bg-muted/40 row for C — both not overflow-hidden, both inset enough that the 2px ring isn't clipped).

### Q2 — Tabs (B): **✅ Confirmed with one nuance on Q-B1.**

- **Q-B1 — OUTWARD `ring-ring` is correct.** The container (`rounded-2xl bg-muted/50 p-1`) is NOT `overflow-hidden`. The `p-1` (4px) padding and `gap-1` (4px) between the two flex-1 tabs give enough clearance for a 2px outward ring — it extends into the padding/gap without being clipped and without bleeding into the sibling tab. Ring-inset is NOT needed here (the PPVPostsPage precedent used ring-inset for flush `flex-1` neighbors with **zero** gap; here there's 4px).

- **Q-B2 — NO press-scale + NO `aria-pressed`: correct.** This is a sliding-pill tab control (framer `layoutId` pill behind the text). Tab bars idiomatically don't take press-scale — the pill animation IS the feedback. `aria-pressed` is wrong for a tab pattern (the idiomatic ARIA would be `role=tab` + `aria-selected`, which is out of this minimal className+display-only scope). The constant visible text ("My Code"/"Scan") provides the accessible name — no `aria-label` needed.

- **KEEP `transition-colors`** — no new transform added, so no flip.

### Q3 — Save QR (D), Share (E), Open camera (F): **✅ Confirmed, exactly as planned.**

All three already ship `transition` (shorthand, no flip), `active:scale-[0.98]`, `hover:bg*`. Ring-only append. For E and F: the `bg-foreground` is the button's **own** dark fill — the outward ring renders against the **neutral page/card parent**, so `ring-ring` is correct per the explicit rulebook rule ("a dark-FILLED button sitting on a NEUTRAL parent still uses ring-ring"). F is centered within the scan-frame section's `px-6` (24px) padding — the 2px ring extends into that space, not clipped by the section's `overflow-hidden`. All have visible text → no `aria-label`.

### Q4 — readOnly input (G): **✅ ADD ring. This is a real keyboard-focus gap.**

The `<input>` is natively focusable via Tab (readOnly does NOT prevent focus), and `outline-none` strips the browser's native indicator with **no replacement**. A keyboard user landing on this input sees nothing. ADD ring.

**One correction to your plan: use OUTWARD `ring-ring`, NOT `ring-inset`.** Two reasons:
1. **Structural rule:** ring-inset is reserved for flush edge children of rounded `overflow-hidden` parents. This input is inside a `rounded-xl bg-muted/40 px-3 py-2.5` row — it's **inset within 12px padding**, and the row is **NOT** `overflow-hidden`. The structural condition isn't met.
2. **Practical:** the input has zero internal padding (`"min-w-0 flex-1 truncate bg-transparent ..."`). An `ring-inset` would render **inside** the input's content box, overlapping the URL text. An outward ring extends into the row's generous padding — clean.

Since `outline-none` already exists in the className, only append `focus-visible:ring-2 focus-visible:ring-ring` (no redundant `focus-visible:outline-none`).

### Q5 — Leave-untouched list: **✅ Confirmed. All correct.**

Every `motion.div`/`motion.span` in the file is either an entrance animation (stagger children), a loop animation (breathing QR glow, corner-bracket pulse, sweep line, swipe dots, active-pill morph), or a layout animation (the `layoutId` sliding pill) — all with **NO onClick**. All presentational/decorative. The QRCodeSVG, VerifiedBadge, QRScannerModal, avatar img, ambient blobs, Tips list, and all icons/text are correctly out of scope.

### Q6 — Responsive 375/768/1024/1280: **✅ No concerns.**

**375px:** Header (Back 40px + badge 40px + `flex-1 min-w-0` title/subtitle) fits in `max-w-2xl mx-auto px-3`. Tab switcher: two `flex-1` tabs ≈167px each — plenty for "My Code"/"Scan". QR card: 200px QR inside px-5 padding ≈ 240px, fits. Profile-link row: `min-w-0 truncate` input + Copy `h-8 w-8` in px-3 — truncation handles overflow. 2-col grid: each button ≈165px — "Save QR" and "Share" with icon fit comfortably in h-12. Scan tab: centered single-column, Open camera auto-width px-6. Tips: `hidden lg:block` — hidden on mobile.

**768px:** Still single-column (`lg:` breakpoint is 1024px). Same as 375 but wider within the 672px cap.

**1024px:** `lg:grid lg:grid-cols-[1fr_1fr] lg:gap-6` activates. Each column ≈318px. QR card (200px QR + padding) fits. Right column: profile-link row + 2-col Save/Share grid (each ≈153px — icon+text fits in h-12) + Tips list (`lg:block` now visible). All clean.

**1280px:** Same 672px cap, centered. Identical to 1024 layout.

---

## Proposed diff

**File:** `src/pages/QRProfilePage.tsx`

**7 className edits, 0 new attrs, 0 logic lines touched.**

### A. Header Back button (~L175)

```diff
-            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-muted active:scale-95"
+            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-foreground transition hover:bg-muted active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

### B. Tab switcher cn() base (~L207)

```diff
-                "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-colors duration-200",
+                "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2
