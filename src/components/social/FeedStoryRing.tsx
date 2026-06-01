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
import { Clock3, Eye, Plus, Radio, ShieldCheck, Sparkles, UserRoundPlus } from "lucide-react";
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
import { isStorySafetySchemaDriftError } from "@/lib/social/sensitiveContent";
import { useHaptic } from "@/hooks/useHaptic";

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
  is_sensitive?: boolean | null;
  sensitive_reason?: string | null;
  hidden_at?: string | null;
  hidden_reason?: string | null;
  sensitive_report_count?: number | null;
}

export default function FeedStoryRing() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [showOwnSheet, setShowOwnSheet] = useState(false);
  const { activeStoryId, openStory, closeStory, updateStory } = useStoryDeepLink({ source: "feed" });
  const { data: myProfile } = useUserProfile();
  const haptic = useHaptic();

  const { data: rawStories = [] } = useQuery({
    queryKey: ["feed-story-users"],
    enabled: !!user,
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const selectBase = "id, user_id, media_url, media_type, text_overlay, audio_url, created_at, expires_at, view_count";
      const selectWithSafety = `${selectBase}, is_sensitive, sensitive_reason, hidden_at, hidden_reason, sensitive_report_count`;
      const queryStories = (select: string, includeHiddenFilter: boolean) => {
        let query = (supabase as any)
          .from("stories")
          .select(select)
          .gt("expires_at", new Date().toISOString());
        if (includeHiddenFilter) query = query.is("hidden_at", null);
        return query.order("created_at", { ascending: true });
      };
      let { data, error } = await queryStories(selectWithSafety, true);
      if (error && isStorySafetySchemaDriftError(error)) {
        const fallback = await queryStories(selectBase, false);
        data = fallback.data;
        error = fallback.error;
      }
      if (error) throw error;
      return (((data as any[]) || []) as RawStory[]).filter((story) => !story.hidden_at);
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
          isSensitive: Boolean(s.is_sensitive),
          sensitiveReason: s.sensitive_reason,
          hiddenAt: s.hidden_at,
          hiddenReason: s.hidden_reason,
          sensitiveReportCount: s.sensitive_report_count ?? 0,
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
    haptic("light");
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
  const otherGroups = groups.filter((g) => g.userId !== user.id);
  const unseenStoryCount = otherGroups.reduce(
    (sum, group) => sum + group.stories.filter((story) => !viewedIds.has(story.id)).length,
    0
  );
  const totalStoryCount = groups.reduce((sum, group) => sum + group.stories.length, 0);
  const freshStoryCount = rawStories.filter((story) => {
    const createdAt = new Date(story.created_at).getTime();
    return Number.isFinite(createdAt) && Date.now() - createdAt < 60 * 60_000;
  }).length;
  const radarStatus = unseenStoryCount > 0 ? "New drops" : "All caught up";

  const handleOwnRingClick = () => {
    haptic("light");
    if (myGroup && myGroup.stories.length > 0) {
      setShowOwnSheet(true);
    } else {
      setShowCreate(true);
    }
  };

  return (
    <>
      <div className="zivo-feed-story-strip mx-2 mt-3 flex gap-3 overflow-x-auto px-1.5 py-1.5 scrollbar-none lg:gap-2 lg:px-1 lg:py-1">
        {/* Your story (Instagram-style) */}
        <button type="button"
          onClick={handleOwnRingClick}
          className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 transition-transform active:scale-95 lg:w-[66px]"
          aria-label={hasMyStory ? "View or add to your story" : "Create your story"}
        >
          <div className="relative">
            <div className={cn(
              "h-[64px] w-[64px] rounded-full p-[2.5px] box-border lg:h-14 lg:w-14",
              hasMyStory
                ? "bg-[conic-gradient(from_140deg,hsl(160_84%_45%),hsl(174_72%_45%),hsl(190_85%_55%),hsl(160_84%_45%))] shadow-[0_0_14px_-3px_hsl(160_84%_45%/0.6)]"
                : "zivo-social-nav-pill"
            )}>
              <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border-2 border-card bg-card shadow-inner">
                {myLatestStory && myLatestStory.mediaType === "image" && myLatestStory.mediaUrl ? (
                  <img
                    src={myLatestStory.mediaUrl}
                    alt="Your story"
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                ) : myLatestStory && myLatestStory.mediaType === "video" && myLatestStory.mediaUrl ? (
                  <video
                    src={myLatestStory.mediaUrl}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
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
            <div className="absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-[2.5px] border-card bg-gradient-to-br from-[hsl(160_84%_45%)] to-[hsl(174_72%_40%)] shadow-[0_2px_10px_-1px_hsl(160_84%_45%/0.75)] lg:h-5 lg:w-5">
              {hasMyStory ? (
                <Sparkles className="h-3 w-3 text-white" strokeWidth={2.5} />
              ) : (
                <Plus className="h-3 w-3 text-white" strokeWidth={3} />
              )}
            </div>
            <span className="zivo-social-chip absolute -left-1 -top-1 rounded-full px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-primary">
              {hasMyStory ? "Live" : "Add"}
            </span>
          </div>
          <span className="max-w-[72px] truncate text-[11px] font-bold text-foreground lg:max-w-[62px] lg:text-[10px]">
            Your story
          </span>
        </button>

        {totalStoryCount > 0 && (
          <div
            className="zivo-social-module-tile flex w-[132px] shrink-0 flex-col justify-center rounded-2xl px-3 py-2 text-left lg:w-[118px]"
            aria-label={`${unseenStoryCount} unseen ${unseenStoryCount === 1 ? "story" : "stories"} across ${otherGroups.length} creators. ${freshStoryCount} fresh this hour.`}
          >
            <span className="mb-1 flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-primary">
              <Radio className="h-3 w-3" aria-hidden="true" />
              Story radar
            </span>
            <span className="text-sm font-black leading-none text-foreground lg:text-xs">
              {radarStatus}
            </span>
            <span className="mt-1 truncate text-[10px] font-bold text-muted-foreground">
              {totalStoryCount} live {totalStoryCount === 1 ? "moment" : "moments"}
            </span>
            <span className="mt-2 grid grid-cols-2 gap-1.5">
              <span className="zivo-social-chip flex items-center gap-1 rounded-full px-1.5 py-1 text-[9px] font-black text-muted-foreground">
                <Clock3 className="h-2.5 w-2.5 text-primary" aria-hidden="true" />
                {freshStoryCount} fresh
              </span>
              <span className="zivo-social-chip flex items-center gap-1 rounded-full px-1.5 py-1 text-[9px] font-black text-muted-foreground">
                <ShieldCheck className="h-2.5 w-2.5 text-emerald-500" aria-hidden="true" />
                {otherGroups.length} people
              </span>
            </span>
          </div>
        )}

        {/* Empty hint — when nobody you follow has posted a story today */}
        {otherGroups.length === 0 && (
          <a
            href="/explore"
            className="group flex w-[92px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 text-center transition-transform active:scale-95 lg:w-[76px]"
            aria-label="Find creators with stories"
          >
            <div className="zivo-social-nav-pill relative flex h-[64px] w-[64px] items-center justify-center rounded-full p-[2.5px] transition-transform group-hover:-translate-y-0.5 lg:h-14 lg:w-14">
              <div className="flex h-full w-full items-center justify-center rounded-full bg-card text-primary">
                <UserRoundPlus className="h-5 w-5" strokeWidth={2.25} />
              </div>
            </div>
            <span className="max-w-[82px] text-[11px] font-bold leading-tight text-primary lg:max-w-[68px] lg:text-[10px]">
              Find stories
            </span>
          </a>
        )}

        {/* Other users' stories */}
        {otherGroups.map((g) => {
          const hasUnviewed = groupHasUnviewed(g);
          const storyCount = g.stories.length;
          return (
            <button type="button"
              key={g.userId}
              className="group flex w-[76px] shrink-0 flex-col items-center gap-1.5 rounded-2xl px-1 py-1 transition-transform active:scale-95 lg:w-[66px]"
              onClick={() => handleRingClick(g)}
              aria-label={`${g.userName}'s ${storyCount === 1 ? "story" : `${storyCount} stories`}${hasUnviewed ? ", new" : ""}`}
            >
              <div className={cn(
                "relative h-[64px] w-[64px] rounded-full p-[2.5px] lg:h-14 lg:w-14",
                hasUnviewed
                  ? "bg-[conic-gradient(from_140deg,hsl(160_84%_45%),hsl(174_72%_45%),hsl(190_85%_55%),hsl(160_84%_45%))] shadow-[0_0_12px_-3px_hsl(160_84%_45%/0.55)]"
                  : "zivo-social-nav-pill"
              )}>
                <div className="h-full w-full overflow-hidden rounded-full border-2 border-card bg-card shadow-inner">
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
                {hasUnviewed && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.08em] text-primary-foreground shadow-lg">
                    New
                  </span>
                )}
                {storyCount > 1 && (
                  <span className="absolute -bottom-1 -left-1 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-card bg-card px-1 text-[8px] font-black text-primary shadow-lg">
                    {storyCount}
                  </span>
                )}
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
        <SheetContent side="bottom" className="zivo-social-sheet-panel rounded-t-[1.5rem] border-0 pb-[var(--zivo-safe-bottom,16px)]">
          <SheetHeader>
            <SheetTitle className="text-left text-base font-extrabold">Your story</SheetTitle>
          </SheetHeader>
          <div className="flex flex-col gap-2 pt-3">
            <button type="button"
              className="zivo-social-sheet-row flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition active:scale-[0.99]"
              onClick={() => {
                haptic("light");
                setShowOwnSheet(false);
                if (myGroup) handleRingClick(myGroup);
              }}
            >
              <span className="zivo-social-share-orb flex h-9 w-9 items-center justify-center rounded-2xl text-primary">
                <Eye className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-bold text-foreground">View your story</span>
                <span className="block truncate text-xs font-medium text-muted-foreground">Open your latest story moments</span>
              </span>
            </button>
            <button type="button"
              className="zivo-social-chip-active flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-extrabold transition active:scale-[0.99]"
              onClick={() => {
                haptic("medium");
                setShowOwnSheet(false);
                setShowCreate(true);
              }}
            >
              <Plus className="h-4 w-4" />
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
