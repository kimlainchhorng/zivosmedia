# MiMo run — 2026-06-14T08:46:29.913Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Pure additive a11y pass zero visual change on LostItemReturns. File has NO framer-motion and NO animations so NO reduced-motion work and NO useReducedMotion import. NO useTranslation so plain-English labels. Two components RequestCard and LostItemReturns plus a statusConfig object. Icons aria-hidden decorative. In statusConfig the 5 status icons Clock CheckCircle Package CheckCircle X each rendered beside its label in a Badge. In RequestCard DollarSign beside payout amount MapPin beside distance CheckCircle inside Mark Returned button completed-line CheckCircle beside Earned text. Header back Button variant ghost size icon is icon-only add aria-label Back and ArrowLeft aria-hidden. The Phone call button is Button asChild wrapping an anchor href tel with ONLY a Phone icon so it is icon-only add aria-label Call customer on the anchor and Phone aria-hidden. Return Fee Info card DollarSign decorative tile aria-hidden. Three empty-state icons Package CheckCircle X all h-12 decorative aria-hidden. HEADING single h1 Lost Item Returns the per-card item_description is a plain p not a heading and the Return Fee Info is a p. Advise whether to leave headings as-is no skip or add per-card headings. Skeleton LoadingSkeleton OUT OF SCOPE. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/LostItemReturns.tsx

---

## 1. Plan

Pure additive a11y edits. Zero visual change, zero logic lines touched. Exact inventory:

| # | Location | Edit | Why |
|---|----------|------|-----|
| 1 | `statusConfig` — all 5 icon values | Add `aria-hidden="true"` | Icon is decorative; the `label` text is the visible status |
| 2 | Header back `Button` L124 | Add `aria-label="Back"` to the `<Button>`; add `aria-hidden="true"` to `ArrowLeft` | Icon-only button needs accessible name |
| 3 | Call `<a>` L100 | Add `aria-label="Call customer"` to the `<a>`; add `aria-hidden="true"` to `Phone` | Icon-only link needs accessible name |
| 4 | Mark Returned `CheckCircle` L97 | Add `aria-hidden="true"` | Icon beside visible "Mark Returned" text |
| 5 | Completed `CheckCircle` L106 | Add `aria-hidden="true"` | Icon beside visible "Earned" text |
| 6 | Payout `DollarSign` L73 | Add `aria-hidden="true"` | Icon beside visible dollar amount |
| 7 | Distance `MapPin` L80 | Add `aria-hidden="true"` | Icon beside visible distance text |
| 8 | Return Fee Info tile `DollarSign` L131 | Add `aria-hidden="true"` | Decorative tile icon |
| 9 | 3 empty-state icons (Package L151, CheckCircle L160, X L169) | Add `aria-hidden="true"` | Decorative; paired with visible descriptive text |

**Headings:** Leave as-is. Single `h1` on the page; item descriptions are `<p>` (correct — they're not section headings); Return Fee Info label is `<p>`. Adding per-card headings would be semantically wrong (these are data cards, not document sections). No skip-level risk.

**Skeleton (`LoadingSkeleton`):** Out of scope per brief.

**Total: 15 `aria-hidden` additions + 2 `aria-label` additions = 17 additive attributes. 0 lines removed, 0 logic lines touched.**

---

## 2. Proposed diff

**File:** `../zivodriver/src/pages/driver/LostItemReturns.tsx`

```diff
 const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ReactNode }> = {
-  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" /> },
-  accepted: { label: "Accepted", variant: "default", icon: <CheckCircle className="h-3 w-3" /> },
-  in_progress: { label: "In Progress", variant: "default", icon: <Package className="h-3 w-3" /> },
-  completed: { label: "Completed", variant: "outline", icon: <CheckCircle className="h-3 w-3" /> },
-  cancelled: { label: "Declined", variant: "destructive", icon: <X className="h-3 w-3" /> },
+  pending: { label: "Pending", variant: "secondary", icon: <Clock className="h-3 w-3" aria-hidden="true" /> },
+  accepted: { label: "Accepted", variant: "default", icon: <CheckCircle className="h-3 w-3" aria-hidden="true" /> },
+  in_progress: { label: "In Progress", variant: "default", icon: <Package className="h-3 w-3" aria-hidden="true" /> },
+  completed: { label: "Completed", variant: "outline", icon: <CheckCircle className="h-3 w-3" aria-hidden="true" /> },
+  cancelled: { label: "Declined", variant: "destructive", icon: <X className="h-3 w-3" aria-hidden="true" /> },
 };
```

```diff
-              <DollarSign className="h-3.5 w-3.5 text-primary" />
+              <DollarSign className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
```

```diff
-                <MapPin className="h-3.5 w-3.5" />
+                <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
```

```diff
-              <Button size="sm" className="flex-1" onClick={() => setShowComplete(true)} disabled={isCompleting}>
-                <CheckCircle className="h-4 w-4 mr-1" /> Mark Returned
+              <Button size="sm" className="flex-1" onClick={() => setShowComplete(true)} disabled={isCompleting} aria-label="Mark Returned">
+                <CheckCircle className="h-4 w-4 mr-1" aria-hidden="true" /> Mark Returned
```

```diff
-                <Button size="sm" variant="outline" asChild>
-                  <a href={`tel:${request.customer_phone}`}>
-                    <Phone className="h-4 w-4" />
+                <Button size="sm" variant="outline" asChild>
+                  <a href={`tel:${request.customer_phone}`} aria-label="Call customer">
+                    <Phone className="h-4 w-4" aria-hidden="true" />
                   </a>
                 </Button>
```

```diff
-              <CheckCircle className="h-4 w-4" />
+              <CheckCircle className="h-4 w-4" aria-hidden="true" />
               Earned ${payout.toFixed(2)}
```

```diff
-        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
-          <ArrowLeft className="h-5 w-5" />
+        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} aria-label="Back">
+          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
         </Button>
```

```diff
-              <DollarSign className="h-5 w-5 text-primary" />
+              <DollarSign className="h-5 w-5 text-primary" aria-hidden="true" />
```

```diff
-                <Package className
