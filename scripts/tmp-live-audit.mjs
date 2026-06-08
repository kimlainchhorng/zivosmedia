// TEMP audit script (not committed). Renders all ZIVO domains/paths and captures evidence.
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const SHOT = path.join(ROOT, 'docs', 'live-audit-screenshots');
const OUT = path.join(ROOT, 'scripts', 'tmp-audit-results.json');

const ROOTS = [
  'zivosmedia.com', 'zivobusiness.com', 'zivodriver.com', 'zivoemployee.com',
  'zivoschat.com', 'zivosoftware.com', 'zivostravel.com', 'zivoadmin.com',
];

const PATHS = {
  'zivosmedia.com': ['/', '/login', '/signup', '/feed', '/business', '/chat', '/travel', '/flights', '/hotels', '/cars', '/bus', '/travel/checkout', '/wallet', '/support/new', '/legal/privacy', '/settings'],
  'zivobusiness.com': ['/'],
  'zivodriver.com': ['/', '/join', '/signup', '/login', '/support', '/privacy', '/terms'],
  'zivoemployee.com': ['/'],
  'zivoschat.com': ['/'],
  'zivosoftware.com': ['/'],
  'zivostravel.com': ['/', '/flights', '/hotels', '/cars', '/bus', '/support', '/trips'],
  'zivoadmin.com': ['/'],
};

function keyOf(domain, p) {
  const slug = p === '/' ? 'root' : p.replace(/^\//, '').replace(/[\/]/g, '-');
  return `${domain.replace(/\./g, '_')}__${slug}`;
}

const VIEWPORTS = {
  desktop: { kind: 'viewport', viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
  mobile: { kind: 'device', device: devices['iPhone 13'] },
  tablet: { kind: 'device', device: devices['iPad (gen 7)'] || devices['iPad Pro 11'] },
};

const results = [];

async function capture(ctx, domain, p, viewName, vcfg) {
  const url = `https://${domain}${p}`;
  const rec = { domain, path: p, url, viewport: viewName, key: keyOf(domain, p) };
  const consoleErrors = [];
  const failedReq = [];
  let page;
  try {
    page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
    page.on('pageerror', e => consoleErrors.push('PAGEERROR: ' + String(e).slice(0, 300)));
    page.on('response', r => { const s = r.status(); if (s >= 400) failedReq.push(`${s} ${r.url().slice(0, 160)}`); });

    let resp;
    try {
      resp = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    } catch (e) {
      rec.loadError = String(e.message || e).slice(0, 200);
    }
    rec.status = resp ? resp.status() : (rec.loadError ? 'LOAD_FAIL' : null);
    rec.finalUrl = page.url();
    await page.waitForTimeout(2800); // let SPA render

    if (!rec.loadError) {
      rec.title = await page.title().catch(() => '');
      const info = await page.evaluate(() => {
        const txt = (document.body && document.body.innerText) ? document.body.innerText : '';
        const h = document.querySelector('h1,h2,[role=heading]');
        const buttons = Array.from(document.querySelectorAll('button,a,[role=button]')).map(b => (b.innerText || '').trim()).filter(Boolean);
        const links = Array.from(document.querySelectorAll('a[href]')).map(a => a.getAttribute('href'));
        return {
          firstText: txt.replace(/\s+/g, ' ').trim().slice(0, 600),
          heading: h ? (h.innerText || '').trim().slice(0, 160) : '',
          fullTextLower: txt.toLowerCase(),
          buttons: buttons.slice(0, 40),
          linkCount: links.length,
          emptyLinks: links.filter(h => !h || h === '#' || h.startsWith('javascript:')).length,
          scrollWidth: document.documentElement.scrollWidth,
          innerWidth: window.innerWidth,
        };
      });
      const t = info.fullTextLower;
      rec.heading = info.heading;
      rec.firstText = info.firstText;
      rec.buttons = info.buttons;
      rec.linkCount = info.linkCount;
      rec.emptyLinks = info.emptyLinks;
      rec.horizontalOverflow = info.scrollWidth > info.innerWidth + 2 ? (info.scrollWidth - info.innerWidth) : 0;
      rec.has_continue_zivosmedia = /continue with zivosmedia/.test(t);
      rec.has_zivochat = /zivochat|zivo chat/.test(t);
      rec.mentions = {
        travel: /\btravel\b/.test(t), driver: /\bdriver\b/.test(t), chat: /\bchat\b/.test(t),
        software: /\bsoftware\b/.test(t), business: /\bbusiness\b/.test(t), employee: /\bemployee\b/.test(t),
        admin: /\badmin\b/.test(t), flights: /\bflight/.test(t), hotels: /\bhotel|resort/.test(t),
        cars: /\bcar rental|rental car|\bcars\b/.test(t), bus: /\bbus\b/.test(t),
        becomeDriver: /become a driver/.test(t), wallet: /\bwallet|payout|earnings|billing|subscription/.test(t),
        placeholder: /lorem ipsum|coming soon|placeholder|delivery partner app|accept orders, navigate to pickups/.test(t),
        ridesCambodia: /cambodia|ride|rides/.test(t),
      };
    }
    rec.consoleErrors = consoleErrors.slice(0, 10);
    rec.failedRequests = failedReq.slice(0, 12);

    const shotDir = path.join(SHOT, viewName);
    const shotPath = path.join(shotDir, rec.key + '.png');
    try {
      await page.screenshot({ path: shotPath, fullPage: false });
      rec.screenshot = path.relative(ROOT, shotPath).replace(/\\/g, '/');
    } catch (e) { rec.screenshot = 'SHOT_FAIL: ' + String(e.message).slice(0, 100); }
  } catch (e) {
    rec.fatal = String(e.message || e).slice(0, 250);
  } finally {
    if (page) await page.close().catch(() => {});
  }
  return rec;
}

const browser = await chromium.launch();
// Persistent context per viewport (much faster than per-capture).
const contexts = {
  desktop: await browser.newContext({ viewport: VIEWPORTS.desktop.viewport, deviceScaleFactor: 1 }),
  mobile: await browser.newContext({ ...VIEWPORTS.mobile.device }),
  tablet: await browser.newContext({ ...VIEWPORTS.tablet.device }),
};
let n = 0;
for (const domain of ROOTS) {
  for (const p of PATHS[domain]) {
    const views = ['desktop', 'mobile'];
    if (p === '/') views.push('tablet');
    for (const v of views) {
      const r = await capture(contexts[v], domain, p, v, VIEWPORTS[v]);
      results.push(r);
      n++;
      console.log(`[${n}] ${v.padEnd(7)} ${domain}${p} -> status=${r.status} title="${(r.title||'').slice(0,40)}" overflow=${r.horizontalOverflow||0} cont=${r.has_continue_zivosmedia} chat=${r.has_zivochat} errs=${(r.consoleErrors||[]).length}`);
      fs.writeFileSync(OUT, JSON.stringify(results, null, 2)); // incremental write
    }
  }
}
await browser.close();
fs.writeFileSync(OUT, JSON.stringify(results, null, 2));
console.log('\nWROTE ' + OUT + ' with ' + results.length + ' records');
