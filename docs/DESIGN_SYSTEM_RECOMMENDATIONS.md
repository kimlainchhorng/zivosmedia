# ZIVO Design System Recommendations

Author: Claude · Date: 2026-06-07
Basis: Codex live screenshot audit (`LIVE_WEBSITE_UI_AUDIT.md`, `MOBILE_UI_AUDIT.md`,
`DESKTOP_UI_AUDIT.md`, per-app `*_WEBSITE_AUDIT.md`) + independent review of the real
screenshots in `docs/ui-audit-screenshots/` across mobile / tablet / desktop, cross-checked
against the live token source (`src/index.css`, `src/components/ui/button.tsx`, `src/pages/Login.tsx`).

This is a synthesis/decision layer that builds on Codex's audit. It does not modify Codex's
audit docs and does not approve any production UI, auth, payment, DNS, or deployment change.

---

## TL;DR

ZIVO already has a **real, well-considered design system** in `zivosmedia` (Instagram-style
mono: black ink on white, hairline borders, a typed product-accent palette, a soft shadow ramp).
The problem is **not the absence of a system — it is that the highest-traffic surfaces bypass it**,
and that per-app theming is hardcoded in page components instead of being driven by tokens. The
result reads on screen as three unrelated brands and a primary call-to-action that looks broken
on first load.

Three root causes, all confirmed in screenshots **and** code:

1. **Auth CTAs bypass the component system and fail contrast.** Login/Signup/Chat render a raw
   `<button class="bg-ig-gradient … disabled:opacity-40">`, not the `<Button>` component. On a
   first visit the form is empty, so the button is disabled at **40% opacity** — that is the
   washed-out peach→pink wash with unreadable white text seen on every auth screenshot.
2. **Per-app brand is hardcoded per domain, not tokenized.** `Login.tsx` literally switches
   `isZivoSoftwareDomain ? "bg-[#101412]" : "bg-ig-gradient"`. That conditional-per-domain pattern
   is why the hub looks red/pink, travel looks blue, and software looks green/black with no shared
   identity.
3. **The system's own rules are violated.** `index.css` says the IG gradient is "used only for
   accents (logo, story rings, like burst), **never for surfaces**." It is being used as a button
   surface on the most important CTA in the product.

Fix the foundation first (tokens + one `<Button>` everywhere + per-app accent token), and every
downstream item in the audit — "Continue with Zivosmedia," driver/business landing pages, ZivoChat
support, ZivoPay context — inherits a consistent look for free.

---

## What already exists (do not rebuild this)

From `src/index.css` (`:root`):

| Token group | Values in place | Verdict |
| --- | --- | --- |
| Base mono | `--background 0 0% 100%`, `--foreground 0 0% 0%`, `--primary 0 0% 0%`, `--primary-foreground 0 0% 100%` | Good. Black-on-white primary is high contrast. |
| Product accents | `--flights 221 83% 53%` (blue), `--hotels 38 92% 50%` (amber), `--cars 263 70% 50%` (purple), `--rides 160 84% 39%` (emerald), `--eats 0 84% 60%` (red), `--more` (slate) | Good and already per-vertical. This is the seam to theme apps. |
| Accent / link | `--ig-blue 204 100% 50%`, `--accent` | Good. |
| Shadow ramp | `--shadow-xs … --shadow-xl`, `--shadow-card` | Good, Ramp-style. |
| Radius | `--radius 0.5rem` | Present, but components override (`rounded-lg`/`xl`/`2xl`) inconsistently — see below. |
| `<Button>` variants | `default` (black), `hero` (foreground/bg), `outline`, `secondary`, `ghost`, `rides`, `eats`, `ig`, `glass` | Solid. `default` and `hero` are the correct high-contrast primaries. |

The black, high-contrast primary you see on `/hotels` ("Switch to Cambodia") and `zivosoftware.com`
("Create Business Software") is the system working as designed. The pale auth CTA is the system
being bypassed.

---

## Defects (screenshot-grounded)

| # | Defect | Evidence (screenshot · viewport) | Root cause | Severity |
| --- | --- | --- | --- | --- |
| D1 | Primary auth CTA reads as washed-out / disabled on first load; white-on-pale fails WCAG contrast | `local/login/desktop-1440.png`, `local/login/iphone-15-pro.png`, `local/signup/iphone-13.png`, `public/zivoschat-com/desktop-1440.png` | Raw `<button bg-ig-gradient disabled:opacity-40>` in `src/pages/Login.tsx:877`/`Signup.tsx`; empty form ⇒ 40% opacity | **P1** |
| D2 | Three unrelated visual languages across the ecosystem | hub red/pink `public/zivosmedia-com/desktop-1440.png`; travel blue `public/zivostravel-com/ipad.png`; software green/black `public/zivosoftware-com/desktop-1440.png` | Per-domain styling hardcoded in components (`isZivoSoftwareDomain ? … : …`) instead of a per-app accent token | **P1** |
| D3 | IG gradient used as a button surface, against the system's own stated rule | login/signup/chat CTA | `bg-ig-gradient` applied to a surface; `index.css` says accents only | **P1** |
| D4 | Service entry points use emoji glyphs, not the icon/accent token set | `local/home/iphone-15-pro.png`, `public/zivodriver-com/iphone-15-pro.png` ("More Services": 🚗🍱✈️🧳…) | Emoji literals instead of a `lucide`/accent-token icon component | **P2** |
| D5 | Logo / wordmark / casing drift | "Zivo" mono mark (login) vs "ZIVO TRAVEL" blue (`public/zivostravel-com/ipad.png`) vs "ZIVO SOFTWARE" green (`…software…`) vs "ZIVO Chat" (`…zivoschat…`) | No shared brand-lockup component; casing not standardized | **P2** |
| D6 | Internal token contradiction: `--sidebar-primary` is emerald `142 71% 45%` while app `--primary` is black | `src/index.css` sidebar block | Sidebar tokens predate the IG-mono primary | **P3** |
| D7 | Radius scale applied inconsistently (`rounded-lg` on auth button vs `rounded-xl`/`2xl` in `<Button>`) | login button `h-10 rounded-lg` vs `buttonVariants` `rounded-xl` | Raw elements don't inherit component radius | **P3** |

> D1's nuance matters: the IG gradient itself is vibrant; the *disabled* state at `opacity-40` is
> what produces the broken-looking pale CTA. Even once enabled, white text on the mid-gradient is
> marginal. Both the bypass and the disabled-state legibility need fixing.

---

## Recommendations

### R1 — Route every primary action through `<Button>` (kills D1, D3, D7)
Replace the raw auth `<button>` in `Login.tsx`, `Signup.tsx`, and the chat login with
`<Button variant="default">` (black) or a new `variant="brand"`. Never apply `bg-ig-gradient` to a
button surface. If a branded CTA is desired, define a **gradient token that meets 4.5:1 with white**
and gate the disabled state on a token (`disabled:bg-muted disabled:text-muted-foreground`) rather
than `opacity-40`, so a disabled control still reads as a control, not a ghost.

Acceptance: every submit/primary CTA is a `<Button>`; axe/contrast check ≥ 4.5:1 in both enabled
and disabled states; no `bg-ig-gradient` on an interactive surface.

### R2 — Make per-app brand a token, not a code branch (kills D2)
Introduce a single semantic brand seam and drive it from the host/app, not from `isZivoSoftwareDomain`
conditionals sprinkled in pages:

```css
/* per-app theme: set --brand-* once at the app shell / data-app attribute */
[data-app="hub"]      { --brand: var(--eats);    /* red */ }
[data-app="travel"]   { --brand: var(--flights); /* blue */ }
[data-app="software"] { --brand: 142 71% 45%;    /* green */ }
[data-app="driver"]   { --brand: var(--rides);   /* emerald */ }
```

Components consume `--brand` / `bg-brand text-brand-foreground`. This keeps each vertical's accent
(blue travel, green software) **as an accent on one shared shell**, instead of three separate-looking
products. Decision needed from owner (see Open Questions): *unified ZIVO masterbrand with vertical
accents* (recommended) vs *independent sub-brands*.

### R3 — One shared Auth shell + brand lockup (supports cross-app work)
The Login, Signup, and Chat auth cards are near-identical templates. Extract a single `<AuthShell>`
(logo lockup, card, inputs, primary CTA, "OR", secondary, footer) and a `<BrandLockup app=…/>`
that standardizes the mark + "ZIVO {App}" wordmark + casing (kills D5). This is the natural home for
the **"Continue with Zivosmedia"** button (see `CROSS_APP_NAVIGATION_FIXES.md`) so it lands once and
appears everywhere.

### R4 — Replace emoji service tiles with a typed icon set (kills D4)
Build `<ServiceTile icon accent label>` backed by `lucide-react` + the product-accent tokens
(`--flights`, `--hotels`, …). Removes the casual emoji look on the most-seen "More Services" grid and
makes tiles theme-aware and accessible (emoji are read literally by screen readers).

### R5 — Reconcile internal token contradictions (kills D6, D7)
Re-derive `--sidebar-primary` from `--primary`/`--brand`; standardize the control radius (pick
`rounded-xl` for buttons/inputs) and remove ad-hoc `rounded-lg` on raw elements.

### R6 — Tokens are the contract for the separate apps
`zivosmedia` serves travel/software/business/chat-config in one build, but **`zivodriver` and
`ZIVO-CHAT` are separate apps** (see platform topology). Publish the token layer (CSS variables +
Tailwind preset) as the shared contract those repos import, so "Continue with Zivosmedia," buttons,
and the consent banner look identical off-build. Short term: mirror `index.css` `:root` + the
`tailwind.config.ts` theme into those repos; medium term: extract `@zivo/tokens`.

---

## Suggested first PRs (foundation before polish)

| PR | Scope | Repo | Unblocks |
| --- | --- | --- | --- |
| DS-1 | Auth CTAs → `<Button>`; fix disabled-state legibility; remove `bg-ig-gradient` from surfaces | `zivosmedia` | D1, D3, contrast on login/signup/chat |
| DS-2 | `--brand` per-app token + `data-app` seam; delete `isZivoSoftwareDomain`-style style branches | `zivosmedia` | D2, cross-app cohesion |
| DS-3 | `<AuthShell>` + `<BrandLockup>` extraction | `zivosmedia` | D5, home for "Continue with Zivosmedia" |
| DS-4 | `<ServiceTile>` icon set; consent banner componentization (see workflow doc) | `zivosmedia` | D4, mobile first-impression |
| DS-5 | Publish tokens/preset to `zivodriver` + `ZIVO-CHAT` | all apps | off-build consistency |

See `PRIORITY_UI_ROADMAP.md` for how these sequence against the workflow and cross-app fixes.
