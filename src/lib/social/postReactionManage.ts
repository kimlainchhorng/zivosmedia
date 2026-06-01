import { supabase } from "@/integrations/supabase/client";
import type { ReactionEmoji } from "@/lib/social/reactions";

export type PostReactionSource = "store" | "user";

export type SetPostReactionPayload = {
  post_id: string;
  source: PostReactionSource;
  emoji: ReactionEmoji | null;
};

type PostReactionManageResult = {
  ok?: boolean;
  reaction?: unknown;
  error?: string;
};

export async function setPostReaction(payload: SetPostReactionPayload) {
  const { data, error } = await supabase.functions.invoke<PostReactionManageResult>("post-reaction-manage", {
    body: {
      action: payload.emoji ? "set_reaction" : "clear_reaction",
      post_id: payload.post_id,
      source: payload.source,
      emoji: payload.emoji,
    },
  });

  return { data: data?.reaction ?? null, error };
}
