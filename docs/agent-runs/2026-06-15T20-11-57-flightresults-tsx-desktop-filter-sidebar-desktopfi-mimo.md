# MiMo run — 2026-06-15T20:11:57.926Z

- model: mimo-v2.5-pro
- api_format: openai
- task: FlightResults.tsx desktop filter sidebar desktopFilterPanel has WORKING sections Stops, Price, Departure-time, Baggage (bound to filters and setFilters and desktopToggleArray, immediate-apply). It ends with 3 DEAD buttons no onClick: Airlines, Duration, More filters. The filter logic already supports airlines and maxDuration, the data exists (availableAirlines list of code/name, maxDurationRange min/max), and the MOBILE filter UI already renders an airline checkbox list and a duration slider. OPTION A: replace the 3 dead buttons with two REAL desktop sections, Airlines (checkbox list over availableAirlines via desktopToggleArray airlines+code) and Duration (slider over maxDurationRange via setFilters maxDuration), and drop More filters since all sections would then be shown. OPTION B: just remove the 3 dead buttons. Q1: A or B and why? Q2: any risk wiring with the desktop immediate-apply model? Concise verdict.

---

## Q1: **Option A** — wire the two real sections.

**Why:** The filter state (`filters.airlines`, `filters.maxDuration`), the data (`availableAirlines`, `maxDurationRange`), and the mobile UI (checkbox list + slider) all already exist. The dead buttons are a visible desktop gap — users click "Airlines" and nothing happens. Option A is pure wiring (no new state, no new data), and it completes the desktop sidebar parity with mobile.

## Q2: Risk with immediate-apply model

**Low.** Both fit the existing pattern:
- **Airlines** → `desktopToggleArray("airlines", code)` — identical to how Stops works (toggle an array value, `setFilters` fires immediately).
- **Duration** → `setFilters({ maxDuration: value })` — a single numeric field, same as Price's `setFilters({ priceRange })`. The slider's `onValueCommit` (not `onChange`) should be used so it doesn't spam re-renders on every drag tick — same as the mobile slider already does.

No new state, no new Supabase queries, no new types.

---

## Plan

1. In `FlightResults.tsx`, locate the `desktopFilterPanel` section (the 3 dead `<button>`s after the Baggage section).
2. Replace them with:
   - **Airlines section**: heading + checkbox list mapped over `availableAirlines`, each using `desktopToggleArray("airlines", airline.code)`, checked via `filters.airlines.includes(airline.code)`.
   - **Duration section**: heading + a range slider (`onValueCommit` → `setFilters({ maxDuration })`) initialized from `maxDurationRange`, displaying the current value.
3. Remove the "More filters" button entirely (all sections are now shown).
4. Verify with `npm run update`.

---

## Proposed Diff

**File:** `src/pages/FlightResults.tsx`

Find the 3 dead buttons at the end of `desktopFilterPanel` (they look approximately like this — exact line numbers vary, but the pattern is):

```tsx
// BEFORE — the 3 dead buttons (after the Baggage section, before the closing </div> of desktopFilterPanel)
<button className="..." onClick={undefined}>Airlines</button>
<button className="..." onClick={undefined}>Duration</button>
<button className="..." onClick={undefined}>More filters</button>
```

Replace with:

```tsx
{/* AFTER — Airlines section */}
<div className="border-b border-border/40 pb-4">
  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Airlines</h4>
  <div className="space-y-2 max-h-48 overflow-y-auto">
    {availableAirlines.map((airline) => (
      <label
        key={airline.code}
        className="flex items-center gap-2 cursor-pointer text-sm"
      >
        <input
          type="checkbox"
          checked={filters.airlines.includes(airline.code)}
          onChange={() => desktopToggleArray("airlines", airline.code)}
          className="rounded border-border"
        />
        <span>{airline.name}</span>
      </label>
    ))}
  </div>
</div>

{/* Duration section */}
<div className="pb-4">
  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
    Max Duration: {filters.maxDuration ?? maxDurationRange.max}h
  </h4>
  <input
    type="range"
    min={maxDurationRange.min}
    max={maxDurationRange.max}
    step={1}
    value={filters.maxDuration ?? maxDurationRange.max}
    onValueCommit={(e) =>
      setFilters({ maxDuration: Number((e.target as HTMLInputElement).value) })
    }
    className="w-full accent-primary"
  />
  <div className="flex justify-between text-xs text-muted-foreground mt-1">
    <span>{maxDurationRange.min}h</span>
    <span>{maxDurationRange.max}h</span>
  </div>
</div>
```

> **Note on the slider event:** If the project uses a shadcn `<Slider>` component (which wraps Radix), the API is `onValueCommit={(val) => setFilters({ maxDuration: val[0] })}` with `value={[filters.maxDuration ?? maxDurationRange.max]}`. If it's a raw `<input type="range">`, use `onChange` + `onMouseUp`/`onPointerUp` for commit behavior. Check which pattern the mobile duration slider uses and match it exactly.

> **Note on `desktopToggleArray`:** Verify its signature. If it's `desktopToggleArray(field: string, value: string)`, the call is `desktopToggleArray("airlines", airline.code)`. If it takes the array field name differently, match the existing Stops usage.

---

## Owner verification checklist

1. **`npm run update`** — must pass (0 type errors + build).
2. **Visual check at 1280px+** — the Airlines list should scroll if > ~6 airlines; the Duration slider should show min/max labels and the current value in the heading.
3. **Functional check** — select/deselect airlines → flight list filters immediately; drag duration slider → list filters on release.
4. **Mobile unaffected** — the mobile filter sheet has its own UI; this change is inside `desktopFilterPanel` only (typically gated by `hidden lg:block` or similar).
