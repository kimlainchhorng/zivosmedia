# DeepSeek run — 2026-06-15T20:11:04.987Z

- model: deepseek-chat
- task: FlightResults.tsx desktop filter sidebar (desktopFilterPanel). It has WORKING sections: Stops, Price, Departure-time, Baggage (all bound to //, immediate-apply). At the end it renders 3 DEAD buttons with no onClick: ['Airlines','Duration','More filters'] — placeholders implying sections that don't exist on desktop. The filter LOGIC supports airlines (f.airlines) and maxDuration, the data exists (availableAirlines = [{code,name,...}], maxDurationRange = {min,max}), and the MOBILE filter UI (renderFilterContent) already renders an airline checkbox list (bound to f.airlines) and a duration slider (bound to f.maxDuration via maxDurationRange). OPTION A: replace the 3 dead buttons with two REAL desktop sections — Airlines (checkbox list over availableAirlines via desktopToggleArray('airlines',code)) and Duration (slider over maxDurationRange, setFilters maxDuration), and drop 'More filters' since stops/price/departure/baggage/airlines/duration would then all be shown. OPTION B: just remove the 3 dead buttons. Q1: A or B? (A gives desktop the airline/duration filters the logic already supports, matching mobile; B is minimal.) Q2: any risk wiring with the desktop immediate-apply model vs the mobile pending model? Concise verdict + reason.

---

# FlightResults.tsx — Desktop Filter Sidebar Fix

## Q1 Verdict: **Option A** (replace dead buttons with real sections)

**Reason:** The filter logic (`f.airlines`, `maxDurationRange`, `setFilters`) already supports both filters, the data (`availableAirlines`, `maxDurationRange`) is already fetched, and the mobile UI already renders them. Leaving 3 dead buttons is worse UX than showing the working filters. "More filters" becomes unnecessary once all 6 sections are visible.

## Q2 Risk: **None** for immediate-apply model

The desktop `desktopToggleArray` and `setFilters` calls are already immediate-apply (same pattern as Stops/Baggage/Departure-time). The mobile pending model uses a separate `pendingFilters` state — no conflict. The airline checkbox list and duration slider are pure presentational components that call the same `setFilters` as the existing sections.

---

## Proposed Change

**File:** `src/pages/flights/FlightResults.tsx`

### Before (lines ~desktopFilterPanel section with 3 dead buttons):
```tsx
{/* Airlines placeholder */}
<button
  onClick={() => {}}
  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/40 bg-card hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground"
>
  <span className="flex items-center gap-2">
    <Plane className="w-4 h-4" />
    Airlines
  </span>
  <ChevronRight className="w-4 h-4" />
</button>

{/* Duration placeholder */}
<button
  onClick={() => {}}
  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/40 bg-card hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground"
>
  <span className="flex items-center gap-2">
    <Clock className="w-4 h-4" />
    Duration
  </span>
  <ChevronRight className="w-4 h-4" />
</button>

{/* More filters placeholder */}
<button
  onClick={() => {}}
  className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg border border-border/40 bg-card hover:bg-muted/50 transition-colors text-sm font-medium text-muted-foreground"
>
  <span className="flex items-center gap-2">
    <SlidersHorizontal className="w-4 h-4" />
    More filters
  </span>
  <ChevronRight className="w-4 h-4" />
</button>
```

### After (replace with real Airlines + Duration sections):
```tsx
{/* Airlines section */}
<div className="space-y-2">
  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
    <Plane className="w-3.5 h-3.5" />
    Airlines
  </h4>
  <div className="space-y-1 max-h-48 overflow-y-auto">
    {availableAirlines.map((airline) => (
      <label
        key={airline.code}
        className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted/50 cursor-pointer text-sm transition-colors"
      >
        <input
          type="checkbox"
          checked={f.airlines.includes(airline.code)}
          onChange={() => desktopToggleArray('airlines', airline.code)}
          className="rounded border-border text-primary focus:ring-primary/30"
        />
        <span className="font-medium">{airline.name}</span>
        <span className="text-xs text-muted-foreground ml-auto">({airline.code})</span>
      </label>
    ))}
  </div>
</div>

<Separator className="my-3" />

{/* Duration section */}
<div className="space-y-2">
  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
    <Clock className="w-3.5 h-3.5" />
    Max Duration
  </h4>
  <div className="px-1">
    <Slider
      min={maxDurationRange.min}
      max={maxDurationRange.max}
      step={30}
      value={[f.maxDuration ?? maxDurationRange.max]}
      onValueChange={([val]) => setFilters({ maxDuration: val === maxDurationRange.max ? undefined : val })}
      className="w-full"
    />
    <div className="flex justify-between text-xs text-muted-foreground mt-1">
      <span>{Math.floor(maxDurationRange.min / 60)}h {maxDurationRange.min % 60}m</span>
      <span>{f.maxDuration ? `${Math.floor(f.maxDuration / 60)}h ${f.maxDuration % 60}m` : 'Any'}</span>
      <span>{Math.floor(maxDurationRange.max / 60)}h {maxDurationRange.max % 60}m</span>
    </div>
  </div>
</div>
```

**Imports to add** (if not already present at top of file):
```tsx
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
```

---

## Owner Verify

1. **Run `npm run update`** — must pass type-check + build.
2. **Preview at `/flights`** on desktop (≥1024px) — confirm the sidebar now shows 6 sections: Stops, Price, Departure-time, Baggage, Airlines, Duration. No dead buttons.
3. **Test airline checkboxes** — toggling should immediately filter results (same behavior as Stops).
4. **Test duration slider** — dragging should immediately filter by max duration.
5. **Mobile filter drawer** (`renderFilterContent`) — verify airline checkboxes + duration slider still work (no regression from the desktop-only change).
6. **Edge case:** if `availableAirlines` is empty (no results yet), the Airlines section renders an empty scrollable area — consider adding a "No airlines available" fallback if desired (not included in diff for minimalism).
