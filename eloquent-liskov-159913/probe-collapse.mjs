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
// open Saved Messages chat
const row = page.locator('button:has-text("Saved Messages")').first();
await row.click();
await page.waitForTimeout(2000);
await page.screenshot({ path: '/tmp/zivo-test/sidebar-expanded.png' });

// Click collapse button
const collapseBtn = page.locator('button[aria-label="Collapse sidebar"]').first();
await collapseBtn.click({ force: true }).catch(() => {});
await page.waitForTimeout(600);
await page.screenshot({ path: '/tmp/zivo-test/sidebar-collapsed.png' });

// Inspect computed shell width
const info = await page.evaluate(() => {
  const s = document.querySelector('[data-zivo-chat-shell]');
  if (!s) return null;
  const c = getComputedStyle(s);
  return { width: c.width, left: c.left };
});
console.log(JSON.stringify(info));
await browser.close();
