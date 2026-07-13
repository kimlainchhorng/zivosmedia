# MiMo run — 2026-06-14T08:49:01.339Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Additive a11y plus reduced-motion zero visual change at default motion on MaintenanceScheduler. File imports framer-motion motion and NO useTranslation so plain-English labels. ONE component. Add const reduceMotion useReducedMotion extend the framer-motion import. Motion inventory. ONE motion.header initial opacity 0 y minus 20 GUARD initial only leave animate intact. ONE back motion.button whileHover whileTap only NO entrance LEAVE UNTOUCHED add aria-label Back and ArrowLeft aria-hidden. ONE per-log motion.div in Logs tab initial opacity 0 y 8 transition delay i times 0.04 GUARD initial and delay reduceMotion ternary. No perpetual loops. Icons aria-hidden decorative ArrowLeft Sparkles beside h1 Wrench ClipboardCheck FileText the three TabsTrigger icons Wrench schedule empty-state Plus inside Record Inspection button which has visible text ClipboardCheck in SheetTitle beside text ClipboardCheck inspections empty-state FileText logs empty-state. FORM FIELDS QUESTION the Record-Inspection Sheet has shadcn Label elements WITHOUT htmlFor so they are NOT programmatically associated with the Select trigger the two date Inputs and the Textarea. The Already-completed checkbox uses a native label wrapping the input plus span so it IS associated leave it. Advise the safest additive fix for the 4 unassociated fields add aria-label matching each visible Label text Inspection Type Due Date Expiry Date Notes OR add htmlFor plus id pairs. Recommend one. HEADING h1 Maintenance then a lone h3 Vehicle Health a skip. Advise promote h3 to h2 like DriverIncidents or DEFER. Skeleton loaders OUT OF SCOPE. Confirm or correct exact edits only no logic changes.
- files: /Users/kimlain/Documents/GitHub/zivodriver/src/pages/driver/MaintenanceScheduler.tsx

---

(no answer text — the run hit max_tokens; raise --max-tokens)

--- partial thinking ---
Let me analyze the file and the task requirements carefully.

## Task Summary

1. **Reduced-motion support**: Add `useReducedMotion` from framer-motion, guard motion props
2. **aria-hidden on decorative icons**
3. **aria-label on the back button**
4. **Form field accessibility** (the 4 unassociated fields)
5. **Heading hierarchy** (h3 → h2 for "Vehicle Health")

## Detailed Analysis

### 1. Reduced Motion
- Import `useReducedMotion` from framer-motion
- Add `const reduceMotion = useReducedMotion()`
- **motion.header** (L78-83): `initial={{ opacity: 0, y: -20 }}` — guard with `initial={reduceMotion ? false : { opacity: 0, y: -20 }}`. Leave `animate` intact.
- **motion.button back** (L86-91): has `whileHover` and `whileTap` only, NO entrance. Leave untouched.
- **motion.div per-log** (L221-225): `initial={{ opacity: 0, y: 8 }}` and `transition={{ delay: i * 0.04 }}` — guard both: `initial={reduceMotion ? false : { opacity: 0, y: 8 }}` and `transition={reduceMotion ? { duration: 0 } : { delay: i * 0.04 }}`.

### 2. Decorative Icons — aria-hidden
The task lists these decorative icons:
- `ArrowLeft` inside the back button (L89)
- `Sparkles` beside h1 (L95)
- `Wrench` in TabsTrigger "Schedule" (L119)
- `ClipboardCheck` in TabsTrigger "Inspections" (L126)
- `FileText` in TabsTrigger "Logs" (L133)
- `Wrench` in schedule empty-state (L148)
- `Plus` inside Record Inspection button (L161) — button has visible text "Record Inspection"
- `ClipboardCheck` in SheetTitle (L170) — beside text "Record Inspection"
- `ClipboardCheck` in inspections empty-state (L198)
- `FileText` in logs empty-state (L243)

All need `aria-hidden="true"`.

### 3. Back Button aria-label
The back button (L86) has `onClick={goBack}` but no `aria-label`. Add `aria-label="Back"`.

### 4. Form Fields — aria-label vs htmlFor

The 4 unassociated fields:
1. **Inspection Type** — `<Label>Inspection Type</Label>` + `<Select><SelectTrigger>...` — shadcn Select, the trigger is a button. Adding `htmlFor` + `id` would link to a `<button>` which doesn't work. `aria-label="Inspection Type"` on the SelectTrigger is the safest.

2. **Due Date** — `<Label>Due Date</Label>` + `<Input type="date" ...>` — can use `htmlFor`+`id` OR `aria-label`. Since it's a native input, both work. But the shadcn Label component renders a `<label>`, so `htmlFor` + `id` is the most robust.

3. **Expiry Date** — same as Due Date.

4. **Notes** — `<Label>Notes</Label>` + `<Textarea ...>` — same, can use `htmlFor`+`id`.

For Select: `aria-label` on the SelectTrigger is safest because the SelectTrigger is a `<button>` and `htmlFor` only works on `<input>`, `<select>`, `<textarea>`. The underlying Radix Select doesn't have a native form element to link.

For the 3 native form controls (2 Inputs + 1 Textarea): `htmlFor` + `id` pairs is most robust — it creates an explicit association that works with all screen readers AND provides a click-to-focus benefit.

**Recommendation**: Use `htmlFor`+`id` for the 3 native inputs (Due Date, Expiry Date, Notes), and `aria-label` on the SelectTrigger for Inspection Type. This is the most robust approach per control type.

### 5. Heading Hierarchy

The h1 is "Maintenance" (L93-96). Then h3 "Vehicle Health" (L177) is a skip. Promote to h2 to match the heading hierarchy (h1 → h2 → h3 for nested sections).

The task says "like DriverIncidents or DEFER". Since this is inside the schedule tab and represents a distinct section, promoting to h2 is the correct fix for proper document outline.

## Exact Edits

### Import change (L2-3)
```diff
- import { motion } from "framer-motion";
+ import { motion, useReducedMotion } from "framer-motion";
```

### Add const (after L41 or wherever appropriate)
```diff
  const primaryVehicle = vehicles.find((v) => v.is_primary) || vehicles[0];
+ const reduceMotion = useReducedMotion();
```

### motion.header initial guard (L78-83)
```diff
      <motion.header
        className="sticky top-0 z-40 backdrop-blur-xl bg-card/95 border-b border-border/30 px-4 py-3 pt-[calc(env(safe-area-inset-top)+0.75rem)]"
-        initial={{ opacity: 0, y: -20 }}
+        initial={reduceMotion ? false : { opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
```

### Back button — aria-label + ArrowLeft aria-hidden (L86-91)
```diff
          <motion.button
            onClick={goBack}
+           aria-label="Back"
            className="p-2.5 rounded-2xl bg-muted/50 hover:bg-muted transition-all border border-border/30"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
-            <ArrowLeft className="w-5 h-5" />
+            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </motion.button>
```

### Sparkles aria-hidden (L95)
```diff
-              <Sparkles className="w-4 h-4 text-primary" />
+              <Sparkles className="w-4 h-4 text-primary" aria-hidden="true" />
```

### TabsTrigger icons aria-hidden (L119, L126, L133)
```diff
-              <Wrench className="w-3.5 h-3.5" /> Schedule
+              <Wrench className="w-3.5 h-3.5" aria-hidden="true" /> Schedule
```
```diff
-              <ClipboardCheck className="w-3.5 h-3.5" /> Inspections
+              <ClipboardCheck className="w-3.5 h-3.5" aria-hidden="true" /> Inspections
```
```diff
-              <FileText className="w-3.5 h-3.5" /> Logs
+              <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Logs
```

### Wrench in schedule empty-state (L148)
```diff
-                <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
+                <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
```

### h3 → h2 for Vehicle Health (L177)
```diff
-                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
+                <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Vehicle Health
-                </h3>
+                </h2>
```

### Plus icon in Record Inspection button (L161)
```diff
-                <Plus className="w-4 h-4" />
+                <Plus className="w-4 h-4" aria-hidden="true" />
```

### ClipboardCheck in SheetTitle (L170)
```diff
-                    <ClipboardCheck className="w-4 h-4 text-primary" />
+                    <ClipboardCheck className="w-4 h-4 text-primary" aria-hidden="true" />
```

### Form field accessibility (L173-196)

For Inspection Type (Select — aria-label on SelectTrigger):
```diff
                  <div className="space-y-1">
                    <Label className="text-xs">Inspection Type</Label>
                    <Select value={inspType} onValueChange={setInspType}>
-                      <SelectTrigger className="text-xs h-9 rounded-xl">
+                      <SelectTrigger className="text-xs h-9 rounded-xl" aria-label="Inspection Type">
                        <SelectValue />
                      </SelectTrigger>
```

For Due Date (Input — htmlFor+id):
```diff
                    <div className="space-y-1">
-                      <Label className="text-xs">Due Date</Label>
+                      <Label htmlFor="insp-due-date" className="text-xs">Due Date</Label>
                      <Input
                        type="date"
+                       id="insp-due-date"
                        value={inspDueDate}
```

For Expiry Date:
```diff
                    <div className="space-y-1">
-                      <Label className="text-xs">Expiry Date</Label>
+                      <Label htmlFor="insp-expiry-date" className="text-xs">Expiry Date</Label>
                      <Input
                        type="date"
+                       id="insp-expiry-date"
                        value={inspExpiryDate}
```

For Notes (Textarea — htmlFor+id):
```diff
                  <div className="space-y-1">
-                    <Label className="text-xs">Notes</Label>
+                    <Label htmlFor="insp-notes" className="text-xs">Notes</Label>
                    <Textarea
+                     id="insp-notes"
                      value={inspNotes}
```

### ClipboardCheck in inspections empty-state (L198)
```diff
-                <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
+                <ClipboardCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
```

### motion.div per-log guards (L221-225)
```diff
                <motion.div
                  key={log.id}
-                  initial={{ opacity: 0, y: 8 }}
+                  initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
-                  transition={{ delay: i
