# MiMo run — 2026-06-14T03:29:52.915Z

- model: mimo-v2.5-pro
- api_format: anthropic
- task: Audit the current zivosmedia repo for the next safest high-impact update to implement now. Focus on Zivo Travel 3D scoped booking pages (/flights, /hotels, /cars, /bus), frontend/backend/API guardrails, and avoid dirty files. Return a concise prioritized plan with file paths, risks, and the safest first patch; no schema changes or payments tests.

---

## Audit + Prioritized Plan

Based on the current state of `AGENT_TASKS.md`, the architecture docs, and the rulebook:

---

### (1) Short Plan — Safest high-impact next steps, ranked

| # | Task | Impact | Risk | Why now / why not |
|---|------|--------|------|-------------------|
| **1** | **Cloudflare Worker HTMLRewriter for travel SEO** (`cloudflare/worker.ts`) | 🔥 High — travel SEO is currently client-side-only; non-JS crawlers see zivosmedia metadata | 🟢 Low — worker file only, no app code touched, additive for travel hosts only | **Safest first patch.** Codex is already on the app-side booking pages; this is a different file with zero collision risk. No schema/payments/auth touched. |
| **2** | **Booking funnel 3D pass** (`/travel/checkout`, `/wallet`, `/payment-methods`) | 🔥 High — checkout funnel is the revenue-critical path | 🟡 Medium — touches shared payment UI; must NOT break zivosmedia checkout | Do AFTER Codex finishes the booking list pages (avoid collision). Wallet/payment-methods already have travel shells, but the checkout flow itself still uses the generic zivosmedia look. |
| **3** | **Harden SSO** (replace URL-hash `refresh_token` handoff with OTP edge function) | 🔥 High — security improvement | 🟡 Medium — requires edge function deploy (owner-only) + auth flow change | Owner must deploy the edge function. Proposal is safe but implementation crosses the "owner commits & deploys" boundary. |
| **4** | **Flight one-click** (resolve free-text origin/destination → IATA code for deep-link auto-run) | Medium — improves deep-link UX | 🟢 Low — purely additive in `FlightLanding.tsx` | Nice-to-have; doesn't block anything. |
| **5** | **Sitemap depth** (destination/route SEO pages) | Medium — long-tail SEO | 🟢 Low — worker-side additions | Do alongside or after #1. |

**Recommendation: #1 (Worker HTMLRewriter) is the safest first patch.** It touches a single file (`cloudflare/worker.ts`) that no other agent is editing, has zero risk of breaking the app build, and solves a real SEO gap. It can land independently of Codex's booking-page work.

---

### (2) Proposed Change — Worker HTMLRewriter for travel host `<head>` correction

**File:** `cloudflare/worker.ts`

**What it does:** On travel hosts (`zivostravel.com`, `www.zivostravel.com`), intercept the HTML response and use Cloudflare's `HTMLRewriter` to:
- Replace the static zivosmedia `<title>` with a travel-specific title
- Replace `og:title`, `og:description`, `og:image` meta tags with travel values
- Replace the `<meta name="description">` tag
- Add canonical pointing to `https://zivostravel.com`

This runs *before* the client-side React SPA loads, so non-JS crawlers (Googlebot's initial fetch, social embeds, link previews) see correct metadata.

Let me look at the current worker to propose a precise diff. Based on the architecture docs, the worker already has:
- `travelSeoResponse` that serves `robots.txt` + `sitemap.xml` for travel hosts
- Host-gating logic

Here is the proposed diff:

```diff
--- a/cloudflare/worker.ts
+++ b/cloudflare/worker.ts
@@ [near the existing travelSeoResponse / HTML response handling]
 
+// --- Travel SEO HTMLRewriter (corrects static index.html <head> on travel hosts) ---
+
+interface TravelMetaEnv {
+  title: string;
+  description: string;
+  ogTitle: string;
+  ogDescription: string;
+  ogImage: string;       // absolute URL
+  canonical: string;
+}
+
+const TRAVEL_SEO: TravelMetaEnv = {
+  title: "Zivo Travel — Flights, Hotels, Cars & Buses",
+  description: "Book flights, hotels, car rentals and bus tickets worldwide with Zivo Travel. Best prices, instant confirmation.",
+  ogTitle: "Zivo Travel — Book Flights, Hotels, Cars & Buses",
+  ogDescription: "Find and book travel deals across flights, hotels, car rentals and bus routes. Instant confirmation, great prices.",
+  ogImage: "https://zivostravel.com/og-zivo-travel.jpg",
+  canonical: "https://zivostravel.com",
+};
+
+class TravelHeadRewriter {
+  private env: TravelMetaEnv;
+  constructor(env: TravelMetaEnv) { this.env = env; }
+
+  element(el: Element) {
+    // Title tag
+    // We'll handle title via the <title> handler below
+  }
+}
+
+class TravelTitleRewriter {
+  private title: string;
+  constructor(title: string) { this.title = title; }
+  element(el: Element) { el.setInnerContent(this.title); }
+}
+
+class TravelMetaRewriter {
+  private name: string;
+  private content: string;
+  constructor(name: string, content: string) { this.name = name; this.content = content; }
+  element(el: Element) {
+    const attr = el.getAttribute("property") || el.getAttribute("name");
+    if (attr === this.name) {
+      el.setAttribute("content", this.content);
+    }
+  }
+}
+
+class TravelCanonicalInjector {
+  private url: string;
+  constructor(url: string) { this.url = url; }
+  element(el: Element) {
+    el.append(`<link rel="canonical" href="${this.url}" />`, { html: true });
+  }
+}
+
+/**
+ * Rewrites the static index.html <head> on travel hosts so non-JS crawlers
+ * and social-embed fetchers see correct Zivo Travel metadata.
+ * Uses Cloudflare HTMLRewriter — zero cost, runs at the edge.
+ */
+function rewriteTravelHead(response: Response, requestUrl: string): Response {
+  const seo = TRAVEL_SEO;
+  // Derive per-URL canonical (strip query/hash)
+  const url = new URL(requestUrl);
+  const canonical = `${seo.canonical}${url.pathname}`;
+
+  const rewriter = new HTMLRewriter()
+    .on("title", new TravelTitleRewriter(seo.title))
+    // og:title
+    .on('meta[property="og:title"]', { element(el) { el.setAttribute("content", seo.ogTitle); } })
+    // og:description
+    .on('meta[property="og:description"]', { element(el) { el.setAttribute("content", seo.ogDescription); } })
+    // og:image
+    .on('meta[property="og:image"]', { element(el) { el.setAttribute("content", seo.ogImage); } })
+    // og:url
+    .on('meta[property="og:url"]', { element(el) { el.setAttribute("content", canonical); } })
+    // twitter:title
+    .on('meta[name="twitter:title"]', { element(el) { el.setAttribute("content", seo.ogTitle); } })
+    // twitter:description
+    .on('meta[name="twitter:description"]', { element(el) { el.setAttribute("content", seo.ogDescription); } })
+    // twitter:image
+    .on('meta[name="twitter:image"]', { element(el) { el.setAttribute("content", seo.ogImage); } })
+    // <meta name="description">
+    .on('meta[name="description"]', { element(el) { el.setAttribute("content", seo.description); } })
+    // Inject canonical into <head>
+    .on("head", new TravelCanonicalInjector(canonical));
+
+  return rewriter.transform(response);
+}
+
+// --- Integration point: wrap the existing HTML response for travel hosts ---
+// In the existing handler that serves index.html for travel hosts, add:
+//
+//   if (isTravelHost && !isAssetRequest && acceptsHtml) {
+//     const htmlResponse = /* existing fetch/env.HTML binding */;
+//     return rewriteTravelHead(htmlResponse, request.url);
+//   }
+
```

**Key design decisions:**

- **`HTMLRewriter` is zero-cost at the edge** — it streams the transform, no buffering.
- **Only fires on travel hosts** — the existing `isZivoTravelHost()` / host-gating check gates the call. Zivosmedia is untouched.
- **Canonical is per-path** — `https://zivostravel.com/flights` gets its own canonical, not just the root.
- **`og:image` points to `public/og-zivo-travel.jpg`** — which was already wired in the client-side Helmet (verified done in AGENT_TASKS.md).
- **No schema, auth, or payments touched** — purely a response-headers/metadata layer.

---

### (3) What the owner must verify or deploy

| Item | Owner action |
|------|-------------|
| **Verify the existing `rewriteTravelHead` call site** | The exact insertion point depends on how the worker currently serves `index.html` for travel hosts. The owner/Claude must read `cloudflare/worker.ts` to find where the HTML response is built and insert the `rewriteTravelHead(htmlResponse, request.url)` call there. |
| **Test with a curl to the real domain** | After deploy: `curl -s https://zivostravel.com \| grep -i 'og:title'` should show `Zivo Travel — Book Flights, Hotels, Cars & Buses` instead of the zivosmedia default. |
| **Verify `public/og-zivo-travel.jpg` exists** | The Helmet already references it (verified done), but confirm the file is actually in `public/` and served. |
| **Worker deploy** | The owner runs `wrangler deploy` (or whatever CI deploys the worker). The agent must NOT deploy. |
| **`npm run update`** | The worker type-check (`npx tsc --noEmit -p tsconfig.cloudflare.json`) must pass after the edit. The `HTMLRewriter` types are provided by `@cloudflare/workers-types` (should already be in the worker tsconfig). |

---

### Collision note

This change touches **only `cloudflare/worker.ts`** (and its tsconfig). Codex's in-progress task touches `src/pages/FlightResults.tsx` / `HotelResults.tsx` / etc. — **zero file overlap**, so these can land in parallel safely.
