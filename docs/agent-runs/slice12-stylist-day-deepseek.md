# DeepSeek run — 2026-06-13T23:16:03.426Z

- model: deepseek-chat
- task: Premium + responsive redesign audit (className-only). File: src/pages/salon/PublicStylistDayPage.tsx (851 lines, stylist-facing day view, route /stylist/:stylistId, no auth — UUID is the token). HARD RULE: do NOT change supabase queries/RPCs/edge-function calls/react-query keys/routing/polling/component logic — ONLY JSX/Tailwind className changes. Premium interaction tokens: cards/wide active:scale-[0.98], links/chips active:scale-[0.97], icon-only active:scale-[0.95]; add focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring; upgrade transition-colors/transition/none to transition-all. shadcn Button/Input/Select/Checkbox/Textarea/Label ALREADY ship active:scale + focus ring — SKIP them; only RAW button/a/Link/input/clickable-Card need tokens; non-clickable div (no onClick) gets NO tokens. The 4 raw controls I plan to touch: (1) 'Jump to today' raw button ~L482 className 'text-[11px] text-primary hover:underline' -> add rounded-sm transition-all active:scale-[0.97] + focus ring; (2) client phone raw <a href=tel:> ~L533 className 'inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted/80' -> add transition-all active:scale-[0.97] + focus ring; (3) formula-notes RAW <input type=text> ~L656 className 'w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground' (this is a literal <input>, NOT shadcn) -> add transition-all + focus-visible ring ONLY (NO active:scale — scaling a text field is wrong); (4) 'My earnings' raw <Link> ~L793 className 'inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px] font-bold text-foreground hover:bg-muted' -> add transition-all active:scale-[0.97] + focus ring. Confirm these 4 are the complete set of raw interactive controls (flag any I missed). Confirm the raw <input> SHOULD get a focus ring (it's a genuine focusable control missing one) and should NOT get active:scale. Note: all the Prev/Next/Clock-in/Clock-out/Mark-complete/notes+formula Save/Cancel/Close/Stripe-CTA controls are shadcn <Button> (skip) and the two notes/formula editors use shadcn <Textarea> (skip). Also flag any fetched-but-unused DayRow/StylistMeta/FormulaRow/ConnectStatus fields. Check responsive at 375/768/1280 for the single max-w-md column (booking list, 3-col Stat grid, per-booking action button row flex-wrap). Keep it tight.
- files: src/pages/salon/PublicStylistDayPage.tsx

---

# Audit: `PublicStylistDayPage.tsx` — Premium Interaction Pass

## Plan

Apply className-only premium interaction tokens to the **4 raw controls** identified, plus verify no other raw controls were missed. No logic/query/routing changes.

## Proposed Changes

**File:** `src/pages/salon/PublicStylistDayPage.tsx`

### 1. "Jump to today" button (~L482)
**Before:**
```tsx
<button type="button" onClick={() => setDate(todayIso())} className="text-[11px] text-primary hover:underline">
```
**After:**
```tsx
<button type="button" onClick={() => setDate(todayIso())} className="text-[11px] text-primary hover:underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 2. Client phone `<a href="tel:">` (~L533)
**Before:**
```tsx
<a href={`tel:${r.client_phone}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted/80">
```
**After:**
```tsx
<a href={`tel:${r.client_phone}`} className="inline-flex items-center gap-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-foreground hover:bg-muted/80 transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

### 3. Formula notes raw `<input>` (~L656)
**Before:**
```tsx
<input
  type="text"
  value={formulaPanel[r.id]?.draftNotes ?? ""}
  onChange={(e) => updateFormulaDraftNotes(r.id, e.target.value)}
  placeholder="Notes (e.g. 'loved it', 'try 7G next time')"
  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground"
  maxLength={500}
/>
```
**After:**
```tsx
<input
  type="text"
  value={formulaPanel[r.id]?.draftNotes ?? ""}
  onChange={(e) => updateFormulaDraftNotes(r.id, e.target.value)}
  placeholder="Notes (e.g. 'loved it', 'try 7G next time')"
  className="w-full rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
  maxLength={500}
/>
```

### 4. "My earnings" `<Link>` (~L793)
**Before:**
```tsx
<Link
  to={`/stylist/${stylistId}/earnings`}
  className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px] font-bold text-foreground hover:bg-muted"
>
```
**After:**
```tsx
<Link
  to={`/stylist/${stylistId}/earnings`}
  className="inline-flex items-center gap-1 rounded-md bg-background px-2 py-1 text-[11px] font-bold text-foreground hover:bg-muted transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
>
```

## Verification of Your 4 Controls

✅ **Complete set confirmed.** I walked every interactive element in the file:

| Control | Type | Action |
|---------|------|--------|
| "Jump to today" `<button>` | Raw `<button>` | ✅ Add tokens |
| Client phone `<a href="tel:">` | Raw `<a>` | ✅ Add tokens |
| Formula notes `<input>` | Raw `<input>` | ✅ Add tokens (focus ring only, no `active:scale`) |
| "My earnings" `<Link>` | Raw `<Link>` | ✅ Add tokens |

### Controls correctly SKIPPED (shadcn components — already ship tokens):
- **Prev/Next** — `<Button variant="ghost">`
- **Clock in/out** — `<Button>`
- **Mark complete** — `<Button>`
- **Notes Cancel/Save** — `<Button variant="ghost">` / `<Button>`
- **Formula Close/Save** — `<Button variant="ghost">` / `<Button>`
- **Stripe CTA** — `<Button>`
- **Notes editor `<Textarea>`** — shadcn `<Textarea>`
- **Formula `<Textarea>`** — shadcn `<Textarea>`

### Controls correctly SKIPPED (non-interactive `<div>` — no `onClick`):
- Error state `<div>` (no `onClick`)
- Loading spinner `<div>`
- Empty state `<div>`
- Booking list `<li>` items (no `onClick` — the card itself isn't clickable)
- `Stat` component `<div>` (no `onClick`)
- `ClockCard` wrapper `<div>` (no `onClick`)
- `StripeConnectBanner` wrapper `<div>` (no `onClick`)
- Notes display `<div>` (no `onClick`)
- Formula history `<li>` items (no `onClick`)

### Raw `<input>` focus ring decision
✅ **Correct — add focus ring, NO `active:scale`.** Scaling a text input on press is wrong UX (it shifts the cursor position and looks broken). The `focus-visible:ring-2` is essential for keyboard accessibility since this is a genuine focusable control with no ring currently.

## Fetched-but-unused Fields Audit

| Interface | Field | Used? |
|-----------|-------|-------|
| `DayRow` | `id` | ✅ Key prop |
| | `store_id` | ❌ **Unused** — internal, no display value |
| | `store_name` | ❌ **Unused** — redundant with `StylistMeta.store_name` |
| | `stylist_id` | ❌ **Unused** — internal, no display value |
| | `stylist_name` | ❌ **Unused** — redundant with `StylistMeta.display_name` |
| | `client_name` | ✅ Rendered |
| | `client_phone` | ✅ Rendered |
| | `service_name` | ✅ Rendered |
| | `start_at` | ✅ Rendered |
| | `end_at` | ❌ **Unused** — could show end time, but `duration_minutes` already conveys length |
| | `duration_minutes` | ✅ Rendered |
| | `status` | ✅ Rendered |
| | `internal_notes` | ✅ Rendered |
| `StylistMeta` | `id` | ✅ Used as key |
| | `display_name` | ✅ Rendered |
| | `store_id` | ❌ **Unused** — internal |
| | `store_name` | ✅ Rendered |
| | `store_slug` | ❌ **Unused** — could link to storefront, but navigation addition is out of scope |
| `ConnectStatus` | `status` | ✅ Used for banner logic |
| | `charges_enabled` | ❌ **Unused** — internal |
| | `payouts_enabled` | ❌ **Unused** — internal |
| | `details_submitted` | ❌ **Unused** — internal |
| `FormulaRow` | `id` | ✅ Key prop |
| | `formula` | ✅ Rendered |
| | `notes` | ✅ Rendered |
| | `applied_at` | ✅ Rendered |
| | `service_name` | ✅ Rendered |
| | `stylist_name` | ❌ **Unused** — redundant with current stylist |
| | `booking_id` | ❌ **Unused** — internal |

**Recommendation:** Skip surfacing all unused fields — they're either internal IDs,
