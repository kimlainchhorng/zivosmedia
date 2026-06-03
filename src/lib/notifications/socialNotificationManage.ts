import { supabase } from "@/integrations/supabase/client";
import type { SocialNotification } from "@/hooks/useSocialNotifications";

const SOCIAL_NOTIFICATION_MANAGE_ENABLED =
  ((import.meta as any).env?.MODE === "test") ||
  ((import.meta as any).env?.VITE_SOCIAL_NOTIFICATION_MANAGE_ENABLED === "true");

export type SocialNotificationManagePayload =
  | { action: "mark_read"; ids: string[] }
  | { action: "mark_all_read" }
  | {
      action: "create";
      user_id: string;
      type: SocialNotification["type"];
      entity_id: string | null;
      entity_type: string | null;
      message: string;
    };

export class SocialNotificationManageUnavailableError extends Error {
  constructor() {
    super("Social notification updates are temporarily unavailable while the secure function is being deployed.");
    this.name = "SocialNotificationManageUnavailableError";
  }
}

export function isSocialNotificationManageEnabled() {
  return SOCIAL_NOTIFICATION_MANAGE_ENABLED;
}

export async function invokeSocialNotificationManage(payload: SocialNotificationManagePayload) {
  if (!SOCIAL_NOTIFICATION_MANAGE_ENABLED) {
    throw new SocialNotificationManageUnavailableError();
  }

  const { data, error } = await supabase.functions.invoke("social-notification-manage", {
    body: payload,
  });

  if (error) throw error;
  return data;
}

export const markSocialNotificationsRead = (ids: string[]) =>
  invokeSocialNotificationManage({ action: "mark_read", ids });

export const markAllSocialNotificationsRead = () =>
  invokeSocialNotificationManage({ action: "mark_all_read" });

export const createManagedSocialNotification = (payload: Omit<Extract<SocialNotificationManagePayload, { action: "create" }>, "action">) =>
  invokeSocialNotificationManage({ action: "create", ...payload });
