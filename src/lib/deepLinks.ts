import { getPublicOrigin } from "@/lib/getPublicOrigin";
import {
  ZIVO_ANDROID_PACKAGE,
  ZIVO_ANDROID_STORE_URL,
  ZIVO_IOS_STORE_URL,
} from "@/config/appStoreLinks";

const APP_SCHEME = `${ZIVO_ANDROID_PACKAGE}://`;

// Re-exported under their original names so existing importers keep working.
// The values (and the env overrides) now live in config/appStoreLinks.
export const IOS_STORE_URL = ZIVO_IOS_STORE_URL;

export const ANDROID_STORE_URL = ZIVO_ANDROID_STORE_URL;

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
