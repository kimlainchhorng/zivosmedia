import { supabase } from "@/integrations/supabase/client";

const NOTIFICATION_MANAGE_ENABLED =
  ((import.meta as any).env?.MODE === "test") ||
  ((import.meta as any).env?.VITE_NOTIFICATION_MANAGE_ENABLED === "true");

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
    super("Notification updates are temporarily unavailable while the secure function is being deployed.");
    this.name = "NotificationManageUnavailableError";
  }
}

export function isNotificationManageEnabled() {
  return NOTIFICATION_MANAGE_ENABLED;
}

/**
 * Per-user notification mutations, routed through the secure Edge Function.
 */
export async function invokeNotificationManage(payload: NotificationManagePayload) {
  if (!NOTIFICATION_MANAGE_ENABLED) {
    throw new NotificationManageUnavailableError();
  }

  const { data, error } = await supabase.functions.invoke("notification-manage", {
    body: payload,
  });

  if (error) throw error;
  return data;
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
