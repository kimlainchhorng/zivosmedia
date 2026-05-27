/**
 * Per-session dedup for "post liked" push notifications.
 *
 * Without this, a user toggling like → unlike → like fires multiple
 * notifications to the post author. The Set is module-scoped so it
 * persists across components on the same page, but resets on full
 * page reload (intentional — we don't want a permanent block).
 */
const notifiedLikePostIds = new Set<string>();

/**
 * Returns true the first time it's called for `postId`, false on
 * subsequent calls within the same session. Use this to guard the
 * push-notification invoke so the author isn't spammed.
 */
export function shouldSendLikeNotification(postId: string): boolean {
  if (!postId) return false;
  if (notifiedLikePostIds.has(postId)) return false;
  notifiedLikePostIds.add(postId);
  return true;
}
