/**
 * ProfileStories — Facebook-style horizontal ring carousel.
 * Shows "Your story" + every friend with active stories. Uses an isolated
 * profile cache key so it never collides with FeedStoryRing's data shape.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Plus, Camera, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import CreateStorySheet from "@/components/profile/CreateStorySheet";
import StoryViewer from "@/components/stories/StoryViewer";
import type { StoryGroup } from "@/components/stories/StoryViewer";
import StoryTextTile from "@/components/stories/StoryTextTile";
import { useStoryDeepLink, useStoryViewerLocation } from "@/hooks/useStoryDeepLink";
import { invalidateAllStoryCaches } from "@/lib/storiesCache";
import { useMyStoryViews } from "@/hooks/useMyStoryViews";

interface RawStory {
  id: string;
  user_id: string;
  media_url: string;
  media_type: string;
  text_overlay: string | null;
  audio_url: string | null;
  created_at: string;
  expires_at: string;
  view_count: number | null;
}

const ProfileStories = () => {
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const queryClient = useQueryClient();
  const { activeStoryId, openStory, closeStory, updateStory } = useStoryDeepLink({ source: "profile" });

  const [showCreate, setShowCreate] = useState(false);

  // All active stories across friends + self (drives the ring carousel)
  const { data: allStories = [], isLoading } = useQuery({
    queryKey: ["profile-story-rings", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await supabase
        .from("stories" as any)
        .select("id, user_id, media_url, media_type, text_overlay, audio_url, created_at, expires_at, view_count")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      return ((data as any[]) || []) as RawStory[];
    },
  });

  // Story IDs current user has viewed → drives "fully viewed" ring color
  const { viewedIds } = useMyStoryViews();

  // Profiles for everyone with an active story
  const userIds = useMemo(
    () => [...new Set(allStories.map((s) => s.user_id))],
    [allStories]
  );
  const authorKey = useMemo(() => [...userIds].sort().join(","), [userIds]);
  const { data: profileMap = new Map() } = useQuery({
    queryKey: ["story-author-profiles", authorKey],
    enabled: userIds.length > 0,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, avatar_url")
        .or(`id.in.(${userIds.join(",")}),user_id.in.(${userIds.join(",")})`);
      const map = new Map<string, any>();
      for (const p of data || []) {
        if ((p as any).id) map.set((p as any).id, p);
        if ((p as any).user_id) map.set((p as any).user_id, p);
      }
      return map;
    },
  });

  // Group stories by user → StoryGroup[] (current user always first)
  const groups: StoryGroup[] = useMemo(() => {
    const byUser = new Map<string, RawStory[]>();
    for (const s of allStories) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    }
    const out: StoryGroup[] = [];
    for (const [uid, list] of byUser.entries()) {
      const p = profileMap.get(uid);
      out.push({
        userId: uid,
        userName: uid === user?.id ? (profile?.full_name || "You") : (p?.full_name || "User"),
        avatarUrl: uid === user?.id ? (profile?.avatar_url || undefined) : (p?.avatar_url || undefined),
        stories: list.map((s) => ({
          id: s.id,
          mediaUrl: s.media_url,
          mediaType: s.media_type,
          caption: s.text_overlay || undefined,
          audioUrl: s.audio_url || undefined,
          createdAt: s.created_at,
          viewsCount: s.view_count ?? 0,
        })),
      });
    }
    // Sort: me first, then by most recent story
    out.sort((a, b) => {
      if (a.userId === user?.id) return -1;
      if (b.userId === user?.id) return 1;
      const aLast = a.stories[a.stories.length - 1].createdAt;
      const bLast = b.stories[b.stories.length - 1].createdAt;
      return bLast.localeCompare(aLast);
    });
    return out;
  }, [allStories, profileMap, user?.id, profile?.full_name, profile?.avatar_url]);

  const myGroup = groups.find((g) => g.userId === user?.id);
  const friendGroups = groups.filter((g) => g.userId !== user?.id);
  const hasMyStory = !!myGroup;

  // Resolve the active deep-linked story to (groupIndex, storyIndex)
  const viewerLocation = useStoryViewerLocation(groups, activeStoryId);

  const openViewer = (groupUserId: string) => {
    const grp = groups.find((g) => g.userId === groupUserId);
    if (!grp || grp.stories.length === 0) return;
    openStory(grp.stories[0].id);
  };

  const handleViewerClose = (meta?: Parameters<typeof closeStory>[0]) => {
    closeStory(meta);
    invalidateAllStoryCaches(queryClient, user?.id);
  };

  const isFullyViewed = (g: StoryGroup) =>
    g.userId !== user?.id && g.stories.every((s) => viewedIds.has(s.id));

  return (
    <>
      {/* Horizontal ring carousel */}
      <div className="-mx-2 overflow-x-auto scrollbar-hide">
        <div className="flex items-start gap-3 px-2 py-1 snap-x snap-mandatory">
          {/* Your story tile (Instagram-style) */}
          <button type="button"
            data-testid="profile-story-ring"
            onClick={() => (hasMyStory ? openViewer(user!.id) : setShowCreate(true))}
            className="snap-start shrink-0 flex flex-col items-center gap-1 w-[72px]"
          >
            <motion.div whileTap={{ scale: 0.92 }} className="relative">
              <div
                className={cn(
                  "h-16 w-16 rounded-full p-[2.5px] box-border",
                  hasMyStory
                    ? "bg-[conic-gradient(from_140deg,hsl(160_84%_45%),hsl(174_72%_45%),hsl(190_85%_55%),hsl(160_84%_45%))] shadow-[0_0_12px_-3px_hsl(160_84%_45%/0.55)]"
                    : "bg-muted-foreground/25"
                )}
              >
                <div className="h-full w-full rounded-full overflow-hidden border-2 border-background bg-card flex items-center justify-center">
                  {(() => {
                    const latest = myGroup?.stories[myGroup.stories.length - 1];
                    if (latest && latest.mediaType === "image" && latest.mediaUrl) {
	                      return <img src={latest.mediaUrl} alt="Your story" className="h-full w-full object-cover" loading="lazy" decoding="async" />;
                    }
                    if (latest && latest.mediaType === "video" && latest.mediaUrl) {
                      return <video src={latest.mediaUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />;
                    }
                    if (latest && (latest.mediaType === "text" || !latest.mediaUrl)) {
                      return <StoryTextTile text={latest.caption || ""} />;
                    }
                    if (profile?.avatar_url) {
                      return (
                        <Avatar className="h-full w-full">
                          <AvatarImage src={profile.avatar_url} />
                          <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                            {(profile?.full_name || "Y")[0]}
                          </AvatarFallback>
                        </Avatar>
                      );
                    }
                    return (
                      <div className="flex h-full w-full items-center justify-center bg-primary/10">
                        <Camera className="h-5 w-5 text-primary/60" />
                      </div>
                    );
                  })()}
                </div>
              </div>
              {/* ZIVO Aurora badge — Sparkles when story exists, Plus to add */}
              <div className="absolute -bottom-0.5 -right-0.5 h-[22px] w-[22px] rounded-full bg-gradient-to-br from-[hsl(160_84%_45%)] to-[hsl(174_72%_40%)] flex items-center justify-center border-[2.5px] border-background shadow-[0_2px_6px_-1px_hsl(160_84%_45%/0.6)]">
                {hasMyStory ? (
                  <Sparkles className="h-3 w-3 text-white" strokeWidth={2.5} />
                ) : (
                  <Plus className="h-3 w-3 text-white" strokeWidth={3} />
                )}
              </div>
              {/* Segment count badge */}
              {hasMyStory && myGroup!.stories.length > 1 && (
                <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full border-2 border-background bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {myGroup!.stories.length}
                </div>
              )}
            </motion.div>
            <span className="text-[11px] font-medium leading-tight text-foreground truncate max-w-[68px] text-center">
              Your story
            </span>
          </button>

          {/* Loading skeletons */}
          {isLoading && friendGroups.length === 0 && (
            <>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="snap-start shrink-0 flex flex-col items-center gap-1 w-[72px]">
                  <div className="h-16 w-16 rounded-full bg-muted animate-pulse" />
                  <div className="h-2.5 w-12 rounded-full bg-muted animate-pulse" />
                </div>
              ))}
            </>
          )}

          {/* Friend rings */}
          {friendGroups.map((g) => {
            const fullyViewed = isFullyViewed(g);
            return (
              <button type="button"
                key={g.userId}
                onClick={() => openViewer(g.userId)}
                className="snap-start shrink-0 flex flex-col items-center gap-1 w-[72px]"
              >
                <motion.div whileTap={{ scale: 0.92 }} className="relative">
                  <div
                    className={cn(
                      "h-16 w-16 rounded-full p-[2.5px]",
                      fullyViewed
                        ? "bg-muted-foreground/25"
                        : "bg-[conic-gradient(from_140deg,hsl(160_84%_45%),hsl(174_72%_45%),hsl(190_85%_55%),hsl(160_84%_45%))] shadow-[0_0_12px_-3px_hsl(160_84%_45%/0.55)]"
                    )}
                  >
                    <Avatar className="h-full w-full border-2 border-background">
                      <AvatarImage src={g.avatarUrl} />
                      <AvatarFallback className="bg-primary/10 text-base font-bold text-primary">
                        {g.userName[0]}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  {g.stories.length > 1 && (
                    <div className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full border-2 border-background bg-foreground text-background text-[10px] font-bold flex items-center justify-center">
                      {g.stories.length}
                    </div>
                  )}
                </motion.div>
                <span className={cn(
                  "text-[11px] leading-tight truncate max-w-[68px] text-center",
                  fullyViewed ? "text-muted-foreground" : "font-semibold text-foreground"
                )}>
                  {g.userName.split(" ")[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <CreateStorySheet
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onPublished={() => invalidateAllStoryCaches(queryClient, user?.id)}
      />

      {viewerLocation && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerLocation.groupIndex}
          startStoryIndex={viewerLocation.storyIndex}
          onClose={handleViewerClose}
          onStoryChange={updateStory}
          source="profile"
        />
      )}
    </>
  );
};

export default ProfileStories;
