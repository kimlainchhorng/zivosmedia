const MARKETING_META: Record<string, string | undefined> = {
  "zivo-google-analytics-id": import.meta.env.VITE_GOOGLE_ANALYTICS_ID,
  "zivo-google-ads-id": import.meta.env.VITE_GOOGLE_ADS_ID,
  "zivo-meta-pixel": import.meta.env.VITE_META_PIXEL_ID,
  "zivo-tiktok-pixel": import.meta.env.VITE_TIKTOK_PIXEL_ID,
  "zivo-x-pixel": import.meta.env.VITE_X_PIXEL_ID,
  "zivo-adsense-client": import.meta.env.VITE_GOOGLE_ADSENSE_CLIENT,
};

function upsertMetaContent(name: string, value: string | undefined) {
  const meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!meta || !value?.trim()) return;
  meta.setAttribute("content", value.trim());
}

export function installMarketingRuntimeConfig() {
  if (typeof document === "undefined") return;
  for (const [name, value] of Object.entries(MARKETING_META)) {
    upsertMetaContent(name, value);
  }
}
