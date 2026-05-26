import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8081/feed-new', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const accept = page.locator('button:has-text("Accept All")').first();
if (await accept.count() > 0) { await accept.click().catch(()=>{}); await page.waitForTimeout(500); }

const tabInfo = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('a, button'));
  return all
    .filter(el => ['Feed', 'Reel', 'Chat'].includes(el.textContent?.trim()))
    .slice(0, 3)
    .map(el => {
      const cs = getComputedStyle(el);
      return { text: el.textContent.trim(), color: cs.color, borderColor: cs.borderColor, background: cs.backgroundImage || cs.backgroundColor };
    });
});
console.log(JSON.stringify(tabInfo, null, 2));

await page.screenshot({ path: '/tmp/zivo-test/header2.png', clip: { x: 0, y: 0, width: 700, height: 80 } });
await browser.close();
