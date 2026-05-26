import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);
await page.screenshot({ path: '/tmp/zivo-test/login-page.png' });
const info = await page.evaluate(() => {
  const inputs = Array.from(document.querySelectorAll('input')).map(i => ({
    type: i.type,
    name: i.name,
    placeholder: i.placeholder,
    visible: i.offsetWidth > 0 && i.offsetHeight > 0,
  }));
  const buttons = Array.from(document.querySelectorAll('button')).slice(0, 10).map(b => b.textContent?.trim().slice(0, 40));
  return { inputs, buttons, body: document.body.innerText.slice(0, 500) };
});
console.log(JSON.stringify(info, null, 2));
await browser.close();
