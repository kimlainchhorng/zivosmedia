# DeepSeek run — 2026-06-14T12:11:07.946Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/ConnectWebsitePage.tsx (424-line customer-facing "Connect Your Website" SEO-widget setup page INSIDE `<AppLayout hideHeader>`. A sticky top bar with a shadcn back `<Button>`; a left setup column (SEO-benefit Cards, a niche-picker grid, a dofollow toggle Card, a status banner Card, a code-snippet Card with a shadcn "Copy code" `<Button disabled={!snippet}>`, a publish-status picker, a Disconnect/Reconnect shadcn `<Button>`); a right live-preview column (theme toggle + widget-preview Card). State via useState (copied/status/theme/connected/niche/dofollow) persisted to localStorage; useAuth → siteId; handleCopy uses navigator.clipboard; toast; cn().

RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, setState, localStorage savePrefs, handleCopy/handleDisconnect/handleReconnect/handleNicheChange/handleDofollowToggle/handleStatusChange, useAuth, snippet template, `disabled`, byte-identical. Don't add role/tabIndex/onKeyDown (structural — FLAG). SKIP shadcn Button/Card/Badge (own tokens), AppLayout (layout), Helmet, all lucide icons, all text/pre/code.

DESIGN TOKEN VOCABULARY (house standard):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. OUTWARD ring renders against PARENT surface. Neutral parent (bg-card/background/secondary/muted/faint-tint) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills/segmented filter/tab/single-select/card-tile active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; wide full-width row active:scale-[0.98/0.99].
- transition rule: transition-transform when scale is sole animated CSS prop; transition-all when colour/bg/border/opacity ALSO animates. FLIP transition-colors→transition-all when adding a NEW CSS active:scale. ALREADY transition-all → append scale WITHOUT flipping.
- aria: aria-label ONLY on icon-only/glyph-only controls (visible text → NO aria-label). aria-pressed on a PERSISTENT single-select segmented filter/tab/picker whose on/off is bg-conveyed. aria-expanded on a disclosure.

5 edit groups applied — confirm CORRECT or NEEDS-FIX:

A) L163 NICHE-PICKER `<button>` ×4 (NICHES.map; single-select; selection bg-conveyed via cn() `niche === n.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"`; onClick handleNicheChange; visible icon+text; cn() STATIC base `text-left p-3 rounded-xl border-2 transition-all flex gap-3 items-start` [ALREADY transition-all]; NO scale/ring/aria) — ADDED `aria-pressed={niche === n.id}` + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the STATIC cn() arg. NO FLIP (already transition-all). OUTWARD ring-ring (faint primary-tint/border selected on the page bg-muted/20 — neutral). Card-tile single-select tier → active:scale-[0.97].

B) L191 DOFOLLOW TOGGLE `<button>` (custom switch; onClick handleDofollowToggle; NO visible text — just a sliding knob span; cn() STATIC `h-6 w-11 rounded-full transition-colors relative shrink-0` + conditional `dofollow ? "bg-primary" : "bg-muted"`; ALREADY has aria-label="Toggle dofollow"; the knob span has its own transition-transform) — APPENDED ring to the STATIC cn() arg + ADDED `aria-pressed={dofollow}` (binary on/off, bg-conveyed). KEPT aria-label. **Ring-ONLY, NO press-scale added** (a sliding switch's affordance is the knob translate; a competing whole-control active:scale would fight it) → transition-colors LEFT as-is (no new CSS scale, so no FLIP). QUESTION: is ring-only (no scale) + aria-pressed (alongside the existing aria-label) the right call for a custom toggle switch, or should I instead use role="switch"/aria-checked (structural → FLAG)?

C) L270/L290 PUBLISH-STATUS `<button>` ×2 (single-select live/draft; selection bg-conveyed via cn() `status === "live"/"draft" ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"`; onClick handleStatusChange; visible text; cn() STATIC base `text-left p-4 rounded-xl border-2 transition-all` [identical on both, ALREADY transition-all]; NO scale/ring/aria) — APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the STATIC arg (both, via shared string) + ADDED `aria-pressed={status === "live"}` / `aria-pressed={status === "draft"}` individually. NO FLIP. OUTWARD ring-ring. Card-tile single-select tier.

D) L330 THEME-TOGGLE `<button>` ×2 (light/dark segmented; selection bg-conveyed via cn() `theme === t ? "bg-background shadow-sm" : "text-muted-foreground"`; onClick setTheme; visible text+dot; container = `grid grid-cols-2 gap-1 p-1 bg-muted rounded-full` [p-1 padded, rounded-full, NOT overflow-hidden]; cn() STATIC base `h-9 rounded-full text-sm font-medium capitalize transition-all flex items-center justify-center gap-2` [ALREADY transition-all]; NO scale/ring/aria) — ADDED `aria-pressed={theme === t}` + APPENDED `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the STATIC arg. NO FLIP. OUTWARD ring-ring (the `bg-background` selected pill on the neutral `bg-muted` track; container is p-1 padded, NOT overflow-hidden → 2px outward ring sits inside the padding, not clipped). Segmented-tab tier.

SKIP confirmed: shadcn back `<Button>` (L119), "Copy code" `<Button disabled={!snippet}>` (L254), Disconnect/Reconnect `<Button>` (L308/L317) — all own tokens/visible text/disabled; all `<Card>` (SEO benefits, dofollow, status banner, snippet, preview), `<Badge>`; AppLayout, Helmet; lucide icons; pre/code snippet; all text.

KEY QUESTIONS: (1) all 5 edit groups correct? (2) B — for the custom toggle switch, is ring-ONLY (no scale) + aria-pressed={dofollow} (+ keep aria-label) right, vs adding a press-scale, vs role="switch"/aria-checked (FLAG structural)? (3) is aria-pressed the right ARIA for the niche/status/theme single-select pickers (vs role=radiogroup/radio or role=tablist/tab — structural)? (4) active:scale-[0.97] right tier for all (card-tile + segmented)? (5) NO FLIP correct everywhere (all 4 className groups already transition-all; the toggle is ring-only)? (6) OUTWARD ring-ring correct for the theme toggle on the p-1-padded bg-muted rounded-full track? (7) did I miss any raw interactive control or mis-tier? (Confirm the 4 shadcn Buttons + Cards are correctly SKIPPED.) Be concise and exact; return precise final className after-strings + aria attrs + verdict per group.
- files: src/pages/app/ConnectWebsitePage.tsx

---

# Review: ConnectWebsitePage.tsx — Premium Interaction + A11y Pass

## Short Plan

Apply the 5 edit groups (A–E) to `src/pages/app/ConnectWebsitePage.tsx` — className-only + display-only aria, preserving all logic. The edits are already applied in the provided file (I can see them inline). I'll verify each group against the house standard and flag any issues.

## Verdict Per Group

### A) Niche Picker `<button>` ×4 (L163)
**VERDICT: ✅ CORRECT**

After-string (STATIC cn() arg):
```
text-left p-3 rounded-xl border-2 transition-all flex gap-3 items-start active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- `aria-pressed={niche === n.id}` ✅ — persistent single-select, bg-conveyed
- `active:scale-[0.97]` ✅ — card-tile tier (border-2 card with own surface)
- No FLIP needed ✅ — already `transition-all`
- OUTWARD `ring-ring` ✅ — faint primary-tint/border on `bg-muted/20` page = neutral parent

### B) Dofollow Toggle `<button>` (L191)
**VERDICT: ✅ CORRECT — ring-only + aria-pressed is right**

After-string (STATIC cn() arg):
```
h-6 w-11 rounded-full transition-colors relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- **Ring-ONLY (no scale)** ✅ — a sliding switch's affordance is the knob translate; adding `active:scale` would fight the knob animation. Correct call.
- `aria-pressed={dofollow}` ✅ — binary on/off, bg-conveyed. Correct alongside the existing `aria-label="Toggle dofollow"` (aria-label describes the control, aria-pressed conveys state — they serve different purposes, both valid).
- **NO FLIP** ✅ — `transition-colors` left as-is (no new CSS scale added, so no need for `transition-all`).
- **`role="switch"`/`aria-checked` is STRUCTURAL → FLAGGED** ✅ — correctly not applied. The house pattern uses `aria-pressed` for custom toggles; upgrading to `role="switch"` would be a structural change.

### C) Publish Status `<button>` ×2 (L270/L290)
**VERDICT: ✅ CORRECT**

After-string (STATIC cn() arg, identical on both):
```
text-left p-4 rounded-xl border-2 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- `aria-pressed={status === "live"}` / `aria-pressed={status === "draft"}` ✅ — single-select, bg-conveyed
- `active:scale-[0.97]` ✅ — card-tile tier (border-2 card with own surface)
- No FLIP needed ✅ — already `transition-all`
- OUTWARD `ring-ring` ✅ — same neutral parent as A

### D) Theme Toggle `<button>` ×2 (L330)
**VERDICT: ✅ CORRECT**

After-string (STATIC cn() arg):
```
h-9 rounded-full text-sm font-medium capitalize transition-all flex items-center justify-center gap-2 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

- `aria-pressed={theme === t}` ✅ — single-select segmented, bg-conveyed
- `active:scale-[0.97]` ✅ — segmented-tab tier
- No FLIP needed ✅ — already `transition-all`
- **OUTWARD `ring-ring`** ✅ — container is `p-1` padded, `rounded-full` but **NOT overflow-hidden**. The 2px outward ring sits inside the 4px padding, not clipped. Correct call.

### E) Key Questions Answered

1. **All 5 edit groups correct?** ✅ Yes — every edit is byte-identical to the house standard.

2. **B — ring-only + aria-pressed right for toggle?** ✅ Yes. Ring-only avoids fighting the knob animation. `aria-pressed` alongside `aria-label` is valid (different purposes). `role="switch"`/`aria-checked` is structural → correctly FLAGGED.

3. **aria-pressed right for niche/status/theme pickers?** ✅ Yes — these are persistent single-select controls where on/off is bg-conveyed. The house pattern uses `aria-pressed` for custom segmented/filter controls. Upgrading to `role="radiogroup"`/`role="tablist"` would be structural → FLAGGED.

4. **active:scale-[0.97] right tier for all?** ✅ Yes — A/C are card-tile tier (border-2 cards with own surface), D is segmented-tab tier. `[0.97]` is the correct tier for both.

5. **No FLIP correct everywhere?** ✅ Yes — A/C/D already `transition-all`; B is ring-only (no new scale) so `transition-colors` stays.

6. **OUTWARD ring-ring correct for theme toggle?** ✅ Yes — the `p-1` padded `bg-muted` track is NOT overflow-hidden, so the outward ring renders inside the padding, not clipped.

7. **Missed controls?** ✅ None. All 4 shadcn Buttons (back, Copy code, Disconnect/Reconnect) + Cards + Badge are correctly SKIPPED (own tokens). No other raw `<button>` or `<a>` or clickable divs present.

## Guard Tally

| Metric | Count |
|--------|-------|
| className edits | 5 (A×1, B×1, C×2, D×1) |
| `aria-pressed` new | 9 (A×4, B×1, C×2, D×2) |
| `aria-label` new | 0 (B's pre-existing kept) |
| `aria-expanded` new | 0 |
| `focus-visible:ring` | 5 (all OUTWARD) |
| `ring-ring` | 5 (all OUTWARD) |
| `ring-inset` | 0 |
| `active:scale-[0.97]` new | 4 (A, C×2, D) |
| ring-only (no scale) | 1 (B) |
| FLIPs | 0 |
| `transition-all` kept | 3 (A, C, D) |
| `transition-colors` kept | 1 (B) |
| Logic lines touched | 0 |

## Final Diff

The edits are already applied in the provided file. The diff from the original would be:

```diff
--- a/src/pages/app/ConnectWebsitePage.tsx
+++ b/src/pages/app/ConnectWebsitePage.tsx
@@ -163,7 +163,7 @@ const ConnectWebsitePage = () => {
                   <button type="button"
                     key={n.id}
                     onClick={() => handleNicheChange(n.id)}
-                    className={cn(
-                      "text-left p-3 rounded-xl border-2 transition-all flex gap-3 items-start",
+                    aria-pressed={niche === n.id}
+                    className={cn(
+                      "text-left p-3 rounded-xl border-2 transition-all flex gap-3 items-start active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                       niche === n.id
@@ -191,7 +191,9 @@ const ConnectWebsitePage = () => {
                   <button type="button"
                     onClick={handleDofollowToggle}
-                    className={cn(
-                      "h-6 w-11 rounded-full transition-colors relative shrink-0",
+                    className={cn(
+                      "h-6 w-11 rounded-full transition-colors relative shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                       dofollow ? "bg-primary" : "bg-muted"
                     )}
                     aria-label="Toggle dofollow"
+                    aria-pressed={dofollow}
@@ -270,7 +272,7 @@ const ConnectWebsitePage = () => {
                 <button type="button"
                   onClick={() => handleStatusChange("live")}
-                  className={cn(
-                    "text-left p-4 rounded-xl border-2 transition-all",
+                  aria-pressed={status === "live"}
+                  className={cn(
+                    "text-left p-4 rounded-xl border-2 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     status === "live"
@@ -290,7 +292,7 @@ const ConnectWebsitePage = () => {
                 <button type="button"
                   onClick={() => handleStatusChange("draft")}
-                  className={cn(
-                    "text-left p-4 rounded-xl border-2 transition-all",
+                  aria-pressed={status === "draft"}
+                  className={cn(
+                    "text-left p-4 rounded-xl border-2 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     status === "draft"
@@ -330,7 +332,7 @@ const ConnectWebsitePage = () => {
                 <button type="button"
                   key={t}
                   onClick={() => setTheme(t)}
-                  className={cn(
-                    "h-9 rounded-full text-sm font-medium capitalize transition-all flex items-center justify-center gap-2",
+                  aria-pressed={theme === t}
+                  className={cn(
+                    "h-9 rounded-full text-sm font-medium capitalize transition-all flex items-center justify-center gap-2 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                     theme === t ? "bg-background shadow-sm" : "text-muted-foreground"
```

## Owner Verification

- **File:** `src/pages/app/ConnectWebsitePage.tsx`
- **Verify:** `npm run update` must pass (type-check + worker type-check + build)
- **Preview:** Navigate to `/connect-website` — verify all 5 controls render correctly at 375/768/1280
- **Structural flag:** The dofollow toggle could be upgraded to `role="switch"`/`aria-checked` for better screenreader semantics — owner decision
- **Structural flag:** The niche picker grid could be wrapped in `role="radiogroup"` — owner decision
- **Structural flag:** The publish status buttons could be wrapped in `role="radiogroup"` — owner decision
- **Structural flag:** The theme toggle segmented control could use `role="tablist"`/`role="tab"` — owner decision
