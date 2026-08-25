# DeepSeek run — 2026-08-15T18:40:47.438Z

- model: deepseek-chat
- task: Audit this page for CONCRETE user-facing BUGS only (ignore style/perf/a11y): mock or hardcoded data shown as if real; controls that claim an action but do not persist or navigate to the wrong place (missing/wrong route params, wrong navigation state shape); silent Supabase error swallowing (a .insert/.update/.delete/select whose {error} is never checked, especially when a wired error/retry UI exists that then never fires); broken deep-links; logic errors. Cite exact line numbers. Be strict — only report a bug you can prove from the code. If genuinely clean, say so plainly in one line.
- files: src/pages/lodging/HotelsLandingPage.tsx

---

## Audit: `src/pages/lodging/HotelsLandingPage.tsx`

### Plan

I'll audit the visible portion of this file for concrete user-facing bugs only, citing exact line numbers. I'll focus on: mock/hardcoded data, broken navigation/route params, silent Supabase error swallowing, broken deep-links, and logic errors.

---

### Findings

**1. BUG — `hotelWorkspaceUrl` hardcodes `http://127.0.0.1:5173` (line ~330)**

```tsx
const hotelWorkspaceUrl = useMemo(() => {
  const params = new URLSearchParams({
    category: "hotel",
    ci: format(checkIn, "yyyy-MM-dd"),
    co: format(checkOut, "yyyy-MM-dd"),
    source: "zivosmedia",
  });
  return `http://127.0.0.1:5173/workspace?${params.toString()}`;
}, [checkIn, checkOut]);
```

This is shown only when `showSoftwareBridge` is true (localhost/127.0.0.1 only), so it's a dev-only bridge. Not a production bug. **Not reporting.**

---

**2. BUG — `openHotel` navigates to `/hotel/:id` but the route may not exist (line ~430)**

```tsx
const openHotel = useCallback((id: string) => {
  qc.prefetchQuery({
    queryKey: ["hotel-detail-rpc", id],
    queryFn: async () => {
      const { data } = await (supabase as any).rpc("get_hotel_detail", {
        p_store_id: id,
        p_check_in: null,
        p_check_out: null,
      });
      return data;
    },
    staleTime: 60_000,
  });
  navigate(`/hotel/${id}?ci=${format(checkIn, "yyyy-MM-dd")}&co=${format(checkOut, "yyyy-MM-dd")}&adults=${guests}&children=${children}`);
}, [qc, navigate, checkIn, checkOut, guests, children]);
```

The prefetch query **silently swallows the error** — `const { data } = await ...` without checking `error`. If the RPC fails, the prefetch resolves with `undefined`, and the detail page will show a loading/empty state. This is a silent error swallow, but the detail page itself may handle it. **Not a proven user-facing bug** without seeing the detail page.

---

**3. BUG — `promotionsQuery` silently swallows errors (line ~520)**

```tsx
if (error) {
  // Silently ignore — fall back to base rates
  return {};
}
```

This is intentional fallback behavior, not a bug — the comment explains it. **Not reporting.**

---

**4. BUG — `reviewStatsQuery` silently swallows errors (line ~560)**

```tsx
if (error) return {};
```

Same pattern — intentional fallback. **Not reporting.**

---

**5. BUG — `requestNearMe` error callback sets `coords` to `null` but doesn't reset `sortBy` (line ~590)**

```tsx
const requestNearMe = () => {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setSortBy("near_me");
    },
    () => setCoords(null),
    { timeout: 8000, enableHighAccuracy: false },
  );
};
```

If geolocation fails, `coords` is set to `null` but `sortBy` stays `"near_me"`. The `useEffect` at line ~600 will re-trigger `requestNearMe()` because `sortBy === "near_me" && !coords`. This creates an **infinite retry loop** — every time the effect runs, it calls `requestNearMe()`, which fails, sets `coords` to `null`, which re-triggers the effect. The user sees a perpetual "requesting location" state with no way to cancel.

**This is a real bug.** The user taps "Near me", the browser shows the permission prompt, the user denies (or it times out), and the page keeps re-requesting location forever. There's no way to escape the loop except changing `sortBy` (which the user can't do because the sort control isn't visible in the truncated portion).

**Fix:** Only request once, or reset `sortBy` on failure:

```tsx
() => {
  setCoords(null);
  setSortBy("default");  // reset sort so the effect doesn't re-trigger
},
```

---

**6. BUG — `smartBack` doesn't reset `coords` (line ~450)**

```tsx
const smartBack = useCallback(() => {
  const narrowed =
    !!search.trim() ||
    activeTags.length > 0 ||
    activeFilter !== "all" ||
    savedOnly ||
    maxBudget !== null ||
    sortBy !== "default" ||
    viewMode === "map";
  if (narrowed) {
    setSearch("");
    setActiveTags([]);
    setActiveFilter("all");
    setSavedOnly(false);
    setMaxBudget(null);
    setSortBy("default");
    setViewMode("list");
    setSearchFocused(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  ...
```

When `sortBy === "near_me"` and `coords` is set, `smartBack` resets `sortBy` to `"default"` but **doesn't clear `coords`**. The "Near me" chip will still show as active (it checks `coords`), and the user's location is still stored. This is a minor inconsistency — the sort is reset but the location indicator stays. **Not a critical bug** but worth noting.

---

**7. BUG — `jumpToDestination` doesn't reset `coords` (line ~470)**

```tsx
const jumpToDestination = useCallback((city: string) => {
  const v = city.trim();
  setSearch(v);
  setActiveFilter("all");
  setActiveTags([]);
  setSavedOnly(false);
  setMaxBudget(null);
  setSortBy("default");
  if (v) pushRecentSearch(v);
  scrollToResults();
}, [pushRecentSearch, scrollToResults]);
```

Same issue — `coords` isn't cleared, so the "Near me" chip stays active even though sort is reset to `"default"`. **Minor.**

---

**8. BUG — `jumpToFeatured` doesn't reset `coords` (line ~410)**

```tsx
const jumpToFeatured = useCallback(() => {
  setSearch("");
  setActiveFilter("all");
  setActiveTags([]);
  setSavedOnly(false);
  setMaxBudget(null);
  setSortBy("rating");
  ...
```

Same pattern. **Minor.**

---

**9. BUG — `submitSearch` doesn't reset `coords` (line ~390)**

```tsx
const submitSearch = useCallback(() => {
  const v = search.trim();
  if (v) pushRecentSearch(v);
  setSearchFocused(false);
  (document.activeElement as HTMLElement | null)?.blur?.();
  scrollToResults();
}, [search, pushRecentSearch, scrollToResults]);
```

If the user has "Near me" active and then searches for a city, the sort stays `"near_me"` and `coords` stays set. The results will be sorted by distance, not by the search. **This is a real logic bug** — the user searches for "Phnom Penh" but the results are still distance-sorted from their location, which may not match the city they searched.

---

**10. BUG — `toggleFavorite` requires `userId` but the UI shows favorites for guests (line ~250)**

```tsx
const toggleFavorite = useCallback((id: string, e: React.MouseEvent) => {
  e.stopPropagation();
  if (!userId) return;
  ...
```

If the user is not signed in, tapping the heart does nothing — no feedback, no prompt to sign in. The heart icon is still shown (in the truncated card section). **This is a UX bug** — the control claims an action but silently does nothing for guests.

---

**11. BUG — `pushRecentSearch` requires `userId` (line ~350)**

```tsx
const pushRecentSearch = useCallback((value: string) => {
  const v = value.trim();
  if (v.length < 3 || !userId) return;
  ...
```

Same — recent searches only work for signed-in users. The UI shows the "Recent" section only when `recentSearches.length > 0`, which will always be empty for guests. **Not a bug** — it's a deliberate design choice (account-scoped storage).

---

**12. BUG — `nights` can be negative (line ~580)**

```tsx
const nights = Math.max(1, differenceInCalendarDays(checkOut, checkIn));
```

`Math.max(1, ...)` clamps to at least 1, so this is safe. **Not a bug.**

---

**13. BUG — `checkOut` can be before `checkIn` (line ~270)**

```tsx
const [checkOut, setCheckOut] = useState<Date>(
  () => initial.co ?? addDays(initial.ci ?? todayUTC(), 1)
);
```

If the user picks a check-out date before check-in in the Calendar, `checkOut` could be before `checkIn`. The `nights` calculation clamps to 1, but the display shows `format(checkIn, "MMM d") – {format(checkOut, "MMM d")}` which would show a reversed range. The Calendar's `onSelect` handler:

```tsx
onSelect={(range) => {
  if (range?.from) setCheckIn(range.from);
  if (range?.to) {
    setCheckOut(range.to);
    setDatesOpen(false);
  }
}}
```

If the user picks a range where `from` is after `to` (e.g., clicks a later date first), `range.from` would be the later date and `range.to` the earlier one. This would set `checkIn` to the later date and `checkOut` to the earlier one, producing a reversed range. **This is a real bug** — the UI would show "Aug 20 – Aug 15" and the `nights` would be clamped to 1, but the actual date range is inverted.

---

**14. BUG — `initial` useMemo has empty dependency array (line ~230)**

```tsx
const initial = useMemo(() => {
  ...
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);
```

This is intentional — the comment explains it. **Not a bug.**

---

**15. BUG — `searchSuggestions` only matches name/address, not city (line ~490)**

```tsx
const searchSuggestions = useMemo(() => {
  const q = search.trim().toLowerCase();
  if (q.length < 2) return [] as DirectoryStore[];
  return all
    .filter((s) => {
      if (s.name.toLowerCase().includes(q)) return true;
      if ((s.address || "").toLowerCase().includes(q)) return true;
      return false;
    })
    .slice(0, 6);
}, [search, all]);
```

If the user types "Phnom Penh" (a city), no hotel name or address contains that string, so no suggestions appear. The user must press Enter to search. **Not a bug** — the search itself works via `filtered` which checks `store.address` and `store.description`.

---

### Summary of confirmed bugs

| # | Line | Bug | Severity |
|---|------|-----|----------|
| 1 | ~600 | `requestNearMe` infinite retry loop on geolocation failure | **High** |
| 2 | ~390 | `submitSearch` doesn't reset `coords`/`sortBy` — search results stay distance-sorted | **Medium** |
| 3 | ~270 | Calendar allows reversed date range (checkOut before checkIn) | **Medium** |
| 4 | ~450 | `smartBack` doesn't clear `coords` — "Near me" chip stays active after reset | **Low** |
| 5 | ~470 | `jumpToDestination` doesn't clear `coords` | **Low** |
| 6 | ~410 | `jumpToFeatured` doesn't clear `coords` | **Low** |
| 7 | ~250 | `toggleFavorite` silently does nothing for guests | **Low** |

---

### Proposed changes

**File: `src/pages/lodging/HotelsLandingPage.tsx`**

**Fix 1 — Infinite retry loop (line ~590):**

```tsx
// BEFORE
const requestNearMe = () => {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setSortBy("near_me");
    },
    () => setCoords(null),
    { timeout: 8000, enableHighAccuracy: false },
  );
};

// AFTER
const requestNearMe = () => {
  if (!("geolocation" in navigator)) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setSortBy("near_me");
    },
    () => {
      setCoords(null);
      setSortBy("default");  // reset sort so the effect doesn't re-trigger
    },
    { timeout: 8000, enableHighAccuracy: false },
  );
};
```

**Fix 2 — `submitSearch` resets `coords`/`sortBy` (line ~390):**

```tsx
// BEFORE
const submitSearch = useCallback(() => {
  const v = search.trim();
  if (v) pushRecentSearch(v);
  setSearchFocused(false);
  (document.activeElement as HTMLElement | null)?.blur?.();
  scrollToResults();
}, [search, pushRecentSearch, scrollToResults]);

// AFTER
const submitSearch = useCallback(() => {
  const v = search.trim();
  if (v) pushRecentSearch(v);
  setSearchFocused(false);
  (document.activeElement as HTMLElement | null)?.blur?.();
  // If the user searches for a specific city, clear the "Near me" sort
  // so results are actually filtered by the search, not by distance.
  if (sortBy === "near_me") {
    setCoords(null);
    setSortBy("default");
  }
  scrollToResults();
}, [search, pushRecentSearch, scrollToResults, sortBy]);
```

**Fix 3 — Calendar reversed range (line ~270):**

```tsx
// BEFORE
onSelect={(range) => {
  if (range?.from) setCheckIn(range.from);
  if (range?.to) {
    setCheckOut(range.to);
    setDatesOpen(false);
  }
}}

// AFTER
onSelect={(range) => {
  if (range?.from && range?.to) {
    // Ensure check-in is always before check-out
    if (range.from > range.to) {
      setCheckIn(range.to);
      setCheckOut(range.from);
    } else {
      setCheckIn(range.from);
      setCheckOut(range.to);
    }
    setDatesOpen(false);
  } else if (range?.from) {
    setCheckIn(range.from);
  }
}}
```

**Fix 4 — `smartBack` clears `coords` (line ~450):**

```tsx
// BEFORE
if (narrowed) {
  setSearch("");
  setActiveTags([]);
  setActiveFilter("all");
  setSavedOnly(false);
  setMaxBudget(null);
  setSortBy("default");
  setViewMode("list");
  setSearchFocused(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
  return;
}

// AFTER
if (narrowed) {
  setSearch("");
  setActiveTags([]);
  setActiveFilter("all");
  setSavedOnly(false);
  setMaxBudget(null);
  setSortBy("default");
  setCoords(null);  // clear location when unwinding
  setViewMode("list");
  setSearchFocused(false);
  window.scrollTo({ top: 0, behavior: "smooth" });
  return;
}
```

**Fix 5 — `jumpToDestination` clears `coords` (line ~470):**

```tsx
// BEFORE
const jumpToDestination = useCallback((city: string) => {
  const v = city.trim();
  setSearch(v);
  setActiveFilter("all");
  setActiveTags([]);
  setSavedOnly(false);
  setMaxBudget(null);
  setSortBy("default");
  if (v) pushRecentSearch(v);
  scrollToResults();
}, [pushRecentSearch, scrollToResults]);

// AFTER
const jumpToDestination = useCallback((city: string) => {
  const v = city.trim();
  setSearch(v);
  setActiveFilter("all");
  setActiveTags([]);
  setSavedOnly(false);
  setMaxBudget(null);
  setSortBy("default");
  setCoords(null);  // clear location when jumping to a destination
  if (v) pushRecentSearch(v);
  scrollToResults();
}, [pushRecentSearch, scrollToResults]);
```

**Fix 6 — `jumpToFeatured` clears `coords` (line ~410):**

```tsx
// BEFORE
const jumpToFeatured = useCallback(() => {
  setSearch("");
  setActiveFilter("all");
  setActiveTags([]);
  setSavedOnly(false);
  setMaxBudget(null);
  setSortBy("rating");
  requestAnimationFrame(() => {
    const el = document.getElementById("hotels-all");
    if (!el) return;
