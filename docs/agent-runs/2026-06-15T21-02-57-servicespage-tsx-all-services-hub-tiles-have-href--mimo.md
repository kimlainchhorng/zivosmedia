# MiMo run — 2026-06-15T21:02:57.969Z

- model: mimo-v2.5-pro
- api_format: openai
- task: ServicesPage.tsx (all-services hub) tiles have href+badge; comingSoon tiles open a waitlist modal instead of navigating. Two bugs: (1) Wellness tile href is '/explore' but a real WellnessPage exists at route '/wellness' so Wellness misroutes - fix to '/wellness'. (2) Cruise tile href is '/flights' badge 'New' but there is NO cruise product or /cruise route, so clicking Cruise dumps into flight search (misleading); the page already marks unbuilt services (Insurance, Visa Help) comingSoon:true with a coming_soon badge + waitlist - fix Cruise to comingSoon:true + coming_soon badge. Q1: agree both fixes? Q2: Cruise comingSoon+waitlist honest vs remove tile vs keep flights link? Q3: single highest-value low-risk UX/UI improvement for a clean all-services tile hub (grid, search, badges, favorites)? Concise verdict.

---

## Verdict

**Q1 — Agree both fixes.** Both are clear bugs: Wellness misroutes to `/explore` instead of `/wellness`, and Cruise silently dumps into flight search with no cruise product behind it.

**Q2 — `comingSoon:true` + `coming_soon` badge + waitlist modal is the right call.** It's honest (no misleading navigation), consistent with how Insurance and Visa Help are already handled, and preserves user intent (they can express interest via the waitlist). Removing the tile loses discoverability; keeping the flights link is deceptive.

**Q3 — Highest-value low-risk improvement: add `aria-label` to the service-grid `motion.button`s.** Each tile currently has no accessible name (icon + text children, but no `aria-label` on the button itself). Adding `aria-label={svc.name}` to each grid tile button is a pure a11y win, zero layout risk, and follows the pattern already established on 100+ slices. This is the one change that makes the hub meaningfully better for screen-reader users with no visual regression risk.

---

## Plan

1. Fix Wellness tile `href`: `'/explore'` → `'/wellness'`
2. Fix Cruise tile: add `comingSoon: true`, change badge from `'New'` to `'coming_soon'`
3. Add `aria-label={svc.name}` to the service-grid `motion.button` (the category grid tiles)
4. Verify with `npm run update`

---

## Proposed Diff

**File:** `src/pages/app/ServicesPage.tsx`

### Change 1 — Wellness tile href (find the `SERVICES` array entry with `name: 'Wellness'` or similar)

```diff
- href: '/explore',
+ href: '/wellness',
```

### Change 2 — Cruise tile (find the `SERVICES` array entry with `name: 'Cruise'` or similar)

```diff
  {
    name: 'Cruise',
    icon: Ship,
-   href: '/flights',
-   badge: 'New',
+   href: '#',
+   badge: 'coming_soon',
+   comingSoon: true,
    ...
  },
```

> **Note:** I need to see the exact `SERVICES` array to give you the precise line numbers and surrounding context. The diff above is the logical change — the exact shape depends on whether `comingSoon` is already a field on the type (it is, since Insurance/Visa Help use it).

### Change 3 — aria-label on service-grid tiles

Find the `motion.button` inside the category grid (around L432 per the slice notes). It currently looks something like:

```tsx
<motion.button
  key={svc.name}
  onClick={() => handleServiceClick(svc)}
  ...
>
```

```diff
  <motion.button
    key={svc.name}
+   aria-label={svc.name}
    onClick={() => handleServiceClick(svc)}
    ...
  >
```

---

## Owner Verification

1. **Confirm the exact field names** in the `SERVICES` array — I'm working from the slice notes, not the live file. The advisor (me) can't read the file directly. The applying agent should grep for `'Wellness'` and `'Cruise'` in `ServicesPage.tsx` to find the exact entries.
2. **Confirm `comingSoon` is already on the type** — Insurance and Visa Help use it, so it should be, but verify.
3. **Confirm `/wellness` route exists** in the router — the task says `WellnessPage` exists at `/wellness`, but the applying agent should verify the route is wired.
4. **Run `npm run update`** — must pass (types + worker types + production build) before marking done.
5. **Preview at 375/768/1280** — the Cruise tile should now show a "Coming Soon" badge and open the waitlist modal on click instead of navigating.
