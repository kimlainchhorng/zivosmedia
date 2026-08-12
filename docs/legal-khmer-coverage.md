# Legal coverage — English and Khmer, across the four ZIVO apps

**Audited:** 2026-08-10 · **Scope:** Zivo-Admin, ZIVO-ride, zivodriver, zivosmedia

The business trades in Cambodia. This records which legal surfaces exist in
Khmer, which do not, and what to do about it in priority order.

## Coverage today

| App | Legal surfaces | In Khmer | Notes |
| --- | --- | --- | --- |
| ZIVO-ride (riders) | 10 pages | **10 / 10** | Khmer inline in each page; both languages pinned by `npm run test:legal-copy` |
| zivodriver (drivers) | 5 documents | **5 / 5** | `src/content/legal/*.md` + `*.kh.md` pairs |
| zivosmedia | 46 routed pages | **0 / 46** | The app ships a Khmer toggle (`km` / ភាសាខ្មែរ) but every legal page is English-only |
| Zivo-Admin | operator console | n/a | Staff-facing; launch controls already ship EN + KH |

The two consumer apps a Cambodian rider or driver actually signs into are
bilingual. The gap is zivosmedia.

## The zivosmedia gap has two halves

### 1. No Khmer

`src/hooks/useI18n.ts` offers `{ code: "km", label: "ភាសាខ្មែរ" }`, so a user
can switch the interface to Khmer — and then read 46 legal pages in English.
A consent or an agreement presented only in a language the user did not choose
is the weakest form of all of these documents.

### 2. The library is shaped for a US business

Of the 46 routed pages, a large group encodes United States law specifically:

`/legal/california-privacy`, `/legal/do-not-sell`, `/legal/dmca`,
`/legal/seller-of-travel`, `/legal/class-action-waiver`, `/legal/gdpr`
(EU), plus `COMPANY_INFO.governingLaw = "State of Delaware"`.

There is no Cambodia-specific consumer page at all. ZIVO-ride and zivodriver
solved this with a **market-compliance** document that the other pages defer
to; zivosmedia has no equivalent.

Note that a choice-of-law clause generally cannot strip a consumer of the
protections of their own country's law. This is a question for counsel, not a
code change — flagged here because the apps disagree with each other today:
ride and driver hardcode no governing law and defer to market compliance,
while zivosmedia names Delaware.

## Suggested order for Khmer

Translating all 46 is the wrong first move — several do not apply in Cambodia
at all. Translate what a Cambodian user is actually asked to agree to:

1. `/legal/terms` — the agreement itself
2. `/legal/privacy` — the most regulated, and the one consent depends on
3. `/legal/refunds` and `/legal/cancellation` — where money disputes start
4. `/legal/cookies` — the consent banner already gates real tracking pixels
5. `/legal/user-conduct` and `/legal/acceptable-use` — grounds for account action
6. A new Cambodia market-compliance page, mirroring the ride/driver one

Then decide per remaining page whether it applies in Cambodia before spending
translation effort on it.

## Recommended mechanism

Follow the pattern zivodriver already proves, rather than inventing one:

```
src/content/legal/<doc>.md      # English
src/content/legal/<doc>.kh.md   # Khmer
```

imported with `?raw` by a thin page component, with the title/description in
`src/i18n/translations.ts`. It keeps legal text out of JSX, makes the two
languages diffable side by side, and lets a contract test assert that every
document has both halves.

zivosmedia currently has no `src/content/legal/` directory — legal text is
inline in each `.tsx`, which is why no test can compare the languages.

## Business identity — blocking, needs real-world data

`npm run check:business-identity` fails. Three fields in
`src/config/legalContent.ts` are empty strings, so **the site publishes no
business address at all**:

- `COMPANY_INFO.registeredAddress` — the address on the incorporation filing,
  the one a payment processor reconciles against
- `COMPANY_INFO.operationsAddress` — the Phnom Penh street address where the
  business actually trades
- `COMPANY_INFO.supportPhone` — a voice line that answers

These cannot be inferred from the repo. The only street address anywhere in the
four repos is a test fixture (`"12 Street 240"` in
`src/config/legalContent.test.ts`) and must not be published.

## Already fixed in this pass

- `qa:legal-policy-contracts` no longer points at three deleted duplicate pages
  and now reads the consent runtime where it actually lives
  (`public/analytics-bootstrap.js`); consent gating verified intact.
- The canonical-URL contract now requires a **host-aware** canonical for
  `TermsOfService.tsx` and `PrivacyPolicy.tsx`, which render different
  documents per host — a flat `zivosmedia.com` canonical would have
  mis-canonicalised the ZIVO Software terms.
- zivodriver gained a bilingual commission policy
  (`src/content/legal/driver-commission.md` / `.kh.md`) stating the real
  per-market cash rates, because Phnom Penh charges 5% while the other 24
  provinces charge 0%.
