# DeepSeek run — 2026-06-14T08:31:07.201Z

- model: deepseek-chat
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

# PersonalSettingsPage.tsx — Review & Confirmation

## All 6 edits are **CORRECT**. No changes needed.

### Per-control final state:

| Control | Final className additions | Aria | Notes |
|---------|--------------------------|------|-------|
| **A** L115 Header Back | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-only, DON'T-CHURN) | `aria-label="Go back"` (NEW) | ✅ Keep `active:scale-90` + `transition-transform`; OUTWARD `ring-ring` on neutral `bg-background` |
| **B** L148 Language | `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-only) | none | ✅ ring-INSET (flush child of `overflow-hidden` card); keep `active:bg-muted/30` + `transition-colors` |
| **C** L156 Change Password | `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-only) | none | ✅ Same as B; ring-INSET |
| **D** L164 Delete Account | `focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-only) | none | ✅ Same as B/C; ring-INSET; no-aria correct (visible text conveys action; destructive color is cosmetic) |
| **E** L186 Eye toggle | `rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (NEW) | kept pre-existing `aria-label` | ✅ `scale-95` icon-only tier; `transition-transform` NEW (no hover); `rounded`; **OUTWARD** `ring-ring` correct (absolutely positioned, NOT a flush child of overflow-hidden parent — the Sheet surface is not overflow-hidden) |
| **F** L200 Update Password | `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (ring-only, DON'T-CHURN) | none | ✅ Keep `active:scale-[0.98]` + `transition-transform`; OUTWARD `ring-ring` on neutral Sheet surface; `disabled` untouched |

### Key decisions confirmed:

1. **Eye toggle (E) — OUTWARD correct.** The eye button is `absolute` positioned inside a `relative` container that is a direct child of the Sheet content (NOT inside a `rounded-2xl overflow-hidden` parent). The Sheet surface is neutral → `ring-ring`. No inset needed.

2. **Eye toggle (E) — `transition-transform` correct.** No `hover:` class on the button. Scale is the sole animated prop. `transition-transform` (not `transition-all`) is correct.

3. **B/C/D — `ring-inset` correct.** All three are flush children of the Account card which has `rounded-2xl overflow-hidden`. An outward ring would clip on the left/right edges. Inset renders over the control's own `bg-card` surface → `ring-ring` (neutral card row, not image-dominant).

4. **Delete Account (D) — no-aria correct.** The visible text "Delete Account" conveys the action. Within the "className + display-only aria" scope, adding `aria-label` would be redundant. The destructive red styling is cosmetic, not an a11y gap.

### Missed controls check:

- ✅ **4 shadcn `<Switch>`** — own tokens, left alone
- ✅ **2 raw `<input>`** (L179, L190) — already have `focus:ring-1 focus:ring-foreground/20`, left alone
- ✅ **`<Sheet>` / `<SheetContent>` / `<SheetHeader>` / `<SheetTitle>`** — own tokens
- ✅ **`AppLayout`** — wrapper, `hideHeader`
- ✅ **All `<div>` / `<p>` / `<span>`** — non-interactive
- ✅ **All icons** — decorative

**No missed raw interactive controls.** The 6 `<button>`s above are the only raw interactive controls in the file.

### Diff (ready to apply):

```diff
--- a/src/pages/app/personal/PersonalSettingsPage.tsx
+++ b/src/pages/app/personal/PersonalSettingsPage.tsx
@@ -112,7 +112,7 @@ export default function PersonalSettingsPage() {
       <div className="flex flex-col px-4 pt-3 pb-24 space-y-4">
         <div className="flex items-center gap-2.5">
-          <button type="button" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform">
+          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <ArrowLeft className="w-4 h-4" />
           </button>
           <h1 className="font-bold text-[17px]">Settings</h1>
@@ -145,7 +145,7 @@ export default function PersonalSettingsPage() {
           <button type="button" onClick={() => navigate("/settings")}
-            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/30 transition-colors">
+            className="w-full flex items-center justify-between px-4 py-3.5 active:bg-muted/30 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <span className="text-[13px] font-semibold text-foreground">Language</span>
             <div className="flex items-center gap-1">
               <span className="text-[12px] text-muted-foreground">{settings.language}</span>
@@ -153,7 +153,7 @@ export default function PersonalSettingsPage() {
           </button>
           <button type="button" onClick={() => setShowChangePw(true)}
-            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors">
+            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <div className="flex items-center gap-2">
               <Lock className="w-3.5 h-3.5 text-muted-foreground" />
               <span className="text-[13px] font-semibold text-foreground">Change Password</span>
@@ -161,7 +161,7 @@ export default function PersonalSettingsPage() {
           </button>
           <button type="button" onClick={() => navigate("/profile/delete-account")}
-            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors">
+            className="w-full flex items-center justify-between px-4 py-3.5 border-t border-border/20 active:bg-muted/30 transition-colors focus-visible:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
             <span className="text-[13px] font-semibold text-red-500">Delete Account</span>
             <ChevronRight className="w-4 h-4 text-red-400/60" />
           </button>
@@ -183,7 +183,7 @@ export default function PersonalSettingsPage() {
               <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(!showPw)}
-                className="absolute right-3 top-3.5">
+                className="absolute right-3 top-3.5 rounded transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                 {showPw ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
               </button>
             </div>
@@ -197,7 +197,7 @@ export default function PersonalSettingsPage() {
               type="button"
               disabled={pwLoading || newPw.length < 8 || newPw !== confirmPw}
               onClick={handleUpdatePassword}
-              className="w-full rounded-2xl bg-foreground text-background font-bold py-3 text-sm disabled:opacity-40 active:scale-[0.98] transition-transform"
+              className="w-full rounded-2xl bg-foreground text-background font-bold py-3 text-sm disabled:opacity-40 active:scale-[0.98] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
             >
               {pwLoading ? "Updating…" : "Update Password"}
             </button>
```

### Owner must verify:
- Run `npm run update` (type-check + worker + build) before committing
- Confirm the change-password flow still works end-to-end (it hits `supabase.auth.updateUser` — real auth action)
- The `aria-label="Go back"` on the header back button is the only new aria attribute (fills a genuine a11y gap — icon-only button had no label)
