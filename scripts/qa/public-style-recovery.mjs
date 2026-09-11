import { chromium, expect } from '@playwright/test';
// Fault injection is loopback-only; block external requests so it cannot report
// artificial failures to a production analytics or monitoring endpoint.
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ serviceWorkers:'block' });
  await context.route('https://**/*', route => route.abort());
  await context.route('**/assets/index-*.css', route => route.abort());
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:5202/?lang=en', { waitUntil:'networkidle' });
  await page.waitForFunction(() => performance.getEntriesByType('resource').some(entry => entry.name.includes('/PublicHomeEntry-')));
  await page.waitForTimeout(1000);
  await page.locator('h1').click();
  await page.waitForFunction(() => sessionStorage.getItem('zivo_chunk_reload'));
  await page.waitForLoadState('networkidle');
  await expect(page.locator('h1')).toHaveText('One app for Cambodia');
  await page.locator('h1').click();
  await expect(page.locator('h1')).toHaveText('Something went wrong');
  await page.getByRole('button', { name:'Try Again', exact:true }).click();
  await expect(page.locator('h1')).toHaveText('One app for Cambodia');
  expect(await page.evaluate(() => localStorage.getItem('zivo_cookie_consent'))).toBeNull();
  console.log('PASS: CSS failure gets one bounded automatic reload, visible recovery, and a working explicit retry. No consent or external monitoring requests.');
} finally { await browser.close(); }
