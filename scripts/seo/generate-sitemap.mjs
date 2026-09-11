#!/usr/bin/env node
/**
 * Generates public/sitemap.xml and public/sitemap-index.xml from the route
 * table plus the programmatic-SEO config, so the sitemap can never drift from
 * what the app actually serves.
 *
 * Why this exists: the hand-maintained sitemap advertised /feed and /reels
 * (no route -> soft 404), /eats and /referrals (behind ProtectedRoute -> login
 * wall for crawlers), and /rides, /terms, /ground-transport (redirects). Every
 * one of those is a Search Console error we were shipping on purpose.
 *
 *   node scripts/seo/generate-sitemap.mjs            # write the files
 *   node scripts/seo/generate-sitemap.mjs --check    # fail if they are stale
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { transformSync } from 'esbuild';
import { REPO_ROOT, buildInventory, parseRoutes, isSitemapExcluded } from './route-inventory.mjs';

const SITE_URL = 'https://zivosmedia.com';
const SITEMAP_PATH = path.join(REPO_ROOT, 'public', 'sitemap.xml');
const ROBOTS_PATH = path.join(REPO_ROOT, 'public', 'robots.txt');
const SITEMAP_INDEX_PATH = path.join(REPO_ROOT, 'public', 'sitemap-index.xml');

/* ------------------------------------------------------------------ *
 * lastmod: real git dates, not "today" for everything                  *
 * ------------------------------------------------------------------ */

/**
 * file path (repo-relative) -> YYYY-MM-DD of its most recent commit.
 *
 * Scoped to src/ and capped: this repo has ~21k commits and an unscoped walk
 * takes over 100s. Files that fall outside the window simply get no <lastmod>
 * — the tag is optional, and omitting it beats inventing a date Google will
 * learn to distrust.
 */
function buildGitDateMap() {
  const log = execFileSync(
    'git',
    ['log', '--no-merges', '--max-count=2000', '--date=short', '--pretty=format:@%cd', '--name-only', '--', 'src'],
    { cwd: REPO_ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 },
  );
  const dates = new Map();
  let current = null;
  for (const line of log.split('\n')) {
    if (line.startsWith('@')) {
      current = line.slice(1);
    } else if (line && current && !dates.has(line)) {
      dates.set(line, current);
    }
  }
  return dates;
}

/**
 * Date for one file: the bulk map first, then a targeted lookup for anything
 * older than the window. Cached, so each file costs at most one git call.
 */
function makeGitDateLookup(bulk) {
  const cache = new Map();
  return (file) => {
    if (!file) return undefined;
    if (bulk.has(file)) return bulk.get(file);
    if (cache.has(file)) return cache.get(file);
    let date;
    try {
      date = execFileSync('git', ['log', '-1', '--format=%cs', '--', file], {
        cwd: REPO_ROOT,
        encoding: 'utf8',
      }).trim() || undefined;
    } catch {
      date = undefined;
    }
    cache.set(file, date);
    return date;
  };
}

/* ------------------------------------------------------------------ *
 * route -> source file, so each URL gets its own lastmod               *
 * ------------------------------------------------------------------ */

const APP_TSX = path.join(REPO_ROOT, 'src', 'App.tsx');

/** Component name -> repo-relative source file, from App.tsx's lazy() table. */
function buildComponentFileMap(source) {
  const map = new Map();
  const lazyPattern = /const\s+([A-Za-z0-9_]+)\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["']([^"']+)["']/g;
  for (const [, name, specifier] of source.matchAll(lazyPattern)) {
    // App.tsx mixes both alias and relative specifiers; both resolve under src/.
    if (specifier.startsWith('@/')) map.set(name, `src/${specifier.slice(2)}`);
    else if (specifier.startsWith('./')) map.set(name, `src/${specifier.slice(2)}`);
  }
  return map;
}

/** Best-guess source file for a route, by looking at the components it renders. */
function resolveRouteFile(route, componentFiles) {
  const rendered = [...route.element.matchAll(/<([A-Z][A-Za-z0-9_]*)\b/g)].map((m) => m[1]);
  for (const name of rendered) {
    const file = componentFiles.get(name);
    if (!file) continue;
    for (const ext of ['.tsx', '.ts', '/index.tsx', '/index.ts']) {
      if (existsSync(path.join(REPO_ROOT, file + ext))) return file + ext;
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * programmatic SEO pages                                               *
 * ------------------------------------------------------------------ */

/** Import a dependency-free .ts config by transpiling it in memory. */
async function importTsConfig(relativePath) {
  const source = readFileSync(path.join(REPO_ROOT, relativePath), 'utf8');
  const { code } = transformSync(source, { loader: 'ts', format: 'esm', target: 'node18' });
  return import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
}

/**
 * Canonical URL for every programmatic page.
 *
 * Only shapes that actually render their own page belong here, and that is
 * fewer than the config implies. React Router does not match params inside a
 * segment, so `/flights/:origin-to-:destination`, `/flights/to-:toCity` and
 * `/flights/from-:fromCity` never match — those URLs fall through to
 * `/flights/:route`, which renders the generic flights landing with
 * `canonical="/flights"`. Verified in the browser: /flights/new-york-to-london
 * and /flights/to-paris both serve "Search Flights from Cambodia" and point
 * their canonical at /flights. Advertising them would be advertising 85 copies
 * of one page.
 *
 * /rent-car/:city is the same story: /rent-car/miami renders the generic
 * CarRentalLanding with `canonical="/rent-car"`.
 *
 * What is left renders a real, self-canonical page: /flights/to/<city>,
 * /hotels/<city>, /airports/<iata> and /deals/<slug>.
 */
async function programmaticUrls() {
  const seo = await importTsConfig('src/config/programmaticSEO.ts');
  const urls = [];

  for (const city of seo.getCitiesByService('flights')) {
    urls.push({ loc: `/flights/to/${city.slug}`, priority: 0.7, changefreq: 'weekly' });
    urls.push({ loc: `/airports/${city.iataCode.toLowerCase()}`, priority: 0.5, changefreq: 'monthly' });
  }
  for (const city of seo.getCitiesByService('hotels')) {
    urls.push({ loc: `/hotels/${city.slug}`, priority: 0.7, changefreq: 'weekly' });
  }
  for (const deal of seo.SEASONAL_DEALS) {
    urls.push({ loc: `/deals/${deal.slug}`, priority: 0.5, changefreq: 'monthly' });
  }
  return urls;
}

/**
 * robots.txt has the final say.
 *
 * A URL that is both advertised and blocked lands in Search Console as
 * "Indexed, though blocked by robots.txt" — Google keeps the URL but never
 * reads the page, so it ranks with no description. Reading the rules here
 * means the two files cannot contradict each other.
 */
function disallowedPathPrefixes() {
  const robots = readFileSync(ROBOTS_PATH, 'utf8');
  const wildcardGroup = robots.slice(robots.indexOf('User-agent: *'));
  return [...wildcardGroup.matchAll(/^Disallow:\s*(\S+)/gm)].map((m) => m[1].replace(/\*$/, ''));
}

/* ------------------------------------------------------------------ *
 * priority heuristics for static routes                                *
 * ------------------------------------------------------------------ */

const TOP_LEVEL_PRIORITY = new Map([
  ['/', 1.0],
  ['/flights', 0.9],
  ['/hotels', 0.9],
  ['/rent-car', 0.9],
  ['/car-rental', 0.9],
  ['/shop', 0.8],
  ['/jobs', 0.8],
  ['/grocery', 0.8],
  ['/things-to-do', 0.8],
  ['/travel-insurance', 0.8],
  ['/deals', 0.8],
]);

function staticPriority(routePath) {
  if (TOP_LEVEL_PRIORITY.has(routePath)) return TOP_LEVEL_PRIORITY.get(routePath);
  if (routePath.startsWith('/legal/')) return 0.2;
  if (routePath.startsWith('/security/')) return 0.3;
  const depth = routePath.split('/').filter(Boolean).length;
  return depth <= 1 ? 0.7 : 0.5;
}

function staticChangefreq(routePath) {
  if (routePath === '/') return 'daily';
  if (routePath.startsWith('/legal/') || routePath.startsWith('/security/')) return 'yearly';
  return 'weekly';
}

/* ------------------------------------------------------------------ *
 * build                                                                *
 * ------------------------------------------------------------------ */

export async function buildSitemapUrls({ withDates = true } = {}) {
  const source = readFileSync(APP_TSX, 'utf8');
  const inventory = buildInventory(source);
  const routes = parseRoutes(source);
  const gitDates = withDates ? buildGitDateMap() : new Map();
  const gitDateFor = withDates ? makeGitDateLookup(gitDates) : () => undefined;
  const componentFiles = buildComponentFileMap(source);
  const routeByPath = new Map();
  for (const route of routes) {
    if (!routeByPath.has(route.path)) routeByPath.set(route.path, route);
  }

  const disallowed = disallowedPathPrefixes();
  const urls = new Map();
  const add = ({ loc, priority, changefreq, lastmod }) => {
    if (urls.has(loc)) return;
    if (disallowed.some((rule) => loc.startsWith(rule))) return;
    urls.set(loc, { loc, priority, changefreq, lastmod });
  };

  for (const routePath of inventory.indexable) {
    const route = routeByPath.get(routePath);
    const file = route ? resolveRouteFile(route, componentFiles) : null;
    add({
      loc: routePath,
      priority: staticPriority(routePath),
      changefreq: staticChangefreq(routePath),
      lastmod: gitDateFor(file),
    });
  }

  const programmaticLastmod = gitDateFor('src/config/programmaticSEO.ts');
  for (const url of await programmaticUrls()) {
    if (isSitemapExcluded(url.loc)) continue;
    add({ ...url, lastmod: programmaticLastmod });
  }

  const { cambodiaGuidePaths } = await importTsConfig('src/content/cambodiaGuides.ts');
  for (const loc of ['/', '/flights', '/hotels', ...cambodiaGuidePaths]) {
    const entry = urls.get(loc);
    if (!entry) throw new Error(`Localized public route is absent from the sitemap inventory: ${loc}`);
    entry.languageBase = loc;
    if (cambodiaGuidePaths.includes(loc)) entry.priority = 0.9;
    urls.set(`${loc}?lang=km`, { ...entry, loc: `${loc}?lang=km` });
  }
  return [...urls.values()].sort((a, b) => b.priority - a.priority || a.loc.localeCompare(b.loc));
}

function renderSitemap(urls) {
  const body = urls
    .map(
      (u) =>
        `  <url>\n` +
        `    <loc>${SITE_URL}${u.loc === '/' ? '/' : u.loc}</loc>\n` +
        (u.languageBase ? ['en', 'km', 'x-default'].map(language => `    <xhtml:link rel="alternate" hreflang="${language}" href="${SITE_URL}${u.languageBase}${language === 'x-default' ? '' : `?lang=${language}`}" />\n`).join('') : '') +
        (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : '') +
        `    <changefreq>${u.changefreq}</changefreq>\n` +
        `    <priority>${u.priority.toFixed(1)}</priority>\n` +
        `  </url>`,
    )
    .join('\n');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Generated by scripts/seo/generate-sitemap.mjs. Do not edit by hand. -->\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body}\n</urlset>\n`
  );
}

function renderSitemapIndex(lastmod) {
  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<!-- Generated by scripts/seo/generate-sitemap.mjs. Do not edit by hand. -->\n` +
    `<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <sitemap>\n    <loc>${SITE_URL}/sitemap.xml</loc>\n    <lastmod>${lastmod}</lastmod>\n  </sitemap>\n` +
    `</sitemapindex>\n`
  );
}

async function main() {
  const check = process.argv.includes('--check');

  if (check) {
    // Compare the URL set only. Regenerating lastmod on every audit run would
    // make the gate fail for unrelated edits; route drift is what matters here.
    const urls = await buildSitemapUrls({ withDates: false });
    const expected = new Set(urls.map((u) => `${SITE_URL}${u.loc}`));
    let xml = '';
    try {
      xml = readFileSync(SITEMAP_PATH, 'utf8');
    } catch {
      console.error('SEO: public/sitemap.xml is missing. Run `npm run seo:sitemap`.');
      process.exit(1);
    }
    const actual = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
    const missing = [...expected].filter((loc) => !actual.has(loc));
    const extra = [...actual].filter((loc) => !expected.has(loc));
    if (missing.length || extra.length) {
      console.error('SEO: sitemap is out of date. Run `npm run seo:sitemap`.');
      for (const loc of missing.slice(0, 20)) console.error(`  missing: ${loc}`);
      for (const loc of extra.slice(0, 20)) console.error(`  stale:   ${loc}`);
      if (missing.length > 20 || extra.length > 20) {
        console.error(`  ...(${missing.length} missing, ${extra.length} stale in total)`);
      }
      process.exit(1);
    }
    console.log(`SEO: sitemap up to date (${actual.size} URLs).`);
    return;
  }

  const urls = await buildSitemapUrls();
  const dated = urls.filter((u) => u.lastmod);
  const newest = dated.reduce((max, u) => (u.lastmod > max ? u.lastmod : max), '1970-01-01');
  writeFileSync(SITEMAP_PATH, renderSitemap(urls));
  writeFileSync(SITEMAP_INDEX_PATH, renderSitemapIndex(newest));
  console.log(
    `SEO: wrote ${urls.length} URLs to public/sitemap.xml ` +
      `(${dated.length} with lastmod, newest ${newest}).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
