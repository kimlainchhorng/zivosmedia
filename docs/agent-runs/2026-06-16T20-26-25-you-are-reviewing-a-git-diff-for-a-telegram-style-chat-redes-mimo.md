# MiMo advisor — You are reviewing a git diff for a Telegram-style chat redesign in a React+TS+Tailwind Vite SPA (client-only, no SSR). Two files: src/pages/ChatHubPage.tsx (segmented All/Personal control, full-screen archived-chats view, birthday banner, Saved Messages star, restyled mobile header/search) and src/pages/channels/ChannelPage.tsx (new overflow menu). RULES: (1) State VERDICT in the FIRST sentence per file: 'BUG: <what>' or 'NO BUG FOUND'. (2) Only flag real correctness/state/accessibility/responsive REGRESSIONS a user would hit — NOT style nitpicks, NOT SSR/hydration (this is a client-only SPA), NOT mixed tab/space indentation. (3) Judge control-flow and conditional render logic only; assume Tailwind classes are valid. Focus: does the archived-screen open/close logic, segmented-control folder switching, and birthday-banner localStorage gating behave correctly? <200 words.

Files: /tmp/chathub.diff, /tmp/channelpage.diff

## ChatHubPage.tsx

BUG: `showArchived` is never reset to `false` when the user switches folder tabs via the segmented control. If a user opens the archived screen, taps "All", then taps "Personal" again, `archivedScreenOpen` re-evaluates to `true` because `showArchived` is still `true` — the archived screen re-opens unexpectedly.
**P1 fix:** Add `useEffect(() => { setShowArchived(false); }, [active]);` or reset in the `setFolder` handler.

**P2:** The segmented control grid lacks a `role="radiogroup"` wrapper and children lack `role="radio"` — `aria-pressed` on buttons works but radiogroup semantics are more correct for a single-select segment.

**P2:** `ChatStories` is now gated on `!showBirthdayBanner` — stories are invisible until the user dismisses the banner, which may be unintentional.

**P2:** On mobile, the search input has `pr-[7.25rem]` even when `chatHeaderAvatarStack` is empty and the `/` shortcut is also hidden — wasted right padding with no visual target.

---

## ChannelPage.tsx

NO BUG FOUND. Menu open/close logic, Escape-key dismissal, transparent backdrop overlay, and `aria-expanded`/`aria-haspopup` on the trigger are all wired correctly.

**P2:** Menu lacks arrow-key navigation between `role="menuitem"` elements and does not auto-focus the first item on open — keyboard-only users must tab through.
