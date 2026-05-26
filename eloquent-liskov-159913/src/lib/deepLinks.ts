import { getPublicOrigin } from "@/lib/getPublicOrigin";

const APP_SCHEME = "com.hizovo.app://";

export const IOS_STORE_URL =
  import.meta.env.VITE_IOS_APP_STORE_URL?.trim() ||
  "https://apps.apple.com/us/app/zivo-customer/id6759480121";

export const ANDROID_STORE_URL =
  import.meta.env.VITE_ANDROID_PLAY_STORE_URL?.trim() ||
  "https://play.google.com/store/apps/details?id=com.hizovo.app";

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
