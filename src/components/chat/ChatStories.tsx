/**
 * ChatStories — Stories row for the Chat hub.
 * Uses the shared `StoryViewer` for the fullscreen viewer experience and the
 * shared `CreateStorySheet` (same premium bottom sheet used on Profile/Feed)
 * for the "Add story" flow — so Chat no longer pops the floating top-left
 * native iOS file chooser.
 */
import { lazy, Suspense, useState } from "react";
import Plus from "lucide-react/dist/esm/icons/plus";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Camera from "lucide-react/dist/esm/icons/camera";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import StoryViewer from "@/components/stories/StoryViewer";
import type { StoryGroup } from "@/components/stories/StoryViewer";
import StoryTextTile from "@/components/stories/StoryTextTile";
import { useStoryDeepLink, useStoryViewerLocation } from "@/hooks/useStoryDeepLink";
import { invalidateAllStoryCaches } from "@/lib/storiesCache";
import { useUserProfile } from "@/hooks/useUserProfile";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import { isStorySafetySchemaDriftError } from "@/lib/social/sensitiveContent";

const CreateStorySheet = lazy(() => import("@/components/profile/CreateStorySheet"));

interface StoryRow {
  id: string;
  user_id: string;
  media_url: string | null;
  media_type: "image" | "video" | "text" | string;
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

interface StoryProfileRow {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export default function ChatStories() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const { activeStoryId, openStory, closeStory, updateStory } = useStoryDeepLink({ source: "chat" });
  const { data: myProfile } = useUserProfile();

  const { data: storyGroups = [] } = useQuery({
    queryKey: ["user-stories"],
    enabled: !!user,
    refetchInterval: 60000,
    queryFn: async () => {
      const selectBase = "id, user_id, media_url, media_type, text_overlay, audio_url, created_at, expires_at, view_count";
      const selectWithSafety = `${selectBase}, is_sensitive, sensitive_reason, hidden_at, hidden_reason, sensitive_report_count`;
      const queryStories = (select: string, includeHiddenFilter: boolean) => {
        let query = (supabase as any)
          .from("stories" as any)
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

      const stories = ((data ?? []) as StoryRow[]).filter((story) => !story.hidden_at);
      if (stories.length === 0) return [];

      const userIds = [...new Set(stories.map((s) => s.user_id))];
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", userIds);

      const profileRows = (profiles ?? []) as StoryProfileRow[];
      const profileMap = new Map(profileRows.map((p) => [p.user_id, p]));

      const groups = new Map<string, StoryGroup>();
      for (const s of stories) {
        if (!groups.has(s.user_id)) {
          const profile = profileMap.get(s.user_id);
          groups.set(s.user_id, {
            userId: s.user_id,
            userName: profile?.full_name || "User",
            avatarUrl: profile?.avatar_url,
            stories: [],
          });
        }
        groups.get(s.user_id)!.stories.push({
          id: s.id,
          mediaUrl: s.media_url,
          mediaType: s.media_type,
          caption: s.text_overlay,
          audioUrl: s.audio_url,
          createdAt: s.created_at,
          viewsCount: s.view_count ?? 0,
          isSensitive: Boolean(s.is_sensitive),
          sensitiveReason: s.sensitive_reason,
          hiddenAt: s.hidden_at,
          hiddenReason: s.hidden_reason,
          sensitiveReportCount: s.sensitive_report_count ?? 0,
        });
      }

      const result = Array.from(groups.values());
      const myIdx = result.findIndex((g) => g.userId === user?.id);
      if (myIdx > 0) {
        const [mine] = result.splice(myIdx, 1);
        result.unshift(mine);
      }
      return result;
    },
  });

  const myStories = storyGroups.find((g) => g.userId === user?.id);
  const hasMyStory = !!myStories && myStories.stories.length > 0;

  const viewerLocation = useStoryViewerLocation(storyGroups, activeStoryId);

  const openViewer = (group: StoryGroup) => {
    if (group.stories.length === 0) return;
    openStory(group.stories[0].id);
  };

  return (
    <>
      {/* Stories Row — Telegram-style compact */}
      <div className="px-3 pt-2 pb-1.5">
        <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-0.5">
          {/* Your Story */}
          <button type="button"
            onClick={() => {
              if (hasMyStory) openViewer(myStories!);
              else setShowCreate(true);
            }}
            className="flex flex-col items-center gap-1 flex-shrink-0 w-[58px]"
          >
            <div className="relative">
              <div className={cn(
                "h-[54px] w-[54px] rounded-full p-[2px] box-border",
                hasMyStory
                  ? "bg-[conic-gradient(from_140deg,hsl(160_84%_45%),hsl(174_72%_45%),hsl(190_85%_55%),hsl(160_84%_45%))] shadow-[0_0_10px_-3px_hsl(160_84%_45%/0.55)]"
                  : "bg-muted-foreground/25"
              )}>
                <div className="h-full w-full rounded-full overflow-hidden border-2 border-background bg-card flex items-center justify-center">
                  {(() => {
                    const latest = myStories?.stories[myStories.stories.length - 1];
                    if (latest && latest.mediaType === "image" && latest.mediaUrl) {
	                      return <img src={latest.mediaUrl} alt="Your story" className="h-full w-full object-cover" loading="lazy" decoding="async" />;
                    }
                    if (latest && latest.mediaType === "video" && latest.mediaUrl) {
                      return <video src={latest.mediaUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />;
                    }
                    if (latest && (latest.mediaType === "text" || !latest.mediaUrl)) {
                      return <StoryTextTile text={latest.caption || ""} />;
                    }
                    const avatar = myStories?.avatarUrl || myProfile?.avatar_url;
                    if (avatar) {
	                      return <img src={optimizeAvatar(avatar, 128) || avatar} alt="Your avatar" className="w-full h-full object-cover" loading="lazy" decoding="async" />;
                    }
                    const initial = (myProfile?.full_name?.[0] || user?.email?.[0] || "").toUpperCase();
                    if (initial) {
                      return (
                        <div className="w-full h-full flex items-center justify-center bg-primary/10 text-sm font-bold text-primary">
                          {initial}
                        </div>
                      );
                    }
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10">
                        <Camera className="w-4 h-4 text-primary/60" />
                      </div>
                    );
                  })()}
                </div>
              </div>
              <span
                onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
                role="button"
                aria-label="Add story"
                className="absolute -bottom-0.5 -right-0.5 h-[18px] w-[18px] rounded-full bg-gradient-to-br from-[hsl(160_84%_45%)] to-[hsl(174_72%_40%)] flex items-center justify-center border-2 border-background shadow-[0_2px_5px_-1px_hsl(160_84%_45%/0.6)]"
              >
                {hasMyStory ? (
                  <Sparkles className="w-2.5 h-2.5 text-white" strokeWidth={2.5} />
                ) : (
                  <Plus className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                )}
              </span>
            </div>
            <span className="text-[10px] text-foreground font-medium max-w-[56px] truncate leading-tight">
              Your story
            </span>
          </button>

          {/* Other Users */}
          {storyGroups
            .filter((g) => g.userId !== user?.id)
            .map((group) => (
              <button type="button"
                key={group.userId}
                onClick={() => openViewer(group)}
                className="flex flex-col items-center gap-1 flex-shrink-0 w-[58px]"
              >
                <div className="h-[54px] w-[54px] rounded-full p-[2px] bg-[conic-gradient(from_140deg,hsl(160_84%_45%),hsl(174_72%_45%),hsl(190_85%_55%),hsl(160_84%_45%))] shadow-[0_0_10px_-3px_hsl(160_84%_45%/0.55)]">
                  <div className="w-full h-full rounded-full border-2 border-background overflow-hidden bg-muted">
                    {group.avatarUrl ? (
	                      <img src={group.avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs font-bold text-muted-foreground">
                        {group.userName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                </div>
                <span className="text-[10px] text-foreground font-semibold max-w-[56px] truncate leading-tight">
                  {group.userName.split(" ")[0]}
                </span>
              </button>
            ))}
        </div>
      </div>

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
          groups={storyGroups}
          startGroupIndex={viewerLocation.groupIndex}
          startStoryIndex={viewerLocation.storyIndex}
          onClose={(meta) => {
            closeStory(meta);
            invalidateAllStoryCaches(queryClient, user?.id);
          }}
          onStoryChange={updateStory}
          source="chat"
        />
      )}
    </>
  );
}
