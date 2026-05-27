/**
 * CreatorPPVStrip — horizontal scroll of a creator's published PPV posts.
 *
 * Renders on PublicProfilePage so visitors can discover & unlock PPV content.
 * Each card links to /ppv?post=<id> where PPVPostDetail handles the unlock.
 */
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { signedUrlFor } from "@/lib/security/signedMedia";
import { Lock, Flame, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { PPV_FREE_FOR_SUBS_UI_ENABLED } from "@/lib/ppv/featureFlags";

interface PPVCard {
  id: string;
  title: string;
  price_cents: number;
  preview_path: string | null;
  media_paths: string[];
  unlock_count: number;
  free_for_subscribers: boolean;
}

function PreviewThumb({ path }: { path: string | null }) {
  const { data: url } = useQuery({
    queryKey: ["ppv-preview", path],
    queryFn: () => (path ? signedUrlFor("ppv-media", path, "thumbnail") : ""),
    enabled: !!path,
    staleTime: 5 * 60 * 1000,
  });
  if (!path) {
    return (
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/30 to-pink-500/15 flex items-center justify-center">
        <Lock className="h-7 w-7 text-rose-500/70" />
      </div>
    );
  }
  if (!url) return <div className="absolute inset-0 bg-muted animate-pulse" />;
  return (
    <>
      <img src={url} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
      <div className="absolute inset-0 backdrop-blur-[2px]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Lock className="h-7 w-7 text-white drop-shadow" />
      </div>
    </>
  );
}

interface Props {
  creatorUserId: string;
  className?: string;
}

export default function CreatorPPVStrip({ creatorUserId, className }: Props) {
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["public-ppv-posts", creatorUserId],
    queryFn: async (): Promise<PPVCard[]> => {
      if (!creatorUserId) return [];
      const { data, error } = await (supabase as any)
        .from("ppv_posts")
        .select("id, title, price_cents, preview_path, media_paths, unlock_count, free_for_subscribers")
        .eq("creator_id", creatorUserId)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) return [];
      return (data as PPVCard[]) ?? [];
    },
    enabled: !!creatorUserId,
    staleTime: 30 * 1000,
  });

  if (isLoading || posts.length === 0) return null;

  return (
    <div className={cn("max-w-3xl mx-auto px-4 mt-4", className)}>
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-extrabold flex items-center gap-1.5">
          <Flame className="h-4 w-4 text-rose-500" />
          Locked Content
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
            {posts.length}
          </span>
        </h3>
        {posts.length > 4 && (
          <span className="text-[10px] text-muted-foreground inline-flex items-center gap-0.5">
            Scroll <ChevronRight className="h-3 w-3" />
          </span>
        )}
      </div>
      <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-none">
        {posts.map((post) => (
          <Link
            key={post.id}
            to={`/ppv?post=${post.id}`}
            className="snap-start shrink-0 w-32 group"
          >
            <div className="relative aspect-[3/4] rounded-xl overflow-hidden border border-rose-500/20 bg-muted">
              {/* Only fall back to the lock-icon placeholder when no preview is
                  set — media_paths[0] is gated by RLS for non-owners, so the
                  signed URL comes back empty and would otherwise leave the
                  card stuck on a pulsing skeleton. */}
              <PreviewThumb path={post.preview_path || null} />
              {PPV_FREE_FOR_SUBS_UI_ENABLED && post.free_for_subscribers && (
                <span className="absolute top-1.5 right-1.5 inline-flex items-center gap-0.5 text-[8px] font-extrabold uppercase tracking-wide bg-amber-500 text-white rounded-full px-1.5 py-0.5">
                  Subs free
                </span>
              )}
              <div className="absolute bottom-0 inset-x-0 p-2">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-[11px] font-extrabold text-white drop-shadow">
                    ${(post.price_cents / 100).toFixed(2)}
                  </span>
                  {post.unlock_count > 0 && (
                    <span className="text-[9px] font-bold text-white/90 bg-black/40 backdrop-blur px-1.5 py-0.5 rounded-full">
                      {post.unlock_count} 🔓
                    </span>
                  )}
                </div>
              </div>
            </div>
            <p className="text-[11px] font-semibold mt-1.5 line-clamp-2 leading-tight">
              {post.title}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
