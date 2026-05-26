import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(3500);
const accept = page.locator('button:has-text("Accept All")').first();
if (await accept.count() > 0) { await accept.click().catch(()=>{}); await page.waitForTimeout(500); }
const email = page.locator('input[type="text"]').first();
const pass = page.locator('input[type="password"]').first();
await email.fill('klainkonkat@gmail.com');
await pass.fill('Chhorng@1998');
await page.locator('button:has-text("Log in")').first().click();
await page.waitForTimeout(8000);
await page.goto('http://localhost:8081/chat', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
// Click "Groups" filter to reveal the "Start a group call" CTA card
const groupsTab = page.locator('button:has-text("Groups")').first();
if (await groupsTab.count() > 0) { await groupsTab.click({ timeout: 2000 }).catch(()=>{}); await page.waitForTimeout(800); }
// Try the Start button next to "Start a group call" — fall back to other entry points
const startBtn = page.locator('button[aria-label="Start a group call"]').first();
if (await startBtn.count() > 0) {
  await startBtn.click();
  await page.waitForTimeout(800);
} else {
  console.log('Start a group call button not found, checking for other entry');
}
await page.screenshot({ path: '/tmp/zivo-test/meet-picker.png' });
await browser.close();
console.log('done');
