import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();

const errors = [];
const warnings = [];
page.on('console', (msg) => {
  const t = msg.type();
  if (t === 'error') errors.push(`[err] ${msg.text()}`);
  if (t === 'warning') warnings.push(`[warn] ${msg.text()}`);
});
page.on('pageerror', (err) => errors.push(`PAGEERROR: ${err.message}`));

console.log('Step 1: /login');
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded', timeout: 60000 });
await page.waitForTimeout(2000);

const emailEl = page.locator('input[type="email"], input[name="email"]').first();
const passEl = page.locator('input[type="password"], input[name="password"]').first();
if (await emailEl.count() > 0) {
  await emailEl.fill('klainkonkat@gmail.com');
  await passEl.fill('Chhorng@1998');
  const submitBtn = page.locator('button[type="submit"], button:has-text("Sign in"), button:has-text("Log in"), button:has-text("Continue")').first();
  await submitBtn.click().catch(() => passEl.press('Enter'));
  await page.waitForTimeout(8000);
}

console.log('Step 2: navigate /feed-new');
await page.goto('http://localhost:8081/feed-new', { waitUntil: 'domcontentloaded' }).catch(()=>{});
await page.waitForTimeout(6000);
await page.screenshot({ path: '/tmp/zivo-test/socialfeed-full.png', fullPage: true });

// Inspect DOM for the issues:
const report = await page.evaluate(() => {
  const out = {};

  // 1. Look for video elements that might be broken (no src, or black)
  const videos = Array.from(document.querySelectorAll('video'));
  out.videos = videos.map(v => ({
    src: v.currentSrc || v.src || '(none)',
    hasSrc: !!(v.currentSrc || v.src),
    poster: v.poster || '(none)',
    readyState: v.readyState,
    networkState: v.networkState,
    width: v.clientWidth,
    height: v.clientHeight,
    paused: v.paused,
    error: v.error ? v.error.code : null,
  }));

  // 2. Skeleton elements still visible
  const skeletons = Array.from(document.querySelectorAll('[class*="skeleton" i], [class*="Skeleton" i], [data-state="loading"]'));
  out.skeletons = skeletons.length;
  out.skeletonSnippets = skeletons.slice(0, 5).map(s => s.outerHTML.slice(0, 200));

  // 3. Stories row — find the rail and report children
  const labels = Array.from(document.querySelectorAll('span, div, p')).filter(el => /Your story|Discover people/.test(el.textContent || ''));
  if (labels.length) {
    const rail = labels[0].closest('[class*="overflow-x"], [class*="snap-x"], [class*="flex"]');
    out.railHTML = rail ? rail.outerHTML.slice(0, 1200) : '(no rail)';
    out.railChildCount = rail ? rail.children.length : 0;
  }

  // 4. Header tab buttons - check colors
  const tabs = Array.from(document.querySelectorAll('button, a')).filter(el => {
    const t = el.textContent?.trim();
    return ['Feed', 'Reel', 'Chat'].includes(t);
  }).slice(0, 3);
  out.tabs = tabs.map(t => ({
    text: t.textContent.trim(),
    classes: t.className,
  }));

  return out;
});

console.log('--- VIDEOS ---');
console.log(JSON.stringify(report.videos, null, 2));
console.log('--- SKELETONS still in DOM:', report.skeletons);
report.skeletonSnippets.forEach(s => console.log(s));
console.log('--- STORIES RAIL children:', report.railChildCount);
console.log(report.railHTML);
console.log('--- TABS ---');
console.log(JSON.stringify(report.tabs, null, 2));

console.log('\n=== ERRORS (' + errors.length + ') ===');
errors.slice(-30).forEach(e => console.log(e));
console.log('\n=== WARNINGS (' + warnings.length + ') ===');
warnings.slice(-15).forEach(w => console.log(w));

await browser.close();
