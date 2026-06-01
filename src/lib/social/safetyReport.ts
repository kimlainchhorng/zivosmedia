import { supabase } from "@/integrations/supabase/client";

type SafetyReportBody = {
  type: "post" | "comment" | "content" | "group_message" | "chat_message" | "story" | "story_comment" | "safety_action";
  reason?: string;
  post_id?: string;
  post_source?: "user" | "store";
  comment_id?: string;
  group_id?: string;
  message_id?: string;
  sender_id?: string;
  receiver_id?: string;
  story_id?: string;
  owner_id?: string;
  comment_author_id?: string;
  target_user_id?: string | null;
  auto_block?: boolean;
  content_type?: "ppv_post" | "paid_dm" | "creator";
  content_id?: string;
  reported_user_id?: string | null;
  description?: string | null;
  action?: "mute" | "block";
};

export async function submitSafetyReport(body: SafetyReportBody) {
  const { data, error } = await supabase.functions.invoke("social-safety-report", { body });
  if (error) throw error;
  return (data ?? {}) as { ok?: boolean; id?: string | null; alreadyReported?: boolean };
}
