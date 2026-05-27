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

console.log('\n=== TEST: Click Saved Messages WITHOUT force ===');
const row = page.locator('button:has-text("Saved Messages")').first();
try {
  await row.click({ timeout: 4000 });
  console.log('Click OK');
} catch (e) {
  console.log('Click BLOCKED:', e.message.slice(0, 400));
}
await page.waitForTimeout(2000);

console.log('\n=== TEST: Click input field ===');
const input = page.locator('input[placeholder*="Message"], textarea[placeholder*="Message"]').first();
try {
  await input.click({ timeout: 4000 });
  console.log('Input click OK');
} catch (e) {
  console.log('Input click BLOCKED:', e.message.slice(0, 400));
}

console.log('\n=== TEST: Find element at viewport center of right pane ===');
const blocker = await page.evaluate(() => {
  // What element is at the center of the right pane?
  const x = 900, y = 500;
  const el = document.elementFromPoint(x, y);
  if (!el) return null;
  const chain = [];
  let cur = el;
  while (cur && chain.length < 6) {
    const cs = getComputedStyle(cur);
    chain.push({
      tag: cur.tagName,
      cls: (cur.className?.slice ? cur.className.slice(0, 150) : '').replace(/\s+/g, ' '),
      pointerEvents: cs.pointerEvents,
      position: cs.position,
      zIndex: cs.zIndex,
    });
    cur = cur.parentElement;
  }
  return chain;
});
console.log(JSON.stringify(blocker, null, 2));

console.log('\n=== TEST: Try clicking a sidebar conversation while chat is open ===');
const sidebarRow = page.locator('button:has-text("ZIVO class")').first();
try {
  await sidebarRow.click({ timeout: 4000 });
  console.log('Sidebar click OK');
  await page.waitForTimeout(1500);
  // Check if chat actually switched
  const newChatTitle = await page.evaluate(() => {
    const h = Array.from(document.querySelectorAll('h2, h3, p, span'))
      .find(el => el.textContent?.trim() === 'ZIVO class');
    return h?.textContent?.trim();
  });
  console.log('Chat switched to:', newChatTitle);
} catch (e) {
  console.log('Sidebar click BLOCKED:', e.message.slice(0, 400));
}

await page.screenshot({ path: '/tmp/zivo-test/clicks.png' });
await browser.close();
