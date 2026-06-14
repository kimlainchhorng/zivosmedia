# MiMo run — 2026-06-14T07:31:15.122Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y only, zero visual change. File has NO framer-motion (shadcn Skeleton out of scope) and NO useTranslation so plain Back. Edits: (1) icon-only ghost back Button gets aria-label Back, ArrowLeft aria-hidden true. (2) aria-hidden true on decorative icons beside visible text: header Sparkles, section-header MapPin next to Active bonus zones text, CheckCircle inside the Inside-zone Badge, Navigation icon inside the Navigate Button, empty-state MapPin. (3) the Navigate Button has visible text so NO aria-label just aria-hidden its icon. (4) HEADING HIERARCHY: single h1 Earn More then jumps to h3 - ZoneCard title zone.name is h3 and empty-state No bonus zones active is h3 with NO h2 between - skipped level. Recommend promoting both h3 to h2 (className unchanged, zero visual change) for contiguous h1 then h2 outline. Confirm or correct. List exact edits only, no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/EarnMore.tsx

---

## Plan

Pure additive a11y — no logic, no visual change, no motion. 9 edits total in one file:

1. **Back button** — `aria-label="Back"` on the Button, `aria-hidden="true"` on its ArrowLeft icon child.
2. **5 decorative icons** — `aria-hidden="true"` on: header Sparkles, section-header MapPin, CheckCircle inside the Badge, Navigation inside the Navigate Button, empty-state MapPin.
3. **Heading hierarchy** — promote the two `h3` elements to `h2` (ZoneCard `zone.name` + empty-state heading) for contiguous `h1 → h2` outline. className unchanged, zero visual impact.

---

## Proposed diff

**File:** `../zivodriver/src/pages/driver/EarnMore.tsx`

### (1) Back button — aria-label + icon aria-hidden

```diff
          <Button
            variant="ghost"
            size="icon"
            onClick={goBack}
-           className="shrink-0"
+           className="shrink-0"
+           aria-label="Back"
          >
-           <ArrowLeft className="h-5 w-5" />
+           <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </Button>
```

### (2) Header Sparkles — decorative beside "Earn More" text

```diff
-          <Sparkles className="h-5 w-5 text-primary" />
+          <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
```

### (3) Section-header MapPin — decorative beside "Active bonus zones near you"

```diff
-          <MapPin className="h-4 w-4" />
+          <MapPin className="h-4 w-4" aria-hidden="true" />
```

### (4) ZoneCard — h3 → h2 (heading hierarchy)

```diff
-            <h3 className="font-semibold text-foreground truncate">{zone.name}</h3>
+            <h2 className="font-semibold text-foreground truncate">{zone.name}</h2>
```

### (5) ZoneCard — CheckCircle inside Badge (decorative beside "Inside zone" text)

```diff
-                <CheckCircle className="h-3 w-3 mr-1" />
+                <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
```

### (6) ZoneCard — Navigation icon inside Navigate Button (has visible text "Navigate")

```diff
                <Navigation className="h-3.5 w-3.5" />
```
→
```diff
                <Navigation className="h-3.5 w-3.5" aria-hidden="true" />
```

### (7) EmptyState — MapPin (decorative inside a decorative circle div)

```diff
-        <MapPin className="h-8 w-8 text-muted-foreground" />
+        <MapPin className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
```

### (8) EmptyState — h3 → h2 (heading hierarchy)

```diff
-      <h3 className="font-semibold text-foreground mb-1">No bonus zones active</h3>
+      <h2 className="font-semibold text-foreground mb-1">No bonus zones active</h2>
```

---

## Summary of changes

| # | Element | Change | Rationale |
|---|---------|--------|-----------|
| 1 | Back `<Button>` | `aria-label="Back"` | Icon-only button, no visible text |
| 2 | Back `<ArrowLeft>` | `aria-hidden="true"` | Decorative; label conveys meaning |
| 3 | Header `<Sparkles>` | `aria-hidden="true"` | Decorative beside "Earn More" h1 |
| 4 | Section `<MapPin>` | `aria-hidden="true"` | Decorative beside visible span text |
| 5 | `<CheckCircle>` in Badge | `aria-hidden="true"` | Decorative beside "Inside zone" text |
| 6 | `<Navigation>` in Button | `aria-hidden="true"` | Decorative beside "Navigate" visible text |
| 7 | Empty-state `<MapPin>` | `aria-hidden="true"` | Decorative in a decorative container |
| 8 | ZoneCard `<h3>` | → `<h2>` | Fixes skipped heading level (h1 → h3) |
| 9 | Empty-state `<h3>` | → `<h2>` | Same — contiguous h1 → h2 outline |

## Owner verification

- `npm run update` must pass (type-check + worker type-check + production build) — the `h3` → `h2` swap is purely a tag change, no className or logic affected.
- Visual spot-check: headings may inherit slightly different browser default sizes, but since the className includes explicit `font-semibold text-foreground` (ZoneCard) and `font-semibold text-foreground mb-1` (empty-state), the rendered size is fully controlled — zero visual change expected. Confirm in browser if paranoid.
