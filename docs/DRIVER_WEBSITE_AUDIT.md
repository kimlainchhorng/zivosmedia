# Driver Website Audit

Scope: `https://zivodriver.com` and local `/driver/orders`.

## Evidence

| Screen | Screenshot Paths | Result |
| --- | --- | --- |
| Public driver domain | `docs/ui-audit-screenshots/public/zivodriver-com/desktop-1440.png`, `iphone-13.png`, `iphone-15-pro.png`, `ipad.png` | Loads a generic ZIVO feed/super-app surface instead of a driver landing page. |
| Driver orders route | `docs/ui-audit-screenshots/local/driver-orders/desktop-1440.png`, `iphone-13.png`, `iphone-15-pro.png`, `ipad.png` | Loads an empty shopping/orders driver page. |

## Findings

| Area | Finding | Recommended Fix | Priority |
| --- | --- | --- | --- |
| Brand consistency | `zivodriver.com` does not identify itself as Zivo Driver in the first viewport. | Replace placeholder with a real driver landing page. | P1 |
| CTA clarity | Missing Apply to Drive, Sign in, Become a Driver, and Continue with Zivosmedia. | Add driver-specific header and hero CTAs. | P1 |
| Workflow clarity | No explanation of Travel booking to Driver job, accept/reject, customer status, or payout. | Add connected workflow section. | P1 |
| Payment connection | No visible driver payout or supported provider roadmap. | Add earnings and payout section with Stripe first, PayPal/Square later. | P1 |
| Support | No “Open ZivoChat” support CTA on public driver page. | Add support section and later wire chat thread context. | P1 |
| Legal | No driver-specific Privacy Policy or Terms of Service visible on public driver page. | Add real legal links before driver launch. | P1 |
| Mobile | Cookie banner blocks most first-viewport content on the generic feed. | Reduce banner footprint after consent UX review. | P1 |
| Local orders empty state | `/driver/orders` says no orders available but does not explain driver jobs. | Add Travel Driver job empty state and payout/support placeholders. | P1 |

## Required P1 Driver Landing Page

Do not implement in this documentation PR. The first driver UI PR should replace the placeholder landing page with:

1. Header
   - Zivo Driver logo/name
   - Continue with Zivosmedia
   - Sign in
   - Become a Driver

2. Hero
   - Headline: Drive with Zivo. Earn on your schedule.
   - Subtext: Accept trips, airport transfers, delivery jobs, and travel-driver requests from Zivo Travel.
   - CTA: Apply to Drive
   - CTA: Sign in with Zivosmedia

3. How it works
   - Apply
   - Verify documents
   - Accept jobs
   - Complete trips
   - Get paid

4. Connected workflow
   - Zivo Travel booking can create driver job
   - Driver accepts/rejects
   - Customer sees status
   - Driver payout after completion

5. Earnings
   - Job earnings
   - Tips
   - Payout status
   - Stripe/PayPal/Square payout support later

6. Safety and trust
   - Verification
   - Support
   - Secure payouts
   - Audit logs

7. Support
   - Open ZivoChat
   - Contact support

8. Legal
   - Real Privacy Policy
   - Real Terms of Service