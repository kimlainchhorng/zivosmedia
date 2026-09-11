import { expect, test } from "@playwright/test";

/**
 * Signed-in Realtime observation.
 *
 * The tenant, the publishable key, the production CSP and both protocol
 * versions are all proven healthy from a signed-out browser on this origin
 * (scripts/qa/realtime-handshake-probe.mjs, and
 * docs/realtime-key-diagnosis-2026-09-09.md). Yet the signed-in app was
 * reported opening four sockets in fifteen seconds — which is exactly this
 * repo's own backoff ladder, 1s + 2s + 4s + 8s, from
 * src/lib/realtime/connectionCircuit.ts.
 *
 * Every one of the 87 `.channel(...)` call sites in src/ is gated on `user.id`,
 * so no channel is created while signed out and the fault cannot be reproduced
 * without a session. This test is the reproduction: it holds a real session and
 * counts what the app's own client actually does on a realtime-active route.
 *
 * `/feed` matters — `routeNeedsRealtime()` returns false for `/`, so the socket
 * is deliberately never opened there and this test would pass vacuously.
 */
test("signed-in feed settles to one live Realtime connection", async ({ page }) => {
  const REALTIME = /\/realtime\/v1\/websocket/;
  const sockets: { openedAt: number; closed: boolean; closedAt: number | null; frames: number }[] = [];
  const start = Date.now();

  page.on("websocket", (ws) => {
    if (!REALTIME.test(ws.url())) return;
    const record = { openedAt: Date.now() - start, closed: false, closedAt: null as number | null, frames: 0 };
    sockets.push(record);
    ws.on("framereceived", () => { record.frames += 1; });
    ws.on("close", () => { record.closed = true; record.closedAt = Date.now() - start; });
  });

  try {
    const email = process.env.QA_TEST_EMAIL;
    const password = process.env.QA_TEST_PASSWORD;
    if (!email || !password) throw new Error("QA_TEST_EMAIL and QA_TEST_PASSWORD are required; realtime observation was not run.");
    await page.goto("/login?redirect=%2Ffeed&lang=en", { waitUntil: "domcontentloaded" });
    const emailEntry = page.getByRole("button", { name: "Sign in with email", exact: true });
    await expect(emailEntry.or(page.locator("#login-email")).first()).toBeVisible({ timeout: 30_000 });
    if (await emailEntry.isVisible()) await emailEntry.click();
    await expect(page.locator("#login-email")).toBeVisible({ timeout: 30_000 });
    await page.locator("#login-email").fill(email);
    await page.locator("#login-password-full").fill(password);
    await Promise.all([
      page.getByRole("button", { name: "Log in", exact: true }).click(),
      page.waitForURL((url) => url.pathname === "/feed", { timeout: 45_000 }),
    ]);
  } catch {
    // Playwright action errors may include filled values; do not forward them.
    throw new Error("Sign-in for the realtime observation failed. Credential diagnostics are suppressed.");
  }

  // The reported failure completes its ladder in ~15s; watch past the end of it.
  await page.waitForTimeout(20_000);

  // Socket lifecycle carries no credentials, so unlike the sign-in above these
  // diagnostics are safe to print — and they are the whole point of the run.
  const live = sockets.filter((s) => !s.closed);
  console.log(`realtime sockets opened on /feed: ${sockets.length} (still open: ${live.length})`);
  for (const [index, socket] of sockets.entries()) {
    console.log(`  #${index + 1} opened +${socket.openedAt}ms, frames ${socket.frames}, ${socket.closed ? `closed +${socket.closedAt}ms` : "still open"}`);
  }

  expect(sockets.length, `Feed should open exactly one Realtime socket; repeated sockets mean the connection is failing and retrying down the backoff ladder. Opened ${sockets.length}.`).toBe(1);
  expect(live.length, "The Realtime socket should still be open after the feed settles.").toBe(1);
  expect(live[0]?.frames ?? 0, "An open socket that never receives a frame has not completed a channel join.").toBeGreaterThan(0);
});
