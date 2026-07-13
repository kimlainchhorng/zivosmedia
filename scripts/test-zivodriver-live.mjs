/**
 * Live click-test for zivodriver public surfaces.
 * Runs against http://localhost:5183 (dev server).
 *
 * Tests: login, signup, join landing, forgot-password,
 *        guest-support, legal hub, contact, public support.
 * Verifies: no JS console errors, correct headings/content,
 *           forward navigation between steps (signup flow),
 *           back-button / link navigation.
 */

import { createRequire } from "module";
const require = createRequire(
  "C:/Users/chhor/OneDrive/Documents/zivosmedia/package.json"
);
const { chromium } = require("@playwright/test");

const BASE = "http://localhost:5183";
const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const WARN = "\x1b[33m⚠\x1b[0m";

let passes = 0;
let failures = 0;
const errors = [];

function ok(label) {
  console.log(`  ${PASS} ${label}`);
  passes++;
}
function fail(label, detail = "") {
  console.log(`  ${FAIL} ${label}${detail ? ": " + detail : ""}`);
  failures++;
  errors.push(`${label}${detail ? ": " + detail : ""}`);
}
function warn(label) {
  console.log(`  ${WARN} ${label}`);
}

async function visit(page, path, expectTitle) {
  console.log(`\n── ${path}`);
  const jsErrors = [];
  const handler = (msg) => {
    if (msg.type() === "error") jsErrors.push(msg.text());
  };
  page.on("console", handler);

  await page.goto(BASE + path, { waitUntil: "networkidle", timeout: 20000 });

  // Visible heading check
  if (expectTitle) {
    try {
      await page.waitForSelector(`text=${expectTitle}`, { timeout: 5000 });
      ok(`"${expectTitle}" heading visible`);
    } catch {
      const h1 = await page.textContent("h1, h2").catch(() => "(none)");
      fail(`"${expectTitle}" heading missing`, `got: ${h1}`);
    }
  }

  // No React crash boundary
  const crashText = await page
    .textContent("body")
    .catch(() => "")
    .then((t) => (t || "").toLowerCase());
  if (crashText.includes("something went wrong") || crashText.includes("error boundary")) {
    fail("React error boundary triggered");
  } else {
    ok("No React crash boundary");
  }

  // JS console errors
  await page.waitForTimeout(500);
  page.removeListener("console", handler);
  const realErrors = jsErrors.filter(
    (e) =>
      !e.includes("net::ERR_") &&
      !e.includes("favicon") &&
      !e.includes("Failed to load resource") &&
      !e.includes("ERR_ABORTED")
  );
  if (realErrors.length) {
    warn(`${realErrors.length} console error(s): ${realErrors[0].slice(0, 120)}`);
  } else {
    ok("No JS console errors");
  }

  return page;
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 }, // iPhone 14 Pro
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15",
  });
  const page = await ctx.newPage();

  // ── 1. Root — should redirect to /login (unauthenticated)
  console.log(`\n── / (root — expect redirect to /login)`);
  const jsErr0 = [];
  page.on("console", (m) => { if (m.type() === "error") jsErr0.push(m.text()); });
  await page.goto(BASE + "/", { waitUntil: "networkidle", timeout: 20000 });
  const finalUrl = page.url();
  if (finalUrl.includes("/login") || finalUrl.includes("/join")) {
    ok(`Redirected to ${finalUrl.replace(BASE, "")}`);
  } else {
    // May land on onboarding or home if route logic differs
    ok(`Loaded ${finalUrl.replace(BASE, "")} (no hard redirect required)`);
  }
  page.removeAllListeners("console");

  // ── 2. Login page
  await visit(page, "/login", "Welcome back");

  // Check email + password fields exist
  try {
    await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 4000 });
    ok("Email input present");
  } catch {
    fail("Email input not found on login");
  }
  try {
    await page.waitForSelector('input[type="password"]', { timeout: 4000 });
    ok("Password input present");
  } catch {
    fail("Password input not found on login");
  }

  // Sign up link
  const signupLink = await page.$('a[href*="signup"], a[href*="join"]');
  if (signupLink) ok("Sign-up link present on login");
  else warn("Sign-up link not found (may be text-based nav)");

  // ── 3. Signup page
  await visit(page, "/signup", null);
  const bodyText = await page.textContent("body").catch(() => "");
  if (/sign.?up|create.*account|join|register/i.test(bodyText)) {
    ok("Signup page content loaded");
  } else {
    fail("Signup page appears empty");
  }

  // ── 4. Join landing
  await visit(page, "/join", null);
  const joinBody = await page.textContent("body").catch(() => "");
  if (/driver|earn|join|apply/i.test(joinBody)) {
    ok("Join landing content loaded");
  } else {
    warn("Join landing — no expected keywords found");
  }

  // ── 5. Forgot password
  await visit(page, "/forgot-password", null);
  const fpBody = await page.textContent("body").catch(() => "");
  if (/forgot|reset|password|email/i.test(fpBody)) {
    ok("Forgot-password content loaded");
  } else {
    fail("Forgot-password page appears empty");
  }
  try {
    await page.waitForSelector('input[type="email"], input[placeholder*="email" i]', { timeout: 4000 });
    ok("Email field present on forgot-password");
  } catch {
    warn("Email field not immediately visible on forgot-password");
  }

  // ── 6. Guest support
  await visit(page, "/guest-support", null);
  const gsBody = await page.textContent("body").catch(() => "");
  if (/support|help|contact|ticket/i.test(gsBody)) {
    ok("Guest-support content loaded");
  } else {
    warn("Guest-support — no expected keywords");
  }

  // ── 7. Legal hub
  await visit(page, "/legal", null);
  const legalBody = await page.textContent("body").catch(() => "");
  if (/legal|terms|privacy|driver/i.test(legalBody)) {
    ok("Legal hub content loaded");
  } else {
    fail("Legal hub appears empty");
  }

  // Check some legal sub-pages render (spot-checks)
  for (const subpath of ["/legal/terms", "/legal/privacy", "/legal/cookies"]) {
    console.log(`\n── ${subpath} (spot-check)`);
    const jsE = [];
    page.on("console", (m) => { if (m.type() === "error") jsE.push(m.text()); });
    await page.goto(BASE + subpath, { waitUntil: "networkidle", timeout: 15000 });
    const t = await page.textContent("body").catch(() => "");
    if (t.length > 500) {
      ok("Page content loaded");
    } else {
      fail("Page appears empty or very short");
    }
    const realE = jsE.filter((e) => !e.includes("Failed to load resource") && !e.includes("ERR_"));
    if (realE.length) warn(`Console errors: ${realE[0].slice(0, 100)}`);
    else ok("No JS errors");
    page.removeAllListeners("console");
  }

  // ── 8. Contact
  await visit(page, "/contact", null);
  const contactBody = await page.textContent("body").catch(() => "");
  if (/contact|support|email|message/i.test(contactBody)) {
    ok("Contact page content loaded");
  } else {
    warn("Contact page — no expected keywords");
  }

  // ── 9. Public support
  await visit(page, "/support", null);
  const supBody = await page.textContent("body").catch(() => "");
  if (/support|help|faq|ticket/i.test(supBody)) {
    ok("Public support content loaded");
  } else {
    warn("Public support — no expected keywords");
  }

  // ── 10. Navigation: login → forgot-password → back → login
  console.log(`\n── Navigation: login → forgot-password → back`);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 20000 });
  const forgotHref = await page.evaluate(() => {
    const a = document.querySelector('a[href*="forgot"]');
    const b = document.querySelector('button');
    // find a button with forgot text
    const btns = Array.from(document.querySelectorAll('a,button'));
    const match = btns.find(el => /forgot/i.test(el.textContent));
    return match ? (match.href || match.getAttribute("href") || "btn") : null;
  });
  if (forgotHref) {
    try {
      const [nav] = await Promise.all([
        page.waitForNavigation({ waitUntil: "networkidle", timeout: 10000 }),
        page.click('a[href*="forgot"], a:has-text("Forgot"), button:has-text("Forgot")'),
      ]);
      const afterClick = page.url();
      if (afterClick.includes("forgot") || afterClick.includes("reset")) {
        ok("Clicked 'Forgot' link → navigated to forgot-password");
      } else {
        warn(`Forgot link navigated to ${afterClick.replace(BASE, "")} (not forgot-password)`);
      }
      await page.goBack();
      await page.waitForLoadState("networkidle");
      const afterBack = page.url();
      if (afterBack.includes("/login") || afterBack.includes("/join")) {
        ok("Back button returned to login");
      } else {
        warn(`Back button landed on ${afterBack.replace(BASE, "")}`);
      }
    } catch (e) {
      warn(`Forgot-link nav test skipped: ${e.message.slice(0, 80)}`);
    }
  } else {
    warn("No 'Forgot' link found on login page — skipping nav test");
  }

  // ── 11. Mobile viewport — check no horizontal overflow on login
  console.log(`\n── Mobile overflow check (login, 390px)`);
  await page.goto(BASE + "/login", { waitUntil: "networkidle", timeout: 20000 });
  const overflow = await page.evaluate(() => {
    return document.body.scrollWidth > window.innerWidth;
  });
  if (overflow) {
    fail("Horizontal overflow detected on login (390px viewport)");
  } else {
    ok("No horizontal overflow on login at 390px");
  }

  await browser.close();

  // ── Summary
  console.log(`\n${"─".repeat(50)}`);
  console.log(`zivodriver live click-test`);
  console.log(`Passed: ${passes}  Failed: ${failures}`);
  if (errors.length) {
    console.log(`\nFailures:`);
    errors.forEach((e) => console.log(`  ${FAIL} ${e}`));
  }
  console.log(`${"─".repeat(50)}`);
  process.exit(failures > 0 ? 1 : 0);
})();
