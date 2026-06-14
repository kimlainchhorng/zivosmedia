# MiMo run — 2026-06-13T23:25:36.905Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze a customer-facing PUBLIC bot profile page — src/pages/BotPublicProfilePage.tsx (a shareable public profile for a chat bot/agent: header avatar+name+bio, a 'Start chat' CTA, a list of pay/subscribe links, a grid of mini-apps, a 'create your own' footer link; data via bot_public_profile/apps/payments RPCs) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change any supabase query/RPC, react-query keys, navigation/routing, or component logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. Control inventory: the 'Home' (~L59) and 'Start chat' (~L106) CTAs are shadcn Button components — ALREADY ship active:scale + focus-visible:ring, SKIP. RAW controls needing the interaction-token pass: (1) header Back icon-button (~L79, 'p-2 -ml-2 rounded-full hover:bg-muted', has aria-label) — icon-only tier: active:scale-95 + transition-transform + focus-visible ring; (2) Pay/subscribe mapped <a> cards (~L119, 'flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 hover:bg-emerald-100') — wide-card tier: active:scale-[0.98] + transition + ring; ALSO FLAG: hardcoded emerald-50/200/100 (not dark-mode-aware / not design tokens) — dark: variant or token swap warranted, or out-of-scope for a pure interaction pass? (3) Mini-apps mapped <a> cards (~L144, 'rounded-xl bg-muted/40 border border-border p-3 hover:bg-muted/60') — wide-card tier: active:scale-[0.98] + transition + ring; (4) 'create your own' <button> (~L176, 'underline') — small text-link tier: active:scale-[0.97] + ring + rounded-sm. Tasks: (1) interaction consistency on the 4 raw controls (confirm tiers/tokens, decide transition-transform vs transition-all per control given hover states). Flag any control I missed. (2) responsive issues at 375/768/1280. (3) display-only polish (incl. the emerald dark-mode flag — recommend fix-or-flag). Return a CONCISE line-referenced punch list of exact className edits with before/after. Do NOT reprint the whole component. Keep under ~700 tokens.
- files: src/pages/BotPublicProfilePage.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

Four raw controls, zero missed. The two shadcn Buttons (Home, Start chat) correctly skipped. One genuine dark-mode bug on the emerald pay cards (fixable within className scope). No responsive crush (single `max-w-2xl px-4` column holds at 375/768/1280).

---

## Punch list — `src/pages/BotPublicProfilePage.tsx`

### 1 · Header Back icon-button (~L79)
**Before:** `"p-2 -ml-2 rounded-full hover:bg-muted"`
**After:** `"p-2 -ml-2 rounded-full hover:bg-muted transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Why `transition-transform`:** only `scale` animates; `hover:bg-muted` is a color change but on a tap-sized icon button a snap hover is fine (matches shadcn `ghost icon` pattern).

### 2 · Pay/subscribe `<a>` cards (~L119) — interaction + dark-mode fix
**Before:** `"flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 p-3 hover:bg-emerald-100"`
**After:** `"flex items-center gap-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 hover:bg-emerald-500/20 dark:bg-emerald-500/15 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Why `transition-all`:** `hover:bg` color needs a smooth fade. **Dark-mode fix:** replaces hardcoded `emerald-50/200/100` with opacity-based tokens (matches `JobPostingDetailPage`'s `bg-emerald-500/15` pattern) — safe in both themes.

### 3 · Pay price text (~L129) — dark-mode fix only
**Before:** `"text-base font-semibold text-emerald-700 flex-shrink-0"`
**After:** `"text-base font-semibold text-emerald-700 dark:text-emerald-400 flex-shrink-0"`
Matches the reference's `text-emerald-700 dark:text-emerald-400`.

### 4 · Mini-apps `<a>` cards (~L144)
**Before:** `"rounded-xl bg-muted/40 border border-border p-3 hover:bg-muted/60"`
**After:** `"rounded-xl bg-muted/40 border border-border p-3 hover:bg-muted/60 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`
**Why `transition-all`:** `hover:bg` color transition + scale.

### 5 · "create your own" `<button>` (~L176)
**Before:** `"underline"`
**After:** `"underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"`

---

**Total:** 5 className edits across 4 controls (+ 1 dark-mode color fix). Zero logic/query/routing changes. `npm run update` must pass before done. The emerald dark-mode swap (#2–3) is display-only and optional if the owner wants to scope it separately — but it's a single className swap, no risk.
