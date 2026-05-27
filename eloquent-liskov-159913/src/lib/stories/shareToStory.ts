/**
 * shareToStory — push a card into the user's 24h story strip.
 *
 * A "story" here is just an entry in the user_posts table flagged with
 * is_story=true and an expires_at 24h from creation. The home story rail
 * already filters to non-expired flagged posts.
 */
import { supabase } from "@/integrations/supabase/client";
import type { ZivoCardPayload } from "@/components/chat/ZivoActionBubble";

export interface StoryShareInput {
  userId: string;
  card?: ZivoCardPayload;
  caption?: string;
  imageUrl?: string;
}

const dbFrom = (table: string): unknown =>
  (supabase as unknown as { from: (t: string) => unknown }).from(table);

export async function shareToStory({ userId, card, caption, imageUrl }: StoryShareInput): Promise<boolean> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  try {
    const { error } = await (dbFrom("user_posts") as { insert: (p: unknown) => Promise<{ error: unknown }> }).insert({
      user_id: userId,
      content: caption || card?.title || "",
      media_url: imageUrl || card?.image || null,
      is_story: true,
      expires_at: expiresAt,
      payload: card ? { kind: "zivo_card", card } : null,
    });
    return !error;
  } catch {
    return false;
  }
}
