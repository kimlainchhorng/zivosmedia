// Multi-route smoothness probe.
// Logs in, then visits each major route. For each:
//   • measures DOMContentLoaded
//   • measures time-to-first-meaningful-text (any visible body text > 50 chars)
//   • measures time-to-stable (no DOM mutations for 500ms)
//   • captures console errors
//   • screenshots at 100ms (the "what users see at first") and 3s (the "settled state")
import { webkit, devices } from '@playwright/test';
import fs from 'fs';

fs.mkdirSync('/tmp/zivo-routes', { recursive: true });

const ROUTES = [
  { name: 'home',       url: '/' },
  { name: 'rides',      url: '/rides/hub' },
  { name: 'flights',    url: '/flights' },
  { name: 'hotels',     url: '/hotels' },
  { name: 'cars',       url: '/cars' },
  { name: 'chat',       url: '/chat' },
  { name: 'account',    url: '/account' },
  { name: 'wallet',     url: '/wallet' },
  { name: 'feed',       url: '/feed' },
  { name: 'reels',      url: '/reels' },
  { name: 'store-map',  url: '/store-map' },
];

const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({ ...devices['iPhone 15 Pro'] });
const page = await context.newPage();

const errors = [];
page.on('pageerror', (err) => errors.push(`[${page.url()}] ${err.message}`));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(`[${page.url()}] CONSOLE: ${m.text().slice(0, 200)}`);
});

const BASE = 'http://127.0.0.1:8082';

console.log('logging in…');
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.locator('input[type="email"]').first().fill('klainkonkat@gmail.com').catch(() => {});
await page.locator('input[type="password"]').first().fill('Chhorng@1998').catch(() => {});
await page.locator('button[type="submit"]').first().click().catch(() => {});
await page.waitForTimeout(4000);

const results = [];

for (const route of ROUTES) {
  console.log(`\n→ ${route.name} (${route.url})`);
  const t0 = Date.now();
  let firstMeaningfulText = -1;
  let stable = -1;

  try {
    await page.goto(`${BASE}${route.url}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    const dom = Date.now() - t0;

    // Capture what user sees immediately
    await page.waitForTimeout(150);
    await page.screenshot({ path: `/tmp/zivo-routes/${route.name}-150ms.png` });

    // Poll for first meaningful text
    for (let i = 0; i < 50; i++) {
      const txt = await page.evaluate(() => {
        const root = document.getElementById('root');
        return root ? (root.innerText || '').trim().length : 0;
      }).catch(() => 0);
      if (txt > 50) { firstMeaningfulText = Date.now() - t0; break; }
      await page.waitForTimeout(100);
    }

    // Poll for DOM stability
    let lastSnap = '';
    let stableSince = Date.now();
    for (let i = 0; i < 100; i++) {
      const snap = await page.evaluate(() => document.body.innerHTML.length).catch(() => 0);
      if (String(snap) === lastSnap) {
        if (Date.now() - stableSince >= 500) { stable = Date.now() - t0; break; }
      } else {
        lastSnap = String(snap);
        stableSince = Date.now();
      }
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(500);
    await page.screenshot({ path: `/tmp/zivo-routes/${route.name}-3s.png` });

    results.push({
      name: route.name, url: route.url,
      dom_ms: dom,
      first_text_ms: firstMeaningfulText,
      stable_ms: stable,
      blank_ms: firstMeaningfulText > 0 ? firstMeaningfulText - dom : -1,
    });
    console.log(`  dom=${dom}ms  first-text=${firstMeaningfulText}ms  stable=${stable}ms`);
  } catch (e) {
    results.push({ name: route.name, url: route.url, error: e.message.slice(0, 200) });
    console.log(`  FAIL: ${e.message.slice(0, 150)}`);
  }
}

console.log('\n=== SUMMARY (sorted by time-to-first-text) ===');
results
  .filter((r) => r.first_text_ms !== undefined)
  .sort((a, b) => (b.first_text_ms || 0) - (a.first_text_ms || 0))
  .forEach((r) => {
    const verdict =
      r.first_text_ms < 0 ? 'BROKEN'
      : r.first_text_ms > 3000 ? 'SLOW'
      : r.first_text_ms > 1500 ? 'meh'
      : r.blank_ms > 1000 ? 'blank-gap'
      : 'ok';
    console.log(
      `  ${verdict.padEnd(10)} ${r.name.padEnd(12)} dom=${String(r.dom_ms).padStart(4)}ms  text=${String(r.first_text_ms).padStart(5)}ms  blank=${String(r.blank_ms).padStart(5)}ms`,
    );
  });

console.log(`\nerrors: ${errors.length}`);
errors.slice(0, 10).forEach((e) => console.log(`  ${e}`));

await browser.close();
console.log('\nscreenshots in /tmp/zivo-routes/');
