// One-off probe: log in, navigate to /store-map, observe loading behavior.
// Reports console errors, network failures, time to map-ready, and screenshots.
import { webkit, devices } from '@playwright/test';
import fs from 'fs';

fs.mkdirSync('/tmp/zivo-map', { recursive: true });

const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 15 Pro'] });
const page = await context.newPage();

const errors = [];
const warnings = [];
const networkFails = [];
const networkLog = [];

page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error') errors.push(msg.text());
  else if (t === 'warning') warnings.push(msg.text());
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));
page.on('requestfailed', (req) =>
  networkFails.push(`${req.method()} ${req.url()} — ${req.failure()?.errorText}`),
);
page.on('response', (res) => {
  const u = res.url();
  if (u.includes('maps-api-key') || u.includes('googleapis.com/maps')) {
    networkLog.push(`${res.status()} ${u}`);
  }
});

const BASE = 'http://127.0.0.1:8082';

console.log('STEP 1: navigate /login');
const t0 = Date.now();
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
console.log(`  load: ${Date.now() - t0}ms`);

await page.locator('input[type="email"], input[name="email"]').first().fill('klainkonkat@gmail.com');
await page.locator('input[type="password"], input[name="password"]').first().fill('Chhorng@1998');
await page.locator('button[type="submit"]').first().click().catch(() => {});
await page.waitForTimeout(3500);
await page.screenshot({ path: '/tmp/zivo-map/01-after-login.png' });

console.log('STEP 2: navigate /store-map (cold)');
const t1 = Date.now();
await page.goto(`${BASE}/store-map`, { waitUntil: 'domcontentloaded', timeout: 60000 });
const navMs = Date.now() - t1;
console.log(`  domcontentloaded: ${navMs}ms`);

// Snapshot at 100ms — this is what the user sees in the "blank" complaint.
await page.waitForTimeout(100);
await page.screenshot({ path: '/tmp/zivo-map/02-map-100ms.png' });

const earlyText = await page.locator('body').textContent().catch(() => '');
console.log(`  100ms text: ${JSON.stringify((earlyText || '').slice(0, 120))}`);

// Loading-overlay visibility check
const loadingVisible = await page.locator('text=Loading map').isVisible().catch(() => false);
console.log(`  100ms — "Loading map…" visible: ${loadingVisible}`);

// Animated shimmer bar check (reads computed style)
const shimmerInfo = await page.evaluate(() => {
  const bars = Array.from(document.querySelectorAll('.animate-shimmer'));
  return bars.map((b) => {
    const cs = getComputedStyle(b);
    return {
      animation: cs.animation || cs.animationName,
      bg: cs.backgroundColor,
    };
  });
}).catch(() => []);
console.log(`  shimmer bars: ${JSON.stringify(shimmerInfo)}`);

await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/zivo-map/03-map-2s.png' });

// Wait up to 15s for the map div to actually contain Google Maps content
const mapReadyMs = await (async () => {
  const start = Date.now();
  for (let i = 0; i < 75; i++) {
    const ready = await page.evaluate(() => {
      const overlay = document.querySelector('.absolute.inset-0.z-\\[500\\]');
      if (overlay) return false;
      const mapDiv = document.querySelector('[role="region"][aria-label*="Map"], .gm-style');
      return !!mapDiv;
    }).catch(() => false);
    if (ready) return Date.now() - start;
    await page.waitForTimeout(200);
  }
  return -1;
})();
console.log(`  map-ready: ${mapReadyMs >= 0 ? mapReadyMs + 'ms' : 'TIMEOUT (15s)'}`);
await page.screenshot({ path: '/tmp/zivo-map/04-map-final.png' });

console.log('\nSTEP 3: navigate AWAY then back (warm cache test)');
await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(500);
const t2 = Date.now();
await page.goto(`${BASE}/store-map`, { waitUntil: 'domcontentloaded' });
console.log(`  warm load domcontentloaded: ${Date.now() - t2}ms`);
await page.waitForTimeout(100);
await page.screenshot({ path: '/tmp/zivo-map/05-warm-100ms.png' });
const warmReady = await page.evaluate(() => !document.querySelector('.absolute.inset-0.z-\\[500\\]'));
console.log(`  100ms — overlay already gone (warm): ${warmReady}`);

console.log('\n=== REPORT ===');
console.log(`errors:    ${errors.length}`);
errors.slice(0, 8).forEach((e) => console.log(`  ✗ ${e.slice(0, 200)}`));
console.log(`warnings:  ${warnings.length}`);
console.log(`network fails: ${networkFails.length}`);
networkFails.slice(0, 5).forEach((n) => console.log(`  ✗ ${n}`));
console.log(`maps requests:`);
networkLog.slice(0, 10).forEach((n) => console.log(`  → ${n}`));

await browser.close();
console.log('\nscreenshots in /tmp/zivo-map/');
