import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(4000);
const accept = page.locator('button:has-text("Accept All")').first();
if (await accept.count() > 0) { await accept.click().catch(()=>{}); await page.waitForTimeout(500); }
const email = page.locator('input[placeholder*="email"], input[placeholder*="username"], input[type="text"]').first();
const pass = page.locator('input[type="password"]').first();
await email.fill('klainkonkat@gmail.com');
await pass.fill('Chhorng@1998');
await page.locator('button:has-text("Log in")').first().click();
await page.waitForTimeout(8000);

await page.goto('http://localhost:8081/chat', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
const chatRow = page.locator('button:has-text("Saved Messages")').first();
await chatRow.click();
await page.waitForTimeout(3000);

const info = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll('*'));
  const chatOverlays = all.filter(el => {
    const cs = getComputedStyle(el);
    return cs.position === 'fixed' && (parseInt(cs.zIndex) >= 50) && el.querySelector('input[placeholder*="Message"]');
  });
  if (chatOverlays.length > 0) {
    const overlay = chatOverlays[0];
    const cs = getComputedStyle(overlay);
    return {
      overlayLeft: cs.left,
      overlayWidth: cs.width,
      overlayRight: cs.right,
      cssVar: cs.getPropertyValue('--chat-sidebar-w'),
      shell: (() => {
        const s = document.querySelector('[data-zivo-chat-shell]');
        if (!s) return null;
        const c = getComputedStyle(s);
        return { left: c.left, width: c.width, position: c.position };
      })(),
    };
  }
  return chatOverlays.map(el => {
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      className: el.className?.slice ? el.className.slice(0, 600) : String(el.className).slice(0, 600),
      position: cs.position,
      left: cs.left,
      right: cs.right,
      top: cs.top,
      bottom: cs.bottom,
      width: cs.width,
      height: cs.height,
      zIndex: cs.zIndex,
      varSidebarW: cs.getPropertyValue('--chat-sidebar-w'),
    };
  });
});
console.log(JSON.stringify(info, null, 2));
await page.screenshot({ path: '/tmp/zivo-test/chat-two-col.png' });
// Now click collapse button to verify
const collapse = page.locator('button[aria-label="Collapse sidebar"]').first();
if (await collapse.count() > 0) {
  await collapse.click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: '/tmp/zivo-test/chat-collapsed.png' });
}
await browser.close();
