/**
 * MediaLibraryPage — Your media library.
 * Instagram-style 3-column grid of all posts the signed-in user has created.
 * Backed by the `user_posts` table.
 */
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Image as ImageIcon, Film, Plus, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface UserPostRow {
  id: string;
  caption: string | null;
  media_url: string | null;
  media_urls: string[] | null;
  media_type: string;
  created_at: string | null;
}

function firstMediaUrl(post: UserPostRow): string | null {
  if (post.media_url) return post.media_url;
  if (post.media_urls && post.media_urls.length > 0) return post.media_urls[0];
  return null;
}

export default function MediaLibraryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["media-library", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as UserPostRow[];
      const { data, error } = await (supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: UserPostRow[] | null; error: unknown }>;
            };
          };
        };
      })
        .from("user_posts")
        .select("id, caption, media_url, media_urls, media_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const photoCount = posts.filter((p) => !p.media_type?.startsWith("video")).length;
  const videoCount = posts.filter((p) => p.media_type?.startsWith("video")).length;

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Your Media Library · ZIVO" description="All your photos and videos in one place." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Camera className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Media Library</h1>
          </div>
          <Button
            size="sm"
            onClick={() => navigate("/feed/new")}
            className="bg-ig-gradient text-white font-bold rounded-full h-9 px-3 hover:opacity-90 border-0"
          >
            <Plus className="h-4 w-4 mr-1" strokeWidth={3} />
            New
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto">
        {/* Counts row */}
        {!isLoading && posts.length > 0 && (
          <div className="flex items-center justify-around px-4 py-3 border-b border-border/40">
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{posts.length}</p>
              <p className="text-[11px] text-muted-foreground">posts</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{photoCount}</p>
              <p className="text-[11px] text-muted-foreground">photos</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-foreground">{videoCount}</p>
              <p className="text-[11px] text-muted-foreground">videos</p>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 p-[2px] sm:p-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && posts.length === 0 && (
          <div className="flex flex-col items-center justify-center px-6 py-20 text-center">
            <div className="h-20 w-20 rounded-3xl bg-ig-gradient flex items-center justify-center mb-5 shadow-lg shadow-rose-500/20">
              <Camera className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">No media yet</h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-xs">
              Share a photo or video and it will show up here for you to manage.
            </p>
            <Button
              onClick={() => navigate("/feed/new")}
              className="bg-ig-gradient text-white font-bold rounded-full h-11 px-6 hover:opacity-90 border-0 shadow-md"
            >
              <Plus className="h-4 w-4 mr-1.5" strokeWidth={3} />
              Share your first post
            </Button>
          </div>
        )}

        {!isLoading && posts.length > 0 && (
          <div className="grid grid-cols-3 gap-[2px] sm:gap-1 p-[2px] sm:p-1">
            {posts.map((post, idx) => {
              const url = firstMediaUrl(post);
              const isVideo = post.media_type?.startsWith("video");
              const multipleMedia = (post.media_urls?.length ?? 0) > 1;
              return (
                <motion.button
                  key={post.id}
                  type="button"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(idx, 12) * 0.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate("/feed")}
                  className="relative aspect-square bg-muted overflow-hidden active:opacity-80 transition-opacity"
                  aria-label={`Open post${post.caption ? `: ${post.caption.slice(0, 40)}` : ""}`}
                >
                  {url ? (
                    isVideo ? (
                      <video
                        src={url}
                        className="w-full h-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <img
                        src={url}
                        alt={post.caption ?? "Post media"}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    )
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <ImageIcon className="h-5 w-5 text-muted-foreground" />
                    </div>
                  )}
                  {isVideo && (
                    <Film className="absolute top-2 right-2 h-4 w-4 text-white drop-shadow-md" />
                  )}
                  {multipleMedia && !isVideo && (
                    <div className="absolute top-2 right-2 h-4 w-4 rounded-sm bg-black/40 backdrop-blur-sm flex items-center justify-center">
                      <span className="text-[9px] text-white font-bold">
                        {post.media_urls!.length}
                      </span>
                    </div>
                  )}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
