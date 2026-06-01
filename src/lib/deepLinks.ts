import { getPublicOrigin } from "@/lib/getPublicOrigin";

const APP_SCHEME = "com.hizovo.app://";
export const ANDROID_APP_PACKAGE = "com.hizovo.app";
export const IOS_APP_STORE_ID = "6759480121";
export type StorePlatform = "ios" | "android";

export const IOS_STORE_URL =
  import.meta.env.VITE_IOS_APP_STORE_URL?.trim() ||
  `https://apps.apple.com/us/app/zivos/id${IOS_APP_STORE_ID}`;

export const ANDROID_STORE_URL =
  import.meta.env.VITE_ANDROID_PLAY_STORE_URL?.trim() ||
  `https://play.google.com/store/apps/details?id=${ANDROID_APP_PACKAGE}`;

type StoreAttributionOptions = {
  search?: string;
  content?: string;
};

const ATTRIBUTION_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
] as const;

function getCurrentSearch(): string {
  return typeof window === "undefined" ? "" : window.location.search;
}

function cleanAttributionValue(value: string): string {
  return value.trim().slice(0, 128);
}

function slugifyAttributionValue(value: string): string {
  return cleanAttributionValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function getInstallAttributionParams(options: StoreAttributionOptions = {}): URLSearchParams {
  const incoming = new URLSearchParams(options.search ?? getCurrentSearch());
  const hasFacebookClick = Boolean(incoming.get("fbclid"));
  const source = cleanAttributionValue(
    incoming.get("utm_source") || (hasFacebookClick ? "facebook" : "zivo_web"),
  );
  const sourceIsFacebook = source.toLowerCase() === "facebook";
  const medium = cleanAttributionValue(
    incoming.get("utm_medium") || (sourceIsFacebook ? "paid_social" : "organic"),
  );
  const campaign = cleanAttributionValue(
    incoming.get("utm_campaign") || (sourceIsFacebook ? "meta-app-install" : "app-install"),
  );
  const content = cleanAttributionValue(
    incoming.get("utm_content") || options.content || "install_cta",
  );
  const term = cleanAttributionValue(incoming.get("utm_term") || "");
  const params = new URLSearchParams();

  for (const [key, value] of [
    ["utm_source", source],
    ["utm_medium", medium],
    ["utm_campaign", campaign],
    ["utm_content", content],
    ["utm_term", term],
  ] as const) {
    if (value) params.set(key, value);
  }

  const fbclid = cleanAttributionValue(incoming.get("fbclid") || "");
  if (fbclid) params.set("fbclid", fbclid);

  return params;
}

export function buildStoreUrlWithAttribution(
  storeUrl: string,
  platform: StorePlatform,
  options: StoreAttributionOptions = {},
): string {
  const attribution = getInstallAttributionParams(options);

  try {
    const url = new URL(storeUrl);

    if (platform === "android") {
      const referrer = new URLSearchParams();
      let hasReferrer = false;
      for (const key of ATTRIBUTION_KEYS) {
        const value = attribution.get(key);
        if (value) {
          referrer.set(key, value);
          hasReferrer = true;
        }
      }
      const fbclid = attribution.get("fbclid");
      if (fbclid) {
        referrer.set("fbclid", fbclid);
        hasReferrer = true;
      }
      if (hasReferrer) url.searchParams.set("referrer", referrer.toString());
      return url.toString();
    }

    for (const key of ATTRIBUTION_KEYS) {
      const value = attribution.get(key);
      if (value) url.searchParams.set(key, value);
    }

    const campaign = attribution.get("utm_campaign");
    if (campaign) url.searchParams.set("ct", slugifyAttributionValue(campaign) || "app-install");

    return url.toString();
  } catch {
    return storeUrl;
  }
}

export function getAttributedStoreUrls(options: StoreAttributionOptions = {}) {
  return {
    ios: buildStoreUrlWithAttribution(IOS_STORE_URL, "ios", options),
    android: buildStoreUrlWithAttribution(ANDROID_STORE_URL, "android", options),
  };
}

export function buildReelDeepLink(postId: string): string {
  return `${getPublicOrigin()}/dl/reel/${encodeURIComponent(postId)}`;
}

export function buildShopDeepLink(storeSlug: string): string {
  return `${getPublicOrigin()}/dl/shop/${encodeURIComponent(storeSlug)}`;
}

export function buildNativeReelUrl(postId: string): string {
  return `${APP_SCHEME}reels/${encodeURIComponent(postId)}`;
}

export function buildNativeShopUrl(storeSlug: string): string {
  return `${APP_SCHEME}shop/${encodeURIComponent(storeSlug)}`;
}

export function buildNativeAppUrl(path = "/app/home"): string {
  const normalizedPath = path.trim().replace(/^\/+/, "");
  return `${APP_SCHEME}${normalizedPath || "app/home"}`;
}
