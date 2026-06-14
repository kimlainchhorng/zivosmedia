# MiMo run — 2026-06-14T12:11:48.174Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

## Verification

All 5 edit groups are **CORRECT** as applied in the provided source. Nothing to fix.

### Per-group verdict

| Group | Control | Edit | Verdict |
|-------|---------|------|---------|
| **A** | Niche picker `<button>` ×4 | `aria-pressed={niche === n.id}` + `active:scale-[0.97]` + ring in STATIC cn() arg | ✅ CORRECT |
| **B** | Dofollow toggle `<button>` | `aria-pressed={dofollow}` + ring-only (NO scale) in STATIC cn() arg; KEPT `aria-label` | ✅ CORRECT |
| **C** | Publish status `<button>` ×2 | `aria-pressed={status === "live"/"draft"}` + `active:scale-[0.97]` + ring in STATIC cn() arg | ✅ CORRECT |
| **D** | Theme toggle `<button>` ×2 | `aria-pressed={theme === t}` + `active:scale-[0.97]` + ring in STATIC cn() arg | ✅ CORRECT |

### Key question answers

**(1) All 5 edit groups correct?** Yes — byte-verified against the source. Every cn() STATIC arg, every aria attr, every skip is right.

**(2) B — ring-ONLY + aria-pressed for toggle switch?**
Correct call. A toggle switch's physical affordance is the **knob translate** (`translate-x-5` / `translate-x-0.5`). Adding `active:scale-[0.97]` to the whole `w-11 h-6` control would visually fight the knob slide. Ring-only is right. `aria-pressed` alongside the existing `aria-label` is fine — `aria-pressed` conveys the on/off binary state, `aria-label` names the control. `role="switch"/aria-checked` would be more semantically precise but is STRUCTURAL → correctly **FLAGGED**.

**(3) aria-pressed for niche/status/theme pickers?**
Yes — house pattern for custom single-select bg-conveyed pickers. `role=radiogroup/radio` or `role=tablist/tab` would be more semantically precise but is STRUCTURAL → **FLAGGED**.

**(4) active:scale-[0.97] right tier?**
Yes. Card-tile tier for niche picker (L) and publish-status (L × wide cards). Segmented-pill tier for theme toggle (small pill in a 2-up track). All `[0.97]`.

**(5) NO FLIP correct?**
Yes. A/B/C/D all already have `transition-all` — the superset covers the new scale. B is ring-only (no new CSS scale), so `transition-colors` stays as-is — no FLIP needed.

**(6) OUTWARD ring-ring on theme toggle?**
Yes. Container is `p-1 bg-muted rounded-full` — **padded (4px), NOT `overflow-hidden`**. The 2px outward ring renders within the 4px padding, not clipped at the rounded edge. The `bg-background shadow-sm` selected pill on the neutral `bg-muted` track → `ring-ring`.

**(7) Missed controls?**
None. Confirmed:
- **4 shadcn Buttons correctly SKIPPED:** back `<Button>` (L119), "Copy code" `<Button disabled={!snippet}>` (L254), Disconnect `<Button>` (L308), Reconnect `<Button>` (L317) — all own tokens.
- **All `<Card>`, `<Badge>`** — own tokens, SKIP.
- **No other raw `<button>`** in the file. No raw `<a>` Links. No clickable `onClick`/`cursor-pointer` divs. No missed interactive controls.

### Summary tally

| Metric | Count |
|--------|-------|
| className edits | 4 (A STATIC, B STATIC, C STATIC ×2 shared string, D STATIC) |
| New aria-pressed | 8 (A ×4 + B ×1 + C ×2 + D ×2; but C uses 2 distinct attrs on 2 separate elements) |
| focus-visible:ring | 4 groups, all `ring-ring`, all OUTWARD, ring-inset=0 |
| active:scale new | 3 groups (A/C/D), B is ring-only |
| FLIPs | 0 |
| Logic lines touched | 0 |
| Controls SKIPPED | 4 shadcn Buttons + Cards/Badge + AppLayout/Helmet/icons/text |

**No diff needed — the file is ready to commit as-is.** Run `npm run update` to verify the gate before marking done.
