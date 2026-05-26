import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const AAB_PATH = path.resolve(__dirname, '../android/app/build/outputs/bundle/release/app-release.aab');
const DEVELOPER_ID = '5585425195147923232';
const APP_ID = '4975101708130032572';
const BASE = `https://play.google.com/console/u/0/developers/${DEVELOPER_ID}/app/${APP_ID}`;
const DRAFT = `${BASE}/tracks/4698016251957513928/releases/3/prepare`;

(async () => {
  const context = await chromium.launchPersistentContext(
    'C:\\Users\\abiga\\AppData\\Local\\PlaywrightSession',
    { headless: false, slowMo: 300, channel: 'chrome' }
  );
  const page = context.pages()[0] || await context.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });

  // Establish session
  console.log('Going to dashboard...');
  await page.goto(`${BASE}/app-dashboard`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Navigate to step 1 of the draft
  console.log('Navigating to Production draft (step 1)...');
  await page.goto(DRAFT, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'scripts/step1-loaded.png' });

  let txt = await page.evaluate(() => document.body.innerText);

  // If we landed on step 2 (review), click Back to get to step 1
  if (txt.includes('Preview and confirm') && txt.includes('Errors')) {
    console.log('On review page — clicking Back to return to step 1...');
    const backBtn = page.locator('button:has-text("Back")').first();
    if (await backBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await backBtn.click();
      await page.waitForTimeout(5000);
      await page.screenshot({ path: 'scripts/back-to-step1.png' });
      txt = await page.evaluate(() => document.body.innerText);
    }
  }

  // --- CHECK AAB STATE ---
  const bundleAlreadyThere = txt.includes('20260429');
  const needsUpload = !bundleAlreadyThere && (
    txt.includes('Drop app bundles') || txt.includes('New app bundles will be shown') || txt.includes('Upload')
  );
  console.log(`Bundle present: ${bundleAlreadyThere}, Needs upload: ${needsUpload}`);

  if (needsUpload) {
    // Remove any existing failed AABs
    const xBtns = await page.locator('button[aria-label*="Remove"], button[title*="Remove"]').all();
    // Also look for close/X buttons next to bundle entries with errors
    const closeBtns = await page.locator('button.close, button[aria-label="Close"], mat-icon:has-text("close")').all();
    for (const btn of [...xBtns]) {
      if (await btn.isVisible().catch(() => false)) {
        console.log('Removing failed bundle entry...');
        await btn.click();
        await page.waitForTimeout(2000);
      }
    }

    // Click Upload button
    console.log('\nUploading AAB (154MB — this will take several minutes)...');
    const uploadBtn = page.locator('a:has-text("Upload"), button:has-text("Upload")').first();
    const uploadVisible = await uploadBtn.isVisible({ timeout: 10000 }).catch(() => false);
    if (!uploadVisible) {
      console.log('Upload button not found!');
      await page.screenshot({ path: 'scripts/no-upload-btn.png' });
      await context.close();
      return;
    }

    const [fileChooser] = await Promise.all([
      page.waitForEvent('filechooser', { timeout: 30000 }),
      uploadBtn.click(),
    ]);
    await fileChooser.setFiles(AAB_PATH);
    console.log('File set. Waiting for upload + Google Play optimization to finish...');
    console.log('(This can take 5-10 minutes for a 154MB bundle. Polling every 15s)\n');

    // Poll up to 10 minutes (40 × 15s)
    let uploadOk = false;
    for (let i = 0; i < 40; i++) {
      await page.waitForTimeout(15000);
      const pollTxt = await page.evaluate(() => document.body.innerText);
      const elapsed = `${Math.round((i + 1) * 15 / 60)}m ${((i + 1) * 15) % 60}s`;

      if (pollTxt.includes('wrong key') || pollTxt.includes('wrong signing') || pollTxt.includes('different key')) {
        console.log('\n⚠️  UPLOAD KEY MISMATCH — key reset not yet approved by Google Play.');
        console.log('    Complete the mobile verification in the Google Play Console app first.');
        await page.screenshot({ path: 'scripts/wrong-key.png' });
        await context.close();
        return;
      }

      if (pollTxt.includes('20260429')) {
        console.log(`✅ Bundle 20260429 is now in the draft! (${elapsed})`);
        uploadOk = true;
        break;
      }

      if (pollTxt.includes('optimized for distribution') || pollTxt.includes('optimizing')) {
        console.log(`  Still optimizing... (${elapsed})`);
        await page.screenshot({ path: `scripts/poll-${i}.png` });
        continue;
      }

      // Optimization done but version not showing yet — check if upload area reappeared (failed)
      if (pollTxt.includes('Drop app bundles') || pollTxt.includes('New app bundles will be shown')) {
        console.log(`  Upload area reappeared — upload may have failed. Retrying... (${elapsed})`);
        break;
      }

      console.log(`  Waiting... (${elapsed})`);
      await page.screenshot({ path: `scripts/poll-${i}.png` });
    }

    if (!uploadOk) {
      console.log('Bundle 20260429 did not appear after 10 minutes. Check poll screenshots.');
      await page.screenshot({ path: 'scripts/upload-timeout.png' });
      await context.close();
      return;
    }
  } else if (bundleAlreadyThere) {
    console.log('Bundle 20260429 already present in draft.');
  }

  await page.screenshot({ path: 'scripts/bundle-confirmed.png' });

  // --- SCROLL DOWN TO RELEASE DETAILS ---
  console.log('\nScrolling to release details...');
  await page.mouse.click(760, 400);
  await page.mouse.wheel(0, 3000);
  await page.waitForTimeout(2000);

  // --- FILL RELEASE NAME ---
  const releaseNameInput = page.locator('input[type="text"]').first();
  if (await releaseNameInput.isVisible({ timeout: 5000 }).catch(() => false)) {
    const val = await releaseNameInput.inputValue().catch(() => '');
    if (!val) {
      await releaseNameInput.click();
      await releaseNameInput.fill('1.0.5 (20260429)');
      await page.waitForTimeout(600);
      console.log('Release name filled.');
    } else {
      console.log('Release name already set:', val);
    }
  }

  // --- FILL RELEASE NOTES ---
  const textarea = page.locator('textarea').last();
  if (await textarea.isVisible({ timeout: 5000 }).catch(() => false)) {
    await textarea.click();
    await textarea.fill('<en-US>\nBug fixes and UI improvements including updated app icon.\n</en-US>');
    await page.waitForTimeout(800);
    console.log('Release notes filled.');
  }
  await page.screenshot({ path: 'scripts/pre-next.png' });
  await page.waitForTimeout(1500);

  // --- CLICK NEXT ---
  console.log('\nClicking Next...');
  const nextBtn = page.locator('button:has-text("Next")').last();
  await nextBtn.scrollIntoViewIfNeeded();
  await nextBtn.click({ force: true, timeout: 15000 });
  await page.waitForTimeout(6000);
  await page.screenshot({ path: 'scripts/review.png' });

  const reviewTxt = await page.evaluate(() => document.body.innerText);
  if (reviewTxt.includes('1 Error') || reviewTxt.includes('fix errors')) {
    // Expand errors to log them
    const showMore = await page.locator('button:has-text("Show more")').all();
    for (const btn of showMore) {
      if (await btn.isVisible().catch(() => false)) await btn.click().catch(() => {});
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scripts/review-errors.png' });
    const errTxt = await page.evaluate(() => document.body.innerText);
    console.log('\n⚠️  Errors on review page:', errTxt.substring(0, 2000));
    await context.close();
    return;
  }

  // --- START ROLLOUT TO PRODUCTION ---
  const rollout = page.locator('button:has-text("Start rollout to Production")').first();
  if (await rollout.isVisible({ timeout: 8000 }).catch(() => false)) {
    console.log('Starting rollout to Production!');
    await rollout.click();
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'scripts/rollout-dialog.png' });
    const confirmBtn = page.locator('button:has-text("Rollout"), button:has-text("OK"), button:has-text("Confirm")').first();
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
      await page.waitForTimeout(3000);
    }
    console.log('✅ Rollout to Production started!');
  } else {
    console.log('No rollout button found. Saving as draft...');
    await page.locator('button:has-text("Save")').last().click({ timeout: 10000 }).catch(() => {});
  }

  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'scripts/done.png' });
  console.log('\n✅ DONE!');
  await context.close();
})();
