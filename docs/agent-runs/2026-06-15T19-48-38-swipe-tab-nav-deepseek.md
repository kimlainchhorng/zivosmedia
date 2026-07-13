DeepSeek (deepseek-chat) — cross-tab swipe nav advisor pass.
Summary of recommendations:
- Architecture: lightweight document-level touch hook (agreed). No framer-motion.
- Exclusion via element.closest() walk: [data-swipe-grab], [data-no-tab-swipe], input, textarea, [role=slider], [role=tab/tablist], reel viewport, stories tray, nav, swipe-back container.
- Edge-only (40px) to avoid all conflicts (NOTE: MiMo disagreed, argued full-width + raised /feed threshold; we went full-width).
- Thresholds: MIN_DX 60, dx/dy ratio 2, max duration 300ms.
- Animation: instant navigate is fine (MiMo suggested View Transitions slide; we adopted VT as progressive enhancement).
- Include all 6 tabs (we limited to Home/Feed/Reels content tabs since chat/account are gated to /login and reels owns its own horizontal gestures).
Full hook draft provided; superseded by our reconciled implementation in src/hooks/useTabSwipeNavigation.ts.
