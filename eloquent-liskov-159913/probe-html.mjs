import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto('http://localhost:8081/feed', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(6000);

const found = await page.evaluate(() => {
  // Find element whose textContent contains 'Birthdays' AND 'Events' AND 'Flights' (the right rail)
  const all = Array.from(document.querySelectorAll('aside, section, div'));
  const candidates = all.filter(e => {
    const t = e.textContent || '';
    return t.includes('Birthdays') && t.includes('Events') && t.includes('Flights') && t.length < 4000;
  });
  // pick the smallest one
  candidates.sort((a, b) => (a.textContent?.length || 0) - (b.textContent?.length || 0));
  const panel = candidates[0];
  if (!panel) return { found: false };
  return {
    found: true,
    tagName: panel.tagName,
    classes: panel.className,
    parentTag: panel.parentElement?.tagName,
    parentClasses: panel.parentElement?.className,
    html: panel.outerHTML.slice(0, 3500),
    textSample: panel.textContent?.slice(0, 300),
  };
});
console.log(JSON.stringify(found, null, 2));
await browser.close();
