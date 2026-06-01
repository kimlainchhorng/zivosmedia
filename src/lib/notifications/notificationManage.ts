import { supabase } from "@/integrations/supabase/client";

export type NotificationMutationAction =
  | "mark_read"
  | "mark_all_read"
  | "delete"
  | "clear_in_app"
  | "snooze";

type NotificationMutationPayload = {
  action: NotificationMutationAction;
  notification_id?: string;
  notification_ids?: string[];
  snoozed_until?: string;
};

async function invokeNotificationManage(payload: NotificationMutationPayload) {
  const { data, error } = await supabase.functions.invoke("notification-manage", {
    body: payload,
  });

  if (error) throw error;
  return data;
}

export const markNotificationsRead = (notificationIds: string[]) =>
  invokeNotificationManage({
    action: "mark_read",
    notification_ids: notificationIds,
  });

export const markNotificationRead = (notificationId: string) =>
  invokeNotificationManage({
    action: "mark_read",
    notification_id: notificationId,
  });

export const markAllNotificationsRead = () =>
  invokeNotificationManage({
    action: "mark_all_read",
  });

export const deleteNotificationsById = (notificationIds: string[]) =>
  invokeNotificationManage({
    action: "delete",
    notification_ids: notificationIds,
  });

export const deleteNotificationById = (notificationId: string) =>
  invokeNotificationManage({
    action: "delete",
    notification_id: notificationId,
  });

export const clearInAppNotifications = () =>
  invokeNotificationManage({
    action: "clear_in_app",
  });

export const snoozeNotificationById = (notificationId: string, snoozedUntil: string) =>
  invokeNotificationManage({
    action: "snooze",
    notification_id: notificationId,
    snoozed_until: snoozedUntil,
  });
