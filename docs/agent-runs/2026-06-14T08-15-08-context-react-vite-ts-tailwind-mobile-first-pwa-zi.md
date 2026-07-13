# DeepSeek run — 2026-06-14T08:15:08.306Z

- model: deepseek-chat
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

## Plan

Control A (L170 status-filter tab) is **already correctly applied** in the file you provided. The diff shows:

- `aria-pressed={statusFilter === f.id}` ✅
- `active:scale-[0.97]` ✅ (segmented-filter tier)
- `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` ✅
- No flip needed — base already has `transition-all duration-200` ✅
- OUTWARD `ring-ring` — the `bg-muted/50` container has `p-1` padding, so the ring is NOT clipped ✅

**Verdict: Control A is CORRECT. No changes needed.**

## Ticket-row `<Link>` — LEAVE (do NOT add ring)

The ticket-row `<Link>` wraps a shadcn `<Card>` that already has `hover:shadow-lg transition-all duration-300`. Adding a focus ring to the `<Link>` would require:
1. Adding `rounded-2xl` to the `<Link>` (it's a bare RR Link, no className currently)
2. Adding `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` to the `<Link>`
3. The `<Card>` inside has `hover:border-primary/15` — the ring would compete visually

This is a **borderline a11y gap** — the native `<a>` element is focusable by default, but has no visible focus indicator. However, adding one would be a structural change (adding className to the `<Link>`) that goes beyond the "className + display-only aria" scope. **Flag for owner to decide in a follow-up pass.**

## Missed raw interactive controls — NONE

I scanned every `<button>`, `<Link>`, and interactive element in the file:

| Control | Status |
|---------|--------|
| L147 shadcn ghost Back `<Button>` asChild `<Link>` | ✅ LEFT (own tokens, already `aria-label="Go back"`) |
| L55 NewTicketDialog trigger `<Button>` | ✅ LEFT (shadcn, own tokens) |
| L110 Submit `<Button>` | ✅ LEFT (shadcn, own tokens) |
| L164 search `<Input>` | ✅ LEFT (shadcn, own tokens) |
| L170 status-filter `<button>` ×4 | ✅ **CORRECTLY EDITED** |
| L194 ticket-row `<Link>` | ✅ LEFT (borderline a11y gap — flagged above) |
| L239/L247 Help Resources `<Button>` asChild `<Link>` | ✅ LEFT (shadcn outline, own tokens) |
| Dialog `<Input>`/`<Textarea>`/`<Select>`/`<Label>` | ✅ LEFT (shadcn, own tokens) |
| `<Card>`/`<CardContent>`/`<Badge>` | ✅ LEFT (shadcn, own tokens) |

**No other raw `<button>` or raw interactive controls exist in this file.** The file has exactly 1 raw interactive control (the status-filter tabs, already correctly edited).

## Final state of control A (already in file)

```tsx
aria-pressed={statusFilter === f.id}
className={`flex-1 text-[11px] font-bold py-2.5 rounded-xl transition-all duration-200 touch-manipulation active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
  statusFilter === f.id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
}`}
```

**No diff to apply — this slice is complete.**
