import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const accept = page.locator('button:has-text("Accept All")').first();
if (await accept.count() > 0) { await accept.click().catch(()=>{}); await page.waitForTimeout(500); }
await page.locator('input[type="text"]').first().fill('klainkonkat@gmail.com');
await page.locator('input[type="password"]').first().fill('Chhorng@1998');
await page.locator('button:has-text("Log in")').first().click();
await page.waitForTimeout(8000);
await page.goto('http://localhost:8081/chat', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const row = page.locator('button:has-text("Saved Messages")').first();
await row.click();
await page.waitForTimeout(3000);
await page.screenshot({ path: '/tmp/zivo-test/chat-after-fix.png' });

// Check chat overlay positioning + input visibility
const info = await page.evaluate(() => {
  const overlays = Array.from(document.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    return cs.position === 'fixed' && parseInt(cs.zIndex) >= 50 && el.querySelector('input[placeholder*="Message"]');
  });
  const overlay = overlays[0];
  if (!overlay) return { found: false };
  const oCS = getComputedStyle(overlay);
  const oRect = overlay.getBoundingClientRect();
  // Find message input
  const input = overlay.querySelector('input[placeholder*="Message"], textarea[placeholder*="Message"]');
  const inRect = input?.getBoundingClientRect();
  // Find scrollable messages container
  const scrollEls = Array.from(overlay.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    return cs.overflowY === 'auto' || cs.overflowY === 'scroll';
  });
  return {
    found: true,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    overlay: {
      top: oCS.top, bottom: oCS.bottom, height: oCS.height,
      rectBottom: oRect.bottom,
    },
    inputBottom: inRect?.bottom,
    inputVisible: inRect && inRect.bottom > 0 && inRect.bottom <= window.innerHeight,
    scrollEls: scrollEls.length,
    scrollSizes: scrollEls.slice(0, 3).map(el => ({
      h: el.clientHeight,
      scroll: el.scrollHeight,
    })),
  };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
