/**
 * appStoreLinks — the single source of truth for every public app-store URL.
 *
 * These URLs used to be copy-pasted into six different files and had drifted
 * into four different values. Most pointed at things that do not exist:
 * `com.zivollc.app`, `com.zivodriver.app`, `com.zivo` and `com.hizovo.pos` are
 * not packages in the ZIVO LLC Play account, and `apps.apple.com/app/zivo` is
 * not a resolvable App Store URL because it carries no numeric id. The install
 * button on the public site therefore led to a "not found" page.
 *
 * That matters beyond broken UX: Google and Apple reviewers browse the public
 * site while reviewing a submission, and this account already carries
 * rejections for store identity mismatches.
 *
 * Import from here. Never inline a store URL again — `src/test/appStoreLinkConsistency.test.ts`
 * fails the build if a raw store URL reappears anywhere else in `src/`.
 */

/** Apple App Store numeric id for the ZIVO customer app. */
export const ZIVO_IOS_APP_ID = "6759480121";

/** Android package for the ZIVO customer app. Must match capacitor.config.ts `appId`. */
export const ZIVO_ANDROID_PACKAGE = "com.hizovo.app";

/** Android package for the ZIVO Driver app. Note the dots: NOT `com.zivodriver.app`. */
export const ZIVO_DRIVER_ANDROID_PACKAGE = "com.zivo.driver";

/**
 * Apple App Store id for the ZIVO Drivers app. This is a DIFFERENT app from the
 * customer one — sending a driver to ZIVO_IOS_APP_ID installs the passenger app,
 * which then refuses the driver's login with "DRIVER_ACCOUNT".
 */
export const ZIVO_DRIVER_IOS_APP_ID = "6759507131";

const fromEnv = (value: string | undefined) => value?.trim() || "";

/**
 * Both customer-app URLs accept an env override so the links can be repointed
 * without a code change — useful while a listing is unavailable.
 */
export const ZIVO_IOS_STORE_URL =
  fromEnv(import.meta.env.VITE_IOS_APP_STORE_URL) ||
  `https://apps.apple.com/us/app/zivo-customer/id${ZIVO_IOS_APP_ID}`;

export const ZIVO_ANDROID_STORE_URL =
  fromEnv(import.meta.env.VITE_ANDROID_PLAY_STORE_URL) ||
  `https://play.google.com/store/apps/details?id=${ZIVO_ANDROID_PACKAGE}`;

export const ZIVO_DRIVER_ANDROID_STORE_URL = `https://play.google.com/store/apps/details?id=${ZIVO_DRIVER_ANDROID_PACKAGE}`;

export const ZIVO_DRIVER_IOS_STORE_URL = `https://apps.apple.com/us/app/zivodrivers/id${ZIVO_DRIVER_IOS_APP_ID}`;
