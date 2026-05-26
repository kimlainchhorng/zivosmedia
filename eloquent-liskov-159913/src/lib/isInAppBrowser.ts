/**
 * Detects if the user is browsing within a social media in-app browser.
 * Returns the platform name or null if not in an in-app browser.
 */
export function detectInAppBrowser(): string | null {
  const ua = navigator.userAgent || "";

  // Facebook
  if (/FBAN|FBAV/i.test(ua)) return "Facebook";
  // Instagram
  if (/Instagram/i.test(ua)) return "Instagram";
  // TikTok
  if (/BytedanceWebview|musical_ly|TikTok/i.test(ua)) return "TikTok";
  // LinkedIn
  if (/LinkedInApp/i.test(ua)) return "LinkedIn";
  // Snapchat
  if (/Snapchat/i.test(ua)) return "Snapchat";
  // Twitter / X
  if (/Twitter/i.test(ua)) return "Twitter";
  // LINE
  if (/Line\//i.test(ua)) return "LINE";
  // WeChat
  if (/MicroMessenger/i.test(ua)) return "WeChat";

  return null;
}
