import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push('PE: ' + e.message));

await page.goto('http://localhost:8081/feed', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const accept = page.locator('button:has-text("Accept All")').first();
if (await accept.count() > 0) { await accept.click().catch(()=>{}); await page.waitForTimeout(500); }

await page.screenshot({ path: '/tmp/zivo-test/feed-route.png', fullPage: false });
// Right rail clip
await page.screenshot({ path: '/tmp/zivo-test/feed-right.png', clip: { x: 1100, y: 60, width: 340, height: 800 } });
// Higher-DPI crop of just the quick-access grid
await page.screenshot({ path: '/tmp/zivo-test/feed-quick.png', clip: { x: 1140, y: 100, width: 280, height: 220 }, scale: 'css' });

const info = await page.evaluate(() => {
  return {
    title: document.title,
    url: location.href,
    h1s: Array.from(document.querySelectorAll('h1, h2')).slice(0, 6).map(h => h.textContent?.trim()),
    rootClasses: document.querySelector('main, [role="main"], #root > div')?.className?.slice(0, 200) || '',
    bodyText: document.body.innerText.slice(0, 500),
  };
});
console.log(JSON.stringify(info, null, 2));
console.log('\n--- ERRORS ---');
errors.slice(-10).forEach(e => console.log(e));
await browser.close();
