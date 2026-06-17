# MiMo run — 2026-06-16T18:57:40.720Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Review and plan a focused Telegram-style All/Personal folder segment update in src/pages/ChatHubPage.tsx. Reference: Telegram Web main chat list under birthday prompt: a full-width white rounded-pill segmented control with subtle shadow, active All segment as pale blue capsule, blue label and blue circular unread badge inline, inactive Personal as gray label on white. Existing code is the birthday/segment overlay around lines 3978-4050 and uses setFolder('all'|'personal') with folderUnreadMap counts. Avoid backend changes; preserve folder behavior and birthday dismiss. Suggest minimal diff and risks.
- files: src/pages/ChatHubPage.tsx

---

## (1) Plan

**Goal:** Replace the current All/Personal folder chip/toggle with a Telegram Web–style full-width white rounded-pill segmented control: white base with subtle shadow, active segment as a pale-blue capsule with blue label + inline blue circular unread badge, inactive segment as gray label on white. Preserve `setFolder('all'|'personal')`, `folderUnreadMap`, `showBirthdayBanner` / `dismissBirthdayBanner`, and all underlying folder logic.

**Scope:** Visual-only — the JSX that renders the segment control and its surrounding birthday banner row. No backend, no data, no state logic. Additive CSS classes only (the component lives inside `.zivo-travel-3d` on the travel host, but the chat hub is the social host, so styling should be self-contained).

**Steps:**
1. Locate the exact JSX block (~L3978-4050) rendering the birthday prompt + All/Personal segment.
2. Replace the segment `<div>`/buttons with a white rounded-pill container (`rounded-full bg-white shadow-sm border border-gray-100`) holding two equal-width `<button>`s, each `rounded-full`, where the active one gets `bg-sky-100 text-sky-600 font-semibold` and the inactive gets `text-gray-500`.
3. The unread count badge next to "All" becomes an inline `bg-sky-500 text-white rounded-full w-5 h-5 text-[11px] font-bold` chip (matching Telegram's blue circle badge).
4. Add `transition-colors duration-150` for a smooth toggle.
5. Preserve the surrounding birthday banner row and its dismiss logic untouched.
6. Verify with `npm run update`.

---

## (2) Proposed Diff

⚠️ **I cannot see the actual JSX at lines 3978-4050** (the file is 303k chars and truncated at ~60k). The diff below is based on the **inferred pattern** from the visible state/logic and the AGENT_TASKS entry describing the birthday/segment overlay. The human/Codex applying this must adjust line numbers and adapt to the exact current markup.

**Likely current shape (inferred):**
```tsx
// ~L3978-4050 area
{showBirthdayBanner && (
  <div className="...">
    {/* birthday prompt */}
    <button onClick={dismissBirthdayBanner}>Dismiss</button>
  </div>
)}

<div className="flex gap-1 px-3 py-2">
  {["all", "personal"].map((f) => (
    <button
      key={f}
      onClick={() => setFolder(f)}
      className={cn(
        "px-3 py-1.5 rounded-lg text-sm",
        folder === f ? "bg-primary text-primary-foreground" : "text-muted-foreground"
      )}
    >
      {f === "all" ? "All" : "Personal"}
      {folderUnreadMap[f] ? (
        <span className="ml-1.5 text-xs">{folderUnreadMap[f]}</span>
      ) : null}
    </button>
  ))}
</div>
```

**Proposed replacement:**
```tsx
{showBirthdayBanner && (
  <div className="...">
    {/* birthday prompt — UNCHANGED */}
    <button onClick={dismissBirthdayBanner}>Dismiss</button>
  </div>
)}

{/* Telegram-style segmented control */}
<div className="px-3 py-2">
  <div className="flex w-full rounded-full bg-white shadow-sm border border-gray-100 p-[3px]">
    {(["all", "personal"] as const).map((f) => {
      const isActive = folder === f;
      const unread = folderUnreadMap[f] ?? 0;
      return (
        <button
          key={f}
          onClick={() => setFolder(f)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 rounded-full py-[7px] text-[13px] font-medium transition-colors duration-150",
            isActive
              ? "bg-sky-100 text-sky-600 font-semibold"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {f === "all" ? "All" : "Personal"}
          {unread > 0 && (
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-full w-5 h-5 text-[11px] font-bold leading-none",
                isActive
                  ? "bg-sky-500 text-white"
                  : "bg-gray-200 text-gray-600"
              )}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>
      );
    })}
  </div>
</div>
```

**Key design tokens (matches Telegram Web):**
| Element | Class |
|---------|-------|
| Pill container | `rounded-full bg-white shadow-sm border border-gray-100 p-[3px]` |
| Active segment | `bg-sky-100 text-sky-600 font-semibold` |
| Inactive segment | `text-gray-500 hover:text-gray-700` |
| Active badge | `bg-sky-500 text-white rounded-full w-5 h-5` |
| Inactive badge | `bg-gray-200 text-gray-600 rounded-full w-5 h-5` |
| Transition | `transition-colors duration-150` |

**What's NOT changed:**
- `setFolder('all'|'personal')` call — identical
- `folderUnreadMap` reads — identical
- `showBirthdayBanner` / `dismissBirthdayBanner` — untouched
- `builtInFolders`, `folder` state, `active` category derivation — untouched
- No new imports, no new state, no backend

---

## (3) Verify / Deploy

1. **`npm run update`** — must pass (type-check + worker type-check + production build, zero TS errors). This is a JSX-only change with no new imports or types, so it should be clean.
2. **Visual smoke at 458px / 768px / 1280px** — confirm:
   - White pill with subtle shadow renders full-width
   - Tapping "All" / "Personal" switches `folder` state (chat list changes)
   - Unread badge shows as blue circle on active, gray on inactive
   - Birthday banner still appears above and dismisses correctly (persists via localStorage `zivo:chat-birthday-banner-dismissed`)
3. **`setFolder` behavior** — switching segments must persist to `localStorage(FOLDER_STORAGE_KEY)` and the chat list must re-filter via `filterChatHubRows`.
4. **Reduced motion** — `transition-colors` respects `prefers-reduced-motion` natively (CSS transition, not framer-motion keyframe), so no additional guard needed.
5. **Applicator caveat** — The exact line numbers and surrounding JSX differ from my inferred structure. The human/Codex applying this must read the real block at ~L3978-4050, preserve the birthday prompt exactly, and replace only the segment control `<div>`/`<button>` elements. Adjust class names if the project uses a different spacing/shadow convention elsewhere in ChatHubPage.
