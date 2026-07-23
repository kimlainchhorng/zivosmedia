type R2PutOptions = {
  httpMetadata?: Headers | Record<string, string>;
  customMetadata?: Record<string, string>;
};

type R2Object = {
  body?: ReadableStream;
  httpEtag: string;
  size: number;
  uploaded: Date;
  range?: { offset: number; length: number };
  writeHttpMetadata(headers: Headers): void;
};

type R2Bucket = {
  get(key: string, options?: { range?: Headers }): Promise<R2Object | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | string | null, options?: R2PutOptions): Promise<R2Object>;
  delete(key: string): Promise<void>;
};

type Fetcher = {
  fetch(request: Request): Promise<Response>;
};

type Env = {
  ASSETS?: Fetcher;
  ZIVO_MEDIA: R2Bucket;
  ALLOWED_ORIGINS?: string;
  MEDIA_WRITE_TOKEN?: string;
  DEEPSEEK_API_KEY?: string;
  ANTHROPIC_API_KEY?: string;
  CLAUDE_API_KEY?: string;
  CHANNEL_OG_FUNCTION_URL?: string;
  SUPABASE_URL?: string;
  ZIVO_SOFTWARE_SUPABASE_URL?: string;
  ZIVO_TRAVEL_SUPABASE_URL?: string;
};

type ZivoHtmlRewriterElement = {
  append(content: string, options?: { html?: boolean }): void;
  remove(): void;
};

type ZivoHtmlRewriterInstance = {
  on(
    selector: string,
    handler: { element(element: ZivoHtmlRewriterElement): void | Promise<void> },
  ): ZivoHtmlRewriterInstance;
  transform(response: Response): Response | Promise<Response>;
};

declare const HTMLRewriter: {
  new(): ZivoHtmlRewriterInstance;
};

const WINDOW_MS = 10 * 60 * 1000;
const AUTH_LIMIT = 80;
const GENERAL_LIMIT = 600;
const AI_LIMIT = 40;
const buckets = new Map<string, { count: number; resetAt: number }>();

const DEFAULT_ALLOWED_ORIGINS = [
  "https://zivosmedia.com",
  "https://www.zivosmedia.com",
  "https://admin.zivosmedia.com",
  "https://zivoschat.com",
  "https://www.zivoschat.com",
  "https://zivosoftware.com",
  "https://www.zivosoftware.com",
  "https://zivobusiness.com",
  "https://www.zivobusiness.com",
  "https://zivodriver.com",
  "https://www.zivodriver.com",
  "https://zivoadmin.com",
  "https://www.zivoadmin.com",
  "https://zivoemployee.com",
  "https://www.zivoemployee.com",
  "https://zivostravel.com",
  "https://www.zivostravel.com",
  "https://app.zivosmedia.com",
  "https://preview.zivosmedia.com",
  "https://zivo-web.myzivo.workers.dev",
  "http://localhost:8081",
  "http://localhost:5173",
  "http://localhost:5174",
];

const CHAT_HOSTS = new Set([
  "zivoschat.com",
  "www.zivoschat.com",
]);

const SOFTWARE_HOSTS = new Set([
  "zivosoftware.com",
  "www.zivosoftware.com",
]);

const SOFTWARE_ORIGIN = "https://zivosoftware.com";
const SOFTWARE_THEME_COLOR = "#10b981";
const SOFTWARE_BACKGROUND_COLOR = "#f2f9f4";
// The generic brand icon is intentionally used until an actual anonymized
// Software QA capture is approved. `/og-image.png` is a Travel creative and
// must never leak into Software social previews.
const SOFTWARE_IMAGE_URL = `${SOFTWARE_ORIGIN}/pwa-icons/icon-512x512.png`;
const SOFTWARE_IMAGE_ALT = "ZIVO Software";
const SOFTWARE_DEFAULT_TITLE = "ZIVO Software | Business Management Software";
const SOFTWARE_DEFAULT_DESCRIPTION =
  "Business management software for customers, vehicles, appointments, inspections, estimates, repair orders, invoices, inventory, staff and reporting.";

const SOFTWARE_ROUTE_META = [
  {
    prefix: "/terms-of-service",
    title: "Terms of Service | ZIVO Software",
    description: "Review the terms that govern use of ZIVO Software.",
  },
  {
    prefix: "/privacy-policy",
    title: "Privacy Policy | ZIVO Software",
    description: "Learn how ZIVO Software handles account, business and service data.",
  },
  {
    prefix: "/login",
    title: "Sign In | ZIVO Software",
    description: "Sign in to your ZIVO Software workspace.",
    private: true,
  },
  {
    prefix: "/signup",
    title: "Create Account | ZIVO Software",
    description: "Create a ZIVO Software account.",
    private: true,
  },
] satisfies {
  prefix: string;
  title: string;
  description: string;
  private?: boolean;
}[];

const SOFTWARE_PUBLIC_PATH_PATTERN =
  /^\/(?:business\/?|terms-of-service\/?|privacy-policy\/?|legal\/(?:terms|privacy)\/?)?$/i;
const SOFTWARE_PRIVATE_PATH_PATTERN =
  /^\/(?:(?:login|signup|billing|account|admin|dashboard|checkout|subscription|auth|auth-callback|forgot-password|reset-password|verify-email|verify-otp|verify-new-device|connect|desktop)(?:\/|$)|business\/(?:new|dashboard|account|billing|insights|software)(?:\/|$))/i;

const SOFTWARE_ROBOTS = `# ZIVO Software (zivosoftware.com)
User-agent: *
Allow: /business
Allow: /terms-of-service
Allow: /privacy-policy
Disallow: /login
Disallow: /signup
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /verify-email
Disallow: /verify-otp
Disallow: /verify-new-device
Disallow: /auth
Disallow: /account
Disallow: /billing
Disallow: /checkout
Disallow: /subscription
Disallow: /admin/
Disallow: /dashboard
Disallow: /business/new
Disallow: /business/dashboard
Disallow: /business/account
Disallow: /business/billing
Disallow: /business/insights
Disallow: /business/software/
Disallow: /connect/
Disallow: /desktop/

Sitemap: ${SOFTWARE_ORIGIN}/sitemap.xml
`;

const SOFTWARE_SITEMAP_ENTRIES = [
  { path: "/business", priority: "1.0", freq: "weekly" },
  { path: "/terms-of-service", priority: "0.3", freq: "monthly" },
  { path: "/privacy-policy", priority: "0.3", freq: "monthly" },
] as const;

const SOFTWARE_MANIFEST = {
  name: "ZIVO Software",
  short_name: "ZIVO Software",
  description: SOFTWARE_DEFAULT_DESCRIPTION,
  categories: ["business", "productivity"],
  lang: "en",
  dir: "ltr",
  id: "/business",
  start_url: "/business?utm_source=pwa",
  scope: "/",
  display: "standalone",
  background_color: SOFTWARE_BACKGROUND_COLOR,
  theme_color: SOFTWARE_THEME_COLOR,
  icons: [
    {
      src: "/pwa-icons/icon-192x192.png",
      sizes: "192x192",
      type: "image/png",
      purpose: "any maskable",
    },
    {
      src: "/pwa-icons/icon-512x512.png",
      sizes: "512x512",
      type: "image/png",
      purpose: "any maskable",
    },
  ],
  shortcuts: [
    {
      name: "Open ZIVO Software",
      short_name: "Home",
      url: "/business",
      icons: [{ src: "/pwa-icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
    },
    {
      name: "Open Dashboard",
      short_name: "Dashboard",
      url: "/business/new",
      icons: [{ src: "/pwa-icons/icon-192x192.png", sizes: "192x192", type: "image/png" }],
    },
  ],
};

const SOFTWARE_TENANT_RESOLVER_PATH = "/business/new";

const TRAVEL_HOSTS = new Set([
  "zivostravel.com",
  "www.zivostravel.com",
]);

const TRAVEL_ORIGIN = "https://zivostravel.com";
const TRAVEL_THEME_COLOR = "#f8fbff";
const TRAVEL_IMAGE_URL = `${TRAVEL_ORIGIN}/og-zivo-travel.jpg`;
const TRAVEL_IMAGE_ALT = "Zivo Travel - Flights, Hotels, Rental Cars, and Bus Booking";
const TRAVEL_DEFAULT_TITLE = "Zivo Travel | Flights, Hotels, Rental Cars, and Bus Booking";
const TRAVEL_DEFAULT_DESCRIPTION =
  "Zivo Travel connects flights, hotels, rental cars, and bus booking in one travel workflow with secure payments, partner payouts, API access, SSO, and SEO-ready trip pages.";

const TRAVEL_ROUTE_META = [
  {
    prefix: "/flights",
    title: "Zivo Travel Flights | Search and Book Flights",
    description: "Search flights, compare fares, and book secure trips through Zivo Travel.",
  },
  {
    prefix: "/hotels",
    title: "Zivo Travel Hotels | Find Stays",
    description: "Search hotels, compare stays, and keep lodging connected to your Zivo Travel trip.",
  },
  {
    prefix: "/cars",
    title: "Zivo Travel Rental Cars | Compare Car Rentals",
    description: "Compare rental cars and reserve ground transport inside the Zivo Travel workflow.",
  },
  {
    prefix: "/car-rental",
    title: "Zivo Travel Rental Cars | Compare Car Rentals",
    description: "Compare rental cars and reserve ground transport inside the Zivo Travel workflow.",
  },
  {
    prefix: "/bus",
    title: "Zivo Travel Bus Tickets | Search Routes",
    description: "Search bus routes and keep tickets connected with your Zivo Travel plans.",
  },
  {
    prefix: "/my-trips",
    title: "My Trips | Zivo Travel",
    description: "View your upcoming and past Zivo Travel bookings.",
    private: true,
  },
  {
    prefix: "/wallet",
    title: "Wallet | Zivo Travel",
    description: "Manage your Zivo Travel wallet balance and activity.",
    private: true,
  },
  {
    prefix: "/payment-methods",
    title: "Payment Methods | Zivo Travel",
    description: "Manage saved cards for Zivo Travel bookings.",
    private: true,
  },
  {
    prefix: "/account",
    title: "Account | Zivo Travel",
    description: "Manage your Zivo Travel profile and account links.",
    private: true,
  },
] satisfies {
  prefix: string;
  title: string;
  description: string;
  private?: boolean;
}[];

const TRAVEL_PRIVATE_PATH_PATTERN =
  /^\/(?:(?:account|wallet|payment-methods|checkout|booking|confirmation|auth|login|signup|admin|my-trips)(?:\/|$)|(?:flights|rent-car)\/results(?:\/|$)|travel\/checkout(?:\/|$)|zivo-travel\/(?:account|my-trips|payment-methods|wallet)(?:\/|$))/i;
const SEO_REMOVE_SELECTORS = [
  "title",
  'link[rel="canonical"]',
  'link[rel="alternate"][hreflang]',
  'meta[name="description"]',
  'meta[name="keywords"]',
  'meta[name="author"]',
  'meta[name="application-name"]',
  'meta[name="apple-mobile-web-app-title"]',
  'meta[name="apple-itunes-app"]',
  'meta[name="theme-color"]',
  'meta[name="robots"]',
  'meta[property="og:title"]',
  'meta[property="og:description"]',
  'meta[property="og:type"]',
  'meta[property="og:url"]',
  'meta[property="og:image"]',
  'meta[property="og:image:width"]',
  'meta[property="og:image:height"]',
  'meta[property="og:image:alt"]',
  'meta[property="og:site_name"]',
  'meta[property="og:locale"]',
  'meta[property="og:locale:alternate"]',
  'meta[name="twitter:card"]',
  'meta[name="twitter:site"]',
  'meta[name="twitter:creator"]',
  'meta[name="twitter:title"]',
  'meta[name="twitter:description"]',
  'meta[name="twitter:image"]',
  'meta[name="twitter:image:alt"]',
  'script[type="application/ld+json"]',
];

// zivostravel.com is served by the same build as zivosmedia.com, so the static
// public/robots.txt and public/sitemap.xml carry zivosmedia URLs. Serve a
// host-specific robots + sitemap for the travel domain instead.
const TRAVEL_ROBOTS = `# Zivo Travel (zivostravel.com)
User-agent: *
Allow: /
Disallow: /account/
Disallow: /wallet
Disallow: /payment-methods
Disallow: /checkout
Disallow: /booking
Disallow: /confirmation
Disallow: /auth/
Disallow: /admin/
Disallow: /login
Disallow: /signup
Disallow: /flights/results
Disallow: /rent-car/results

Sitemap: ${TRAVEL_ORIGIN}/sitemap.xml
`;

type TravelSitemapFrequency = "daily" | "weekly" | "monthly";

type TravelSitemapEntry = {
  path: string;
  priority: string;
  freq: TravelSitemapFrequency;
};

const TRAVEL_SITEMAP_DESTINATION_SLUGS = [
  "phnom-penh",
  "siem-reap",
  "sihanoukville",
  "kampot",
  "kep",
  "battambang",
  "bangkok",
  "singapore",
  "tokyo",
  "seoul",
  "paris",
  "london",
  "new-york",
  "los-angeles",
  "dubai",
  "bali",
  "ho-chi-minh-city",
  "kuala-lumpur",
  "sydney",
  "rome",
  "barcelona",
  "amsterdam",
  "cancun",
  "honolulu",
] as const;

const TRAVEL_SITEMAP_FLIGHT_ROUTE_SLUGS = [
  "phnom-penh-to-siem-reap",
  "phnom-penh-to-bangkok",
  "phnom-penh-to-singapore",
  "phnom-penh-to-ho-chi-minh-city",
  "phnom-penh-to-kuala-lumpur",
  "siem-reap-to-bangkok",
  "siem-reap-to-singapore",
  "bangkok-to-tokyo",
  "singapore-to-bali",
  "new-york-to-paris",
  "new-york-to-london",
  "los-angeles-to-tokyo",
  "san-francisco-to-tokyo",
  "chicago-to-paris",
  "miami-to-cancun",
  "london-to-dubai",
  "paris-to-rome",
  "london-to-barcelona",
  "sydney-to-singapore",
  "dubai-to-bangkok",
] as const;

const TRAVEL_SITEMAP_ENTRIES: TravelSitemapEntry[] = [
  { path: "/", priority: "1.0", freq: "daily" },
  { path: "/flights", priority: "0.9", freq: "daily" },
  { path: "/hotels", priority: "0.9", freq: "daily" },
  { path: "/cars", priority: "0.9", freq: "daily" },
  { path: "/bus", priority: "0.9", freq: "daily" },
  { path: "/things-to-do", priority: "0.6", freq: "weekly" },
  { path: "/destinations", priority: "0.6", freq: "weekly" },
  { path: "/travel-insurance", priority: "0.5", freq: "weekly" },
  { path: "/guides/cheap-flights", priority: "0.6", freq: "weekly" },
];

function buildTravelSitemapEntries(): TravelSitemapEntry[] {
  const destinationEntries = TRAVEL_SITEMAP_DESTINATION_SLUGS.flatMap((city): TravelSitemapEntry[] => [
    { path: `/flights/to/${city}`, priority: "0.68", freq: "weekly" },
    { path: `/flights/cities/${city}`, priority: "0.64", freq: "weekly" },
    { path: `/destinations/${city}/hotels`, priority: "0.62", freq: "weekly" },
    { path: `/destinations/${city}/activities`, priority: "0.58", freq: "weekly" },
  ]);
  const routeEntries = TRAVEL_SITEMAP_FLIGHT_ROUTE_SLUGS.map((route): TravelSitemapEntry => ({
    path: `/flights/${route}`,
    priority: "0.66",
    freq: "weekly",
  }));
  const seen = new Set<string>();

  return [...TRAVEL_SITEMAP_ENTRIES, ...destinationEntries, ...routeEntries].filter(({ path }) => {
    if (seen.has(path) || TRAVEL_PRIVATE_PATH_PATTERN.test(path)) return false;
    seen.add(path);
    return true;
  });
}

function travelSeoResponse(request: Request, url: URL): Response | null {
  if (!TRAVEL_HOSTS.has(url.hostname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const head = request.method === "HEAD";

  if (url.pathname === "/robots.txt") {
    return new Response(head ? null : TRAVEL_ROBOTS, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }

  if (url.pathname === "/sitemap.xml") {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = buildTravelSitemapEntries().map(
      ({ path, priority, freq }) =>
        `  <url>\n    <loc>${escapeHtml(`${TRAVEL_ORIGIN}${path}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    ).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    return new Response(head ? null : xml, {
      status: 200,
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }

  return null;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeJsonForHtml(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function softwareCanonical(url: URL) {
  let pathname = url.pathname.replace(/\/+$/, "") || "/";
  if (pathname === "/") pathname = "/business";
  if (pathname === "/legal/terms") pathname = "/terms-of-service";
  if (pathname === "/legal/privacy") pathname = "/privacy-policy";
  return new URL(pathname, SOFTWARE_ORIGIN).toString();
}

export function softwareSeoResponse(request: Request, url: URL): Response | null {
  if (!SOFTWARE_HOSTS.has(url.hostname)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const head = request.method === "HEAD";

  if (url.pathname === "/robots.txt") {
    return new Response(head ? null : SOFTWARE_ROBOTS, {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }

  if (url.pathname === "/sitemap.xml") {
    const lastmod = new Date().toISOString().slice(0, 10);
    const urls = SOFTWARE_SITEMAP_ENTRIES.map(
      ({ path, priority, freq }) =>
        `  <url>\n    <loc>${escapeHtml(`${SOFTWARE_ORIGIN}${path}`)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`,
    ).join("\n");
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
    return new Response(head ? null : xml, {
      status: 200,
      headers: { "content-type": "application/xml; charset=utf-8", "cache-control": "public, max-age=3600" },
    });
  }

  if (url.pathname === "/manifest.webmanifest") {
    const manifest = `${JSON.stringify(SOFTWARE_MANIFEST, null, 2)}\n`;
    return new Response(head ? null : manifest, {
      status: 200,
      headers: {
        "content-type": "application/manifest+json; charset=utf-8",
        "cache-control": "public, max-age=3600",
      },
    });
  }

  return null;
}

export function softwarePageMeta(url: URL) {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const canonical = softwareCanonical(url);
  const canonicalPathname = new URL(canonical).pathname;
  const routeMeta = SOFTWARE_ROUTE_META.find(
    ({ prefix }) => canonicalPathname === prefix || canonicalPathname.startsWith(`${prefix}/`),
  );
  const isPrivate = Boolean(
    routeMeta?.private ||
    SOFTWARE_PRIVATE_PATH_PATTERN.test(pathname) ||
    !SOFTWARE_PUBLIC_PATH_PATTERN.test(pathname),
  );

  return {
    title: routeMeta?.title || SOFTWARE_DEFAULT_TITLE,
    description: routeMeta?.description || SOFTWARE_DEFAULT_DESCRIPTION,
    canonical,
    robots: isPrivate ? "noindex,nofollow" : "index,follow,max-image-preview:large",
  };
}

export function softwareHeadTags(url: URL) {
  const meta = softwarePageMeta(url);
  const organizationJson = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "ZIVO Software",
    legalName: "ZIVO LLC",
    url: `${SOFTWARE_ORIGIN}/business`,
    logo: `${SOFTWARE_ORIGIN}/pwa-icons/icon-512x512.png`,
  };
  const softwareApplicationJson = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "ZIVO Software",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    url: `${SOFTWARE_ORIGIN}/business`,
    description: SOFTWARE_DEFAULT_DESCRIPTION,
    publisher: {
      "@type": "Organization",
      name: "ZIVO Software",
      url: `${SOFTWARE_ORIGIN}/business`,
    },
    featureList: [
      "Customer and vehicle management",
      "Appointments and inspections",
      "Estimates and repair orders",
      "Invoices and inventory",
      "Staff management and reporting",
    ],
  };

  return `
    <title data-rh="true">${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" data-rh="true" />
    <meta name="application-name" content="ZIVO Software" />
    <meta name="apple-mobile-web-app-title" content="ZIVO Software" />
    <meta name="theme-color" content="${SOFTWARE_THEME_COLOR}" />
    <meta name="robots" content="${meta.robots}" />
    <link rel="canonical" href="${escapeHtml(meta.canonical)}" data-rh="true" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(meta.canonical)}" />
    <meta property="og:image" content="${SOFTWARE_IMAGE_URL}" />
    <meta property="og:image:alt" content="${SOFTWARE_IMAGE_ALT}" />
    <meta property="og:site_name" content="ZIVO Software" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${SOFTWARE_IMAGE_URL}" />
    <meta name="twitter:image:alt" content="${SOFTWARE_IMAGE_ALT}" />
    <script type="application/ld+json">${escapeJsonForHtml(organizationJson)}</script>
    <script type="application/ld+json">${escapeJsonForHtml(softwareApplicationJson)}</script>
  `;
}

function travelCanonical(url: URL) {
  const canonical = new URL(url.pathname || "/", TRAVEL_ORIGIN);
  return canonical.toString();
}

function travelPageMeta(url: URL) {
  const pathname = url.pathname.replace(/\/+$/, "") || "/";
  const routeMeta = TRAVEL_ROUTE_META.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isPrivate = Boolean(routeMeta?.private || TRAVEL_PRIVATE_PATH_PATTERN.test(pathname));
  const canonical = travelCanonical(url);

  return {
    title: routeMeta?.title || TRAVEL_DEFAULT_TITLE,
    description: routeMeta?.description || TRAVEL_DEFAULT_DESCRIPTION,
    canonical,
    robots: isPrivate ? "noindex,nofollow" : "index,follow,max-image-preview:large",
  };
}

function travelHeadTags(url: URL) {
  const meta = travelPageMeta(url);
  const canonicalUrl = new URL(meta.canonical);
  const languageBase = `${TRAVEL_ORIGIN}${canonicalUrl.pathname === "/" ? "/" : canonicalUrl.pathname}`;
  const languageUrl = (lang?: string) => (lang ? `${languageBase}?lang=${lang}` : languageBase);
  const webSiteJson = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Zivo Travel",
    url: `${TRAVEL_ORIGIN}/`,
    potentialAction: {
      "@type": "SearchAction",
      target: `${TRAVEL_ORIGIN}/flights?from={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
  const organizationJson = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Zivo Travel",
    url: `${TRAVEL_ORIGIN}/`,
    parentOrganization: { "@type": "Organization", name: "Zivos Media" },
  };

  return `
    <title>${escapeHtml(meta.title)}</title>
    <meta name="description" content="${escapeHtml(meta.description)}" />
    <meta name="application-name" content="Zivo Travel" />
    <meta name="apple-mobile-web-app-title" content="Zivo Travel" />
    <meta name="apple-itunes-app" content="app-id=6759480121, app-argument=${TRAVEL_ORIGIN}" />
    <meta name="theme-color" content="${TRAVEL_THEME_COLOR}" />
    <meta name="robots" content="${meta.robots}" />
    <link rel="canonical" href="${escapeHtml(meta.canonical)}" />
    <link rel="alternate" hreflang="x-default" href="${escapeHtml(languageUrl())}" />
    <link rel="alternate" hreflang="en" href="${escapeHtml(languageUrl())}" />
    <link rel="alternate" hreflang="km" href="${escapeHtml(languageUrl("km"))}" />
    <link rel="alternate" hreflang="ar" href="${escapeHtml(languageUrl("ar"))}" />
    <link rel="alternate" hreflang="fr" href="${escapeHtml(languageUrl("fr"))}" />
    <meta property="og:title" content="${escapeHtml(meta.title)}" />
    <meta property="og:description" content="${escapeHtml(meta.description)}" />
    <meta property="og:type" content="website" />
    <meta property="og:url" content="${escapeHtml(meta.canonical)}" />
    <meta property="og:image" content="${TRAVEL_IMAGE_URL}" />
    <meta property="og:image:alt" content="${TRAVEL_IMAGE_ALT}" />
    <meta property="og:site_name" content="Zivo Travel" />
    <meta property="og:locale" content="en_US" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(meta.title)}" />
    <meta name="twitter:description" content="${escapeHtml(meta.description)}" />
    <meta name="twitter:image" content="${TRAVEL_IMAGE_URL}" />
    <meta name="twitter:image:alt" content="${TRAVEL_IMAGE_ALT}" />
    <script type="application/ld+json">${escapeJsonForHtml(webSiteJson)}</script>
    <script type="application/ld+json">${escapeJsonForHtml(organizationJson)}</script>
  `;
}

function htmlResponseInit(response: Response) {
  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return { status: response.status, statusText: response.statusText, headers };
}

function tagAttribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return (match?.[2] || match?.[3] || match?.[4] || "").toLowerCase();
}

function stripSeoTags(html: string) {
  const removableMetaNames = new Set([
    "description",
    "keywords",
    "author",
    "application-name",
    "apple-mobile-web-app-title",
    "apple-itunes-app",
    "theme-color",
    "robots",
    "twitter:card",
    "twitter:site",
    "twitter:creator",
    "twitter:title",
    "twitter:description",
    "twitter:image",
    "twitter:image:alt",
  ]);
  const removableOgProperties = new Set([
    "og:title",
    "og:description",
    "og:type",
    "og:url",
    "og:image",
    "og:image:width",
    "og:image:height",
    "og:image:alt",
    "og:site_name",
    "og:locale",
    "og:locale:alternate",
  ]);

  return html
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(/<link\b[^>]*>/gi, (tag) => {
      const rel = tagAttribute(tag, "rel");
      return rel === "canonical" || (rel === "alternate" && tagAttribute(tag, "hreflang")) ? "" : tag;
    })
    .replace(/<meta\b[^>]*>/gi, (tag) => {
      const name = tagAttribute(tag, "name");
      const property = tagAttribute(tag, "property");
      return removableMetaNames.has(name) || removableOgProperties.has(property) ? "" : tag;
    })
    .replace(
      /<script\b(?=[^>]*\btype\s*=\s*["']application\/ld\+json["'])[^>]*>[\s\S]*?<\/script>/gi,
      "",
    );
}

function rewriteSoftwareHtmlString(html: string, url: URL) {
  const cleaned = stripSeoTags(html);
  const softwareHead = `${softwareHeadTags(url)}\n</head>`;
  return /<\/head>/i.test(cleaned)
    ? cleaned.replace(/<\/head>/i, softwareHead)
    : `${cleaned}\n${softwareHeadTags(url)}`;
}

export async function rewriteSoftwareHtml(
  request: Request,
  url: URL,
  response: Response,
): Promise<Response> {
  if (request.method !== "GET" || !SOFTWARE_HOSTS.has(url.hostname)) return response;
  if (response.status < 200 || response.status >= 300) return response;
  if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) return response;

  const htmlResponse = new Response(response.body, htmlResponseInit(response));
  const Rewriter = typeof HTMLRewriter === "undefined" ? undefined : HTMLRewriter;

  if (!Rewriter) {
    return new Response(rewriteSoftwareHtmlString(await htmlResponse.text(), url), htmlResponseInit(htmlResponse));
  }

  const removeElement = {
    element(element: ZivoHtmlRewriterElement) {
      element.remove();
    },
  };
  const appendSoftwareHead = {
    element(element: ZivoHtmlRewriterElement) {
      element.append(softwareHeadTags(url), { html: true });
    },
  };

  let rewriter = new Rewriter();
  for (const selector of SEO_REMOVE_SELECTORS) {
    rewriter = rewriter.on(selector, removeElement);
  }
  return rewriter.on("head", appendSoftwareHead).transform(htmlResponse);
}

function rewriteTravelHtmlString(html: string, url: URL) {
  const cleaned = stripSeoTags(html);
  const travelHead = `${travelHeadTags(url)}\n</head>`;
  return /<\/head>/i.test(cleaned)
    ? cleaned.replace(/<\/head>/i, travelHead)
    : `${cleaned}\n${travelHeadTags(url)}`;
}

async function rewriteTravelHtml(request: Request, url: URL, response: Response): Promise<Response> {
  if (request.method !== "GET" || !TRAVEL_HOSTS.has(url.hostname)) return response;
  if (response.status < 200 || response.status >= 300) return response;
  if (!(response.headers.get("content-type") || "").toLowerCase().includes("text/html")) return response;

  const htmlResponse = new Response(response.body, htmlResponseInit(response));
  const Rewriter = typeof HTMLRewriter === "undefined" ? undefined : HTMLRewriter;

  if (!Rewriter) {
    return new Response(rewriteTravelHtmlString(await htmlResponse.text(), url), htmlResponseInit(htmlResponse));
  }

  const removeElement = {
    element(element: ZivoHtmlRewriterElement) {
      element.remove();
    },
  };
  const appendTravelHead = {
    element(element: ZivoHtmlRewriterElement) {
      element.append(travelHeadTags(url), { html: true });
    },
  };

  let rewriter = new Rewriter();
  for (const selector of SEO_REMOVE_SELECTORS) {
    rewriter = rewriter.on(selector, removeElement);
  }
  return rewriter.on("head", appendTravelHead).transform(htmlResponse);
}

const CSP_BASE =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.supabase.co https://js.stripe.com https://*.stripe.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleapis.com https://*.gstatic.com https://www.googletagmanager.com https://www.google-analytics.com https://connect.facebook.net https://pagead2.googlesyndication.com https://*.googlesyndication.com https://partner.googleadservices.com https://www.googleadservices.com https://adservice.google.com https://analytics.tiktok.com https://static.ads-twitter.com https://platform.twitter.com https://static.cloudflareinsights.com https://*.lovable.app https://*.lovable.dev; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://*.gstatic.com; img-src 'self' data: blob: https:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https: wss: blob: data:; media-src 'self' blob: data: https:; frame-src 'self' https://ride.zivosmedia.com https://js.stripe.com https://*.stripe.com https://www.google.com https://*.duffel.com https://platform.twitter.com https://syndication.twitter.com https://*.twimg.com https://googleads.g.doubleclick.net https://*.g.doubleclick.net https://tpc.googlesyndication.com https://*.googlesyndication.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self' https://*.stripe.com https://*.duffel.com; frame-ancestors 'self'; upgrade-insecure-requests";

const SUPABASE_PROJECT_REFS = {
  media: "slirphzzwcogdbkeicff",
  software: "ydxztoresbdeoeijhxww",
  travel: "xbllvmpomorawkcrtbcq",
} as const;

type CspReportProject = keyof typeof SUPABASE_PROJECT_REFS;

const CSP_REPORT_PROJECT_BY_HOST = new Map<string, CspReportProject>([
  ["zivosoftware.com", "software"],
  ["www.zivosoftware.com", "software"],
  ["zivoschat.com", "media"],
  ["www.zivoschat.com", "media"],
  ["zivosmedia.com", "media"],
  ["www.zivosmedia.com", "media"],
  ["zivostravel.com", "travel"],
  ["www.zivostravel.com", "travel"],
]);

function normalizedSupabaseUrl(value?: string) {
  return (value || "").trim().replace(/\/+$/, "");
}

function fallbackSupabaseProjectUrl(project: CspReportProject) {
  return `https://${SUPABASE_PROJECT_REFS[project]}.supabase.co`;
}

function cspReportUriForProject(project: CspReportProject, env: Env) {
  const configuredUrl =
    project === "software"
      ? env.ZIVO_SOFTWARE_SUPABASE_URL
      : project === "travel"
        ? env.ZIVO_TRAVEL_SUPABASE_URL
        : env.SUPABASE_URL;
  const baseUrl = normalizedSupabaseUrl(configuredUrl) || fallbackSupabaseProjectUrl(project);
  return `${baseUrl}/functions/v1/csp-report`;
}

const immutableCache = "public, max-age=31536000, immutable";
const authPathPattern = /^\/(?:login|signup|auth(?:\/|$)|admin(?:\/|$))/i;
const aiPathPattern = /^\/api\/(?:ai|deepseek)(?:\/|$)/i;
const blockedPathPattern =
  /(?:^|\/)(?:\.env|\.git|\.svn|\.hg|wp-admin|wp-login\.php|xmlrpc\.php|phpmyadmin|adminer|\.DS_Store|composer\.json|package-lock\.json)(?:\/|$)|(?:\.\.\/|\/etc\/passwd|\/proc\/self|%2e%2e|%5c)/i;

function json(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), { ...init, headers });
}

function noStoreJson(data: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("cache-control", "no-store");
  return json(data, { ...init, headers });
}

function clientIp(request: Request) {
  return request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for") || "unknown";
}

function isRateLimited(request: Request, url: URL) {
  const now = Date.now();
  const isAuthPath = authPathPattern.test(url.pathname);
  const isAiPath = aiPathPattern.test(url.pathname);
  const bucket = isAuthPath ? "auth" : isAiPath ? "ai" : "site";
  const key = `${bucket}:${clientIp(request)}`;
  const limit = isAuthPath ? AUTH_LIMIT : isAiPath ? AI_LIMIT : GENERAL_LIMIT;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  current.count += 1;
  return current.count > limit;
}

function allowedOrigins(env: Env) {
  return (env.ALLOWED_ORIGINS || DEFAULT_ALLOWED_ORIGINS.join(","))
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function corsHeaders(request: Request, env: Env) {
  const requestOrigin = request.headers.get("origin");
  const origins = allowedOrigins(env);
  const allowOrigin = origins.includes("*")
    ? "*"
    : requestOrigin && origins.includes(requestOrigin)
      ? requestOrigin
      : "";

  const headers = new Headers();
  if (allowOrigin) {
    headers.set("access-control-allow-origin", allowOrigin);
    headers.set("vary", "Origin");
  }
  headers.set("access-control-allow-methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
  headers.set("access-control-allow-headers", "authorization, content-type, x-zivo-media-token");
  headers.set("access-control-max-age", "86400");
  return headers;
}

function withCors(response: Response, request: Request, env: Env) {
  const headers = new Headers(response.headers);
  corsHeaders(request, env).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

function allowedOriginForRequest(request: Request, url: URL, env: Env) {
  const requestOrigin = request.headers.get("origin");
  const origins = allowedOrigins(env);

  if (origins.includes("*")) return "*";
  if (requestOrigin && origins.includes(requestOrigin)) return requestOrigin;
  if (origins.includes(url.origin)) return url.origin;
  return "";
}

function securityHeaders(request: Request, url: URL, env: Env) {
  const headers = new Headers();
  const allowOrigin = allowedOriginForRequest(request, url, env);
  const cspReportProject = CSP_REPORT_PROJECT_BY_HOST.get(url.hostname) ?? "media";
  const cspReportUri = cspReportUriForProject(cspReportProject, env);

  if (allowOrigin) {
    headers.set("access-control-allow-origin", allowOrigin);
    if (request.headers.get("origin")) {
      headers.set("vary", "Origin");
    }
  }

  headers.set("strict-transport-security", "max-age=63072000; includeSubDomains; preload");
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "SAMEORIGIN");
  headers.set("x-permitted-cross-domain-policies", "none");
  headers.set("x-dns-prefetch-control", "on");
  headers.set("content-security-policy", `${CSP_BASE}; report-uri ${cspReportUri}`);
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set(
    "permissions-policy",
    "camera=(self), microphone=(self), geolocation=(self \"https://ride.zivosmedia.com\"), payment=(self \"https://ride.zivosmedia.com\"), accelerometer=(), gyroscope=(self), magnetometer=(), usb=(), bluetooth=(), midi=(), serial=(), interest-cohort=(), display-capture=(), document-domain=()",
  );
  headers.set("cross-origin-opener-policy", "same-origin-allow-popups");
  headers.set("cross-origin-resource-policy", "same-site");
  return headers;
}

function withSecurityHeaders(response: Response, request: Request, env: Env) {
  const url = new URL(request.url);
  const headers = new Headers(response.headers);
  securityHeaders(request, url, env).forEach((value, key) => headers.set(key, value));
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function chatHomeRedirect(request: Request, url: URL) {
  if ((request.method !== "GET" && request.method !== "HEAD") || !CHAT_HOSTS.has(url.hostname)) {
    return null;
  }

  if (url.pathname !== "/") {
    return null;
  }

  const target = new URL(url.toString());
  target.pathname = "/chat";
  return new Response(null, {
    status: 302,
    headers: {
      "cache-control": "no-store",
      "location": target.toString(),
    },
  });
}

function softwareDashboardRedirect(request: Request, url: URL) {
  if ((request.method !== "GET" && request.method !== "HEAD") || !SOFTWARE_HOSTS.has(url.hostname)) {
    return null;
  }

  if (url.pathname === "/login" || url.pathname === "/signup") {
    const redirect = url.searchParams.get("redirect");
    if (redirect !== "/business" && redirect !== "/business/dashboard") {
      return null;
    }

    const target = new URL(url.toString());
    target.searchParams.set("redirect", SOFTWARE_TENANT_RESOLVER_PATH);
    return new Response(null, {
      status: 302,
      headers: {
        "cache-control": "no-store",
        "location": target.toString(),
      },
    });
  }

  if (url.pathname !== "/business/dashboard") {
    return null;
  }

  const target = new URL(url.toString());
  target.pathname = SOFTWARE_TENANT_RESOLVER_PATH;
  return new Response(null, {
    status: 302,
    headers: {
      "cache-control": "no-store",
      "location": target.toString(),
    },
  });
}

function safeObjectKey(raw: string) {
  try {
    const decoded = decodeURIComponent(raw);
    if (!decoded || decoded.startsWith("/") || decoded.includes("..") || decoded.includes("\\")) {
      return "";
    }
    return decoded;
  } catch {
    return "";
  }
}

function mediaKey(pathname: string) {
  return safeObjectKey(pathname.replace(/^\/media\/?/, ""));
}

function downloadKey(pathname: string) {
  return safeObjectKey(pathname.replace(/^\//, ""));
}

function bearerToken(request: Request) {
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return request.headers.get("x-zivo-media-token") || "";
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function authorizeWrite(request: Request, env: Env) {
  if (!env.MEDIA_WRITE_TOKEN) {
    return false;
  }
  return constantTimeEqual(bearerToken(request), env.MEDIA_WRITE_TOKEN);
}

async function handleR2Object(request: Request, env: Env, key: string, publicUrlPrefix: string) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (!key) {
    return withCors(json({ error: "Invalid object key" }, { status: 400 }), request, env);
  }

  if (request.method === "GET" || request.method === "HEAD") {
    const rangeHeader = request.headers.get("range");
    const object = await env.ZIVO_MEDIA.get(key, rangeHeader ? { range: request.headers } : undefined);
    if (!object) {
      return withCors(json({ error: "Object not found" }, { status: 404 }), request, env);
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("etag", object.httpEtag);
    headers.set("accept-ranges", "bytes");
    headers.set("cache-control", headers.get("cache-control") || immutableCache);

    let status = 200;
    if (rangeHeader && object.range) {
      status = 206;
      const end = object.range.offset + object.range.length - 1;
      headers.set("content-range", `bytes ${object.range.offset}-${end}/${object.size}`);
      headers.set("content-length", String(object.range.length));
    } else {
      headers.set("content-length", String(object.size));
    }

    return withCors(new Response(request.method === "HEAD" ? null : object.body, { status, headers }), request, env);
  }

  if (request.method === "PUT") {
    if (!authorizeWrite(request, env)) {
      return withCors(json({ error: "Unauthorized" }, { status: 401 }), request, env);
    }

    const contentType = request.headers.get("content-type") || "application/octet-stream";
    const cacheControl = request.headers.get("cache-control") || immutableCache;
    await env.ZIVO_MEDIA.put(key, request.body, {
      httpMetadata: {
        "content-type": contentType,
        "cache-control": cacheControl,
      },
      customMetadata: {
        uploaded_by: "zivo-cloudflare-worker",
      },
    });

    return withCors(
      json({ ok: true, key, url: `${publicUrlPrefix}${encodeURI(key)}` }, { status: 201 }),
      request,
      env,
    );
  }

  if (request.method === "DELETE") {
    if (!authorizeWrite(request, env)) {
      return withCors(json({ error: "Unauthorized" }, { status: 401 }), request, env);
    }
    await env.ZIVO_MEDIA.delete(key);
    return withCors(new Response(null, { status: 204 }), request, env);
  }

  return withCors(json({ error: "Method not allowed" }, { status: 405 }), request, env);
}

async function handleMedia(request: Request, env: Env) {
  const url = new URL(request.url);
  return handleR2Object(request, env, mediaKey(url.pathname), "/media/");
}

async function handleDownload(request: Request, env: Env) {
  const url = new URL(request.url);
  return handleR2Object(request, env, downloadKey(url.pathname), "/");
}

async function handleChannelSharePreview(request: Request, env: Env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return json({ error: "Method not allowed" }, { status: 405 });
  }

  const url = new URL(request.url);
  const handle = safeObjectKey(url.pathname.replace(/^\/share\/c\/?/, ""));
  if (!handle || handle.includes("/")) {
    return json({ error: "Invalid channel handle" }, { status: 400 });
  }

  const upstreamBase =
    env.CHANNEL_OG_FUNCTION_URL ||
    (env.SUPABASE_URL ? `${env.SUPABASE_URL}/functions/v1/channel-og` : "");
  if (!upstreamBase) {
    return new Response("channel OG upstream not configured", { status: 503 });
  }

  const upstreamUrl = new URL(upstreamBase);
  upstreamUrl.searchParams.set("handle", handle);

  const headers = new Headers();
  for (const header of ["accept", "accept-language", "user-agent"]) {
    const value = request.headers.get(header);
    if (value) headers.set(header, value);
  }

  const response = await fetch(upstreamUrl.toString(), { headers });
  return new Response(request.method === "HEAD" ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}

type AiProvider = "deepseek" | "claude";
type AiProviderRequest = AiProvider | "auto";
type AiChatMode = "support" | "travel" | "site-builder";
type AiChatRole = "user" | "assistant";
type AiChatMessage = {
  role?: string;
  content?: unknown;
};

const DEEPSEEK_API_URL = "https://api.deepseek.com/chat/completions";
const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const DEEPSEEK_MODELS = new Set(["deepseek-v4-flash", "deepseek-v4-pro"]);
const CLAUDE_MODELS = new Set([
  "claude-sonnet-4-6",
  "claude-opus-4-8",
  "claude-haiku-4-5",
  "claude-fable-5",
]);
const DEEPSEEK_DEFAULT_MODEL = "deepseek-v4-flash";
const CLAUDE_DEFAULT_MODEL = "claude-sonnet-4-6";
const AI_MAX_MESSAGES = 20;
const AI_MAX_MESSAGE_CHARS = 3000;
const AI_MAX_TOTAL_CHARS = 12000;
const AI_MAX_TOKENS = 1200;

const AI_SYSTEM_PROMPTS: Record<AiChatMode, string> = {
  support:
    "You are ZIVO AI Assistant, a friendly and concise support helper for ZIVO travel, delivery, chat, and marketplace products. Keep answers under 150 words unless the user asks for detail. Never invent order numbers, booking status, account details, prices, refunds, or policies. For payments, safety, account lockouts, charge disputes, or anything uncertain, recommend creating a human support ticket.",
  travel:
    "You are Zivo Travel Assistant. Help users plan trips, compare destinations, and understand flight, hotel, car, and bus booking options. Keep guidance practical, safety-minded, and concise. Do not claim live inventory, live prices, booking confirmation, refunds, or payment status unless the app provides that data.",
  "site-builder":
    "You are ZIVO Website Builder Assistant. Help draft website copy, page sections, SEO titles, UX ideas, and implementation notes for ZIVO-owned sites. Keep suggestions specific to ZIVO, avoid fake claims, and never ask users to paste API keys, payment secrets, or private credentials.",
};

function isAiMode(value: unknown): value is AiChatMode {
  return value === "support" || value === "travel" || value === "site-builder";
}

function isAiProviderRequest(value: unknown): value is AiProviderRequest {
  return value === "deepseek" || value === "claude" || value === "auto";
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function sanitizeAiMessages(rawMessages: unknown) {
  if (!Array.isArray(rawMessages)) {
    return [];
  }

  let totalChars = 0;
  const messages: { role: AiChatRole; content: string }[] = [];
  const recent = rawMessages.slice(-AI_MAX_MESSAGES);

  for (const raw of recent) {
    const message = raw as AiChatMessage;
    const role = message.role === "assistant" ? "assistant" : message.role === "user" ? "user" : null;
    if (!role || typeof message.content !== "string") continue;

    const content = message.content.trim().slice(0, AI_MAX_MESSAGE_CHARS);
    if (!content) continue;

    totalChars += content.length;
    if (totalChars > AI_MAX_TOTAL_CHARS) break;
    messages.push({ role, content });
  }

  return messages;
}

function isAiProviderConfigured(provider: AiProvider, env: Env) {
  if (provider === "claude") {
    return Boolean((env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY)?.trim());
  }
  return Boolean(env.DEEPSEEK_API_KEY?.trim());
}

function aiProviderOrder(requestedProvider: AiProviderRequest, mode: AiChatMode): AiProvider[] {
  if (requestedProvider === "claude") return ["claude", "deepseek"];
  if (requestedProvider === "deepseek") return ["deepseek", "claude"];
  return ["deepseek", "claude"];
}

function modelForProvider(provider: AiProvider, requestedModel: string) {
  if (provider === "claude") {
    return CLAUDE_MODELS.has(requestedModel) ? requestedModel : CLAUDE_DEFAULT_MODEL;
  }
  return DEEPSEEK_MODELS.has(requestedModel) ? requestedModel : DEEPSEEK_DEFAULT_MODEL;
}

function withAiProviderHeaders(response: Response, provider: AiProvider, isFallback: boolean) {
  const headers = new Headers(response.headers);
  headers.set("x-zivo-ai-provider", provider);
  headers.set("x-zivo-ai-fallback", isFallback ? "true" : "false");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

async function deepSeekChat(
  request: Request,
  env: Env,
  options: {
    messages: { role: AiChatRole; content: string }[];
    mode: AiChatMode;
    model: string;
    stream: boolean;
    temperature: number;
    maxTokens: number;
  },
) {
  const deepSeekApiKey = env.DEEPSEEK_API_KEY?.trim();
  if (!deepSeekApiKey) {
    return withCors(noStoreJson({ error: "DeepSeek is not configured" }, { status: 503 }), request, env);
  }

  const upstream = await fetch(DEEPSEEK_API_URL, {
    method: "POST",
    headers: {
      "authorization": `Bearer ${deepSeekApiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      messages: [
        { role: "system", content: AI_SYSTEM_PROMPTS[options.mode] },
        ...options.messages,
      ],
      stream: options.stream,
      temperature: options.temperature,
      max_tokens: options.maxTokens,
      thinking: { type: "disabled" },
    }),
  });

  if (!upstream.ok) {
    console.error("DeepSeek API error", { status: upstream.status, mode: options.mode, model: options.model });
    const status = upstream.status === 429 ? 429 : upstream.status === 401 || upstream.status === 403 ? 503 : 502;
    const message = status === 429 ? "DeepSeek is busy. Please try again shortly." : "DeepSeek request failed";
    return withCors(noStoreJson({ error: message }, { status }), request, env);
  }

  const headers = new Headers();
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex");
  headers.set("content-type", options.stream ? "text/event-stream; charset=utf-8" : "application/json; charset=utf-8");
  upstream.headers.forEach((value, key) => {
    if (key.toLowerCase().startsWith("x-ratelimit-")) {
      headers.set(key, value);
    }
  });

  return withCors(new Response(upstream.body, { status: upstream.status, headers }), request, env);
}

function anthropicStreamToOpenAiStream(body: ReadableStream | null) {
  if (!body) return null;

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  return body.pipeThrough(new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      let separatorIndex: number;

      while ((separatorIndex = buffer.indexOf("\n\n")) !== -1) {
        const eventBlock = buffer.slice(0, separatorIndex);
        buffer = buffer.slice(separatorIndex + 2);
        const dataLine = eventBlock
          .split("\n")
          .map((line) => line.trim())
          .find((line) => line.startsWith("data: "));
        if (!dataLine) continue;

        try {
          const payload = JSON.parse(dataLine.slice(6));
          if (payload.type === "content_block_delta" && payload.delta?.type === "text_delta") {
            const text = payload.delta.text;
            if (typeof text === "string" && text) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
            }
          } else if (payload.type === "message_stop") {
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          } else if (payload.type === "error") {
            const message = payload.error?.message || "Claude stream error";
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: message })}\n\n`));
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
          }
        } catch {
          // Ignore malformed or partial SSE events; buffering handles partial chunks.
        }
      }
    },
    flush(controller) {
      if (buffer.trim()) {
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      }
    },
  }));
}

async function claudeChat(
  request: Request,
  env: Env,
  options: {
    messages: { role: AiChatRole; content: string }[];
    mode: AiChatMode;
    model: string;
    stream: boolean;
    temperature: number;
    maxTokens: number;
  },
) {
  const anthropicApiKey = (env.ANTHROPIC_API_KEY || env.CLAUDE_API_KEY)?.trim();
  if (!anthropicApiKey) {
    return withCors(noStoreJson({ error: "Claude is not configured" }, { status: 503 }), request, env);
  }

  const upstream = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "x-api-key": anthropicApiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: options.model,
      system: AI_SYSTEM_PROMPTS[options.mode],
      messages: options.messages,
      max_tokens: options.maxTokens,
      stream: options.stream,
      temperature: options.temperature,
    }),
  });

  if (!upstream.ok) {
    console.error("Claude API error", { status: upstream.status, mode: options.mode, model: options.model });
    const status = upstream.status === 429 || upstream.status === 529
      ? 429
      : upstream.status === 401 || upstream.status === 403
        ? 503
        : 502;
    const message = status === 429 ? "Claude is busy. Please try again shortly." : "Claude request failed";
    return withCors(noStoreJson({ error: message }, { status }), request, env);
  }

  const headers = new Headers();
  headers.set("cache-control", "no-store");
  headers.set("x-robots-tag", "noindex");

  if (options.stream) {
    headers.set("content-type", "text/event-stream; charset=utf-8");
    return withCors(new Response(anthropicStreamToOpenAiStream(upstream.body), { status: 200, headers }), request, env);
  }

  const data = await upstream.json() as { content?: { type?: string; text?: string }[] };
  const content = (data.content || [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("");

  headers.set("content-type", "application/json; charset=utf-8");
  return withCors(
    new Response(JSON.stringify({ choices: [{ message: { role: "assistant", content } }] }), { status: 200, headers }),
    request,
    env,
  );
}

async function handleAiChat(request: Request, env: Env, url: URL) {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(request, env) });
  }

  if (request.method !== "POST") {
    return withCors(noStoreJson({ error: "Method not allowed" }, { status: 405 }), request, env);
  }

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > 48_000) {
    return withCors(noStoreJson({ error: "Request is too large" }, { status: 413 }), request, env);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json() as Record<string, unknown>;
  } catch {
    return withCors(noStoreJson({ error: "Invalid JSON body" }, { status: 400 }), request, env);
  }

  const messages = sanitizeAiMessages(body.messages);
  if (messages.length === 0 && typeof body.message === "string" && body.message.trim()) {
    messages.push({ role: "user", content: body.message.trim().slice(0, AI_MAX_MESSAGE_CHARS) });
  }

  if (messages.length === 0) {
    return withCors(noStoreJson({ error: "Message is required" }, { status: 400 }), request, env);
  }

  const requestedProvider = url.pathname.startsWith("/api/deepseek/")
    ? "deepseek"
    : isAiProviderRequest(body.provider)
      ? body.provider
      : "auto";
  const mode = isAiMode(body.mode) ? body.mode : "travel";
  const stream = body.stream !== false;
  const temperature = clampNumber(body.temperature, 0, 1, 0.4);
  const maxTokens = Math.round(clampNumber(body.max_tokens ?? body.maxTokens, 128, AI_MAX_TOKENS, 700));
  const requestedModel = typeof body.model === "string" ? body.model : "";
  const preferredProviders = aiProviderOrder(requestedProvider, mode);
  const configuredProviders = preferredProviders.filter((provider) => isAiProviderConfigured(provider, env));

  if (configuredProviders.length === 0) {
    return withCors(noStoreJson({ error: "AI is not configured" }, { status: 503 }), request, env);
  }

  let lastResponse: Response | null = null;
  for (const provider of configuredProviders) {
    const options = {
      messages,
      mode,
      model: modelForProvider(provider, requestedModel),
      stream,
      temperature,
      maxTokens,
    };
    const response = provider === "claude"
      ? await claudeChat(request, env, options)
      : await deepSeekChat(request, env, options);
    const isFallback = provider !== preferredProviders[0];
    const canFallback = response.status === 429 || response.status >= 500;

    if (!canFallback || provider === configuredProviders[configuredProviders.length - 1]) {
      return withAiProviderHeaders(response, provider, isFallback);
    }

    lastResponse = response;
  }

  return lastResponse
    ? withAiProviderHeaders(lastResponse, configuredProviders[configuredProviders.length - 1], true)
    : withCors(noStoreJson({ error: "AI request failed" }, { status: 502 }), request, env);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return json({ ok: true, service: "zivo-web", media: Boolean(env.ZIVO_MEDIA) });
    }

    if (request.method !== "OPTIONS") {
      if (blockedPathPattern.test(url.pathname)) {
        return withSecurityHeaders(noStoreJson({ error: "Forbidden" }, { status: 403 }), request, env);
      }

      if (isRateLimited(request, url)) {
        return withSecurityHeaders(noStoreJson({ error: "Too many requests" }, { status: 429 }), request, env);
      }
    }

    const chatRedirect = chatHomeRedirect(request, url);
    if (chatRedirect) {
      return withSecurityHeaders(chatRedirect, request, env);
    }

    const softwareRedirect = softwareDashboardRedirect(request, url);
    if (softwareRedirect) {
      return withSecurityHeaders(softwareRedirect, request, env);
    }

    if (url.pathname === "/media" || url.pathname.startsWith("/media/")) {
      return handleMedia(request, env);
    }

    if (url.pathname.startsWith("/downloads/")) {
      return handleDownload(request, env);
    }

    if (url.pathname.startsWith("/share/c/")) {
      return handleChannelSharePreview(request, env);
    }

    if (url.pathname === "/api/ai/chat" || url.pathname === "/api/deepseek/chat") {
      return withSecurityHeaders(await handleAiChat(request, env, url), request, env);
    }

    const softwareSeo = softwareSeoResponse(request, url);
    if (softwareSeo) {
      return withSecurityHeaders(softwareSeo, request, env);
    }

    const travelSeo = travelSeoResponse(request, url);
    if (travelSeo) {
      return withSecurityHeaders(travelSeo, request, env);
    }

    if (env.ASSETS) {
      const assetResponse = await env.ASSETS.fetch(request);
      const softwareHtml = await rewriteSoftwareHtml(request, url, assetResponse);
      return withSecurityHeaders(await rewriteTravelHtml(request, url, softwareHtml), request, env);
    }

    return json({ error: "Not found" }, { status: 404 });
  },
};
