# MiMo run — 2026-06-13T23:22:26.384Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Analyze a customer-facing PUBLIC app-store deep-link redirect page — src/pages/ShareProfileRedirect.tsx (shows 'Open in ZIVO app' / 'Download for iOS/Android' CTAs, plus a small 'Continue in browser' text link) — for PREMIUM + RESPONSIVE refinements toward parity with reference src/pages/hubs/JobPostingDetailPage.tsx. HARD RULE: do NOT change routing, redirect logic, useEffect/platform-detection, or any data/query logic — propose ONLY JSX/Tailwind className changes plus tiny display-only logic. Control inventory: the two primary CTAs ('Open in ZIVO app' ~L159, 'Download for…' ~L162) are shadcn Button components — ALREADY ship active:scale + focus-visible:ring, SKIP. The ONLY raw control is a small 'Continue in browser' text-link button (~L174): className 'mt-4 text-[12px] text-muted-foreground underline-offset-2 hover:underline', NO active:scale, NO focus ring, NO rounded. Tasks: (1) interaction consistency — for the small text-link, add active:scale-[0.97] (small text-link tier) + focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring + rounded-sm (clean radius on inline text) + transition-transform (or transition-all if hover state needs to animate). Flag any control I missed. (2) responsive issues at 375/768/1280 (centered single-column hero). (3) any display-only polish worth doing. Return a CONCISE line-referenced punch list of exact className edits with before/after. Do NOT reprint the whole component. Keep under ~600 tokens.
- files: src/pages/ShareProfileRedirect.tsx, src/pages/hubs/JobPostingDetailPage.tsx

---

## Plan

One raw control identified (matching the task description), zero missed. Two states need display-only polish. No responsive crush (single `max-w-sm` centered column holds at all widths).

---

## Punch list — `src/pages/ShareProfileRedirect.tsx`

### 1. Interaction fix — "Continue in browser" button (~L174)

**Before:**
```
className="mt-4 text-[12px] text-muted-foreground underline-offset-2 hover:underline"
```
**After:**
```
className="mt-4 text-[12px] text-muted-foreground underline-offset-2 hover:underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```
Rationale: `transition-all` (not `transition-transform`) because `hover:underline` is a text-decoration change that benefits from the same transition scope; `active:scale-[0.97]` (small text-link tier); `rounded-sm` for clean focus-ring radius; keyboard focus ring.

### 2. Display-only polish — "Profile not found" state (~L130–133)

The notFound screen is bare text on a blank background while the fallback screen has a styled card. Bring them visually consistent.

**Before (~L130–133):**
```jsx
<div className="min-h-screen flex items-center justify-center bg-background">
  <p className="text-muted-foreground">Profile not found</p>
</div>
```
**After:**
```jsx
<div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
  <div className="w-full max-w-sm rounded-3xl border border-border/60 bg-card p-6 shadow-sm text-center">
    <div className="mx-auto mb-4 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
      <Smartphone className="h-7 w-7" />
    </div>
    <p className="font-semibold">Profile not found</p>
    <p className="mt-1 text-[13px] text-muted-foreground">
      This link may be invalid or the profile has been removed.
    </p>
  </div>
</div>
```
Uses the same card shell as the main fallback UI (`max-w-sm rounded-3xl border bg-card p-6 shadow-sm`) + the same icon chip pattern (but `bg-muted` instead of `bg-primary/10` to signal a dead-end state). Display-only — zero logic changes.

### 3. No other edits needed

- Both `<Button>` components (L159, L162) are shadcn — already ship `active:scale-[0.98]` + `focus-visible:ring-2 focus-visible:ring-ring` + `transition-all`. **Skip.**
- Loading state (L137–140) is a standard centered spinner — fine.
- Responsive: `px-6` outer + `p-6` card + `max-w-sm` gives ~327px content at 375px viewport. No crush. Button row is `flex-col gap-2 w-full` — holds at all widths. **No responsive fix needed.**
- No fetched-but-unused fields (this page only reads `profiles.id, user_id` by `share_code` — both consumed for navigation).

---

## Summary diff (2 edits, display-only + className-only)

| # | Location | Type | Lines changed |
|---|----------|------|---------------|
| 1 | L174 `className` | className swap | 1 ins / 1 del |
| 2 | L130–133 notFound JSX | display-only refactor | ~10 ins / 3 del |

**Total: ~11 insertions / 4 deletions. Zero handler/query/routing/logic lines touched.**

## Owner verification

1. Run `npm run update` — must pass (type-check + worker type-check + build).
2. Preview `/p/testcode` on desktop (should hit the notFound→redirect path in native-WebView mode, or show the fallback card on desktop). On mobile, the auto-redirect fires first; the fallback card surfaces after ~1.8s.
3. Tab to the "Continue in browser" link → confirm `ring-2 ring-ring` appears on `:focus-visible`. Press/click → confirm `scale-[0.97]` press feedback.
4. If this is part of the premium interaction marathon, move the task to **Done** in `AGENT_TASKS.md` after green verify.
