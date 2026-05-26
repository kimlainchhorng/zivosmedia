import { webkit, devices } from '@playwright/test';

const browser = await webkit.launch({ headless: true });
const context = await browser.newContext({
  ...devices['iPhone 15 Pro'],
});
const page = await context.newPage();

const errors = [];
const consoles = [];
page.on('console', (msg) => {
  consoles.push(`[${msg.type()}] ${msg.text()}`);
});
page.on('pageerror', (err) => {
  errors.push(`PAGEERROR: ${err.message}\n${(err.stack || '').slice(0, 2000)}`);
});

console.log('Step 1: /login');
await page.goto('http://localhost:8082/login', { waitUntil: 'load', timeout: 60000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: '/tmp/zivo-test/01-login.png' });

const emailEl = page.locator('input[type="email"], input[name="email"]').first();
const passEl = page.locator('input[type="password"], input[name="password"]').first();
await emailEl.fill('klainkonkat@gmail.com');
await passEl.fill('Chhorng@1998');
await page.screenshot({ path: '/tmp/zivo-test/02-filled.png' });

const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Continue")').first();
await submitBtn.click().catch(() => passEl.press('Enter'));

await page.waitForTimeout(9000);
await page.screenshot({ path: '/tmp/zivo-test/03-after-login.png' });
console.log('After login URL:', page.url());

console.log('=== CONSOLE (last 80) ===');
consoles.slice(-80).forEach((l) => console.log(l));
console.log('=== PAGE ERRORS (' + errors.length + ') ===');
errors.forEach((e) => console.log(e));

await browser.close();
