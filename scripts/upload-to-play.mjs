import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { checkPlayPublicPolicyPages } from "./native/check-play-public-policy-pages.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const aabPath = path.resolve(
  root,
  "android/app/build/outputs/bundle/release/app-release.aab",
);
const buildGradlePath = path.resolve(root, "android/app/build.gradle");

const defaultDeveloperId = "5585425195147923232";
const defaultAppId = "4973331690915375954";
const defaultTrackId = "4697386757642451497";
const defaultReleaseId = "2";

const developerId = process.env.PLAY_CONSOLE_DEVELOPER_ID || defaultDeveloperId;
const appId = process.env.PLAY_CONSOLE_APP_ID || defaultAppId;
const trackId = process.env.PLAY_CONSOLE_TRACK_ID || defaultTrackId;
const releaseId = process.env.PLAY_CONSOLE_RELEASE_ID || defaultReleaseId;
const base = `https://play.google.com/console/u/0/developers/${developerId}/app/${appId}`;
const releaseUrl =
  process.env.PLAY_CONSOLE_RELEASE_URL ||
  `${base}/tracks/${trackId}/releases/${releaseId}/prepare`;
const profileDir =
  process.env.PLAYWRIGHT_PROFILE_DIR ||
  path.resolve(root, ".playwright/play-console-profile");
const confirmUpload = process.env.ZIVO_PLAY_UPLOAD_CONFIRM === "UPLOAD_DRAFT";
const loginWaitMs = Number(process.env.PLAY_CONSOLE_WAIT_FOR_LOGIN_MS || "0");

function readGradleVersion() {
  const gradle = fs.readFileSync(buildGradlePath, "utf8");
  const versionName = gradle.match(/versionName\s+["']([^"']+)["']/)?.[1];
  const versionCode = gradle.match(/versionCode\s+(\d+)/)?.[1];
  if (!versionName || !versionCode) {
    throw new Error(
      `Could not read versionName/versionCode from ${path.relative(root, buildGradlePath)}`,
    );
  }
  return { versionName, versionCode };
}

function assertReady() {
  if (!fs.existsSync(aabPath)) {
    throw new Error(`Missing release AAB: ${path.relative(root, aabPath)}`);
  }
  if (!fs.existsSync(buildGradlePath)) {
    throw new Error(
      `Missing Gradle config: ${path.relative(root, buildGradlePath)}`,
    );
  }
}

async function screenshot(page, name) {
  const outDir = path.resolve(root, "scripts/play-upload-screenshots");
  fs.mkdirSync(outDir, { recursive: true });
  await page.screenshot({
    path: path.join(outDir, `${name}.png`),
    fullPage: true,
  });
}

async function visible(locator, timeout = 5000) {
  return locator.isVisible({ timeout }).catch(() => false);
}

function needsGoogleSignIn(text) {
  return /Sign in|Use your Google Account/i.test(text);
}

async function waitForGoogleSignInIfRequested(page, text) {
  if (!needsGoogleSignIn(text)) {
    return text;
  }

  if (!Number.isFinite(loginWaitMs) || loginWaitMs <= 0) {
    console.log(
      "Google sign-in is required in the opened browser window. Sign in, then rerun this script.",
    );
    return text;
  }

  const maxMinutes = Math.round(loginWaitMs / 6000) / 10;
  console.log(
    `Google sign-in is required in the opened browser window. Waiting up to ${maxMinutes} minutes for sign-in...`,
  );

  const deadline = Date.now() + loginWaitMs;
  while (Date.now() < deadline) {
    await page.waitForTimeout(5000);
    const currentText = await page.evaluate(() => document.body.innerText);
    if (!needsGoogleSignIn(currentText)) {
      await page
        .waitForLoadState("networkidle", { timeout: 30000 })
        .catch(() => {});
      console.log("Google sign-in completed. Continuing Play Console upload.");
      return currentText;
    }
    console.log("Still waiting for Google sign-in...");
  }

  await screenshot(page, "google-sign-in-timeout");
  throw new Error(
    "Timed out waiting for Google sign-in. Sign in in the opened Play Console window, then rerun this script.",
  );
}

async function main() {
  await checkPlayPublicPolicyPages();
  assertReady();
  const { versionName, versionCode } = readGradleVersion();
  const releaseName =
    process.env.PLAY_RELEASE_NAME || `${versionName} (${versionCode})`;
  const releaseNotes =
    process.env.PLAY_RELEASE_NOTES ||
    [
      "<en-US>",
      "Bug fixes, performance improvements, and store-ready native release updates.",
      "</en-US>",
    ].join("\n");

  console.log("Google Play draft upload helper");
  console.log(`AAB: ${path.relative(root, aabPath)}`);
  console.log(`Release: ${releaseName}`);
  console.log(`Release URL: ${releaseUrl}`);

  if (!confirmUpload) {
    console.log(
      "\nDry run only. To upload to the Play Console draft, rerun with:",
    );
    console.log(
      "ZIVO_PLAY_UPLOAD_CONFIRM=UPLOAD_DRAFT node scripts/upload-to-play.mjs",
    );
    return;
  }

  const context = await chromium.launchPersistentContext(profileDir, {
    headless: false,
    slowMo: 250,
    channel: "chrome",
  });
  const page = context.pages()[0] || (await context.newPage());
  await page.setViewportSize({ width: 1280, height: 900 });

  try {
    console.log("Opening Play Console release draft...");
    await page.goto(releaseUrl, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(6000);
    await screenshot(page, "release-draft-loaded");

    let text = await page.evaluate(() => document.body.innerText);
    text = await waitForGoogleSignInIfRequested(page, text);
    if (needsGoogleSignIn(text)) {
      return;
    }

    if (text.includes("Preview and confirm") && text.includes("Errors")) {
      const backButton = page.locator('button:has-text("Back")').first();
      if (await visible(backButton)) {
        await backButton.click();
        await page.waitForTimeout(5000);
        text = await page.evaluate(() => document.body.innerText);
        await screenshot(page, "back-to-edit");
      }
    }

    const bundleAlreadyPresent = text.includes(versionCode);
    const uploadAreaPresent =
      /Drop app bundles|New app bundles will be shown|Upload/i.test(text);
    console.log(`Bundle ${versionCode} present: ${bundleAlreadyPresent}`);

    if (!bundleAlreadyPresent) {
      if (!uploadAreaPresent) {
        await screenshot(page, "upload-area-not-found");
        throw new Error(
          "Could not find the Play Console upload area. Check scripts/play-upload-screenshots/upload-area-not-found.png.",
        );
      }

      const uploadButton = page
        .locator('a:has-text("Upload"), button:has-text("Upload")')
        .first();
      if (!(await visible(uploadButton, 15000))) {
        await screenshot(page, "upload-button-not-found");
        throw new Error("Could not find the Play Console Upload button.");
      }

      console.log(
        `Uploading AAB for versionCode ${versionCode}. This can take several minutes.`,
      );
      const [fileChooser] = await Promise.all([
        page.waitForEvent("filechooser", { timeout: 30000 }),
        uploadButton.click(),
      ]);
      await fileChooser.setFiles(aabPath);

      let uploadOk = false;
      for (let i = 0; i < 40; i += 1) {
        await page.waitForTimeout(15000);
        const pollText = await page.evaluate(() => document.body.innerText);
        const elapsedSeconds = (i + 1) * 15;
        const elapsed = `${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s`;

        if (/wrong key|wrong signing|different key/i.test(pollText)) {
          await screenshot(page, "wrong-upload-key");
          throw new Error(
            "Google Play rejected the AAB because the upload key does not match this app.",
          );
        }

        if (
          /not yet valid|recently reset|able to upload app bundles again from/i.test(
            pollText,
          )
        ) {
          await screenshot(page, "upload-key-not-yet-valid");
          const resetWindow = pollText.match(
            /You uploaded an app bundle[^\n]+/i,
          )?.[0];
          throw new Error(
            resetWindow ||
              "Google Play rejected the AAB because the reset upload key is not valid yet.",
          );
        }

        if (pollText.includes(versionCode)) {
          console.log(
            `Bundle ${versionCode} is now attached to the draft (${elapsed}).`,
          );
          uploadOk = true;
          break;
        }

        console.log(`Waiting for Play bundle processing... ${elapsed}`);
      }

      if (!uploadOk) {
        await screenshot(page, "upload-timeout");
        throw new Error(
          "Timed out waiting for the uploaded bundle to appear in the draft.",
        );
      }
    }

    await screenshot(page, "bundle-confirmed");
    await page.mouse.wheel(0, 2600);
    await page.waitForTimeout(1500);

    const releaseNameInput = page.locator('input[type="text"]').first();
    if (await visible(releaseNameInput)) {
      await releaseNameInput.fill(releaseName);
      console.log("Release name set.");
    }

    const releaseNotesInput = page.locator("textarea").last();
    if (await visible(releaseNotesInput)) {
      await releaseNotesInput.fill(releaseNotes);
      console.log("Release notes set.");
    }

    await screenshot(page, "draft-ready-to-review");
    console.log(
      "\nDraft upload/update finished. This script intentionally does not click rollout.",
    );
    console.log(
      "Review the draft in Play Console and start rollout manually when ready.",
    );
  } finally {
    await context.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
