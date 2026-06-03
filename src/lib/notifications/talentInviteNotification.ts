import { supabase } from "@/integrations/supabase/client";

const TALENT_INVITE_NOTIFICATION_ENABLED =
  ((import.meta as any).env?.MODE === "test") ||
  ((import.meta as any).env?.VITE_TALENT_INVITE_NOTIFICATION_ENABLED === "true");

export type TalentInviteNotificationPayload = {
  target_user_id: string;
};

export class TalentInviteNotificationUnavailableError extends Error {
  constructor() {
    super("Talent invite notifications are temporarily unavailable while the secure function is being deployed.");
    this.name = "TalentInviteNotificationUnavailableError";
  }
}

export function isTalentInviteNotificationEnabled() {
  return TALENT_INVITE_NOTIFICATION_ENABLED;
}

export async function inviteTalentToApply(payload: TalentInviteNotificationPayload) {
  if (!TALENT_INVITE_NOTIFICATION_ENABLED) {
    throw new TalentInviteNotificationUnavailableError();
  }

  const { data, error } = await supabase.functions.invoke("talent-invite-notification", {
    body: payload,
  });

  if (error) throw error;
  return data;
}
