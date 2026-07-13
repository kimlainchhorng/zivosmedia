/**
 * FeedStoryRing — Horizontal scrollable story rings for the feed page.
 * Tapping a ring opens the shared StoryViewer via a deep-linked URL
 * (`?story=<story_id>`), so the same link can be shared and reopened anywhere.
 *
 * The "Add story" affordance opens the shared `CreateStorySheet` (the same
 * premium bottom sheet used on Profile) instead of launching the raw native
 * iOS/Android file chooser, which on Safari renders as a floating top-left
 * popover detached from any trigger.
 */
import { lazy, Suspense, useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import StoryViewer from "@/components/stories/StoryViewer";
import type { StoryGroup } from "@/components/stories/StoryViewer";
import StoryTextTile from "@/components/stories/StoryTextTile";
import { useStoryDeepLink, useStoryViewerLocation } from "@/hooks/useStoryDeepLink";
import { invalidateAllStoryCaches } from "@/lib/storiesCache";
import { useMyStoryViews } from "@/hooks/useMyStoryViews";
import { useUserProfile } from "@/hooks/useUserProfile";

const CreateStorySheet = lazy(() => import("@/components/profile/CreateStorySheet"));

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

export default function FeedStoryRing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showOwnSheet, setShowOwnSheet] = useState(false);
  const { activeStoryId, openStory, closeStory, updateStory } = useStoryDeepLink({ source: "feed" });
  const { data: myProfile } = useUserProfile();

  const { data: rawStories = [] } = useQuery({
    queryKey: ["feed-story-users"],
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("stories")
        .select("id, user_id, media_url, media_type, text_overlay, audio_url, created_at, expires_at, view_count")
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: true });
      return ((data as any[]) || []) as RawStory[];
    },
  });

  const { viewedIds } = useMyStoryViews();

  const userIds = useMemo(() => [...new Set(rawStories.map((s) => s.user_id))], [rawStories]);
  const profileKey = useMemo(() => [...userIds].sort().join(","), [userIds]);

  const { data: profileMap = new Map() } = useQuery({
    queryKey: ["feed-story-profiles", profileKey],
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

  const groups: StoryGroup[] = useMemo(() => {
    const byUser = new Map<string, RawStory[]>();
    for (const s of rawStories) {
      if (!byUser.has(s.user_id)) byUser.set(s.user_id, []);
      byUser.get(s.user_id)!.push(s);
    }
    const out: StoryGroup[] = [];
    for (const [uid, list] of byUser.entries()) {
      const p = profileMap.get(uid);
      out.push({
        userId: uid,
        userName: p?.full_name || "User",
        avatarUrl: p?.avatar_url || undefined,
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
    // Put current user first
    const myIdx = out.findIndex((g) => g.userId === user?.id);
    if (myIdx > 0) {
      const [mine] = out.splice(myIdx, 1);
      out.unshift(mine);
    }
    return out;
  }, [rawStories, profileMap, user?.id]);

  const viewerLocation = useStoryViewerLocation(groups, activeStoryId);

  const hasMyStory = groups.some((g) => g.userId === user?.id);

  const handleRingClick = (group: StoryGroup) => {
    if (group.stories.length === 0) return;
    openStory(group.stories[0].id);
  };

  const handleViewerClose = (meta?: Parameters<typeof closeStory>[0]) => {
    closeStory(meta);
    invalidateAllStoryCaches(queryClient, user?.id);
  };

  if (!user) return null;

  const groupHasUnviewed = (g: StoryGroup) =>
    g.userId !== user.id && g.stories.some((s) => !viewedIds.has(s.id));

  const myGroup = groups.find((g) => g.userId === user.id);
  const myLatestStory = myGroup?.stories[myGroup.stories.length - 1];

  const handleOwnRingClick = () => {
    if (myGroup && myGroup.stories.length > 0) {
      setShowOwnSheet(true);
    } else {
      setShowCreate(true);
    }
  };

  return (
    <>
      <div className="flex gap-3 px-3 py-2 overflow-x-auto scrollbar-none border-b border-border/20 lg:gap-2 lg:py-1.5">
        {/* Your story (Instagram-style) */}
        <button type="button"
          onClick={handleOwnRingClick}
          className="flex flex-col items-center gap-1 shrink-0 w-[72px] lg:w-[64px]"
        >
          <div className="relative">
            <div className={cn(
              "h-[64px] w-[64px] rounded-full p-[2.5px] box-border lg:h-14 lg:w-14",
              hasMyStory
                ? "bg-[conic-gradient(from_140deg,hsl(160_84%_45%),hsl(174_72%_45%),hsl(190_85%_55%),hsl(160_84%_45%))] shadow-[0_0_14px_-3px_hsl(160_84%_45%/0.6)]"
                : "bg-muted-foreground/20"
            )}>
              <div className="h-full w-full rounded-full overflow-hidden border-2 border-card bg-card relative flex items-center justify-center">
                {myLatestStory && myLatestStory.mediaType === "image" && myLatestStory.mediaUrl ? (
                  <img
                    src={myLatestStory.mediaUrl}
	                    alt="Your story"
	                    className="h-full w-full object-cover"
	                    loading="lazy"
	                    decoding="async"
	                  />
                ) : myLatestStory && myLatestStory.mediaType === "video" && myLatestStory.mediaUrl ? (
                  <video
                    src={myLatestStory.mediaUrl}
                    className="h-full w-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                  />
                ) : myLatestStory && (myLatestStory.mediaType === "text" || !myLatestStory.mediaUrl) ? (
                  <StoryTextTile text={myLatestStory.caption || ""} />
                ) : (
                  <Avatar className="h-full w-full">
                    <AvatarImage src={optimizeAvatar(myGroup?.avatarUrl || myProfile?.avatar_url || undefined, 128)} loading="lazy" />
                    <AvatarFallback className="text-sm font-bold">
                      {(myProfile?.full_name?.[0] || user.email?.[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            </div>
            <div className={cn(
              "absolute -bottom-0.5 -right-0.5 h-[22px] w-[22px] rounded-full flex items-center justify-center border-[2.5px] border-card shadow-[0_2px_6px_-1px_hsl(160_84%_45%/0.6)] lg:h-5 lg:w-5",
              hasMyStory
                ? "bg-gradient-to-br from-[hsl(160_84%_45%)] to-[hsl(174_72%_40%)]"
                : "bg-gradient-to-br from-[hsl(160_84%_45%)] to-[hsl(174_72%_40%)]"
            )}>
              {hasMyStory ? (
                <Sparkles className="h-3 w-3 text-white" strokeWidth={2.5} />
              ) : (
                <Plus className="h-3 w-3 text-white" strokeWidth={3} />
              )}
            </div>
          </div>
          <span className="text-[11px] font-medium text-foreground max-w-[68px] truncate lg:max-w-[60px] lg:text-[10px]">
            Your story
          </span>
        </button>

        {/* Empty hint — when nobody you follow has posted a story today */}
        {groups.filter((g) => g.userId !== user.id).length === 0 && (
          <a
            href="/explore"
            className="flex flex-col items-center gap-1 shrink-0 w-[80px] active:scale-95 transition-transform lg:w-[68px]"
          >
            <div className="h-[64px] w-[64px] rounded-full p-[2.5px] bg-gradient-to-br from-primary/40 to-emerald-400/30 box-border flex items-center justify-center lg:h-14 lg:w-14">
              <div className="h-full w-full rounded-full bg-card flex items-center justify-center text-primary">
                <Sparkles className="h-5 w-5" strokeWidth={2.25} />
              </div>
            </div>
            <span className="text-[11px] font-semibold text-primary text-center leading-tight lg:text-[10px]">
              Discover people →
            </span>
          </a>
        )}

        {/* Other users' stories */}
        {groups.filter((g) => g.userId !== user.id).map((g) => {
          const hasUnviewed = groupHasUnviewed(g);
          return (
            <button type="button"
              key={g.userId}
              className="flex flex-col items-center gap-1 shrink-0 w-[72px] lg:w-[64px]"
              onClick={() => handleRingClick(g)}
            >
              <div className={cn(
                "h-[64px] w-[64px] rounded-full p-[2.5px] lg:h-14 lg:w-14",
                hasUnviewed
                  ? "bg-[conic-gradient(from_140deg,hsl(160_84%_45%),hsl(174_72%_45%),hsl(190_85%_55%),hsl(160_84%_45%))] shadow-[0_0_12px_-3px_hsl(160_84%_45%/0.55)]"
                  : "bg-muted-foreground/20"
              )}>
                <div className="h-full w-full rounded-full overflow-hidden border-2 border-card bg-card">
                  <Avatar className="h-full w-full">
                    <AvatarImage src={optimizeAvatar(g.avatarUrl, 64)} loading="lazy" />
                    <AvatarFallback
                      className="text-sm font-bold text-white"
                      style={{
                        background: `linear-gradient(135deg, hsl(${(g.userId.charCodeAt(0) * 47) % 360} 70% 55%), hsl(${(g.userId.charCodeAt(0) * 47 + 60) % 360} 70% 45%))`,
                      }}
                    >
                      {(g.userName[0] || "U").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
              <span className={cn(
                "text-[11px] max-w-[68px] truncate lg:max-w-[60px] lg:text-[10px]",
                hasUnviewed ? "font-semibold text-foreground" : "font-medium text-muted-foreground"
              )}>
                {g.userName.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Own-ring action sheet: View or Add */}
      <Sheet open={showOwnSheet} onOpenChange={setShowOwnSheet}>
        <SheetContent side="bottom" className="rounded-t-2xl pb-[var(--zivo-safe-bottom,16px)]">
          <SheetHeader>
            <SheetTitle className="text-left">Your story</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 pt-3">
            <button type="button"
              className="w-full text-left px-4 py-3 rounded-xl bg-muted/40 hover:bg-muted/60 active:scale-[0.99] transition font-medium"
              onClick={() => {
                setShowOwnSheet(false);
                if (myGroup) handleRingClick(myGroup);
              }}
            >
              View your story
            </button>
            <button type="button"
              className="w-full text-left px-4 py-3 rounded-xl bg-primary text-primary-foreground hover:opacity-95 active:scale-[0.99] transition font-medium"
              onClick={() => {
                setShowOwnSheet(false);
                setShowCreate(true);
              }}
            >
              Add to your story
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {showCreate && (
        <Suspense fallback={null}>
          <CreateStorySheet
            open={showCreate}
            onClose={() => setShowCreate(false)}
            onPublished={() => invalidateAllStoryCaches(queryClient, user?.id)}
          />
        </Suspense>
      )}

      {viewerLocation && (
        <StoryViewer
          groups={groups}
          startGroupIndex={viewerLocation.groupIndex}
          startStoryIndex={viewerLocation.storyIndex}
          onClose={handleViewerClose}
          onStoryChange={updateStory}
          source="feed"
        />
      )}
    </>
  );
}
