import { supabase } from "@/integrations/supabase/client";

export type NotificationManageAction =
  | "mark_read"
  | "mark_all_read"
  | "delete"
  | "clear_in_app"
  | "snooze";

export type NotificationManagePayload = {
  action: NotificationManageAction;
  notification_id?: string;
  notification_ids?: string[];
  snoozed_until?: string;
};

/**
 * Thrown when there is no signed-in user to scope the mutation to.
 * (Kept for backwards-compatibility with existing call sites / guards.)
 */
export class NotificationManageUnavailableError extends Error {
  constructor() {
    super("You need to be signed in to manage notifications.");
    this.name = "NotificationManageUnavailableError";
  }
}

export function isNotificationManageEnabled() {
  return true;
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const userId = data.user?.id;
  if (!userId) throw new NotificationManageUnavailableError();
  return userId;
}

function normalizeIds(payload: NotificationManagePayload): string[] {
  const raw = payload.notification_ids?.length
    ? payload.notification_ids
    : payload.notification_id
      ? [payload.notification_id]
      : [];
  return [...new Set(raw.filter((value): value is string => typeof value === "string" && value.length > 0))];
}

/**
 * Per-user notification mutations, run directly against Postgres.
 *
 * Row-Level Security ("Users update own notifications" / "Users delete own
 * notifications", USING auth.uid() = user_id) guarantees a signed-in user can
 * only ever touch their OWN rows. We also filter by user_id explicitly for
 * defense in depth, mirroring the server function's scoping.
 */
export async function invokeNotificationManage(payload: NotificationManagePayload) {
  const userId = await currentUserId();
  const nowIso = new Date().toISOString();
  // Cast: some optional columns (e.g. snoozed_until) are not in generated types.
  const db = supabase as any;

  if (payload.action === "mark_all_read") {
    const { error } = await db
      .from("notifications")
      .update({ is_read: true, read_at: nowIso })
      .eq("user_id", userId)
      .eq("is_read", false);
    if (error) throw error;
    return { ok: true, action: payload.action };
  }

  if (payload.action === "clear_in_app") {
    const { error } = await db
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .eq("channel", "in_app");
    if (error) throw error;
    return { ok: true, action: payload.action };
  }

  const ids = normalizeIds(payload);
  if (ids.length === 0) throw new Error("No notifications selected");

  if (payload.action === "delete") {
    const { error } = await db
      .from("notifications")
      .delete()
      .eq("user_id", userId)
      .in("id", ids);
    if (error) throw error;
    return { ok: true, action: payload.action, count: ids.length };
  }

  if (payload.action === "snooze") {
    if (!payload.snoozed_until) throw new Error("Missing snooze time");
    const { error } = await db
      .from("notifications")
      .update({ snoozed_until: payload.snoozed_until })
      .eq("user_id", userId)
      .in("id", ids);
    if (error) throw error;
    return { ok: true, action: payload.action, count: ids.length };
  }

  // mark_read (one or many)
  const { error } = await db
    .from("notifications")
    .update({ is_read: true, read_at: nowIso })
    .eq("user_id", userId)
    .in("id", ids);
  if (error) throw error;
  return { ok: true, action: payload.action, count: ids.length };
}

export const markNotificationRead = (notificationId: string) =>
  invokeNotificationManage({ action: "mark_read", notification_id: notificationId });

export const markNotificationsRead = (notificationIds: string[]) =>
  invokeNotificationManage({ action: "mark_read", notification_ids: notificationIds });

export const markAllNotificationsRead = () =>
  invokeNotificationManage({ action: "mark_all_read" });

export const deleteNotificationById = (notificationId: string) =>
  invokeNotificationManage({ action: "delete", notification_id: notificationId });

export const deleteNotificationsById = (notificationIds: string[]) =>
  invokeNotificationManage({ action: "delete", notification_ids: notificationIds });

export const clearInAppNotifications = () =>
  invokeNotificationManage({ action: "clear_in_app" });

export const snoozeNotificationById = (notificationId: string, snoozedUntil: string) =>
  invokeNotificationManage({ action: "snooze", notification_id: notificationId, snoozed_until: snoozedUntil });
