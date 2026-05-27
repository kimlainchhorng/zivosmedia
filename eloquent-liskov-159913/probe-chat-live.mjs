import { chromium } from '@playwright/test';
const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();

const errors = [];
page.on('pageerror', e => errors.push('PE: ' + e.message));
page.on('console', m => { if (m.type() === 'error') errors.push('[err] ' + m.text()); });

console.log('1. Login');
await page.goto('http://localhost:8081/login', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2500);
const accept = page.locator('button:has-text("Accept All")').first();
if (await accept.count() > 0) { await accept.click().catch(()=>{}); await page.waitForTimeout(500); }

const email = page.locator('input[placeholder*="email"], input[placeholder*="username"], input[type="text"]').first();
const pass = page.locator('input[type="password"]').first();
await email.fill('klainkonkat@gmail.com');
await pass.fill('Chhorng@1998');
const submit = page.locator('button:has-text("Log in"), button:has-text("Sign in"), button[type="submit"]').first();
await submit.click().catch(() => pass.press('Enter'));
await page.waitForTimeout(8000);
console.log('Post-login URL:', page.url());

console.log('2. Go to /chat');
await page.goto('http://localhost:8081/chat', { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(5000);
await page.screenshot({ path: '/tmp/zivo-test/chat-loggedin.png' });

console.log('3. Find a group/conversation to click');
// Look for a list item with "ZIVO class" or "ZIVO Platform" or any conversation row
const chatRow = page.locator('button:has-text("ZIVO class"), button:has-text("Saved Messages"), button:has-text("ZIVO Platform")').first();
const rowCount = await chatRow.count();
console.log('rowCount=', rowCount);
if (rowCount > 0) {
  await chatRow.click().catch(()=>{});
  await page.waitForTimeout(3000);
}

await page.screenshot({ path: '/tmp/zivo-test/chat-opened.png' });

// Inspect DOM
const info = await page.evaluate(() => {
  const shell = document.querySelector('[data-zivo-chat-shell]');
  const out = {
    url: location.href,
    viewport: { w: window.innerWidth, h: window.innerHeight },
    shellExists: !!shell,
  };
  if (shell) {
    const cs = getComputedStyle(shell);
    out.shell = {
      classes: shell.className.slice(0, 400),
      position: cs.position,
      left: cs.left,
      top: cs.top,
      width: cs.width,
      height: cs.height,
      zIndex: cs.zIndex,
      overflow: cs.overflow,
      backdropFilter: cs.backdropFilter,
      filter: cs.filter,
      transform: cs.transform,
    };
  }
  // Look at chat overlay (GroupChat / PersonalChat motion.div)
  const allFixed = Array.from(document.querySelectorAll('*')).filter(el => {
    const cs = getComputedStyle(el);
    return cs.position === 'fixed' && el !== shell;
  });
  out.fixedCount = allFixed.length;
  out.fixedElements = allFixed.slice(0, 5).map(el => {
    const cs = getComputedStyle(el);
    return {
      tag: el.tagName,
      classes: (el.className?.slice && el.className.slice(0, 200)) || '',
      left: cs.left,
      top: cs.top,
      right: cs.right,
      width: cs.width,
      zIndex: cs.zIndex,
    };
  });
  // CSS var lookup
  const root = document.documentElement;
  out.cssVarOnRoot = getComputedStyle(root).getPropertyValue('--chat-sidebar-w');
  out.cssVarOnBody = getComputedStyle(document.body).getPropertyValue('--chat-sidebar-w');
  // Find PullToRefresh wrapper
  const pullWrapper = document.querySelector('.zivo-shell-mobile');
  if (pullWrapper && pullWrapper.parentElement) {
    out.cssVarOnPullWrapperParent = getComputedStyle(pullWrapper.parentElement).getPropertyValue('--chat-sidebar-w');
    out.pullWrapperParentTag = pullWrapper.parentElement.tagName;
    out.pullWrapperParentStyleAttr = pullWrapper.parentElement.getAttribute('style');
  }
  return out;
});
console.log(JSON.stringify(info, null, 2));
console.log('\nERRORS:', errors.length);
errors.slice(-10).forEach(e => console.log(e));
await browser.close();
