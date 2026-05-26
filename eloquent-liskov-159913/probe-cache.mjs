import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  serviceWorkers: 'block',
});
const page = await ctx.newPage();
// Disable cache
await page.route('**/*', (route) => {
  const headers = { ...route.request().headers(), 'cache-control': 'no-cache, no-store' };
  route.continue({ headers });
});
await page.goto('http://localhost:8081/feed', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

const has = await page.evaluate(() => {
  const txt = document.body.innerText;
  return {
    hasBirthdays: txt.includes('Birthdays'),
    hasViewBirthdays: txt.includes('View birthdays'),
    hasQuickAccess: txt.includes('Quick Access'),
    hasEvents: /\bEvents\b/.test(txt),
    snippet: txt.slice(0, 800),
  };
});
console.log(JSON.stringify(has, null, 2));
await page.screenshot({ path: '/tmp/zivo-test/feed-no-sw.png', clip: { x: 1100, y: 60, width: 340, height: 800 } });
await browser.close();
