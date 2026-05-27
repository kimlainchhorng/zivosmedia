/**
 * SoundPage — TikTok-style sound page showing all reels using a specific audio
 * Users can browse reels with this sound and "Use this sound" for their own posts
 */
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { normalizeStorePostMediaUrl } from "@/utils/normalizeStorePostMediaUrl";
import { ArrowLeft, Play, Music, Grid3X3, Users, Eye } from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import CreatePostModal from "@/components/social/CreatePostModal";
import { Helmet } from "react-helmet-async";
import VerifiedBadge from "@/components/VerifiedBadge";
import { isBlueVerified } from "@/lib/verification";

/** Convert a URL slug like "midnight-drive" into "Midnight Drive" */
function humanizeSlug(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Known ZIVO Session tracks — maps slug → metadata for enriched display */
const KNOWN_TRACKS: Record<string, { title: string; artist: string; genre: string; duration: string }> = {
  "midnight-drive": { title: "Midnight Drive", artist: "Zivo Sessions", genre: "Chill", duration: "3:20" },
  "city-lights": { title: "City Lights", artist: "Zivo Sessions", genre: "Lo-fi", duration: "3:23" },
  "ocean-ride": { title: "Ocean Ride", artist: "Zivo Sessions", genre: "Ambient", duration: "2:21" },
  "sunset-loop": { title: "Sunset Loop", artist: "Zivo Sessions", genre: "Beats", duration: "2:47" },
  "neon-streets": { title: "Neon Streets", artist: "Zivo Sessions", genre: "Synth", duration: "4:01" },
  "golden-hour": { title: "Golden Hour", artist: "Zivo Sessions", genre: "Pop", duration: "3:45" },
  "night-runner": { title: "Night Runner", artist: "Zivo Sessions", genre: "Electronic", duration: "3:55" },
  "coastal-breeze": { title: "Coastal Breeze", artist: "Zivo Sessions", genre: "Tropical", duration: "2:38" },
};

export default function SoundPage() {
  const { soundName } = useParams<{ soundName: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const slug = soundName || "";
  const knownTrack = KNOWN_TRACKS[slug];
  const displayName = knownTrack?.title || humanizeSlug(slug);
  const artistName = knownTrack?.artist || "Original Sound";
  const [showCreatePost, setShowCreatePost] = useState(false);

  // Search by both humanized name and raw slug to find matches
  const searchTerms = useMemo(() => {
    const terms = new Set<string>();
    terms.add(displayName);
    terms.add(slug);
    terms.add(decodeURIComponent(slug));
    if (knownTrack) terms.add(knownTrack.title);
    return Array.from(terms);
  }, [displayName, slug, knownTrack]);

  // Fetch all posts with matching audio_name
  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["sound-reels", slug],
    queryFn: async () => {
      const db = supabase as any;
      const allStorePosts: any[] = [];
      const allUserPosts: any[] = [];

      // Search with each possible name variant
      for (const term of searchTerms) {
        const { data: storePosts } = await db
          .from("store_posts")
          .select("id, store_id, caption, media_urls, media_type, created_at, audio_name, view_count, store_profiles(name, logo_url, slug, is_verified)")
          .eq("is_published", true)
          .eq("audio_name", term)
          .order("created_at", { ascending: false })
          .limit(50);
        if (storePosts) allStorePosts.push(...storePosts);

        const { data: userPosts } = await db
          .from("user_posts")
          .select("id, user_id, caption, media_urls, media_type, created_at, audio_name, profiles(full_name, avatar_url, is_verified)")
          .eq("audio_name", term)
          .order("created_at", { ascending: false })
          .limit(50);
        if (userPosts) allUserPosts.push(...userPosts);
      }

      // Deduplicate by id
      const seenIds = new Set<string>();
      const storeResults = allStorePosts
        .filter((p: any) => { if (seenIds.has(p.id)) return false; seenIds.add(p.id); return true; })
        .map((p: any) => ({
          id: p.id,
          caption: p.caption,
          media_urls: p.media_urls || [],
          media_type: p.media_type,
          created_at: p.created_at,
          view_count: p.view_count || 0,
          author_name: p.store_profiles?.name || "Shop",
          author_avatar: p.store_profiles?.logo_url,
          author_is_verified: p.store_profiles?.is_verified === true,
          type: "store" as const,
        }));

      const userResults = allUserPosts
        .filter((p: any) => { if (seenIds.has(p.id)) return false; seenIds.add(p.id); return true; })
        .map((p: any) => ({
          id: p.id,
          caption: p.caption,
          media_urls: p.media_urls || [],
          media_type: p.media_type,
          created_at: p.created_at,
          view_count: 0,
          author_name: p.profiles?.full_name || "User",
          author_avatar: p.profiles?.avatar_url,
          author_is_verified: p.profiles?.is_verified === true,
          type: "user" as const,
        }));

      return [...storeResults, ...userResults].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!slug,
  });

  const totalViews = posts.reduce((sum, p) => sum + (p.view_count || 0), 0);

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>{displayName} | Zivo</title>
        <meta name="description" content={`Listen to ${displayName} by ${artistName} on Zivo`} />
      </Helmet>
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-40 bg-background/95 backdrop-blur border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-1.5 rounded-full hover:bg-muted/50">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-ig-gradient truncate">{displayName}</h1>
            <p className="text-xs text-muted-foreground">
              {posts.length} reel{posts.length !== 1 ? "s" : ""} • {totalViews > 1000 ? `${(totalViews / 1000).toFixed(1)}K` : totalViews} views
            </p>
          </div>
        </div>
      </div>

      {/* Sound info card */}
      <div className="px-4 py-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center animate-[spin_3s_linear_infinite]">
            <svg viewBox="0 0 24 24" className="w-8 h-8 fill-primary">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{artistName}</p>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {posts.length} reel{posts.length !== 1 ? "s" : ""}
              </span>
              {knownTrack && (
                <>
                  <span className="px-1.5 py-0.5 rounded-full bg-muted/50">{knownTrack.genre}</span>
                  <span>{knownTrack.duration}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Use this sound button */}
        {user && (
          <button type="button"
            onClick={() => setShowCreatePost(true)}
            className="mt-4 w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          >
            <Music className="h-4 w-4" />
            Use this sound
          </button>
        )}
      </div>

      {/* Grid of reels */}
      <div className="px-1 pb-24">
        <div className="flex items-center gap-2 px-3 pb-3">
          <Grid3X3 className="h-4 w-4 text-foreground" />
          <span className="text-sm font-semibold text-foreground">Reels</span>
        </div>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No reels found with this sound
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-0.5">
            {posts.map((post) => {
              const thumb = (post.media_urls || []).map((u: string) => normalizeStorePostMediaUrl(u)).filter(Boolean)[0];
              return (
                <button type="button"
                  key={post.id}
                  onClick={() => navigate(`/reels/${post.id}`)}
                  className="relative aspect-[9/16] bg-muted overflow-hidden group"
                >
                  {thumb && post.media_type === "video" ? (
                    <video
                      src={thumb}
                      muted
                      preload="metadata"
                      className="w-full h-full object-cover"
                    />
                  ) : thumb ? (
                    <img src={thumb} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Music className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                    <Play className="h-6 w-6 text-white opacity-0 group-hover:opacity-80 transition-opacity fill-white" />
                  </div>
                  {post.view_count > 0 && (
                    <div className="absolute bottom-1 left-1 flex items-center gap-0.5 text-white text-[10px] font-medium drop-shadow">
                      <Play className="h-2.5 w-2.5 fill-white" />
                      {post.view_count > 1000 ? `${(post.view_count / 1000).toFixed(1)}K` : post.view_count}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Create post modal with pre-filled audio */}
      {showCreatePost && user && (
        <CreatePostModal
          userId={user.id}
          userProfile={null}
          onClose={() => setShowCreatePost(false)}
          onCreated={() => {
            setShowCreatePost(false);
          }}
          initialAudioName={displayName}
        />
      )}
    </div>
  );
}
