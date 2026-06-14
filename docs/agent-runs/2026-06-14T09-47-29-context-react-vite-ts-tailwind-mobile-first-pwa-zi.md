# DeepSeek run — 2026-06-14T09:47:29.230Z

- model: deepseek-chat
- task: CONTEXT — React+Vite+TS+Tailwind mobile-first PWA (ZIVO). Premium interaction + accessibility token pass on src/pages/app/shop/ShopSettingsPage.tsx (159-line merchant "Shop Settings" page rendered inside <AppLayout>; @tanstack/react-query useQuery "my-store" (store_profiles eq owner_id maybeSingle) + useMutation save (store_profiles update eq id eq owner_id) → invalidate + toast; useState name/description/phone/address/hours; useEffect hydrates from store; loading + no-store guard states). RULES: className strings + display-only aria-* (aria-label/aria-pressed/aria-expanded) ONLY; preserve ALL logic, onClick, navigate, supabase, react-query keys, setState byte-identical. Don't add a SECOND COMPETING press effect. Don't churn controls that ALREADY ship press+transition (add ring only). Don't add role/tabIndex/onKeyDown (structural — FLAG). Don't touch disabled. SKIP shadcn Button/Input/Textarea/AppLayout (own tokens). LEAVE native form fields & non-interactive labels.

DESIGN TOKEN VOCABULARY (house standard, match exactly):
- Focus ring: focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring (NO ring-offset). OUTWARD default. ring-inset ONLY when control is a FLUSH edge child of a rounded OVERFLOW-HIDDEN parent.
- Ring color: --ring resolves BLACK. Outward ring renders against the control's PARENT surface. Neutral parent (bg-card/background/secondary/muted) = ring-ring.
- Press-scale tiers: icon-only active:scale-95; links/chips/pills active:scale-[0.97]; wide full-width WITH own surface active:scale-[0.98]; bare full-width row NO own surface active:scale-[0.99]. Back-icon-buttons already shipping active:scale-90 keep it (DON'T renumber).
- transition rule: transition-transform when scale is the ONLY animated prop ON THE ELEMENT; transition-all when ALSO hover:bg/text(color)/border/opacity ON THE ELEMENT ITSELF.
- FLIP / ADD: ADDING a new active:scale to a transition-colors/no-transition control that ALSO has a hover/active color/bg/border ON ITSELF → use transition-all (FLIP).
- DON'T-CHURN: control ALREADY has press (active:scale) + transition → ADD ring (+aria) ONLY; don't renumber, no flip.
- For bare icon/text-link buttons/anchors add a rounded/rounded-full so the ring traces tightly.
- aria: aria-label ONLY on icon-only/image-only/glyph-only controls. aria-pressed ONLY on a persistent single-select toggle/segmented filter. aria-expanded on a disclosure.

ONE edit applied — confirm CORRECT or NEEDS-FIX:

A) L92 BACK button — was `p-2 -ml-2 rounded-full hover:bg-muted/50` (icon-only ArrowLeft; onClick navigate("/shop-dashboard"); hover:bg ON ITSELF; NO transition, NO scale, NO ring; rounded-full present; NO aria-label; inside sticky bg-background/95 header neutral) → ADDED `aria-label="Go back"` + FLIP (no-transition→transition-all) + `active:scale-95` + ring. Final: `p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring` + `aria-label="Go back"`. Confirm: (1) icon-only aria-label="Go back" correct; (2) FLIP no-transition→transition-all correct (hover:bg ON ITSELF + new scale both animate); (3) active:scale-95 icon tier correct; (4) OUTWARD ring-ring on neutral sticky header.

ALSO CONFIRM I should LEAVE: AppLayout shell; shadcn <Button> "Save" L96 (disabled={save.isPending}) + "Go to Dashboard" L81 + full-width "Save Changes" L152 (disabled={save.isPending}) — own tokens, disabled untouched; shadcn <Input> L112/129/133/137 + <Textarea> L116 (own tokens, native form fields); the section-heading <h2>s + <label>s (non-interactive — labels have no htmlFor, purely visual); the store-URL <p> mono text L147 (non-interactive); all lucide icons (decorative); loading + no-store guard states. No clickable divs with onClick. No raw <a>.

Be concise and exact. Return the precise final className after-string for A + the aria attr. Flag any other in-scope raw interactive control I missed.
- files: src/pages/app/shop/ShopSettingsPage.tsx

---

## Plan

One edit needed on `src/pages/app/shop/ShopSettingsPage.tsx`:

**A) L92 BACK button** — already has the correct final state in the file you provided. The diff is already applied. Confirm it's correct, then verify `npm run update`.

---

## Confirmation: Edit A is CORRECT

**Final className:**
```
p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring
```

**aria attr:** `aria-label="Go back"`

| Check | Verdict |
|-------|---------|
| (1) icon-only aria-label="Go back" | ✅ Correct — ArrowLeft is decorative, no visible text |
| (2) FLIP no-transition→transition-all | ✅ Correct — `hover:bg-muted/50` ON THE ELEMENT + new `active:scale-95` both animate |
| (3) active:scale-95 icon tier | ✅ Correct — icon-only button |
| (4) OUTWARD ring-ring on neutral sticky header | ✅ Correct — `bg-background/95` parent, no overflow-hidden, ring-inset not needed |

---

## Leave-list confirmed

✅ **AppLayout** shell — own tokens  
✅ **shadcn `<Button>`** ×3 (L96 "Save", L81 "Go to Dashboard", L152 "Save Changes") — own tokens, `disabled` untouched  
✅ **shadcn `<Input>`** ×4 (L112, L129, L133, L137) — own tokens, native form fields  
✅ **shadcn `<Textarea>`** L116 — own tokens, native form field  
✅ **`<h2>` section headings + `<label>`s** — non-interactive (labels are visual-only, no `htmlFor`)  
✅ **Store URL `<p>`** L147 — non-interactive text  
✅ **All lucide icons** — decorative  
✅ **Loading + no-store guard states** — no interactive controls  

---

## Missed controls scan: NONE

- No clickable `<div>`s with `onClick`  
- No raw `<a>` tags  
- No other raw `<button>`s besides the one edited  
- No native form fields beyond the shadcn Inputs/Textarea (which are own tokens)  

---

## Owner action

The file already has the edit applied. Run:

```bash
npm run update
```

If it passes, commit. No further changes needed on this page.
