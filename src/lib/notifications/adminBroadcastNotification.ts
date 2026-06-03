import { supabase } from "@/integrations/supabase/client";

const ADMIN_BROADCAST_NOTIFICATION_ENABLED =
  ((import.meta as any).env?.MODE === "test") ||
  ((import.meta as any).env?.VITE_ADMIN_BROADCAST_NOTIFICATION_ENABLED === "true");

export type AdminBroadcastPreviewPayload = {
  action: "preview";
  role: string;
};

export type AdminBroadcastSendPayload = {
  action: "send";
  title: string;
  body: string;
  role: string;
  channel: string;
};

export type AdminBroadcastNotificationPayload =
  | AdminBroadcastPreviewPayload
  | AdminBroadcastSendPayload;

export class AdminBroadcastNotificationUnavailableError extends Error {
  constructor() {
    super("Admin broadcast notifications are temporarily unavailable while the secure function is being deployed.");
    this.name = "AdminBroadcastNotificationUnavailableError";
  }
}

export function isAdminBroadcastNotificationEnabled() {
  return ADMIN_BROADCAST_NOTIFICATION_ENABLED;
}

export async function invokeAdminBroadcastNotification(payload: AdminBroadcastNotificationPayload) {
  if (!ADMIN_BROADCAST_NOTIFICATION_ENABLED) {
    throw new AdminBroadcastNotificationUnavailableError();
  }

  const { data, error } = await supabase.functions.invoke("admin-broadcast-notification", {
    body: payload,
  });

  if (error) throw error;
  return data;
}

export const previewAdminBroadcastAudience = (role: string) =>
  invokeAdminBroadcastNotification({ action: "preview", role });

export const sendAdminBroadcastNotification = (payload: Omit<AdminBroadcastSendPayload, "action">) =>
  invokeAdminBroadcastNotification({ action: "send", ...payload });
