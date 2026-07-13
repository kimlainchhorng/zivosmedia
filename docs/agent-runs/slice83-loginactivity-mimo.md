# MiMo run — 2026-06-14T07:58:42.366Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind+framer-motion mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/LoginActivityPage.tsx (296-line "Login Activity" — a security/login audit log at /login-activity; REAL Supabase useQuery(["login-alerts", user.id]) over login_alerts (eq user_id, order created_at desc, limit 200, staleTime 30s); useState tab; useMemo stats + filtered; a tabs array [all/login/security/suspicious]; layout: sticky header [shadcn ghost Back Button + ShieldCheck + "Login Activity"] + a gradient stats hero motion.div + a conditional suspicious banner [with a "Manage devices" button] + a tab-filter chip row + loading skeletons + empty states + an event list of motion.div rows). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, navigate, setTab, useQuery/Supabase, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button> (own focus/scale tokens). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset only when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring; saturated/dark/image surface AS THE PARENT = ring-white/70. A gradient-FILLED chip selected state on a NEUTRAL parent still uses ring-ring.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97]; wide full-width row WITH own surface active:scale-[0.98]; BARE full-width row NO own surface active:scale-[0.99].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. FLIP RULE: transition-colors/transition-opacity GAINING a NEW active:scale MUST flip to transition-all. ALREADY transition-all → append without flipping. DON'T-CHURN: a control that ALREADY has active:scale + transition → ADD ring (+aria) ONLY.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way toggle whose on/off is bg-conveyed. NOT aria-pressed on one-shot actions (nav, clear).

TWO edits applied — confirm each CORRECT or NEEDS-FIX:

A) L170 "Manage devices" button (raw <button>, inside the suspicious banner, icon ShieldOff + VISIBLE text "Manage devices", one-shot onClick={() => navigate("/devices")}, base `mt-2 h-7 px-3 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-500/30 active:scale-95 transition-all`). It ALREADY has active:scale-95 + transition-all + hover:bg-rose-500/30 ON ITSELF. Parent = the suspicious banner `bg-rose-500/10 border-rose-500/30` (a light rose tint). → applied: DON'T-CHURN → APPENDED ONLY `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (no scale renumber, no flip — already transition-all; no aria — visible text "Manage devices" conveys the action; OUTWARD ring-ring renders against the light-rose banner). Confirm DON'T-CHURN ring-only + no-aria + OUTWARD ring-ring.

B) L184 TAB chip (raw <button>, mapped over `tabs` [all/Sign-ins/Security/Suspicious], single-select filter, selection bg-conveyed `bg-ig-gradient text-white shadow-sm` [selected] vs `bg-secondary text-foreground hover:bg-muted` [unselected], one-shot onClick={() => setTab(t.id)}, VISIBLE text = label + a count badge span; className via cn() static FIRST arg `shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5`, ALREADY transition-all, NO scale/focus/aria). Container = `flex gap-2 overflow-x-auto` on the page bg-background (neutral). → applied: ADDED `aria-pressed={tab === t.id}` + APPENDED into the cn() static FIRST arg `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented-filter tier [0.97]; NO flip — transition-all already present; OUTWARD ring-ring — selected bg-ig-gradient fill renders against neutral bg-background; single edit hits all tabs). Confirm tier [0.97] + aria-pressed + no-flip + OUTWARD ring-ring.

ALSO CONFIRM I should LEAVE: the shadcn ghost Back <Button> L125 (own focus/scale tokens); SEOHead/SwipeBackContainer (wrappers); all motion.div wrappers (hero L138, suspicious banner L155, event rows L233 — entrance anim, NO onClick); the loading skeletons + empty-state <div>s (non-interactive); the count-badge <span> + "Review" badge <span> + all event-row spans (non-interactive); all icons (ArrowLeft/ShieldCheck/Sparkles/LogIn/LogOut/Key/Smartphone/AlertTriangle/MapPin/Monitor/Tablet/ShieldOff/Filter/Clock — decorative).

Be concise and exact. Return the precise final className after-string per control + any aria attr. Flag any other in-scope raw interactive control I missed.
- files: src/pages/LoginActivityPage.tsx

---

## Review — LoginActivityPage.tsx

### (1) Plan

Two edits, both already applied in the working tree. Confirm correctness + completeness of the LEAVE list.

### (2) Verdicts

**Edit A — "Manage devices" button: ✅ CORRECT**

- DON'T-CHURN applies: already has `active:scale-95` + `transition-all` + `hover:bg-rose-500/30` → ring-only append is the right call.
- No `aria-label` needed: visible text "Manage devices" conveys the action. ✓
- No scale renumber (keeps existing `-95`). ✓
- No flip (already `transition-all`). ✓
- Outward `ring-ring`: parent is the light-rose banner (`bg-rose-500/10`) sitting on neutral `bg-background` — `ring-ring` is correct (not `ring-white/70`). ✓

**Final className:**
```
mt-2 h-7 px-3 rounded-full bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[11px] font-bold inline-flex items-center gap-1 hover:bg-rose-500/30 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**Aria:** none added. ✓

---

**Edit B — Tab filter chips: ✅ CORRECT**

- Single-select segmented filter → `aria-pressed={tab === t.id}` is the correct house pattern (persistent bg-conveyed selection state, not a one-shot action). ✓
- Tier `[0.97]` correct for segmented filter/tab. ✓
- No flip: `transition-all` already present in the cn() static first arg. ✓
- Outward `ring-ring`: selected `bg-ig-gradient` fill renders ring against neutral `bg-background` parent. ✓
- Single edit via cn() static part hits all 4 tabs. ✓

**Final cn() static first arg:**
```
shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all inline-flex items-center gap-1.5 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```
**Aria:** `aria-pressed={tab === t.id}` on the `<button>`. ✓

---

**LEAVE list: ✅ ALL CORRECT, no omissions**

| Item | Reason |
|------|--------|
| shadcn ghost Back `<Button>` L125 | Own focus/scale tokens |
| `SEOHead` / `SwipeBackContainer` | Wrappers, non-interactive |
| All `motion.div` wrappers (hero, banner, event rows) | Entrance anim, NO `onClick` |
| Loading skeleton `<div>`s + empty-state `<div>`s | Non-interactive presentational |
| Count-badge `<span>`, "Review" badge `<span>`, event-row metadata `<span>`s | Non-interactive |
| All icons (ArrowLeft, ShieldCheck, Sparkles, LogIn, LogOut, Key, Smartphone, AlertTriangle, MapPin, Monitor, Tablet, ShieldOff, Filter, Clock) | Decorative |

**No missed raw interactive controls.** The file has exactly 3 interactive controls total: the shadcn Back Button (LEAVE), the "Manage devices" button (A), and the tab chips (B). All event rows are `motion.div` with no `onClick` — purely presentational.

### (3) Owner verification

- Run `npm run update` — must pass (0 type errors + worker types + production build).
- Guard grep on the diff: exactly **2 className edits** (A + B), **1 aria attr** (`aria-pressed` on tab chips), **0 logic lines touched**.
- Preview caveat: page reads live `login_alerts` via `useQuery` (auth-gated); preview server may be contended by parallel agents.
