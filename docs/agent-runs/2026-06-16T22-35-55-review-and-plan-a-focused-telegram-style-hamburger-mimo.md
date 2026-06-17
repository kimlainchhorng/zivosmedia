# MiMo run — 2026-06-16T22:35:55.886Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review and plan a focused Telegram-style hamburger side menu PANEL update in src/pages/ChatHubPage.tsx. New reference is Telegram Web mobile menu panel selected: panel at x about 15, y about 103, width about 376 in a 458px viewport, rounded 24px, pale blue translucent background, no header card chrome, profile row with circular K avatar and Kim text, Add Account, then divider, Saved Messages, Archived Chats with count, My Stories, Contacts, divider, Wallet, divider, Settings, More with chevron. Rows are tall, about 57-72px, icons are large dark outline, labels bold, count muted gray. Existing code already uses chat-hub-menu-toggle peer menu and a pale backdrop; preserve existing row actions and backend behavior. Suggest minimal diff and risks.
- files: src/pages/ChatHubPage.tsx

---

# Hamburger Side Menu Panel — Telegram Web Alignment Review & Plan

## 1. Short plan

The existing hamburger menu (applied by Codex, 2026-06-16) already has the right **structure**: pale-blue overlay, translucent left panel, profile row with avatar/initial, the 8 Telegram rows, dividers. The delta to the reference screenshot is **purely sizing/spacing polish** — the current panel is undersized relative to Telegram Web's generous proportions. Five concrete changes:

| # | What | Current | Telegram reference | Change |
|---|------|---------|-------------------|--------|
| 1 | Panel radius | `rounded-2xl` (20px) | 24px | → `rounded-[24px]` |
| 2 | Row height | ~56px | 57–72px | `min-h-[56px]` → `min-h-[60px]`, `py-4` → `py-[18px]` |
| 3 | Icons | `w-7 h-7` | Large, dark outline | `w-7 h-7` → `w-[26px] h-[26px]`, add `text-slate-700` |
| 4 | Archived count badge | exists (sky-400) | Muted gray | `bg-sky-400 text-white` → `bg-slate-300/80 text-slate-600` |
| 5 | More row chevron | implicit or missing | Right-aligned `ChevronRight` | Ensure visible, `text-slate-400` |

All changes are **className-only** — zero logic, zero behavior, zero new imports. The menu actions (navigate, toast, archived screen, etc.) are untouched.

## 2. Proposed diff

**File:** `src/pages/ChatHubPage.tsx`

All changes are in the `BodyPortal` section that renders the hamburger overlay (the block gated on `chat-hub-menu-toggle:checked ~ * .pointer-events-auto`). The exact line numbers depend on the full file, but here are the **before → after** className swaps:

### 2a. Panel container — radius

```diff
- className="absolute top-[60px] left-3 bottom-3 w-[85vw] max-w-[340px] bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-y-auto overscroll-contain z-[9999] border border-white/40 flex flex-col"
+ className="absolute top-[60px] left-3 bottom-3 w-[85vw] max-w-[360px] bg-white/95 backdrop-blur-xl rounded-[24px] shadow-2xl overflow-y-auto overscroll-contain z-[9999] border border-white/40 flex flex-col"
```

**What changed:** `rounded-2xl` → `rounded-[24px]`, `max-w-[340px]` → `max-w-[360px]` (Telegram's panel is ~376px in a 458px viewport ≈ 82vw; 360px is a comfortable cap that keeps it from edge-bleeding on smaller phones).

### 2b. Row height + icon size

Each menu row (Saved Messages, Archived Chats, My Stories, Contacts, Wallet, Settings, More) currently uses something like:

```diff
- className="flex items-center gap-4 px-5 min-h-[56px] py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors rounded-xl cursor-pointer"
+ className="flex items-center gap-[18px] px-5 min-h-[60px] py-[18px] hover:bg-slate-50 active:bg-slate-100 transition-colors rounded-xl cursor-pointer"
```

And the icon inside each row:

```diff
- <Icon className="w-7 h-7 text-slate-500" />
+ <Icon className="w-[26px] h-[26px] text-slate-700" />
```

Apply to all 8 rows. The label classes stay bold — `text-[16px] font-semibold text-slate-900` — which already matches Telegram.

### 2c. Archived count badge — muted gray

```diff
  {archivedCount > 0 && (
-   <span className="ml-auto bg-sky-400 text-white text-xs font-semibold rounded-full px-2 py-0.5 min-w-[20px] text-center">
+   <span className="ml-auto bg-slate-300/80 text-slate-600 text-xs font-semibold rounded-full px-2.5 py-0.5 min-w-[22px] text-center">
      {archivedCount}
    </span>
  )}
```

### 2d. "More" row — explicit right chevron

If the More row doesn't already have a trailing `ChevronRight`:

```diff
  {/* Settings row */}
  ...existing Settings row...
  
  {/* More row */}
  <button onClick={...} className="flex items-center gap-[18px] px-5 min-h-[60px] py-[18px] hover:bg-slate-50 active:bg-slate-100 transition-colors rounded-xl cursor-pointer w-full text-left">
-   <MoreVertical className="w-[26px] h-[26px] text-slate-700" />
-   <span className="text-[16px] font-semibold text-slate-900">More</span>
+   <MoreVertical className="w-[26px] h-[26px] text-slate-700" />
+   <span className="text-[16px] font-semibold text-slate-900 flex-1">More</span>
+   <ChevronRight className="w-5 h-5 text-slate-400" />
  </button>
```

`ChevronRight` is already imported at the top of the file.

### 2e. Divider spacing refinement

If dividers use `my-1`, bump to `my-1.5` for more breathing room between sections:

```diff
- <div className="h-px bg-slate-200/80 mx-5 my-1" />
+ <div className="h-px bg-slate-200/80 mx-5 my-1.5" />
```

### 2f. Profile row — no change needed

The profile row (circular avatar, full_name, `@username` or phone, "Add Account") already matches Telegram's proportions. The `h-14 w-14 rounded-full` avatar and bold name/username text are correct. Leave as-is.

## 3. What the owner must verify

1. **Visual QA at 375px, 458px, and 768px** — open the hamburger menu on each viewport and compare against Telegram Web's mobile menu side-by-side. Confirm: panel fills from header to bottom, rows are comfortably tall, icons are dark and legible, the Archived badge is gray not blue, the More chevron is visible.

2. **`npm run update`** — must pass green (type-check + worker type-check + production build). This is a className-only change so there's zero risk of a type error, but verify per the rulebook.

3. **No new imports** — `ChevronRight` is already imported at L14 of ChatHubPage.tsx. If the More chevron line needs it, confirm it's available in the visible portion of the file.

4. **Reduced-motion** — the menu panel uses no `motion.*` components (it's a CSS checkbox peer toggle), so there's no reduced-motion concern for this change.

5. **Commit scope** — touches 1 file only (`src/pages/ChatHubPage.tsx`), 5–6 className hunks, zero logic. Ready for the owner to commit when verified.
