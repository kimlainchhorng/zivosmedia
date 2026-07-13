# MiMo run — 2026-06-14T05:51:07.290Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Premium interaction + a11y QA on ONE customer-facing page: src/pages/TwoStepAuthPage.tsx (191 lines, "Status + manage your 2-step verification", REAL Supabase two_step_auth (orphan, user-owned), AUTH-aware via useAuth [user.id scopes query]). Read-only view + a single toggle. One useQuery ["two-step-auth", user.id] (maybeSingle own row, enabled !!user.id). useQueryClient qc. useState toggling. toggle() = optimistic qc.setQueryData + supabase.functions.invoke("account-security-settings", {resource:"two_step", action:"update", enabled:next}) + toast + invalidate-on-error. Layout: SwipeBackContainer + SEOHead noIndex; sticky header (shadcn back <Button> + ShieldCheck badge + title); gradient hero status motion.div (Not set up/Enabled/Disabled, NO onClick); loading skeletons; not-configured card (shadcn "Set up 2-step" Button → navigate /account/security); configured card (status row + RAW Enable/Disable toggle pill + hint/recovery blocks + RAW "Change password or hint" nav row); blue info banner.

Reference standard: src/pages/hubs/JobPostingDetailPage.tsx (transition-all active:scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring).

VERIFIED FACTS (full line-by-line read): exactly 2 RAW <button type="button"> (toggle L143 + change-password nav row L173) + 2 shadcn <Button> (back L89, "Set up 2-step" L127). 0 motion.button. Hero motion.div L102 NO onClick. hint/recovery blocks L153/163 are non-interactive divs.
- shadcn back <Button aria-label="Back" variant="ghost" size="icon" className="h-10 w-10 rounded-full"> (L89) => SKIP (ships tokens, labeled).
- shadcn "Set up 2-step" <Button onClick navigate("/account/security")> (L127) => SKIP (ships tokens).
- (A) Enable/Disable toggle pill (L143, RAW): onClick toggle(), disabled={toggling}. LABEL is the ACTION word — "Enable" (when off) / "Disable" (when on) / "…" (while toggling) — i.e. label CHANGES with state (it is the action to perform, NOT a constant label). Appearance also varies by state (enabled = bg-secondary hover:bg-muted; disabled = bg-ig-gradient text-white shadow-sm). Base BEFORE: "h-9 px-4 rounded-full text-xs font-bold inline-flex items-center transition-all disabled:opacity-50" (transition-all ALREADY present, NO scale, NO ring).
- (B) "Change password or hint" nav row (L173, RAW): onClick navigate("/account/security"), VISIBLE text + ChevronRight, full-width. ONE-SHOT NAV. Base BEFORE: "w-full flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary text-foreground text-xs font-bold transition-colors" (transition-colors + hover:bg, NO scale, NO ring).

TOKEN TIERS: wide/primary/cards/full-width active:scale-[0.98]; links/chips/pills/segmented active:scale-[0.97]; icon-only active:scale-95. Always focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring. FLIP transition-colors→transition-all when ADDING a NEW scale to a button that ALSO has a hover bg/color. APPEND-not-flip when transition-all already present. aria-pressed ONLY for persistent toggle/segmented/filter conveyed by bg/color with a CONSTANT label word — NOT for an action-label toggle whose label CHANGES (Enable/Disable), NOT one-shot nav. OUTWARD ring default.

EDITS APPLIED (validate exact):
(A) toggle pill (L143): APPEND "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" after transition-all (pill tier [0.97]; APPEND-not-flip — transition-all already present; OUTWARD ring-ring on neutral card surface). NO aria-pressed (label is the ACTION and CHANGES Enable↔Disable — a constant-label toggle would qualify, but a changing action-label does not; aria-pressed + changing label = confusing SR announce). NEW base: "h-9 px-4 rounded-full text-xs font-bold inline-flex items-center transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50".
(B) change-password nav row (L173): FLIP transition-colors→transition-all + APPEND "active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" (wide full-width row tier [0.98]; FLIP mandatory — adding new scale to a transition-colors button with hover:bg-secondary; NO aria — one-shot nav, visible text; OUTWARD ring-ring). NEW base: "w-full flex items-center justify-between p-3 rounded-xl bg-secondary/40 hover:bg-secondary text-foreground text-xs font-bold transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring".

QUESTIONS:
(1) Toggle (A): Confirm NO aria-pressed is correct — the label is the ACTION verb and CHANGES (Enable↔Disable), so it is an action-label toggle (like Follow/Unfollow), NOT a constant-label state toggle. pill [0.97] + APPEND-not-flip (transition-all present) + OUTWARD ring-ring correct? Or do you argue aria-pressed={enabled} IS warranted since it is a binary state conveyed by bg?
(2) Nav (B): FLIP transition-colors→transition-all mandatory (new scale + hover:bg-secondary)? wide full-width tier [0.98] (vs [0.97])? NO aria (one-shot nav)? OUTWARD ring-ring?
(3) Inventory exhaustive (2 RAW + 2 shadcn)? Both shadcn Buttons (back L89, Set up 2-step L127) correctly SKIPPED? hero motion.div L102 + hint block L153 + recovery block L163 + info banner L184 + skeletons L114 + not-configured card L117 correctly LEFT (presentational/non-interactive)?
(4) Responsive 375/768/1280: header; hero (text-3xl status); configured card (icon tile h-10 w-10 + flex-1 min-w-0 status/timestamp + toggle pill h-9 px-4 — does the pill crowd the timestamp @375?); hint/recovery rows; full-width nav row. Any crush @375? sub-44px tap targets to FLAG (back h-10 40px; toggle h-9 36px)?
(5) Owner flags (logic/out of scope, FLAG not fix): supabase cast type-workaround; toggle() optimistic qc.setQueryData WITH invalidate-on-error rollback (good pattern — note it); functions.invoke writes account-security-settings (server-side); the "Set up 2-step" + "Change password or hint" both navigate to the SAME /account/security route (intended?); no recovery-email masking (shown in full as font-mono — minor privacy note); anything else?

Be concise. Cite classNames. If correct as-is, say so per item.
- files: src/pages/TwoStepAuthPage.tsx

---

## Review: TwoStepAuthPage.tsx

### (1) Toggle (A) — NO aria-pressed: **Correct**

The label CHANGES (`"Enable"` ↔ `"Disable"` ↔ `"…"`), making it an **action-label** toggle, not a constant-label state toggle. `aria-pressed` here would produce confusing SR output: `"Enable pressed"` (implying on) or `"Disable pressed"` (implying off). The label itself already conveys the action. This matches the Follow/Unfollow convention — no `aria-pressed`.

Pill `[0.97]` ✓ · APPEND-not-flip (`transition-all` already present) ✓ · OUTWARD `ring-ring` (sits on neutral `bg-card` parent) ✓

### (2) Nav row (B) — **Correct as applied**

- **FLIP** `transition-colors`→`transition-all` — mandatory. Row has `hover:bg-secondary` (color) gaining `active:scale-[0.98]` (transform). `transition-colors` wouldn't ease the scale. `transition-all` covers both. ✓
- **Wide tier `[0.98]`** — correct. Full-width `p-3 rounded-xl` bordered row = wide-row precedent, not a pill/chip. ✓
- **NO aria** — correct. One-shot `navigate()`, visible text "Change password or hint". ✓
- **OUTWARD `ring-ring`** — correct. Neutral card surface. ✓

### (3) Inventory: **Exhaustive, correct**

| Control | Type | Action | Verdict |
|---------|------|--------|---------|
| Back (L89) | shadcn `Button` | `navigate(-1)` | SKIP ✓ (ships tokens + `aria-label="Back"`) |
| "Set up 2-step" (L127) | shadcn `Button` | `navigate("/account/security")` | SKIP ✓ (ships tokens) |
| Toggle pill (L143) | RAW `button` | `toggle()` | EDITED ✓ |
| Change-password row (L173) | RAW `button` | `navigate("/account/security")` | EDITED ✓ |

All remaining correctly LEFT:
- Hero `motion.div` L102 — entrance anim, NO onClick · ✓
- Skeletons L114 — `animate-pulse` divs · ✓
- Not-configured card L117 — non-interactive container · ✓
- Hint block L153, Recovery block L163 — non-interactive `div`s · ✓
- Info banner L184 — non-interactive `div` · ✓

### (4) Responsive / tap targets

**No crush at 375.** The configured card row is icon `h-10 w-10` + gap-3(12) + `flex-1 min-w-0` status/timestamp + `shrink-0` pill `h-9 px-4`. At 375 with `p-4`(32px): fixed elements ~154px, leaving ~187px for the `flex-1` — ample for "Configured but off" + relative timestamp. Header, hero `text-3xl`, hint/recovery rows, nav row all single-column within `max-w-2xl mx-auto px-4`. Clean at 768/1280 (wider within centered column).

**Sub-44px tap targets — FLAG (repo-wide, not introduced here):**
- Back `h-10 w-10` = 40px
- Toggle pill `h-9` = **36px** ← the most concerning one since it's a primary binary-action control
- "Set up 2-step" `h-10` = 40px
- Change-password row `p-3` ≈ 40px total

### (5) Owner flags

**(a)** `supabase as unknown as {...}` cast — existing pattern, cleanup when types regenerate.

**(b)** Toggle optimistic pattern is **correct and well-built**: `setQueryData` → `functions.invoke` → on error `toast.error` + `invalidateQueries` (rollback) → on success `toast.success`. Rollback-on-error is good practice.

**(c)** Both "Set up 2-step" and "Change password or hint" navigate to `/account/security` — appears **intentional** (security hub manages both).

**(d)** Recovery email shown in **full** as `font-mono` — minor privacy note. Could mask (`j***@example.com`) but product decision.

**(e)** No query-error UI (a network failure renders "Not set up" — misleading). Minor.

**(f)** `toggling` disables the button during invoke — correct double-tap prevention.

---

## Summary

**Both edits are correct. No changes needed.** The file as provided has the right tokens applied to both RAW controls, correct tier selection, correct FLIP/APPEND decisions, correct aria-pressed omission, exhaustive inventory, and no responsive issues. `npm run update` should pass (0 logic lines changed — className-only edits on 2 buttons). Ready for the owner to commit.
