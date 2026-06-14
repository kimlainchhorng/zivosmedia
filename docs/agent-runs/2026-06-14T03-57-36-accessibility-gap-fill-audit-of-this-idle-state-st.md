# DeepSeek run — 2026-06-14T03:57:36.626Z

- model: deepseek-chat
- task: Accessibility gap-fill audit of this idle-state status banner (driver ride-hail app). IMPORTANT context: this banner ONLY renders when the driver is online AND has no pending request and no active trip (it early-returns null otherwise) - so the driver is IDLE and waiting, NOT actively navigating. It shows one of four mutually-exclusive states via separate conditional returns: a dispatch-incident/maintenance notice, a no-jobs-nearby notice, a dispatch-paused/waiting-for-requests notice, and a demand-level line. Focus ONLY on additive non-visual a11y. No visual redesign, no copy, no routing, no layout. Questions: 1) Confirm aria-hidden true on the three decorative lucide icons: Wrench line 51, MapPinOff line 78, Radio line 94 (each sits next to text that already states the meaning). 2) LIVE REGION JUDGMENT: should this idle banner get role status with aria-live polite so a screen-reader user hears the status change (e.g. waiting to dispatch-paused, or a new incident)? Argue both ways. Because the four states are SEPARATE conditional returns (different DOM nodes mount and unmount), would an aria-live attribute on those nodes even reliably announce transitions, or would it need a single always-mounted live container wrapping the whole thing? Give a concrete additive recommendation. 3) The incident/maintenance variant lines 40 to 61 - if it gets a live region, should it be role status (polite) or role alert (assertive)? It is a dispatch delay notice, mildly important but not a safety emergency. Recommend. Give exact line plus attribute for every recommendation. Keep additive and minimal.
- files: src/components/map/WaitingBanner.tsx

---

# Accessibility Audit: Idle-State Status Banner (Driver Ride-Hail)

## Short Plan

Three additive a11y fixes, zero visual changes:

1. **`aria-hidden="true"`** on the three decorative Lucide icons (Wrench, MapPinOff, Radio) — each is purely decorative alongside text that already states the meaning.
2. **Single always-mounted live region** wrapping the entire banner content — because the four states are separate conditional returns (different DOM nodes mount/unmount), `aria-live` on each individual node would NOT reliably announce transitions (the browser may not detect a "new" live region appearing as a content change). A single persistent container with `aria-live="polite"` + `role="status"` that wraps the inner content ensures every state swap is announced.
3. **`role="status"` (polite)** for the incident/maintenance variant — it's a dispatch delay notice, not a safety emergency. `role="alert"` would be too aggressive for a non-urgent operational notice.

---

## Proposed Changes

### File: `src/pages/driver/DriverRideHailPage.tsx`

#### Change 1: Decorative icons — add `aria-hidden="true"` (3 lines)

**Line 51** (Wrench icon):
```tsx
// BEFORE:
<Wrench className="h-5 w-5 text-amber-500 shrink-0" />
// AFTER:
<Wrench className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />
```

**Line 78** (MapPinOff icon):
```tsx
// BEFORE:
<MapPinOff className="h-5 w-5 text-muted-foreground shrink-0" />
// AFTER:
<MapPinOff className="h-5 w-5 text-muted-foreground shrink-0" aria-hidden="true" />
```

**Line 94** (Radio icon):
```tsx
// BEFORE:
<Radio className="h-5 w-5 text-emerald-500 shrink-0" />
// AFTER:
<Radio className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />
```

#### Change 2: Single always-mounted live region wrapper

**Wrap the entire banner content** (the outer `<div>` that conditionally renders one of the four states) with a persistent container that has `aria-live="polite"` + `role="status"`. This ensures every state transition is announced regardless of which conditional branch mounts.

**Before** (around line 38–39, the opening of the banner div):
```tsx
{isOnline && !pendingRequest && !activeTrip && (
  <div className="px-4 py-3 space-y-2">
```

**After**:
```tsx
{isOnline && !pendingRequest && !activeTrip && (
  <div className="px-4 py-3 space-y-2" aria-live="polite" role="status">
```

**Why this works:** The `aria-live` + `role="status"` is on the **always-mounted** outer `<div>`. When the inner content swaps between the four conditional returns, the browser detects the DOM content change inside the live region and announces it. This is the reliable pattern — putting `aria-live` on each individual conditional node would fail because the browser sees a node being removed and a new one appearing, not a "change" to an existing live region.

#### Change 3: Incident/maintenance variant — `role="status"` (polite) is correct

No additional attribute needed beyond the wrapper's `role="status"`. The wrapper's `aria-live="polite"` already ensures polite announcement. No `role="alert"` needed — this is a dispatch delay notice, not a safety emergency.

---

## Summary of Additions

| Location | Attribute | Rationale |
|----------|-----------|-----------|
| Line 51 (Wrench icon) | `aria-hidden="true"` | Decorative icon alongside text |
| Line 78 (MapPinOff icon) | `aria-hidden="true"` | Decorative icon alongside text |
| Line 94 (Radio icon) | `aria-hidden="true"` | Decorative icon alongside text |
| Line 38–39 (outer banner `<div>`) | `aria-live="polite"` + `role="status"` | Single always-mounted live region for reliable state transition announcements |

**Total: 4 attribute additions, 0 removals, 0 visual changes, 0 logic changes.**

---

## Owner Verification

- **No visual change** — verify the banner looks identical before/after.
- **Screen reader test** — with VoiceOver/NVDA, toggle between idle states (e.g., dispatch-paused → no-jobs-nearby) and confirm the new state is announced politely.
- **`npm run update`** — must pass (type-check + worker type-check + build).
