# MiMo advisor — Review this 2026 floating-pill mobile bottom nav. It renders via createPortal, swaps social vs travel tab sets by host, shows unread badges, and an avatar on the account tab. Find real bugs: active-tab detection misses, badge/count races, a11y gaps, portal/SSR issues, double-mount risk.

Files: src/components/app/ZivoMobileNav.tsx

[no text] {"id":"6487f837279147b39546cf1719bba48d","type":"message","role":"assistant","model":"mimo-v2.5-pro","stop_reason":"max_tokens","content":[{"type":"thinking","thinking":"Let me carefully review this component for real bugs, accessibility gaps, responsive/mobile issues, and disconnected/unwired logic.\n\nLet me go through systematically:\n\n1. **Active-tab detection misses**\n2. **Badge/count races**\n3. **Accessibility gaps**\n4. **Portal/SSR issues**\n5. **Double-mount risk**\n6. **Other correctness issues**\n\nLet me analyze each:\n\n### Active-tab detection\n\nThe `getActiveTab` function:\n
