import { supabase } from "@/integrations/supabase/client";

export type GroupMessageSendPayload = {
  sender_id?: string | null;
  group_id: string;
  message?: string | null;
  message_type?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  voice_url?: string | null;
  file_payload?: unknown;
  reply_to_id?: string | null;
  reply_to_message_id?: string | null;
  reply_to_snapshot?: unknown;
  location_lat?: number | null;
  location_lng?: number | null;
  location_label?: string | null;
  expires_at?: string | null;
  locked_price_coins?: number | null;
};

type FunctionSendResult = {
  ok?: boolean;
  message?: unknown;
  messages?: unknown[];
  error?: string;
};

export async function sendGroupMessage(payload: GroupMessageSendPayload) {
  const { data, error } = await supabase.functions.invoke<FunctionSendResult>("group-message-send", {
    body: stripClientSender(payload),
  });

  return { data: data?.message ?? null, error };
}

export async function sendGroupMessages(payloads: GroupMessageSendPayload[]) {
  const { data, error } = await supabase.functions.invoke<FunctionSendResult>("group-message-send", {
    body: { messages: payloads.map(stripClientSender) },
  });

  return { data: data?.messages ?? [], error };
}

function stripClientSender(payload: GroupMessageSendPayload): Omit<GroupMessageSendPayload, "sender_id"> {
  const { sender_id: _senderId, ...serverOwnedPayload } = payload;
  return serverOwnedPayload;
}
