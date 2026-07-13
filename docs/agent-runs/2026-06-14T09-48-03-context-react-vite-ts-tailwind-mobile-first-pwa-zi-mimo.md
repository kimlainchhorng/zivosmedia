# MiMo run — 2026-06-14T09:48:03.067Z

- model: mimo-v2.5-pro
- api_format: anthropic
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

**Verdict: ✅ CORRECT — ready to apply.**

### (1) Short plan

One raw interactive control on this page — the icon-only Back `<button>`. Apply the standard icon-only pass: aria-label + FLIP + scale-95 + ring. All other controls are shadcn (own tokens) or native form fields. Done.

### (2) Precise edit

**File:** `src/pages/app/shop/ShopSettingsPage.tsx` — **L92 BACK button**

**Before:**
```
className="p-2 -ml-2 rounded-full hover:bg-muted/50"
```

**After:**
```
aria-label="Go back"
className="p-2 -ml-2 rounded-full hover:bg-muted/50 transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
```

No other lines change. All `onClick`/`navigate`/`supabase`/react-query/`setState`/`disabled` byte-identical.

### (3) Verification

**Leave-list confirmed (all correct):**

| Control | Why skipped |
|---|---|
| shadcn `<Button>` ×3 (L81 Go to Dashboard, L96 Save, L152 Save Changes) | Own tokens; L96/L152 have `disabled={save.isPending}` |
| shadcn `<Input>` ×3 (L112, L129, L133, L137) | Own tokens, native form fields |
| shadcn `<Textarea>` ×1 (L116) | Own tokens, native form field |
| `<h2>` section headings ×3 | Non-interactive |
| `<label>` elements ×5 | No `htmlFor`, purely visual, non-interactive |
| `<p>` mono URL (L147) | Non-interactive |
| `AppLayout` shell | Own tokens |
| All lucide `<* className>` icons | Decorative |

**No other raw interactive controls missed.** No clickable `<div>`s, no raw `<a>` tags, no raw `<button>`s besides L92. File is a simple settings form — straightforward.

**Guard grep over the diff:**
- className edits: **1** ✅
- new aria: **1** (`aria-label="Go back"`) ✅
- `focus-visible:ring`: **1**, `ring-ring`: **1** (OUTWARD on `bg-background/95` neutral header) ✅
- `ring-inset`: **0** ✅
- `active:scale-95`: **1** (icon-only) ✅
- FLIP: **1** (no-transition → `transition-all` — `hover:bg-muted/50` + new scale both animate) ✅
- competing 2nd press added: **0** ✅
- `disabled` touched: **0** ✅
- 0 logic lines touched ✅

**Owner to verify:** `npm run update` must pass (types + worker + build). This page hits live Supabase (requires a signed-in merchant with a `store_profiles` row); preview the Back button at 375/768/1280 to confirm the ring renders cleanly against the `bg-background/95` sticky header.
