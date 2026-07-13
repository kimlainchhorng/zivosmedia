# MiMo advisor — Shipped-verification of a close-on-failure fix in CarRentalLocationsSection.tsx + useCarRentalLocations.ts (car-rental pickup/dropoff branch CRUD — name/address/hours/phone/is_default/is_active). VERIFY these invariants: (1) the add/edit dialog closes ONLY on mutation success — save() does 'setSubmitted(true); const ok = editing ? await update(editing.id, draft) : Boolean(await create(draft)); if (ok) setDialogOpen(false);' so a failed write keeps the dialog open with typed data intact; (2) the delete dialog closes ONLY on success — 'if (await remove(deleteId)) setDeleteId(null);'; (3) 'submitted' is reset to false at every open path (openCreate, openEdit) and on the delete trigger onClick, so a stale error banner can't flash; (4) both dialogs block backdrop/Escape while saving via onOpenChange '(o)=>{ if(!o && saving) return; ... }', Cancel+confirm buttons disabled={saving}, no double-submit; (5) hook: update()/remove() return Promise<boolean> (false after rollback), create() returns CarRentalLocation|null, setError(null) at each mutation entry, and in update()'s error branch await load() runs BEFORE setError(msg); (6) the per-row Edit/Delete action buttons are mobile-visible ('transition-opacity sm:opacity-0 sm:group-hover:opacity-100', not the touch-invisible 'opacity-0 group-hover:opacity-100'). Report each PASS/FAIL with exact code evidence. Flag any close-on-failure / data-loss hole. Note is_default semantics: setting one location default may unset others server-side — call out only if the client does something unsafe.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalLocationsSection.tsx

## Verification Report

### Invariant 1 — Add/Edit dialog closes ONLY on success
**PASS.** `save()` guards close behind mutation result:
```ts
const ok = editing ? await update(editing.id, draft) : Boolean(await create(draft));
if (ok) setDialogOpen(false);
```
`update` returns `false` → dialog stays open. `create` returns `null` → `Boolean(null) === false` → dialog stays open. Typed data intact in `draft` state.

### Invariant 2 — Delete dialog closes ONLY on success
**PASS.**
```ts
if (await remove(deleteId)) setDeleteId(null);
```
`remove` returns `false` → `setDeleteId` never called → `open={!!deleteId}` stays `true`.

### Invariant 3 — `submitted` reset at every open path
**PASS.**
- `openCreate`: `setSubmitted(false);` ✓
- `openEdit`: `setSubmitted(false);` ✓
- Delete trigger: `onClick={() => { setSubmitted(false); setDeleteId(l.id); }}` ✓

### Invariant 4 — Dialogs block close + no double-submit while saving
**PASS.** Both dialogs guard `onOpenChange`:
```ts
onOpenChange={(o) => { if (!o && saving) return; setDialogOpen(o); }}   // edit
onOpenChange={(o) => { if (!o && saving) return; if (!o) setDeleteId(null); }}  // delete
```
Cancel buttons: `disabled={saving}` ✓. Confirm buttons: `disabled={saving || ...}` ✓.

### Invariant 5 — Hook return types / error handling
**PARTIAL — hook file not provided.** Component consumption is correct:
- `Boolean(await create(draft))` safely coerces `CarRentalLocation | null` ✓
- `await update(…)` / `await remove(…)` results used as booleans ✓
- Depends on hook calling `setError(null)` at mutation entry and `load()` before `setError(msg)` in update's error branch — **cannot verify without `useCarRentalLocations.ts`**.

**⚠️ P1 — Provide hook file for full verification of rollback + error sequencing.**

### Invariant 6 — Mobile-visible action buttons
**PASS.**
```tsx
className="flex items-center gap-1 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
```
Default opacity is `100` on mobile (no `opacity-0` base class). Only hidden `sm:` and up, restored on group-hover. Not the broken `opacity-0 group-hover:opacity-100` pattern.

---

### Additional Findings

**⚠️ P2 — Icon-only Edit/Delete buttons lack `aria-label`.**
Screen readers announce these as unlabeled buttons (only contain `<Pencil>` / `<Trash2>` icons).
```tsx
<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(l)}>
  <Pencil className="h-3.5 w-3.5" />
</Button>
```
**Fix:** Add `aria-label="Edit location"` / `aria-label="Delete location"`.

**⚠️ P2 — 28×28px touch targets below 44px minimum.**
`className="h-7 w-7"` overrides shadcn's default `h-10 w-10` icon size, yielding 28px buttons — below WCAG 2.5.5 / Apple HIG.
**Fix:** Use `h-9 w-9` minimum or add padding: `className="h-7 w-7 p-1.5"`.

**⚠️ P2 — Labels not programmatically associated with inputs.**
`<Label>` in `<Field>` has no `htmlFor`; `<Input>` has no `id`. Screen readers can't link labels to controls.
**Fix:** Add `htmlFor`/`id` pairs, or wrap inputs inside `<Label>`.

---

### Verdict

**Core close-on-failure and data-preservation logic: solid — no close-on-failure or data-loss hole found.** `is_default` handling is client-neutral (just passes the value), no unsafe client-side assumption. Three P2 a11y issues and one P1 hook-verification gap.
