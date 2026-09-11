# Zivo Business restaurant menus in customer Home

The customer Home at `/app/home` (also `/index`) includes the restaurant menus shared through Zivo Business. It uses the existing Home sign-in boundary and does not change the Eats phone gate, checkout, account identity, payment, or dispatch flows.

## Deployment configuration

Set this **public build-time** variable in the Media deployment environment before building:

```dotenv
VITE_ZIVO_BUSINESS_CATALOG_URL=https://gzyktwcanrrkosieecxs.supabase.co/functions/v1/public-merchant-catalog
```

This is a public read endpoint, not a credential. Do not include an API key, session token, or service-role key. The catalog request omits credentials. Keep the endpoint in deployment configuration; do not add another project's backend URL as a source default.

Missing or invalid configuration makes no fetch request and displays “Restaurant menus are not connected here yet.” This change does not configure a deployment, enable a merchant, or establish that the endpoint is live. A deployment must use a verified Business catalog release and permit the Media origin through its public response policy.

## Publication and ordering boundaries

Business emits `menu_url` only when the restaurant has explicitly enabled both `public_menu_enabled` and `public_discovery_enabled`. Existing QR menus must not be automatically listed on other apps. Media never invents a menu link from a restaurant name, order link, or product row. Existing eligible ordering rows retain their separate catalog ordering contract.

- A trusted `menu_url` can render without product rows. It must point to a permitted HTTPS Business host at `/order/restaurant/{slug}?view=menu`, with no credentials or explicit port.
- A menu-only restaurant shows **View menu**, has no ordering estimate, and sends the customer to the published menu.
- **Open menu & order** requires a trusted `order_url`, matching restaurant product rows, and `is_open !== false`. A published menu alone cannot enable ordering. Preparation time is shown only when the catalog provides a valid value for an orderable restaurant.
- Links preserve menu view and set the customer's `lang=en|km` and `source=zivos`; no session is transferred.
- Empty, not configured, malformed, and failed request states remain distinct. Only failed requests get one automatic retry and an explicit Try again action.

## Focused verification

```sh
npm test -- src/lib/zivoBusinessRestaurantCatalog.test.ts src/components/home/ZivoBusinessRestaurantCards.test.tsx --maxWorkers=1
node scripts/qa/zivo-business-restaurant-catalog-ui.mjs /tmp/zivo-media-menus-ui
npm run type-check
```

The browser fixture is isolated from customer accounts and intercepts its catalog with labeled example records. It checks English/Khmer, 320/390/1024px layouts, Media's existing light-only palette even with a stored dark class, the two link behaviors, failure/empty/configuration states, and retry. This is fixture evidence, not authenticated or production availability evidence.

Before release, coordinate the repository's full `npm run update` gate with other active builds. A web build/deploy does not update an already installed native bundle.
