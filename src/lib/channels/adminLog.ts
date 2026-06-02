/**
 * Channel admin log (Recent Actions) — best-effort event recording.
 *
 * Writes go to `channel_admin_log` (RLS: the acting user records their own
 * actions; reads are manager-only). Logging never blocks or fails the user's
 * action — a failed insert is swallowed.
 *
 * @module adminLog
 */
import { supabase } from "@/integrations/supabase/client";

export type ChannelLogAction =
  | "member_joined"
  | "member_left"
  | "member_added"
  | "member_removed"
  | "member_unbanned"
  | "role_changed"
  | "settings_changed"
  | "info_changed"
  | "post_canceled";

/** Broad grouping used by the Recent Actions filter. */
export type ChannelLogCategory = "members" | "settings" | "messages";

export const LOG_CATEGORY: Record<ChannelLogAction, ChannelLogCategory> = {
  member_joined: "members",
  member_left: "members",
  member_added: "members",
  member_removed: "members",
  member_unbanned: "members",
  role_changed: "members",
  settings_changed: "settings",
  info_changed: "settings",
  post_canceled: "messages",
};

export async function logChannelAction(
  channelId: string | null | undefined,
  actorId: string | null | undefined,
  action: ChannelLogAction,
  opts?: { targetUserId?: string | null; meta?: Record<string, unknown> },
): Promise<void> {
  if (!channelId || !actorId) return;
  try {
    await (supabase as any).from("channel_admin_log").insert({
      channel_id: channelId,
      actor_id: actorId,
      action,
      target_user_id: opts?.targetUserId ?? null,
      meta: opts?.meta ?? {},
    });
  } catch {
    /* best-effort: never block the user action on a logging failure */
  }
}
