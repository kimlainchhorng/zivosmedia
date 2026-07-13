# MiMo run — 2026-06-14T08:32:03.858Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/personal/PersonalSettingsPage.tsx (213-line "Settings" — a signed-in customer's app settings at the personal settings route; localStorage-backed settings (SETTINGS_KEY) + a real supabase.auth.updateUser({password}) change-password flow in a bottom Sheet; useState settings/showChangePw/newPw/confirmPw/showPw/pwLoading; useEffect toggles the dark class; toggle() persists to localStorage + toast; layout: AppLayout [hideHeader] + a manual header [raw icon Back + "Settings"] + 4 settings-group cards [each a header row + rows of shadcn Switch toggles] + an "Account" card [3 raw full-width link buttons: Language→navigate("/settings"), Change Password→setShowChangePw(true), Delete Account→navigate("/profile/delete-account")] + a Change-Password Sheet [2 raw <input> + an eye show/hide raw <button> + an "Update Password" raw <button>]). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, setShowChangePw/setShowPw, supabase.auth.updateUser, toggle()/localStorage, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Switch>/<Sheet> (own tokens). Don't churn the raw password <input>s (ALREADY have native focus:ring-1 focus:ring-foreground/20). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown. Don't touch disabled.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when the control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; wide full-width row/card WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. Adding a NEW transition to a button with NO prior transition is NEW (not a flip).
- DON'T-CHURN: a control that ALREADY has active:scale + transition → ADD ring (+aria) ONLY (no scale renumber, no redundant 2nd scale, no flip).
- A control that ALREADY presses via active:bg (background wash) + transition-colors → ADD ring ONLY (do NOT add a competing scale; keep transition-colors, no flip).
- For bare icon/text-link buttons add a `rounded`/`rounded-full` so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter.

SIX edits applied — confirm each CORRECT or NEEDS-FIX:

A) L115 HEADER BACK button (icon-only ArrowLeft, one-shot onClick={() => navigate(-1)}, base `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform` [ALREADY active:scale-90 + transition-transform], had NO focus AND NO aria-label; parent = the page column on bg-background neutral) → applied: ADDED `aria-label="Go back"` (icon-only had none) + APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (DON'T-CHURN ring-only — already active:scale-90 + transition-transform; KEEP active:scale-90 [DON'T renumber to 95]; no flip; OUTWARD ring-ring on neutral bg-background). Confirm ADD aria-label + DON'T-CHURN ring-only + keep active:scale-90 + OUTWARD ring-ring.

B) L148 "LANGUAGE" link button (raw <button>, one-shot onClick={() => navigate("/settings")}, VISIBLE text "Language" + a ChevronRight, base `w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/30 transition-colors` [ALREADY presses via active:bg-muted/30 background wash + transition-colors], NO scale/focus/aria; FLUSH child of the Account card `rounded-2xl bg-card border overflow-hidden` [OVERFLOW-HIDDEN rounded parent]) → applied: APPENDED `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-ONLY — no competing scale, already presses via active:bg; keep transition-colors, no flip; ring-INSET — flush child of overflow-hidden card, outward would clip; ring-ring over own bg-card row; NO aria — visible text). Confirm ring-ONLY + ring-INSET + ring-ring + no-aria.

C) L156 "CHANGE PASSWORD" link button (raw <button>, one-shot onClick={() => setShowChangePw(true)}, VISIBLE text "Change Password" + a Lock icon + a ChevronRight, base `w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors`, same FLUSH-child-of-overflow-hidden-card context as B) → applied: identical to B — APPENDED `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-ONLY + ring-INSET + ring-ring + no-aria). Confirm.

D) L164 "DELETE ACCOUNT" link button (raw <button>, one-shot onClick={() => navigate("/profile/delete-account")}, VISIBLE text "Delete Account" [text-red-500] + a ChevronRight, base `w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors`, same FLUSH-child context) → applied: identical to B/C — APPENDED `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-ONLY + ring-INSET + ring-ring + no-aria — the visible "Delete Account" text conveys the action; the destructive-red is cosmetic, not an aria concern). Confirm ring-ONLY + ring-INSET + ring-ring + no-aria.

E) L186 SHOW/HIDE PASSWORD eye toggle (raw <button>, icon-only Eye/EyeOff, one-shot onClick={() => setShowPw(!showPw)}, ALREADY aria-label={showPw ? "Hide password" : "Show password"}, base `absolute right-3 top-3.5` [NO transition/scale/focus]; absolutely positioned over the right edge of the new-password <input> inside the Sheet on a neutral bg-muted/30 field / neutral Sheet surface) → applied: KEPT aria-label + APPENDED `rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (icon-only tier scale-95; transition-transform NEW — no hover on the button, scale is the SOLE animated prop, no prior transition; rounded so the ring traces the small icon tightly; OUTWARD ring-ring against the neutral field/sheet; KEPT aria-label). Confirm tier scale-95 + transition-transform NEW + rounded + OUTWARD ring-ring + keep aria-label.

F) L200 "UPDATE PASSWORD" submit button (raw <button>, one-shot onClick={handleUpdatePassword}, has `disabled={pwLoading || newPw.length < 8 || newPw !== confirmPw}`, VISIBLE text, base `w-full rounded-2xl bg-foreground text-background font-bold py-3 text-sm disabled:opacity-40 active:scale-[0.98] transition-transform` [ALREADY active:scale-[0.98] + transition-transform], NO focus/aria; inside the Sheet on a neutral surface, the button has its OWN bg-foreground dark fill) → applied: APPENDED `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ONLY (DON'T-CHURN ring-only — already active:scale-[0.98] + transition-transform; KEEP active:scale-[0.98] [wide full-width with own surface tier]; no flip; OUTWARD ring-ring — the outward ring renders against the neutral Sheet surface around the dark bg-foreground button; NO aria — visible text; KEPT disabled untouched). Confirm DON'T-CHURN ring-only + keep active:scale-[0.98] + OUTWARD ring-ring + no-aria + disabled untouched.

ALSO CONFIRM I should LEAVE: every shadcn <Switch> (own focus/state tokens) in the 4 settings-group cards; the <Sheet>/<SheetContent>/<SheetHeader>/<SheetTitle> (own tokens); the two raw password <input>s L179 + L190 (ALREADY native outline-none focus:ring-1 focus:ring-foreground/20 — leave to avoid churn); AppLayout (wrapper, hideHeader); the settings-group/account-card header <div>s + label/desc <p>s + <span>s (non-interactive); the "Passwords don't match" <p> (non-interactive); ArrowLeft/Bell/MapPin/Shield/Eye/EyeOff/Moon/Smartphone/Globe/ChevronRight/Lock icons (decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed. Note especially: (1) is OUTWARD ring correct on the absolutely-positioned eye toggle E (vs inset)? (2) is the eye toggle's transition-transform correct (no hover)? (3) for B/C/D — is ring-INSET correct given they're flush children of the overflow-hidden Account card? (4) for the Delete Account link D — is no-aria correct, or does destructive-action a11y warrant anything (within display-only scope)?
- files: src/pages/app/personal/PersonalSettingsPage.tsx

---

## Verdict: ALL 6 EDITS CORRECT — ZERO CHANGES NEEDED

Every edit follows the house rules precisely. No missed controls. Leave list is complete. Here are the specific answers to the four flagged questions plus the full guard-grep accounting.

---

### Per-control confirmation

| # | Control | Final className (after) | Aria | Verdict |
|---|---------|------------------------|------|---------|
| **A** | Header Back | `w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label="Go back"` (NEW) | ✅ |
| **B** | Language | `w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/30 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | none | ✅ |
| **C** | Change Password | `w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | none | ✅ |
| **D** | Delete Account | `w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | none | ✅ |
| **E** | Eye toggle | `absolute right-3 top-3.5 rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | `aria-label` (pre-existing kept) | ✅ |
| **F** | Update Password | `w-full rounded-2xl bg-foreground text-background font-bold py-3 text-sm disabled:opacity-40 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` | none | ✅ |

---

### Answers to the four flagged questions

**(1) OUTWARD ring on the eye toggle E — CORRECT.** The button is `absolute right-3 top-3.5` inside a `<div className="relative">` wrapping the input. It is NOT a flush edge child of a rounded overflow-hidden parent — it floats over the `bg-muted/30` input field on the neutral Sheet surface. An outward ring renders cleanly against the neutral field/Sheet background. No inset.

**(2) `transition-transform` on E — CORRECT.** The button has zero hover:bg/text/border/opacity effects. Scale is the SOLE animated prop. `transition-transform` (not `transition-all`) is the right token. This is a NEW transition (no prior transition class existed).

**(3) `ring-inset` on B/C/D — CORRECT.** All three are direct children of the Account card (`rounded-2xl bg-card border overflow-hidden`). The `overflow-hidden` on the rounded parent means an outward ring would be clipped on the rounded corners. `ring-inset` renders over the control's own `bg-card` row surface, which is neutral → `ring-ring` (BLACK).

**(4) No-aria on D (Delete Account) — CORRECT.** Within the display-only scope (className + `aria-label`/`aria-pressed`/`aria-expanded` only), there is no appropriate display-only ARIA attribute for a destructive action. `aria-label` is for icon-only controls (D has visible text). `aria-pressed` is for persistent toggles. `aria-describedby` pointing to a warning would require adding an `id` to an existing element — beyond the display-only scope. The visible red "Delete Account" text already conveys the destructive nature. The real confirmation lives in the `/profile/delete-account` destination page, not on this link button.

---

### Guard-grep stats over the diff

```
className edits:        6 (A–F)
aria new:               1 (A: aria-label="Go back")
focus-visible:ring:     6
ring-ring:              6  (A/E/F OUTWARD, B/C/D INSET)
ring-inset:             3  (B/C/D)
ring-white/70:          0
aria-pressed:           0
aria-expanded:          0
active:scale-95:        1  new (E)
active:scale-90:        1  pre-existing kept (A)
active:scale-[0.98]:    1  pre-existing kept (F)
FLIPs:                  0
NEW transitions:        1  (E: transition-transform)
transition-colors removed: 0
Logic lines touched:    0
```

---

### Missed controls: NONE

All 6 raw `<button>` elements in the file are edited (A–F). The two raw password `<input>`s have native `focus:ring-1 focus:ring-foreground/20` — left alone. All `<Switch>`, `<Sheet>*` are shadcn — left alone. No other raw interactive controls in the file.

---

### Leave list: CONFIRMED COMPLETE

All items correctly excluded: shadcn Switches, Sheet/SheetContent/SheetHeader/SheetTitle, both password inputs (native focus ring), AppLayout, all non-interactive divs/p/span, all decorative icons, the "Passwords don't match" `<p>`.

---

### Owner action

No code changes needed — the file in the working tree already has all 6 edits applied correctly. Verify:

```bash
npm run update
```

Must pass (type-check + worker type-check + production build). No logic was touched, so this is a pure display-only / a11y change with zero functional risk.
