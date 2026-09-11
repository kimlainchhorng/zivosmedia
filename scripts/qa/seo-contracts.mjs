#!/usr/bin/env node
/**
 * Static SEO contracts.
 *
 * These exist because the hand-maintained sitemap drifted away from the router
 * and started advertising URLs that cost us crawl budget:
 *   - /feed and /reels have no route, so they fall through to the /:countrySlug
 *     stub, which renders NotFound and bounces to "/" — a soft 404.
 *   - /eats and /referrals sit behind ProtectedRoute, so a crawler sees a login
 *     wall, never the page.
 *   - /rides, /terms and /ground-transport are client-side redirects, which
 *     Search Console reports as sitemap errors.
 *   - /hotels/london and /hotels/in-london were both listed: one page, two URLs,
 *     split ranking signals.
 *
 * Every rule below turns one of those into a build failure.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { buildInventory, firstDeclarationWins, parseRoutes } from "../seo/route-inventory.mjs";

const root = process.cwd();
const failures = [];
let checks = 0;

function source(relativePath) {
  const file = path.join(root, relativePath);
  if (!existsSync(file)) {
    failures.push(`missing file: ${relativePath}`);
    return "";
  }
  return readFileSync(file, "utf8").replace(/\r\n/g, "\n");
}

function require(id, condition, message) {
  checks += 1;
  if (!condition) failures.push(`${id}: ${message}`);
}

const SITE_URL = "https://zivosmedia.com";

/* ---------------------------------------------------------------- *
 * Route facts every rule below reads from                            *
 * ---------------------------------------------------------------- */

const appSource = source("src/App.tsx");
const routes = appSource ? firstDeclarationWins(parseRoutes(appSource)) : [];
const inventory = appSource ? buildInventory(appSource) : { indexable: [] };

const staticRoutes = new Set(routes.filter((r) => !r.dynamic).map((r) => r.path));
const protectedRoutes = new Set(routes.filter((r) => r.protected).map((r) => r.path));
const redirectRoutes = new Set(routes.filter((r) => r.redirect).map((r) => r.path));

/**
 * Dynamic routes that can actually serve a page.
 *
 * /:countrySlug is excluded on purpose: it renders NotFound, so treating it as
 * a match would make every dead one-segment URL look reachable — which is
 * exactly how /feed and /reels slipped past review.
 */
const NOT_FOUND_STUBS = new Set(["/:countrySlug", "*"]);
const servingDynamicRoutes = routes.filter(
  (r) => r.dynamic && !r.redirect && !NOT_FOUND_STUBS.has(r.path),
);

function matchesDynamicRoute(pathname) {
  const segments = pathname.split("/").filter(Boolean);
  return servingDynamicRoutes.some((route) => {
    const routeSegments = route.path.split("/").filter(Boolean);
    if (routeSegments.length !== segments.length) return false;
    return routeSegments.every((segment, i) => {
      if (!segment.includes(":")) return segment === segments[i];
      // "in-:location" and ":origin-to-:destination" carry a literal prefix.
      const literalPrefix = segment.slice(0, segment.indexOf(":"));
      return segments[i].startsWith(literalPrefix);
    });
  });
}

function routeExists(pathname) {
  return staticRoutes.has(pathname) || matchesDynamicRoute(pathname);
}

const robots = source("public/robots.txt");
const wildcardGroup = robots.slice(robots.indexOf("User-agent: *"));
const disallowRules = [...wildcardGroup.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1].replace(/\*$/, ""));
const isDisallowed = (pathname) => disallowRules.some((rule) => pathname.startsWith(rule));

/* ---------------------------------------------------------------- *
 * sitemap.xml                                                        *
 * ---------------------------------------------------------------- */

const sitemap = source("public/sitemap.xml");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => m[1])
  .filter((loc) => loc.startsWith(SITE_URL))
  .map((loc) => new URL(loc));
for (const url of sitemapUrls) {
  require(`sitemap-query:${url.pathname}${url.search}`, !url.search || (url.search === '?lang=km' || url.search === '?lang=en'), 'Only explicit supported language variants may be indexed.');
}
const sitemapPaths = sitemapUrls.map(url => url.pathname);

require("sitemap-generated", sitemap.includes("scripts/seo/generate-sitemap.mjs"),
  "public/sitemap.xml must be produced by the generator (run `npm run seo:sitemap`)");
require("sitemap-not-empty", sitemapPaths.length > 100,
  `public/sitemap.xml has only ${sitemapPaths.length} URLs — the generator likely failed`);

for (const pathname of sitemapPaths) {
  const id = `sitemap:${pathname}`;
  require(`${id}:exists`, routeExists(pathname), `${pathname} is in the sitemap but has no route (soft 404)`);
  require(`${id}:public`, !protectedRoutes.has(pathname), `${pathname} is in the sitemap but sits behind ProtectedRoute`);
  require(`${id}:not-redirect`, !redirectRoutes.has(pathname), `${pathname} is in the sitemap but only redirects elsewhere`);
}

/**
 * Shapes that must never be advertised.
 *
 * /hotels/in-<city> renders HotelCityLandingPage with the slug taken
 * literally, so the page titles itself "Hotels in In London".
 *
 * The flight and car-rental shapes below all fall through to a generic landing
 * page that sets `canonical` to /flights or /rent-car — React Router does not
 * match params inside a segment, so `to-:toCity` and `:origin-to-:destination`
 * never bind. Verified in the running app.
 */
const DUPLICATE_URL_SHAPES = [
  [/^\/hotels\/in-/, "/hotels/<city>"],
  [/^\/car-rental\/in-/, "/rent-car/<city>"],
  [/^\/flights\/(to|from)-/, "/flights/to/<city>"],
  [/^\/flights\/[a-z-]+-to-[a-z-]+$/, "the generic /flights landing"],
];
for (const [pattern, canonical] of DUPLICATE_URL_SHAPES) {
  const offenders = sitemapPaths.filter((p) => pattern.test(p));
  require(`sitemap-duplicate:${canonical}`, offenders.length === 0,
    `${offenders.length} sitemap URLs duplicate ${canonical} (e.g. ${offenders[0]})`);
}

// Routes robots.txt blocks on purpose (search results, dashboards, /profile)
// are indexable by the router but must stay out of the sitemap.
const indexableMissing = inventory.indexable.filter((p) => !sitemapPaths.includes(p) && !isDisallowed(p));
require("sitemap-covers-indexable", indexableMissing.length === 0,
  `${indexableMissing.length} indexable routes are missing from the sitemap (e.g. ${indexableMissing[0]}) — run \`npm run seo:sitemap\``);

/* ---------------------------------------------------------------- *
 * robots.txt                                                         *
 * ---------------------------------------------------------------- */

/**
 * A URL cannot be both advertised and blocked. Google reports these as
 * "Indexed, though blocked by robots.txt": it keeps the URL but never sees the
 * page, so the listing shows no description.
 */
for (const pathname of sitemapPaths) {
  const blocking = disallowRules.find((rule) => pathname.startsWith(rule));
  require(`sitemap-vs-robots:${pathname}`, !blocking,
    `${pathname} is in the sitemap but robots.txt disallows it via "${blocking}"`);
}
require("robots-sitemap", robots.includes(`Sitemap: ${SITE_URL}/sitemap.xml`),
  "public/robots.txt must advertise the sitemap");
require("robots-no-retired-domain", !robots.includes("hizivo.com"),
  "public/robots.txt still references the retired hizivo.com domain");

/* ---------------------------------------------------------------- *
 * llms.txt — the same rules, for AI crawlers                         *
 * ---------------------------------------------------------------- */

const llms = source("public/llms.txt");
const llmsPaths = [...new Set(
  [...llms.matchAll(new RegExp(`${SITE_URL.replace(/[.]/g, "\\.")}(/[^)\\s]*)`, "g"))].map((m) => m[1]),
)];
for (const pathname of llmsPaths) {
  require(`llms:${pathname}:exists`, routeExists(pathname), `llms.txt links ${pathname}, which has no route`);
  require(`llms:${pathname}:public`, !protectedRoutes.has(pathname), `llms.txt links ${pathname}, which is behind ProtectedRoute`);
}

/* ---------------------------------------------------------------- *
 * Structured data                                                    *
 * ---------------------------------------------------------------- */

/**
 * index.html carries the site-wide JSON-LD (Organization, WebSite with a
 * SearchAction, MobileApplication, WebApplication, Service catalogue, FAQ).
 * It is static, so crawlers get it without executing any JavaScript — but a
 * malformed block is invisible until Search Console reports the loss weeks
 * later, so parse every one of them here.
 */
const indexHtml = source("index.html");
const jsonLdBlocks = [...indexHtml.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => m[1]);

/**
 * No static canonical in index.html.
 *
 * SEOHead updates the tag in place, but the 59 react-helmet-async pages append
 * a second one — leaving two canonicals with the static homepage first, which
 * is the one Google reads. Measured on /hotels/london before this was removed:
 * ["https://zivosmedia.com/", "https://zivosmedia.com/hotels/london"]. Pages
 * set their own; a page that sets none is better off with no canonical at all.
 *
 * The sibling hosts are unaffected: cloudflare/worker.ts strips and re-injects
 * the whole SEO head for zivosoftware.com and zivostravel.com.
 */
require("no-static-canonical", !/<link[^>]+rel="canonical"/.test(indexHtml),
  'index.html must not ship a static <link rel="canonical"> — Helmet pages append a second one and Google reads the first');

require("jsonld-present", jsonLdBlocks.length >= 5,
  `index.html has ${jsonLdBlocks.length} JSON-LD blocks; the site-wide schema set should be there`);

const jsonLdTypes = new Set();
jsonLdBlocks.forEach((block, i) => {
  checks += 1;
  try {
    const parsed = JSON.parse(block);
    for (const entry of Array.isArray(parsed) ? parsed : [parsed]) {
      if (entry["@type"]) jsonLdTypes.add(entry["@type"]);
    }
  } catch (error) {
    failures.push(`jsonld-valid:${i}: index.html JSON-LD block ${i} does not parse (${error.message})`);
  }
});

for (const type of ["Organization", "WebSite", "MobileApplication"]) {
  require(`jsonld-type:${type}`, jsonLdTypes.has(type), `index.html is missing ${type} structured data`);
}

/**
 * The Organization's sameAs must list the profiles the site itself links to.
 *
 * sameAs is how Google ties zivosmedia.com to the company's social accounts;
 * if the footer links a profile the schema does not name, that connection is
 * left on the table, and if the schema names one the site does not link, it is
 * an unverifiable claim.
 */
const footer = source("src/components/Footer.tsx");
const footerSocials = [...footer.matchAll(/href: "(https:\/\/(?:x|instagram|facebook|linkedin|youtube|tiktok)\.com\/[^"]+)"/g)]
  .map((m) => m[1])
  .filter((url) => !/\/(sharer|shareArticle|share)\b/.test(url));
for (const profile of new Set(footerSocials)) {
  require(`jsonld-sameas:${profile}`, indexHtml.includes(profile),
    `index.html Organization sameAs does not list ${profile}, which the footer links`);
}

/**
 * com.myzivo.app and com.hizovo.app are both suspended on Google Play with an
 * appeal outstanding. Advertising either in structured data points searchers
 * and Google at a dead listing, so keep the schema iOS-only until they are
 * reinstated.
 */
require("jsonld-no-suspended-play", !indexHtml.includes("play.google.com/store/apps/details"),
  "index.html structured data links a Google Play listing while the ZIVO packages are suspended");

/* ---------------------------------------------------------------- *
 * Marketing attribution                                              *
 * ---------------------------------------------------------------- */

/**
 * The consent bootstrap reads these from <meta> tags that
 * src/config/marketingRuntimeConfig.ts fills from Vite env vars. If the
 * production deploy does not pass them, every pixel ships dark: no analytics,
 * no conversion tracking, no remarketing audiences, no AdSense revenue.
 */
const MARKETING_ENV_VARS = [
  "VITE_GOOGLE_ANALYTICS_ID",
  "VITE_GOOGLE_ADS_ID",
  "VITE_META_PIXEL_ID",
  "VITE_TIKTOK_PIXEL_ID",
  "VITE_GOOGLE_ADSENSE_CLIENT",
];
for (const workflow of ["deploy-cloudflare-production.yml", "deploy-production.yml"]) {
  const contents = source(`.github/workflows/${workflow}`);
  if (!contents) continue;
  for (const variable of MARKETING_ENV_VARS) {
    require(`marketing-env:${workflow}:${variable}`, contents.includes(variable),
      `${workflow} does not pass ${variable}, so that pixel ships dark in production`);
  }
}

const report = {
  generated: new Date().toISOString(),
  counts: { checks, failures: failures.length },
  failures,
};

console.log(JSON.stringify(report, null, 2));
if (failures.length > 0) process.exit(1);
