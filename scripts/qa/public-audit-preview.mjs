import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const folder = 'artifacts/site-audit';
await mkdir(folder, { recursive: true });
const browser = await chromium.launch();
const results = [];
try {
  for (const item of [
    { name: 'home-en-desktop', path: '/?lang=en', width: 1366, height: 900 },
    { name: 'home-km-mobile', path: '/?lang=km', width: 390, height: 844 },
    { name: 'flights-km-mobile', path: '/flights?lang=km&from=KTI&to=SAI', width: 390, height: 844 },
    { name: 'hotels-km-mobile', path: '/hotels?lang=km', width: 390, height: 844 },
    { name: 'siem-reap-km-no-js', path: '/cambodia/siem-reap?lang=km', width: 390, height: 844, javaScriptEnabled: false },
  ]) {
    const context = await browser.newContext({ viewport: { width:item.width, height:item.height }, javaScriptEnabled:item.javaScriptEnabled ?? true, serviceWorkers:'block' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.name));
    await page.goto('http://127.0.0.1:5202' + item.path, { waitUntil:'domcontentloaded' });
    await page.locator('h1').first().waitFor({ state:'visible', timeout:30000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1000);
    const result = await page.evaluate(() => ({ language:document.documentElement.lang, headings:[...document.querySelectorAll('h1')].map(e=>e.textContent), overflow:document.documentElement.scrollWidth > innerWidth, title:document.title }));
    await page.screenshot({ path:`${folder}/${item.name}.png`, fullPage: item.path.startsWith('/?') || item.javaScriptEnabled === false });
    results.push({ page:item.name, ...result, errors });
    await context.close();
  }
} finally { await browser.close(); }
await writeFile(`${folder}/public-preview.json`, JSON.stringify(results,null,2));
console.log(JSON.stringify(results,null,2));
if (results.some(result => result.overflow || result.errors.length || result.headings.length !== 1)) process.exitCode=1;
