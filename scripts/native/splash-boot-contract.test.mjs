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
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const capacitorConfig = fs.readFileSync(path.join(root, "capacitor.config.ts"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "index.html"), "utf8");
const mainTsx = fs.readFileSync(path.join(root, "src/main.tsx"), "utf8");
const androidGradleRunner = fs.readFileSync(path.join(root, "scripts/native/run-android-gradle.mjs"), "utf8");

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

test("slow native starts do not hold the first draw behind a splash timer or a blank root", () => {
  const configCode = stripComments(capacitorConfig);
  const mainCode = stripComments(mainTsx);
  const bootShellIndex = indexHtml.indexOf("<div data-zivo-boot-shell");
  const reactRootIndex = indexHtml.indexOf('<div id="root"></div>');

  assert.match(
    configCode,
    /launchShowDuration\s*:\s*0/,
    "The Android 12 splash plugin must not install an extra pre-draw timer gate on a slow WebView launch.",
  );
  assert.match(indexHtml, /data-zivo-boot-shell/, "index.html must paint a static boot shell before React evaluates.");
  assert.match(indexHtml, /កំពុងបើកកម្មវិធីរបស់អ្នក/, "The static boot state must remain understandable in Khmer.");
  assert.match(indexHtml, /aria-atomic="true"/, "Assistive technology must announce the bilingual boot state atomically.");
  assert.notEqual(bootShellIndex, -1, "index.html must render the boot shell as body markup.");
  assert.notEqual(reactRootIndex, -1, "index.html must give React an initially empty root.");
  assert.ok(
    bootShellIndex < reactRootIndex,
    "The boot shell must remain outside and before #root so createRoot cannot clear it before the first route paints.",
  );
  assert.match(
    mainCode,
    /removeBootShellAfterFirstAppPaint\(root\)/,
    "main.tsx must keep the static shell until React starts painting the real app root.",
  );
  assert.match(mainCode, /new MutationObserver/, "main.tsx must observe the first real React root element.");
  assert.match(mainCode, /root\.childElementCount/, "Comment-only Suspense output must not dismiss the boot shell.");
  assert.doesNotMatch(
    mainCode,
    /requestAnimationFrame/,
    "Boot-shell removal must not depend on animation frames that iOS can pause behind the native splash.",
  );
  assert.match(mainCode, /function finishBoot\(\)/, "Boot success must have one explicit completion boundary.");
  assert.match(
    mainCode,
    /NATIVE_BOOT_SHELL_HANDOFF_MS\s*=\s*350/,
    "Native startup must keep a short branded handoff after React commits so the WebView cannot flash white.",
  );
  assert.match(
    mainCode,
    /window\.setTimeout\(removeBootShell, NATIVE_BOOT_SHELL_HANDOFF_MS\)/,
    "The native handoff must use a timer that still runs while platform splash animation frames are paused.",
  );
  assert.match(mainCode, /notifyNativeAppReady\(\)/, "OTA readiness must wait for the committed app boundary.");
  assert.match(mainCode, /createRoot\(root, \{ onUncaughtError: paintBootError \}\)/, "React root failures must surface visibly.");
  assert.doesNotMatch(mainCode, /root\.replaceChildren/, "Boot error handling must not mutate React's managed root.");

  const observeIndex = mainCode.indexOf("removeBootShellAfterFirstAppPaint(root)");
  const renderIndex = mainCode.indexOf("createRoot(root");
  assert.ok(observeIndex < renderIndex, "The boot observer must attach before React rendering starts.");
});

test("Android Gradle builds sync and verify the repaired Capacitor payload first", () => {
  const code = stripComments(androidGradleRunner);
  const targetMinimumIndex = code.indexOf("GOOGLE_PLAY_MIN_TARGET_SDK = 36");
  const targetGuardIndex = code.indexOf("targetSdkVersion < GOOGLE_PLAY_MIN_TARGET_SDK");
  const syncIndex = code.indexOf('["run", "android:sync"]');
  const generatedConfigIndex = code.indexOf("capacitor.config.json");
  const splashGuardIndex = code.indexOf("launchAutoHide !== true");
  const splashDurationGuardIndex = code.indexOf("launchShowDuration !== 0");
  const bootShellGuardIndex = code.indexOf("generatedBootShellIndex");
  const emptyRootGuardIndex = code.indexOf("generatedReactRootIndex");
  const gradleIndex = code.indexOf('execFileSync("sh"');

  assert.notEqual(targetMinimumIndex, -1, "Android builds must pin Google Play's API 36 minimum.");
  assert.notEqual(targetGuardIndex, -1, "Android builds must fail closed when targetSdkVersion is below API 36.");
  assert.notEqual(syncIndex, -1, "Android Gradle builds must run the existing build + Capacitor sync workflow first.");
  assert.notEqual(generatedConfigIndex, -1, "The build must inspect the synchronized Android capacitor.config.json.");
  assert.notEqual(splashGuardIndex, -1, "The build must fail closed unless generated launchAutoHide is true.");
  assert.notEqual(splashDurationGuardIndex, -1, "The build must fail closed unless the generated splash timer is disabled.");
  assert.notEqual(bootShellGuardIndex, -1, "The build must fail closed unless the synchronized boot shell is present.");
  assert.notEqual(emptyRootGuardIndex, -1, "The build must fail closed unless React receives an empty synchronized root.");
  assert.notEqual(gradleIndex, -1, "The Android runner must still invoke the Gradle wrapper.");
  assert.ok(targetMinimumIndex < targetGuardIndex, "The target API minimum must be defined before it is enforced.");
  assert.ok(targetGuardIndex < syncIndex, "An outdated target SDK must fail before the expensive web rebuild starts.");
  assert.ok(syncIndex < generatedConfigIndex, "Capacitor sync must happen before the generated config is read.");
  assert.ok(generatedConfigIndex < splashGuardIndex, "The synchronized config must be read before its splash value is checked.");
  assert.ok(splashGuardIndex < splashDurationGuardIndex, "Auto-hide must be verified before the splash timer guard.");
  assert.ok(splashDurationGuardIndex < bootShellGuardIndex, "The splash config must be verified before the boot shell.");
  assert.ok(bootShellGuardIndex < emptyRootGuardIndex, "The generated boot shell and React root order must both be inspected.");
  assert.ok(bootShellGuardIndex < gradleIndex, "The synchronized boot shell must be verified before Gradle packages it.");
  assert.ok(splashGuardIndex < gradleIndex, "The stale-splash guard must run before Gradle can package an app bundle.");
});
