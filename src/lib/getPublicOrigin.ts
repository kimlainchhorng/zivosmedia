const DEFAULT_PUBLIC_ORIGIN = "https://zivosmedia.com";
const SUPABASE_FUNCTIONS_BASE = `${import.meta.env.VITE_SUPABASE_URL || ""}/functions/v1`;

// Edge function URL that serves profile OG tags and redirects humans.
const PROFILE_OG_FUNCTION = `${SUPABASE_FUNCTIONS_BASE}/profile-og`;
const POST_OG_FUNCTION = `${SUPABASE_FUNCTIONS_BASE}/post-og`;
const CHANNEL_OG_FUNCTION = `${SUPABASE_FUNCTIONS_BASE}/channel-og`;

/**
 * Returns the public-facing origin for shareable URLs.
 * Always returns the production zivosmedia.com domain so links shared from
 * preview/staging environments never leak temporary hosts (netlify.app,
 * lovable.app, localhost, etc.) to social networks.
 */
export function getPublicOrigin(): string {
  const configuredOrigin = import.meta.env.VITE_PUBLIC_ORIGIN?.trim();
  if (configuredOrigin && /^https:\/\/(www\.)?(zivollc\.com|hizivo\.com)/i.test(configuredOrigin)) {
    return configuredOrigin;
  }

  return DEFAULT_PUBLIC_ORIGIN;
}

/**
 * Returns a share URL for a feed/reel post.
 * Points directly to the post-og edge function so social crawlers (Facebook,
 * Twitter, etc.) receive post-specific OG tags. Humans are 302-redirected to
 * the branded /dl/reel/:id landing page by the function itself.
 */
export function getPostShareUrl(postId: string): string {
  return `${POST_OG_FUNCTION}?post=${encodeURIComponent(postId)}`;
}

/**
 * Returns the profile share URL for social networks.
 * Uses the branded zivosmedia.com domain (routes through /p/:code which redirects
 * to the OG edge function for crawlers and to the in-app profile for humans).
 */
export function getProfileShareUrl(shareCode: string): string {
  return `${getPublicOrigin()}/p/${encodeURIComponent(shareCode)}`;
}

/** Internal: direct edge function URL (used by server-side OG redirects). */
export function getProfileOgFunctionUrl(shareCode: string): string {
  return `${PROFILE_OG_FUNCTION}?code=${encodeURIComponent(shareCode)}`;
}

/**
 * Returns a share URL for a channel.
 *
 * Resolves to `${publicOrigin}/share/c/:handle` so the URL displayed in iOS
 * Share Sheet / iMessage previews stays on the brand domain. Netlify proxies
 * that path to the channel-og edge function (see public/_redirects), which
 * returns OG meta tags. Real browsers run the inline `<script>` and continue
 * to /c/:handle.
 */
export function getChannelShareUrl(handle: string): string {
  return `${getPublicOrigin()}/share/c/${encodeURIComponent(handle)}`;
}

/** Internal: direct edge function URL (kept for testing / non-Netlify hosts). */
export function getChannelOgFunctionUrl(handle: string): string {
  return `${CHANNEL_OG_FUNCTION}?handle=${encodeURIComponent(handle)}`;
}

/**
 * Deep link to a specific chat message. Uses the `?with=…&msg=…` (DM) or
 * `?group=…&msg=…` (group) convention that ChatHubPage already reads to open
 * the conversation and jump to the message.
 */
export function getChatMessageShareUrl(opts: {
  recipientId?: string;
  groupId?: string;
  messageId: string;
}): string {
  const params = new URLSearchParams();
  if (opts.groupId) params.set("group", opts.groupId);
  else if (opts.recipientId) params.set("with", opts.recipientId);
  params.set("msg", opts.messageId);
  return `${getPublicOrigin()}/chat?${params.toString()}`;
}
