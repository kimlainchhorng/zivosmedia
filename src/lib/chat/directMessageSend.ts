import { supabase } from "@/integrations/supabase/client";
export type DirectMessageSendPayload = {
  sender_id?: string | null;
  receiver_id: string;
  message?: string | null;
  message_type?: string | null;
  image_url?: string | null;
  video_url?: string | null;
  voice_url?: string | null;
  file_payload?: unknown;
  gift_payload?: unknown;
  reply_to_id?: string | null;
  forwarded_from_user_id?: string | null;
  forwarded_from_message_id?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
  location_label?: string | null;
  expires_at?: string | null;
  self_destruct_seconds?: number | null;
  locked_price_cents?: number | null;
  locked_payload_content?: string | null;
};

type FunctionSendResult = {
  ok?: boolean;
  message?: unknown;
  messages?: unknown[];
  error?: string;
};

export async function sendDirectMessage(payload: DirectMessageSendPayload) {
  const { data, error } = await supabase.functions.invoke<FunctionSendResult>("chat-message-send", {
    body: stripClientSender(payload),
  });

  return { data: data?.message ?? null, error };
}

export async function sendDirectMessages(payloads: DirectMessageSendPayload[]) {
  const { data, error } = await supabase.functions.invoke<FunctionSendResult>("chat-message-send", {
    body: { messages: payloads.map(stripClientSender) },
  });

  return { data: data?.messages ?? [], error };
}

function stripClientSender(payload: DirectMessageSendPayload): Omit<DirectMessageSendPayload, "sender_id"> {
  const { sender_id: _senderId, ...serverOwnedPayload } = payload;
  return serverOwnedPayload;
}
