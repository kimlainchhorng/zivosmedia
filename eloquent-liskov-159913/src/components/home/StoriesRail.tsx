/**
 * StoriesRail — Instagram-style horizontal stories carousel for Home.
 *
 * Renders the user's "Your story" entry first (with a `+` add affordance)
 * followed by the latest unexpired story per followed user. Unwatched
 * stories show the IG gradient ring; watched ones fall back to a hairline
 * gray ring. When there are no real stories from followed users, only
 * "Your story" is shown — no placeholder faces.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import Plus from "lucide-react/dist/esm/icons/plus";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useStoriesFeed } from "@/hooks/useStoriesFeed";
import { cn } from "@/lib/utils";

export default function StoriesRail() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: profile } = useUserProfile();
  const { data: stories = [], isLoading } = useStoriesFeed();

  // Local optimistic-watch overlay so a tap immediately desaturates the ring,
  // even before the story_views write round-trips.
  const [locallyWatched, setLocallyWatched] = useState<Set<string>>(new Set());
  const initialWatched = useMemo(
    () => new Set(stories.filter(s => s.watched).map(s => s.id)),
    [stories],
  );

  const yourInitial = (profile?.full_name?.[0] || user?.email?.[0] || "Z").toUpperCase();
  const yourName = profile?.full_name?.split(" ")[0] || "Your story";

  // For guests, the rail has nothing to show — skip rendering entirely so we
  // don't leave a "Your story" tile that routes to an auth-gated page.
  if (!user && stories.length === 0 && !isLoading) {
    return null;
  }

  // Hide the rail's bottom border when there's nothing but "Your story" — keeps
  // the home screen clean instead of leaving an orphan divider.
  const hasOthers = stories.length > 0 || isLoading;

  return (
    <div className={cn(hasOthers && "border-b border-border")}>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-3">
        {/* "Your story" — only shown to signed-in users (tile routes to auth-only /feed/new) */}
        {user && (
          <button
            type="button"
            onClick={() => navigate("/feed/new")}
            className="shrink-0 flex flex-col items-center gap-1 touch-manipulation active:opacity-70 transition-opacity"
          >
            <div className="relative">
              <Avatar className="h-[62px] w-[62px] border border-border">
                <AvatarImage src={profile?.avatar_url || undefined} alt={yourName} />
                <AvatarFallback className="bg-muted text-foreground text-base font-semibold">
                  {yourInitial}
                </AvatarFallback>
              </Avatar>
              <span
                aria-hidden
                className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center ring-2 ring-background"
              >
                <Plus className="w-3 h-3" strokeWidth={3} />
              </span>
            </div>
            <span className="text-[11px] text-foreground leading-none max-w-[64px] truncate">
              Your story
            </span>
          </button>
        )}

        {stories.map(s => {
          const seen = initialWatched.has(s.id) || locallyWatched.has(s.id);
          return (
            <motion.button
              key={s.id}
              type="button"
              whileTap={{ scale: 0.94 }}
              onClick={() => {
                setLocallyWatched(w => {
                  if (w.has(s.id)) return w;
                  const next = new Set(w);
                  next.add(s.id);
                  return next;
                });
                navigate(`/stories/${s.id}`);
              }}
              className="shrink-0 flex flex-col items-center gap-1 touch-manipulation"
              aria-label={`Open ${s.name}'s story`}
            >
              <span
                className={cn(
                  "rounded-full p-[2px]",
                  seen ? "bg-border" : "bg-ig-gradient",
                )}
              >
                <span className="block rounded-full p-[2px] bg-background">
                  <Avatar className="h-[58px] w-[58px]">
                    <AvatarImage src={s.avatarUrl} alt={s.name} />
                    <AvatarFallback className="bg-muted text-foreground text-sm font-semibold">
                      {s.name[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </span>
              </span>
              <span
                className={cn(
                  "text-[11px] leading-none max-w-[64px] truncate",
                  seen ? "text-muted-foreground" : "text-foreground",
                )}
              >
                {s.name}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
