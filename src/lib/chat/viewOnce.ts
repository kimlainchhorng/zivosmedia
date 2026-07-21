/**
 * viewOnce — Telegram-style "view once" (burn-after-view) media for 1:1 chats.
 *
 * The flag + consumed state live in a message's `file_payload` JSON (no schema
 * migration): `{ view_once: true }` on send, `view_once_opened: true` once the
 * recipient has opened it. On open the server also nulls image_url/video_url so
 * the media can never be re-fetched.
 */
import { supabase } from "@/integrations/supabase/client";

interface ViewOnceFilePayload {
  view_once?: boolean;
  view_once_opened?: boolean;
}

export interface ViewOnceMessage {
  image_url?: string | null;
  video_url?: string | null;
  file_payload?: unknown;
}

/** "none" = not a view-once message. "sent" = sender's own, unopened.
 *  "gate" = recipient, unopened (tap to view once). "opened" = consumed. */
export type ViewOnceState = "none" | "sent" | "gate" | "opened";

function payload(fp: unknown): ViewOnceFilePayload {
  return fp && typeof fp === "object" ? (fp as ViewOnceFilePayload) : {};
}

export function isViewOnce(filePayload: unknown): boolean {
  return payload(filePayload).view_once === true;
}

export function isViewOnceOpened(filePayload: unknown): boolean {
  return payload(filePayload).view_once_opened === true;
}

export function viewOnceMediaState(msg: ViewOnceMessage, isMe: boolean): ViewOnceState {
  if (!isViewOnce(msg.file_payload)) return "none";
  if (isViewOnceOpened(msg.file_payload) || (!msg.image_url && !msg.video_url)) return "opened";
  return isMe ? "sent" : "gate";
}

export type ViewOnceMediaType = "image" | "video";

/**
 * Consume a view-once message: server validates the caller is the recipient and
 * that it hasn't been opened, marks it consumed, and returns a short-lived URL
 * to display the media exactly once.
 */
export async function consumeViewOnce(
  messageId: string,
): Promise<{ url: string; type: ViewOnceMediaType }> {
  const { data, error } = await supabase.functions.invoke("chat-consume-view-once", {
    body: { message_id: messageId },
  });
  if (error) throw error;
  if (!data?.url) throw new Error(data?.error || "Could not open this photo");
  return { url: data.url as string, type: (data.type as ViewOnceMediaType) || "image" };
}
