import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface FeedStory {
  id: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  watched: boolean;
}

// Fetches the latest unexpired story per followed user, joined to profile
// display info, with each story's watched state determined from story_views.
async function fetchStoriesFeed(viewerId: string): Promise<FeedStory[]> {
  const { data: follows, error: followsErr } = await supabase
    .from("user_followers")
    .select("following_id")
    .eq("follower_id", viewerId);
  if (followsErr) throw followsErr;

  const followingIds = (follows ?? []).map(f => f.following_id);
  if (followingIds.length === 0) return [];

  const { data: stories, error: storiesErr } = await supabase
    .from("stories")
    .select("id, user_id, created_at")
    .in("user_id", followingIds)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });
  if (storiesErr) throw storiesErr;
  if (!stories || stories.length === 0) return [];

  // One entry per user — keep the most recent story (already sorted desc).
  const latestByUser = new Map<string, { id: string; user_id: string }>();
  for (const s of stories) {
    if (!latestByUser.has(s.user_id)) latestByUser.set(s.user_id, s);
  }
  const latestStories = [...latestByUser.values()];
  const userIds = latestStories.map(s => s.user_id);
  const storyIds = latestStories.map(s => s.id);

  // profiles in this DB may key off either `id` or `user_id` — query both.
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, user_id, username, full_name, avatar_url")
    .or(`user_id.in.(${userIds.join(",")}),id.in.(${userIds.join(",")})`);

  const profileFor = (uid: string) =>
    profiles?.find(p => p.user_id === uid) ?? profiles?.find(p => p.id === uid);

  const { data: views } = await supabase
    .from("story_views")
    .select("story_id")
    .eq("viewer_id", viewerId)
    .in("story_id", storyIds);
  const viewed = new Set((views ?? []).map(v => v.story_id));

  return latestStories.map(s => {
    const p = profileFor(s.user_id);
    const name = p?.username || p?.full_name?.split(" ")[0] || "user";
    return {
      id: s.id,
      userId: s.user_id,
      name,
      avatarUrl: p?.avatar_url ?? undefined,
      watched: viewed.has(s.id),
    };
  });
}

export function useStoriesFeed() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["stories-feed", user?.id],
    queryFn: () => fetchStoriesFeed(user!.id),
    enabled: !!user?.id,
    staleTime: 60_000,
  });
}
