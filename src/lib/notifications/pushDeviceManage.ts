import { supabase } from "@/integrations/supabase/client";

const PUSH_DEVICE_MANAGE_ENABLED =
  ((import.meta as any).env?.MODE === "test") ||
  ((import.meta as any).env?.VITE_PUSH_DEVICE_MANAGE_ENABLED === "true");

export type PushDeviceManagePayload = {
  action: "revoke";
  subscription_id: string;
};

export class PushDeviceManageUnavailableError extends Error {
  constructor() {
    super("Push device management is temporarily unavailable while the secure function is being deployed.");
    this.name = "PushDeviceManageUnavailableError";
  }
}

export function isPushDeviceManageEnabled() {
  return PUSH_DEVICE_MANAGE_ENABLED;
}

export async function invokePushDeviceManage(payload: PushDeviceManagePayload) {
  if (!PUSH_DEVICE_MANAGE_ENABLED) {
    throw new PushDeviceManageUnavailableError();
  }

  const { data, error } = await supabase.functions.invoke("push-device-manage", {
    body: payload,
  });

  if (error) throw error;
  return data;
}

export const revokePushDevice = (subscriptionId: string) =>
  invokePushDeviceManage({ action: "revoke", subscription_id: subscriptionId });
