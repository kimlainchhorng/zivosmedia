# MiMo run — 2026-06-14T04:56:39.007Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Continue Codex-owned Zivo Travel booking surface work after a verified /cars page pass in src/pages/Cars.tsx. Audit the next safest high-impact patch among /bus, /hotels, /flights, or the car detail/funnel. Avoid dirty files and payments/schema. Recommend one concrete file/scope with risks and verification.

---

## (1) Short plan

**Recommended next file: `src/pages/Bus.tsx`**

Rationale:
- **Isolation**: Bus is a standalone list page (from/to/date search → results) with no booking funnel overlap, no payments/schema, and no dirty-file risk from other agents
- **Precedent**: The `/cars` pass is verified — Bus has the same surface pattern (deep-link params from `ZivoTravelHome`, search form, results list), so the same `.zivo-travel-3d` components + responsive sweep apply identically
- **Risk profile**: Low — no checkout, no Stripe, no `CambodiaOnlyGate`, no Supabase writes. If Bus.tsx has the standard header-back RAW button pattern, it also gets the interaction-token pass (same `active:scale-95` + `ring-ring` pattern as the 50+ verified slices)
- **Impact**: Fills in the last "easy" list page before tackling Hotels (gate context) or Flights (most complex state)

---

## (2) Proposed scope — what to check and change

**Prerequisites** (Codex should verify before editing):
```bash
git status src/pages/Bus.tsx          # must be clean / not dirty
git log --oneline -3 src/pages/Bus.tsx  # confirm last author
```

**Read the file** (~likely 150–300 lines) and confirm the inventory:

| What to find | Expected pattern |
|---|---|
| Page root | `<div className="min-h-screen bg-background ...">` or wrapped in `SwipeBackContainer` |
| Header back button | RAW `<button>` with `onClick={goBack}`, icon-only ArrowLeft, likely `hover:bg-muted` → needs `transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-ring` |
| Search form inputs | shadcn `<Input>` / native `<select>` → leave (ship tokens / native focus) |
| Search/submit button | shadcn `<Button>` → leave (ships tokens) |
| Results list | `motion.div` rows → leave (presentational, no onClick on the row wrapper) |
| Deep-link param read | `useSearchParams` reading `from`, `to`, `date` — do NOT touch |
| Any Supabase query | Read-only search — do NOT touch |

**The `.zivo-travel-3d` surface pass** (if not already applied to Bus.tsx):
- Wrap page content with `PageTransition` for the 3D enter animation
- If results render as a list, consider `Coverflow3D` or `Reveal` for scroll-in
- Apply `zt-glass` / `zt-gradient-text` tokens where appropriate (card surfaces, headings)
- Verify `prefers-reduced-motion` safety (the kit components already handle this)

**The interaction-token pass** (the pattern from 50+ verified slices):
```
Header back (RAW, icon-only, aria-label="Back"):
  BEFORE: "p-2 -ml-2 rounded-full hover:bg-muted"
  AFTER:  "p-2 -ml-2 rounded-full hover:bg-muted transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

Any other RAW `<button>` instances (filter chips, sort toggles) get the same tier-appropriate treatment — document each in the diff description per the established protocol.

**What to SKIP** (do not edit):
- All shadcn `<Button>`, `<Input>`, `<Select>`, `<Switch>` — ship tokens
- All `motion.div` wrappers with no onClick — presentational
- The Supabase query / react-query keys / search params logic — zero logic changes
- Any payments/checkout code — out of scope

---

## (3) Owner verification

After Codex applies the change:

```bash
npm run update          # must be TRUE EXIT 0
grep -c 'active:scale' src/pages/Bus.tsx  # confirm count matches controls edited
git diff src/pages/Bus.tsx | grep -c '^[+-]'  # confirm className-only, no logic
```

**Preview**: Load `/bus?from=Phnom+Penh&to=Siem+Reap&date=2026-07-01` on localhost to verify:
- Deep-link params populate the search form
- 3D surface tokens render under `.zivo-travel-3d`
- Reduced-motion: no animations fire with `prefers-reduced-motion: reduce`
- 375px / 768px / 1280px responsive — no crush

**Deploy**: Owner commits when ready. No schema or payment changes → safe to ship with the existing `/cars` pass.

---

**After Bus is done**, the recommended order is:
1. `/hotels` (same list-page pattern, but audit the `ZivoTravelHotelGate` wrapper first — now pass-through but verify)
2. `/flights` (most complex — airport autocomplete, multi-field form, `useFlightDeepLinkInitial` hook)
3. Car detail/funnel (deeper in booking flow — higher coordination risk)
