# MiMo run — 2026-06-14T08:16:04.195Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/SupportCenterPage.tsx (262-line "Support Center" — unified support tickets at /support; REAL data via useSupportTickets(statusFilter)/useCreateSupportTicket [react-query]; useState statusFilter/search + a NewTicketDialog sub-component with its own form state; layout: a sticky header [shadcn ghost icon Back Button asChild Link + title + the NewTicketDialog trigger Button] + a search Input + a SEGMENTED STATUS-FILTER tab strip [4 raw <button> mapped over all/open/in_progress/resolved inside a bg-muted/50 rounded-xl p-1 container] + a tickets list [each = a RR <Link> wrapping a shadcn Card] OR an empty-state Card + a Help-Resources grid of 2 shadcn outline Buttons (asChild Link) + MobileBottomNav). RULES: className strings + display-only aria-* ONLY; preserve ALL logic, onClick, setStatusFilter, navigate/Link targets, hooks/react-query, byte-identical. Don't add a SECOND competing press effect. Don't churn shadcn <Button>/<Input>/<Textarea>/<Select>/<Dialog>/<Card>/<Badge>/<Label> (own tokens). Don't renumber an existing scale. Don't add role/tabIndex/onKeyDown.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset only when control is a flush edge child of a rounded overflow-hidden PARENT.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; small inline text-link active:scale-[0.97]; medium chip/pill/button active:scale-[0.98]; segmented filter chip/tab active:scale-[0.97].
- transition rule: transition-transform when scale is the ONLY animated prop ON THE BUTTON; transition-all when ALSO hover:bg/text/border/opacity ON THE BUTTON ITSELF. A control that ALREADY has transition-all → appending a scale needs NO flip.
- aria: aria-label ONLY on icon-only/image-only controls. aria-pressed ONLY on a PERSISTENT single-select segmented filter/tab/picker OR a two-way bg-conveyed toggle.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

A) L170 STATUS-FILTER segmented tab (raw <button>, mapped over [{all},{open},{in_progress},{resolved}], one-shot onClick={() => setStatusFilter(f.id)}, className is a TEMPLATE LITERAL with a static base `flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-200 touch-manipulation` + a conditional `${statusFilter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"}` [active state conveyed by bg-card + shadow]; parent = a `flex gap-1 bg-muted/50 rounded-xl p-1` segmented container). → applied: ADDED `aria-pressed={statusFilter === f.id}` + APPENDED into the static base `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` (segmented-filter tier [0.97]; NO flip — base ALREADY has `transition-all duration-200`, appending a scale needs no flip; OUTWARD ring-ring — the chips sit on the `bg-muted/50` container [p-1 padding → NOT a flush overflow-hidden edge child → OUTWARD not inset], neutral muted parent = ring-ring; aria-pressed — persistent single-select segmented filter, active state conveyed by bg-card). Confirm tier [0.97] + NO-flip (already transition-all) + OUTWARD ring-ring + aria-pressed (single-select segmented filter).

ALSO CONFIRM I should LEAVE: the shadcn ghost icon Back <Button> L147 (asChild Link, ALREADY aria-label="Go back", own tokens); the NewTicketDialog trigger <Button> L55 + the Submit <Button> L110 (own tokens); the search <Input> L164 + all dialog <Input>/<Textarea>/<Select>/<Label> (own tokens); the Help-Resources outline <Button>s L239/L247 (asChild Link, own tokens); all <Card>/<CardContent>/<Badge> (own tokens); the ticket-row <Link> L194 wrapping a shadcn Card (a bare RR Link wrapping a Card with its OWN hover:shadow-lg/hover:border — native-focusable; adding a ring would require className+rounded churn on the Link — FLAG as a borderline a11y gap, don't churn?) — ADVISE: should the ticket-row Link get a focus-visible ring, or leave it? all motion.div/AnimatePresence wrappers (entrance anim); MobileBottomNav (sub-component); all icons (decorative).

Be concise and exact. Return the precise final className after-string for control A + the aria attr. Give a clear verdict on the ticket-row <Link> (ring or leave). Flag any other in-scope raw interactive control I missed.
- files: src/pages/app/SupportCenterPage.tsx

---

## Verdict

### Control A — Status-filter segmented tab: ✅ CORRECT

All five decisions verified:

| Decision | Rationale | ✓ |
|---|---|---|
| `active:scale-[0.97]` | Segmented-filter chip tier | ✓ |
| NO flip | Base already has `transition-all duration-200` — appending scale needs no flip | ✓ |
| OUTWARD `ring-ring` | Parent `bg-muted/50 rounded-xl p-1` has padding (not flush/overflow-hidden) → OUTWARD; neutral muted surface → `ring-ring` | ✓ |
| `aria-pressed` | Persistent single-select segmented filter, bg-conveyed selection | ✓ |
| Static base insertion | Appended into the static part of the template literal (not the conditional) | ✓ |

**Precise final static base string (the part before the ternary):**

```
flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**Precise final full button:**

```tsx
<button type="button"
  key={f.id}
  onClick={() => setStatusFilter(f.id)}
  aria-pressed={statusFilter === f.id}
  className={`flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
    statusFilter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
  }`}
>
  {f.label}
</button>
```

No changes to logic, `onClick`, `setStatusFilter`, or the ternary conditional.

---

### Ticket-row `<Link>` (L194): **ADD the ring — recommended**

It's a navigational `<a>` (keyboard-focusable, wraps an entire Card surface). A focus indicator is a genuine a11y gap, not cosmetic. The edit is minimal and additive — the Link currently has **no className at all**, so there's nothing to conflict with:

**Before:**
```tsx
<Link to={`/support/${ticket.id}`}>
```

**After:**
```tsx
<Link to={`/support/${ticket.id}`} className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
```

- `block` — `<a>` is inline by default; `block` lets the ring outline the full Card area
- `rounded-2xl` — matches the inner Card's `rounded-2xl`
- OUTWARD `ring-ring` — the Link sits on the neutral `bg-background` page surface
- No competing press effect (no `active:scale` — the Card's own `hover:shadow-lg` handles hover feedback)
- Zero logic/prop changes

---

### Leave-list confirmed ✓

| Control | Reason | Leave |
|---|---|---|
| Back `<Button>` L147 | Shadcn ghost, `asChild`, already `aria-label="Go back"` | ✓ |
| NewTicketDialog trigger `<Button>` L55 | Shadcn, own tokens | ✓ |
| Submit `<Button>` L110 | Shadcn, own tokens | ✓ |
| Search `<Input>` L164 | Shadcn, own tokens | ✓ |
| All dialog `<Input>`/`<Textarea>`/`<Select>`/`<Label>` | Shadcn, own tokens | ✓ |
| Help-Resources `<Button>`s L239/L247 | Shadcn outline `asChild`, own tokens | ✓ |
| All `<Card>`/`<CardContent>`/`<Badge>` | Shadcn, own tokens | ✓ |
| All `motion.div`/`AnimatePresence` | Presentational entrance anim | ✓ |
| `MobileBottomNav` | Sub-component, own internals | ✓ |
| All icons | Decorative | ✓ |

### No other raw interactive controls missed ✓

The file has exactly **2 raw interactive controls in scope**: the 4× segmented tab `<button>` (control A) and the ticket-row `<Link>` (L194). Everything else is shadcn or non-interactive.

---

### Summary diff (2 edits, 2 className, 1 aria attr, 0 logic)

| # | Control | Edit |
|---|---|---|
| A | Segmented tab `<button>` (×4) | `aria-pressed={statusFilter === f.id}` + append `active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` into static base |
| B | Ticket-row `<Link>` | Add `className="block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"` |

**Owner verify:** `npm run update` → must pass (0 type errors + production build). Preview the segmented tab keyboard focus at 375/768/1280 and the ticket-row Link focus ring.
