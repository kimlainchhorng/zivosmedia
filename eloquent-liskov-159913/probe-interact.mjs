import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', e => errors.push('PE: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('[err] ' + m.text().slice(0,200)); });

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

// Open Chhorng Kimlain personal chat (has real messages)
console.log('\n== TEST 1: Open a personal chat with messages ==');
const row = page.locator('button:has-text("Chhorng Kimlain")').first();
await row.click();
await page.waitForTimeout(3500);
await page.screenshot({ path: '/tmp/zivo-test/test-1-opened.png' });

// Measure layout
const layout = await page.evaluate(() => {
  const overlays = Array.from(document.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    return cs.position === 'fixed' && parseInt(cs.zIndex) >= 50 && el.querySelector('input[placeholder*="Message"], textarea[placeholder*="Message"]');
  });
  const overlay = overlays[0];
  if (!overlay) return { found: false };
  const r = overlay.getBoundingClientRect();
  const input = overlay.querySelector('input[placeholder*="Message"], textarea[placeholder*="Message"]');
  const inR = input?.getBoundingClientRect();
  const messages = overlay.querySelectorAll('[data-msg], [data-message-id], .message, [class*="bubble"]');
  return {
    overlay: { left: r.left, top: r.top, right: r.right, bottom: r.bottom },
    inputVisible: inR && inR.bottom <= window.innerHeight && inR.top >= 0,
    inputRect: inR && { top: inR.top, bottom: inR.bottom, left: inR.left },
    messageCount: messages.length,
  };
});
console.log('Layout:', JSON.stringify(layout, null, 2));

// TEST 2: Try scrolling the messages area
console.log('\n== TEST 2: Scroll the messages area ==');
const beforeScroll = await page.evaluate(() => {
  const scrollEls = Array.from(document.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 5;
  });
  return scrollEls.map(el => ({
    cls: el.className.slice ? el.className.slice(0,80) : '',
    h: el.clientHeight,
    scrollH: el.scrollHeight,
    scrollTop: el.scrollTop,
  })).slice(0, 5);
});
console.log('Scrollables BEFORE scroll:', JSON.stringify(beforeScroll, null, 2));

// Try to scroll the first scrollable inside the overlay
await page.evaluate(() => {
  const scrollEls = Array.from(document.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 5;
  });
  if (scrollEls[0]) scrollEls[0].scrollTop = scrollEls[0].scrollHeight; // scroll to bottom
});
await page.waitForTimeout(300);

const afterScroll = await page.evaluate(() => {
  const scrollEls = Array.from(document.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    return (cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight + 5;
  });
  return scrollEls.map(el => ({ scrollTop: el.scrollTop, scrollH: el.scrollHeight })).slice(0, 5);
});
console.log('Scrollables AFTER scroll:', JSON.stringify(afterScroll, null, 2));

// TEST 3: Click an input and type
console.log('\n== TEST 3: Type into message input ==');
const msgInput = page.locator('input[placeholder*="Message"], textarea[placeholder*="Message"]').first();
const inputCount = await msgInput.count();
console.log('Message input found:', inputCount);
if (inputCount > 0) {
  await msgInput.click({ timeout: 3000 }).catch((e) => console.log('Click fail:', e.message));
  await page.waitForTimeout(300);
  await msgInput.fill('Test from probe');
  await page.waitForTimeout(300);
  const val = await msgInput.inputValue();
  console.log('Input value after typing:', val);
}
await page.screenshot({ path: '/tmp/zivo-test/test-3-typed.png' });

// TEST 4: Try clicking a like / reaction on a message bubble
console.log('\n== TEST 4: Try double-tap to like a message ==');
const bubbles = await page.locator('[data-msg], [class*="bubble"], [class*="Bubble"]').count();
console.log('Bubbles found:', bubbles);

console.log('\n== ERRORS ==');
errors.slice(-15).forEach(e => console.log(e));
await browser.close();
