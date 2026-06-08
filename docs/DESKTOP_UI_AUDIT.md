# Desktop UI Audit

## Scope

Desktop screenshots were captured at 1440px for all public domains and local routes under `docs/ui-audit-screenshots/`.

## Desktop Status Summary

- Most public domains load, but several read as generic ZIVO/feed pages rather than dedicated product sites.
- Zivo Travel has the clearest product framing.
- Zivo Admin domain is not reachable in the captured audit.
- Desktop hub navigation needs a consistent app switcher and shared identity/payment entry.
- Admin and payment routes exist locally but need clearer production admin dashboard framing.

## Priority Desktop Findings

| Finding | Affected screens | Recommended fix | Priority |
| --- | --- | --- | --- |
| `zivoadmin.com` unavailable | Admin domain | Publish admin shell and health check. | P0 |
| `/hotels` route mismatch | Local hotel route | Correct content routing before visual polish. | P0 |
| Dedicated domains are generic | Driver, Business, Employee | Build domain-specific landing pages. | P1 |
| Payment/billing entry is not obvious | Wallet, checkout, business, software | Add ZivoPay/Zivosmedia Payments entry points. | P1 |
| Support is not consistently visible | All app domains | Add ZivoChat support CTA and route metadata. | P1 |
| App switching is inconsistent | All domains | Add unified app switcher component after identity plan approval. | P1 |

## Desktop Design Notes

Desktop screens should prioritize clear platform identity, scan-friendly navigation, and operational density for admin/business dashboards. Avoid making every app feel like the same social feed.