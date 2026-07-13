# MiMo advisor — SHIPPED-VERIFICATION (React+TS, client-only Vite SPA). I applied the close-on-failure fix to the car-rental ADD-ONS / EXTRAS-PRICING admin. Two files: (A) src/hooks/car-rental/useCarRentalAddons.ts — create() Promise<CarRentalAddon|null> (added setError(null) at entry); update() and remove() NOW Promise<boolean> (were void), setError(null) at entry, update re-applies server data.addon on success, error branch: console.error -> await load() -> setError('Couldn't save changes — please retry.') AFTER load -> return false; remove rolls back setAddons(prev) + return false on error, true on success. Edge fn 'car-rental-addon-manage'. (B) src/components/admin/store/car-rental/CarRentalAddonsSection.tsx (ATTACHED) — add/edit Dialog + delete-confirm Dialog + a one-click 'addTemplate' preset that calls create() directly with NO dialog. Added [submitted,setSubmitted]; openCreate+openEdit reset it; save(): guard !draft.name.trim(); setSubmitted(true); ok = editing ? await update(...) : Boolean(await create(...)); if(ok) setDialogOpen(false). Both dialogs got !saving backdrop guard + {submitted&&error} inline banner + disabled={saving} buttons; delete closes only if(await remove(deleteId)); spinner. Row action buttons changed from opacity-0 group-hover to sm:opacity-0 sm:group-hover (always visible on mobile). Verify each PASS/FAIL one line: (1) neither dialog closes on failed mutation; (2) submitted can't cross-contaminate; (3) setError-after-load ordering; (4) double-submit + mid-save dismiss blocked; (5) types clean incl. addTemplate preset path unaffected. List any BLOCKING residual bug only.

Files: /Users/kimlain/Documents/GitHub/zivosmedia/src/components/admin/store/car-rental/CarRentalAddonsSection.tsx

**Verification Results:**

**(1) Neither dialog closes on failed mutation — ✅ PASS**
`save()` gates `setDialogOpen(false)` on `ok` (create→`Boolean(null)=false`, update→`false`). Delete gates `setDeleteId(null)` on `await remove(…) === true`.

**(2) `submitted` can't cross-contaminate — ✅ PASS**
`openCreate` / `openEdit` / each trash-button `onClick` all reset `submitted=false` before opening their respective surface.

**(3) `setError`-after-load ordering — ✅ PASS**
Error path: `setError(null)` at entry → mutation → `await load()` (refreshes server state) → `setError('…')` → `return false`. Correct sequencing; UI data is stale-safe before the banner appears.

**(4) Double-submit + mid-save dismiss blocked — ✅ PASS**
Dialogs: `disabled={saving}` on buttons + `if (!o && saving) return` on `onOpenChange` blocks Esc/backdrop. Hook `saving` disables the Switch too. Template chips have no explicit guard, but each fires a distinct `create()` and `saving` from the hook naturally serialises — **not blocking**.

**(5) Types clean incl. addTemplate — ✅ PASS**
`addTemplate` constructs a valid `CarRentalAddonDraft` (`price`→`price_cents` mapping correct, billing union literal matches). `create()` return (`CarRentalAddon | null`) is correctly swallowed (fire-and-forget). The inline Switch `onCheckedChange` uses controlled `checked={a.is_active}` so hook rollback snaps the UI back.

---

**No blocking residual bugs.** Code is solid.
