#!/usr/bin/env node
/**
 * Guards the two defects that got ZIVO (com.hizovo.app) removed from Google
 * Play on 2026-07-29 under the Broken Functionality policy — "Problems
 * loading: Your app does not open or load". The reviewer's evidence was the
 * ZIVO logo on an otherwise blank screen: a native splash that never came down.
 *
 * Both defects had to be present to produce a permanent splash, so both are
 * pinned here. Either one alone reintroduces the failure mode.
 *
 *   1. capacitor.config.ts set `launchAutoHide: false`. The plugin's own
 *      Android source (@capacitor/splash-screen .../SplashScreen.java) is
 *      explicit that this means the splash is never hidden for you:
 *
 *          if (settings.isAutoHide()) {
 *              ...postDelayed(() -> hideDialog(...), getShowDuration());
 *          } else {
 *              // If no autoHide, call complete
 *              if (splashListener != null) splashListener.completed();
 *          }
 *
 *      The else-branch fires the listener and returns; it never hides the
 *      dialog, and `launchShowDuration` is not read at all on that path. A
 *      comment in capacitor.config.ts claimed launchShowDuration acted as a
 *      safety net "so users never get a permanent splash". It did not.
 *
 *   2. src/main.tsx called SplashScreen.hide() INSIDE the try block, after
 *      createRoot().render(). A synchronous throw from render jumped to catch
 *      and never scheduled the hide, so the boot-error panel was painted
 *      underneath a splash that (per defect 1) stayed up forever.
 *
 * These are source-shape assertions rather than runtime ones on purpose: the
 * failure only reproduces on a native cold start with a throwing bundle, which
 * no unit test in this repo can stage. Shape is what regressed, so shape is
 * what is pinned.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const capacitorConfig = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
const mainTsx = fs.readFileSync(path.join(root, "src/main.tsx"), "utf8");

/** Strip comments so prose about the bug cannot satisfy a source assertion. */
function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

test("capacitor.config.ts leaves the native splash auto-hide enabled", () => {
  const code = stripComments(capacitorConfig);

  assert.doesNotMatch(
    code,
    /launchAutoHide\s*:\s*false/,
    "launchAutoHide:false means the native splash is NEVER hidden unless JS " +
      "calls SplashScreen.hide(). Any boot that throws before that call leaves " +
      "a permanent splash, which is what got this app pulled from Google Play " +
      "on 2026-07-29 (Broken Functionality: 'Your app does not open or load'). " +
      "launchShowDuration is not a safety net here — the plugin ignores it when " +
      "autoHide is false.",
  );

  assert.match(
    code,
    /launchAutoHide\s*:\s*true/,
    "capacitor.config.ts must set launchAutoHide:true explicitly, so the native " +
      "splash always comes down on its own even when the JS bundle never boots.",
  );
});

test("main.tsx hides the splash on every boot path, not only on success", () => {
  const code = stripComments(mainTsx);

  const finallyIndex = code.indexOf("} finally {");
  assert.notEqual(
    finallyIndex,
    -1,
    "src/main.tsx must wrap its boot in try/catch/finally. The splash hide " +
      "belongs in finally so that a synchronous throw from " +
      "createRoot().render() still brings the splash down and lets the " +
      "boot-error panel become visible.",
  );

  const hideIndex = code.indexOf("SplashScreen.hide");
  assert.notEqual(hideIndex, -1, "src/main.tsx must call SplashScreen.hide().");

  assert.ok(
    hideIndex > finallyIndex,
    "SplashScreen.hide() must sit in the finally block. It used to sit inside " +
      "the try, after render(), so a boot-time throw skipped it entirely and " +
      "the user saw a frozen logo instead of the error panel painted beneath it.",
  );

  // The whole point is that no hide is reachable only on the success path.
  const tryBlock = code.slice(code.indexOf("try {"), finallyIndex);
  assert.doesNotMatch(
    tryBlock,
    /SplashScreen\.hide/,
    "A SplashScreen.hide() inside the try block is success-path-only. Keep the " +
      "single hide in finally so every path reaches it.",
  );
});
