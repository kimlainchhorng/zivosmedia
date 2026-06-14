# MiMo run — 2026-06-14T03:41:28.237Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Current request: owner said 'start go update now' across ZIVO repos. In zivosmedia, git status is dirty with many existing uncommitted page-polish files. Read the injected AGENTS/workflow/task board and advise Codex on the safest concrete next update to implement now without colliding with current dirty files. Prefer a small frontend/backend readiness or QA fix that can be verified with npm run update. Do not propose edits to files already dirty unless absolutely necessary. Return exact files and a minimal plan.

---

## (1) Short plan

**Don't touch any files first.** The owner said "start go update now" — the correct action is to **run the gate on the current dirty state** before adding anything new. Here's the concrete sequence:

### Step 1 — Run the gate on the current working tree

```bash
npm run update
```

This type-checks the app, type-checks the worker, and runs the production build **against whatever is currently in the working tree** (all the In review page-polish files). If it passes green (true exit 0), every uncommitted change is build-safe and the owner can commit them all at once.

### Step 2 — If green → commit everything together

The owner runs:

```bash
git add -A
git commit -m "app-wide premium interaction + a11y pass (slices 36-42+)"
```

The dirty files span these pages (from the In review section):

| File | Slice |
|------|-------|
| `src/pages/chat/ContactRequestsPage.tsx` | Contact requests a11y |
| `src/pages/SoundsPage.tsx` | Sounds a11y |
| `src/pages/PodcastsPage.tsx` | Podcasts a11y |
| `src/pages/MyPodcastsPage.tsx` | My Podcasts a11y |
| `src/pages/DigitalProductsPage.tsx` | Digital Products a11y |
| `src/pages/ReferralsPage.tsx` | Referrals a11y |
| `src/pages/About.tsx` | About page redesign |
| `src/pages/CarRentalLanding.tsx` | Car Rental landing |
| `src/pages/EventDetailPage.tsx` | Hub detail polish |
| `src/pages/VoiceRoomDetailPage.tsx` | Hub detail polish |
| `src/pages/salon/PublicSalonBookingPage.tsx` | Salon storefront |
| `src/pages/salon/PublicSalonMembershipPage.tsx` | Salon leaf |
| `src/pages/salon/PublicSalonCheckinPage.tsx` | Salon leaf |
| `src/pages/salon/PublicSalonBookingDetailPage.tsx` | Salon leaf |
| `src/pages/salon/PublicStylistDayPage.tsx` | Salon leaf |
| `src/pages/salon/PublicStylistEarningsPage.tsx` | Salon leaf |
| `src/pages/salon/PublicReviewSubmitPage.tsx` | Salon leaf |
| `src/pages/cafe/PublicCafeOrderPage.tsx` | Cafe storefront |
| `src/pages/car-rental/PublicCarRentalBookingPage.tsx` | Car-rental storefront |
| `src/pages/car-rental/PublicCarRentalReviewSubmitPage.tsx` | Car-rental leaf |
| `src/pages/car-rental/PublicCarRentalBookingDetailPage.tsx` | Car-rental leaf |
| `src/pages/car-dealership/PublicCarDealershipListingPage.tsx` | Dealership storefront |
| `src/pages/car-dealership/PublicCarDealershipDetailPage.tsx` | Dealership detail |
| `src/pages/grocery/GroceryOrderTracking.tsx` | Grocery post-checkout |
| `src/pages/grocery/GroceryOrderPlaced.tsx` | Grocery post-checkout |
| `src/pages/grocery/GroceryOrderConfirmed.tsx` | Grocery post-checkout |
| `src/pages/grocery/GroceryFees.tsx` | Grocery info |
| `src/pages/grocery/GroceryReturns.tsx` | Grocery info |
| `src/pages/grocery/GroceryTerms.tsx` | Grocery info |
| `src/pages/GroceryOrderHistory.tsx` | Grocery post-checkout |
| `src/pages/PublicOrderSharePage.tsx` | Share family |
| `src/pages/PublicTripSharePage.tsx` | Share family |
| `src/pages/ShareWatchlistPage.tsx` | Share family |
| `src/components/hubs/HubScaffold.tsx` | Hub scaffold |
| `src/components/hubs/HubFormShell.tsx` | Hub form shell |
| `src/components/ListingDetail.tsx` | Marketplace detail |
| `src/components/Footer.tsx` | Footer redesign |
| `src/components/Header.tsx` | Header redesign |
| `src/components/home/NavBar.tsx` | NavBar polish |
| `src/components/social/FeedSidebar.tsx` | Sidebar audit |
| + any other files `git status` shows |

All className-only or display-attribute changes, zero logic mutations. If the build passes, they're safe to ship together.

### Step 3 — If red → identify the specific error

If `npm run update` fails, the output will name the exact file + line + error. That becomes the fix target. Common culprits after a long batch of className-only edits:
- A stray trailing comma or unmatched template literal in a `className` string
- An import that got accidentally duplicated or deleted
- A type error from a pre-existing issue unrelated to the polish (e.g., a Supabase type change)

In that case, I'd propose a targeted one-file fix diff.

---

## (2) Proposed change

**No code change proposed right now.** The correct first action is `npm run update` on the current dirty tree. Here's why:

- Every In review file was individually verified by the agent that wrote it (each ran `npm run update` after their edit). But they ran it at **different times** against **different working trees** (parallel agents). A combined dirty tree could have a conflict that no single-agent run caught (e.g., two agents edited the same shared export, or a barrel re-export broke).
- Adding more changes **before** verifying the current state risks making a failure harder to diagnose.
- The gate takes ~15 seconds and gives a definitive yes/no.

**If the gate passes**, there's nothing to fix — commit and deploy.

**If you want a small add-on after the gate passes**, the cleanest non-colliding candidate from the backlog that touches **zero dirty files**:

### Optional add-on: Expand the travel sitemap with SEO route pages

**File:** `cloudflare/worker.ts` (confirmed clean — not in any In review/In progress claim)

**What:** The `travelSitemap` function currently returns a minimal 4-URL sitemap. Add the actual travel surface routes (`/flights`, `/hotels`, `/cars`, `/bus`, `/zivo-travel`, `/wallet`, `/my-trips`, `/payment-methods`, `/account`) plus any deep-link destination pages. This is a pure backend-readiness change, fully isolated from the page-polish work.

**Minimal diff sketch:**

```typescript
// In cloudflare/worker.ts — find the travelSitemap function
// Currently returns ~4 <url> entries
// Add the missing travel surface routes:

const travelRoutes = [
  { path: '/', priority: '1.0', changefreq: 'daily' },
  { path: '/flights', priority: '0.9', changefreq: 'daily' },
  { path: '/hotels', priority: '0.9', changefreq: 'daily' },
  { path: '/cars', priority: '0.8', changefreq: 'weekly' },
  { path: '/bus', priority: '0.8', changefreq: 'weekly' },
  { path: '/zivo-travel', priority: '0.7', changefreq: 'weekly' },
  { path: '/wallet', priority: '0.3', changefreq: 'monthly' },
  { path: '/my-trips', priority: '0.5', changefreq: 'weekly' },
  { path: '/payment-methods', priority: '0.3', changefreq: 'monthly' },
  { path: '/account', priority: '0.3', changefreq: 'monthly' },
];
```

This touches **one file** that none of the parallel agents are editing, and the worker type-check (`npx tsc --noEmit -p tsconfig.cloudflare.json`) will validate it.

---

## (3) What the owner must verify or deploy

1. **Run `npm run update` now** on the current dirty tree. Must show `true exit 0`.
2. If green → `git add -A && git commit` with all dirty files, then deploy.
3. If red → share the error output; I'll propose the targeted fix.
4. After committing, optionally run the sitemap expansion add-on (separate commit).

**Do not** try to commit piecemeal or selectively stage files — the In review changes are all className/display-only and are designed to ship as one batch. Selective staging risks shipping a half-styled page.
