# MiMo advisor — Review this cookie-consent banner ONLY for real correctness bugs, accessibility gaps (icon-only buttons without accessible names, missing dialog role/labelling, focus management, Escape-to-dismiss), and mobile issues. It is intentionally hidden on native + auth routes and is safe-area aware. Tag P0/P1/P2 with a one-line fix each. If solid, say so.

Files: src/components/common/CookieConsent.tsx

## CookieConsent Review

### P1 — Accessibility (4 findings)

| # | Finding | Fix |
|---|---------|-----|
| 1 | **Icon-only `<X>` buttons in the main banner and rideHub banner lack `aria-label`.** Screen readers announce nothing. (The details-view X already has one.) | Add `aria-label="Reject cookies and close"` to both. |
| 2 | **Banner container has no `role="dialog"` or `aria-label`.** Screen readers don't announce the overlay semantically. | Add `role="dialog" aria-label="Cookie consent"` to the outermost `<Card>`. |
| 3 | **No focus trap or initial focus placement.** When the banner slides in, focus stays on the page body—keyboard/screen-reader users may never reach it. | Use a lightweight focus trap (e.g. `@radix-ui/react-focus-scope` or manual `tabIndex={-1}` + `useEffect` focus) on mount. |
| 4 | **No Escape key handler.** WCAG expects Escape to dismiss modal-like overlays. | Add `onKeyDown` listener on the dialog: `if (e.key === 'Escape') handleRejectAll()`. |

### P2 — Correctness (1 finding)

| # | Finding | Fix |
|---|---------|-----|
| 5 | **`showDetails` never resets when the banner hides.** Navigate to an auth route while details are open, then back—the banner reopens directly in details view, skipping the summary. | Reset `showDetails` to `false` inside the `useEffect` whenever `isVisible` is set to `false`. |

### No issues found

- Safe-area handling via `--zivo-safe-bottom` ✓
- `max-h-[46vh]` + `overflow-y-auto` on mobile prevents the banner from dominating the viewport ✓
- `min-h-[40px]` touch targets, `touch-manipulation` on all interactive elements ✓
- Native Capacitor + auth-route suppression logic is correct ✓
- `animatePresence` exit animation won't unmount mid-interaction ✓
