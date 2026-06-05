/**
 * TrendingPage — Instagram-style social discovery surface.
 * Real database-backed queries only. Empty states stay honest when there is no data.
 */
import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import SEOHead from "@/components/SEOHead";
import VerifiedBadge from "@/components/VerifiedBadge";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { isBlueVerified } from "@/lib/verification";
import { cn } from "@/lib/utils";
import { optimizeAvatar } from "@/utils/optimizeAvatar";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Eye from "lucide-react/dist/esm/icons/eye";
import Flame from "lucide-react/dist/esm/icons/flame";
import Hash from "lucide-react/dist/esm/icons/hash";
import Heart from "lucide-react/dist/esm/icons/heart";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Play from "lucide-react/dist/esm/icons/play";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Search from "lucide-react/dist/esm/icons/search";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import Users from "lucide-react/dist/esm/icons/users";

type Tab = "posts" | "hashtags" | "people" | "communities";
type TrendPost = {
  id: string;
  rawId: string;
  caption: string | null;
  media_urls: string[];
  thumbnail_url?: string | null;
  media_type: string | null;
  likes_count: number;
  comments_count: number;
  views_count: number;
  created_at: string;
  author_name: string;
  author_avatar: string | null;
  author_id: string;
  is_verified: boolean | null;
  source: "user" | "store";
};
type TrendTag = { tag: string; count: number; likes: number };
type TrendPerson = { id: string; user_id?: string | null; full_name: string | null; avatar_url: string | null; bio: string | null; is_verified: boolean | null; follower_count?: number | null; posts_count?: number | null };
type TrendCommunity = { id: string; name: string; description: string | null; avatar_url: string | null; member_count: number | null; is_verified: boolean | null; category: string | null };

const tabMeta: { id: Tab; label: string; icon: typeof Flame }[] = [
  { id: "posts", label: "Posts", icon: Flame },
  { id: "hashtags", label: "Hashtags", icon: Hash },
  { id: "people", label: "People", icon: Users },
  { id: "communities", label: "Communities", icon: Users },
];

const EMPTY_POSTS: TrendPost[] = [];
const EMPTY_TAGS: TrendTag[] = [];
const EMPTY_PEOPLE: TrendPerson[] = [];
const EMPTY_COMMUNITIES: TrendCommunity[] = [];

function extractHashtags(caption: string | null): string[] {
  if (!caption) return [];
  return (caption.match(/#[\w一-鿿؀-ۿ]+/g) || []).map((tag) => tag.toLowerCase());
}

function formatCompact(n: number | null | undefined): string {
  const value = Number(n || 0);
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return value.toLocaleString();
}

function trendScore(posts: TrendPost[], tags: TrendTag[]) {
  const likes = posts.reduce((sum, post) => sum + post.likes_count, 0);
  const views = posts.reduce((sum, post) => sum + post.views_count, 0);
  const tagHeat = tags.reduce((sum, tag) => sum + tag.count, 0);
  return Math.min(99, Math.round((posts.length * 4) + (likes / 900) + (views / 18000) + (tagHeat / 1200)));
}

function topicGradient(index: number) {
  const gradients = [
    "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.95), transparent 26%), linear-gradient(135deg,#ff7a18,#ff2d78 52%,#7c3aed)",
    "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.95), transparent 26%), linear-gradient(135deg,#06b6d4,#2563eb 48%,#7c3aed)",
    "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.95), transparent 26%), linear-gradient(135deg,#10b981,#22c55e 42%,#f59e0b)",
    "radial-gradient(circle at 25% 15%, rgba(255,255,255,0.95), transparent 26%), linear-gradient(135deg,#f97316,#ef4444 45%,#db2777)",
  ];
  return gradients[index % gradients.length];
}

function isVideoUrl(url: string | null | undefined) {
  return Boolean(url && /\.(mp4|mov|m4v|webm)(\?|#|$)/i.test(url));
}

function normalizePost(row: any, source: "user" | "store"): TrendPost {
  if (row.source === "user" || row.source === "store") {
    return {
      id: row.id,
      rawId: row.raw_id,
      caption: row.caption || "",
      media_urls: Array.isArray(row.media_urls) ? row.media_urls.filter(Boolean) : [],
      thumbnail_url: row.thumbnail_url || null,
      media_type: row.media_type || null,
      likes_count: row.likes_count || 0,
      comments_count: row.comments_count || 0,
      views_count: row.views_count || 0,
      created_at: row.created_at || new Date().toISOString(),
      author_name: row.author_name || (row.source === "user" ? "Creator" : "Business"),
      author_avatar: row.author_avatar || null,
      author_id: row.author_id,
      is_verified: row.is_verified ?? false,
      source: row.source,
    };
  }

  const profile = source === "user" ? row.profiles : row.store_profiles;
  return {
    id: `${source[0]}-${row.id}`,
    rawId: row.id,
    caption: row.caption || "",
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    thumbnail_url: row.thumbnail_url || null,
    media_type: row.media_type || null,
    likes_count: row.likes_count || 0,
    comments_count: row.comments_count || 0,
    views_count: row.views_count || row.view_count || 0,
    created_at: row.created_at,
    author_name: source === "user" ? profile?.full_name || "Creator" : profile?.name || "Business",
    author_avatar: source === "user" ? profile?.avatar_url || null : profile?.logo_url || null,
    author_id: source === "user" ? row.user_id : row.store_id,
    is_verified: source === "user" ? profile?.is_verified ?? null : profile?.is_verified ?? false,
    source,
  };
}

async function getTrendingPostsFromTables(): Promise<TrendPost[]> {
  const { data, error } = await (supabase as any)
    .from("store_posts")
    .select("id, caption, media_urls, thumbnail_url, media_type, likes_count, comments_count, view_count, created_at, store_id, store_profiles:store_profiles(name, logo_url, is_verified)")
    .eq("is_published", true)
    .order("likes_count", { ascending: false })
    .limit(40);
  if (error) throw error;
  return (data || []).map((row: any) => normalizePost(row, "store"));
}

async function getTrendingHashtagsFromTables(): Promise<TrendTag[]> {
  const { data: storeRows, error: storeError } = await (supabase as any)
    .from("store_posts")
    .select("caption, hashtags, likes_count")
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(500);
  if (storeError) throw storeError;
  const counts: Record<string, { count: number; likes: number }> = {};
  (storeRows || []).forEach((post: any) => {
    const tags = [
      ...extractHashtags(post.caption),
      ...(Array.isArray(post.hashtags) ? post.hashtags.map((tag: string) => tag.startsWith("#") ? tag.toLowerCase() : `#${tag.toLowerCase()}`) : []),
    ];
    Array.from(new Set(tags)).forEach((tag) => {
      if (!counts[tag]) counts[tag] = { count: 0, likes: 0 };
      counts[tag].count += 1;
      counts[tag].likes += post.likes_count || 0;
    });
  });
  return Object.entries(counts)
    .map(([tag, value]) => ({ tag, ...value }))
    .sort((a, b) => (b.count * 10 + b.likes) - (a.count * 10 + a.likes))
    .slice(0, 30);
}

export default function TrendingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("posts");
  const [query, setQuery] = useState("");
  const [isRetryingTrending, setIsRetryingTrending] = useState(false);

  const storePostQuery = useQuery({
    queryKey: ["trending-posts"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_trending_posts", { p_limit: 40 });
      if (!error) return (data || []).map((row: any) => normalizePost(row, row.source));
      return getTrendingPostsFromTables();
    },
    staleTime: 90_000,
    retry: 1,
    placeholderData: [],
  });

  const trendingPosts = useMemo(() => {
    const live = [...(storePostQuery.data || [])]
      .filter((post) => post.caption?.trim() || post.media_urls.length > 0)
      .sort((a, b) => (b.likes_count * 3 + b.comments_count * 6 + b.views_count / 40) - (a.likes_count * 3 + a.comments_count * 6 + a.views_count / 40))
      .slice(0, 40);
    return live;
  }, [storePostQuery.data]);

  const hashtagQuery = useQuery({
    queryKey: ["trending-hashtags-page"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_trending_hashtags", { p_limit: 30 });
      if (!error) return data || [];
      return getTrendingHashtagsFromTables();
    },
    staleTime: 3 * 60_000,
    retry: 1,
    placeholderData: [],
  });

  const peopleQuery = useQuery({
    queryKey: ["trending-people"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_trending_people", { p_limit: 30 });
      if (!error) return data || [];
      return [];
    },
    staleTime: 3 * 60_000,
    retry: 1,
    placeholderData: [],
  });

  const communityQuery = useQuery({
    queryKey: ["trending-communities"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .rpc("get_trending_communities", { p_limit: 30 });
      if (!error) return data || [];

      const { data: tableData, error: tableError } = await (supabase as any)
        .from("communities")
        .select("id, name, description, avatar_url, member_count, is_verified, category")
        .order("member_count", { ascending: false })
        .limit(30);
      if (tableError) throw tableError;
      return tableData || [];
    },
    staleTime: 3 * 60_000,
    retry: 1,
    placeholderData: [],
  });

  const hashtagCounts = hashtagQuery.data ?? EMPTY_TAGS;
  const trendingPeople = peopleQuery.data ?? EMPTY_PEOPLE;
  const communities = communityQuery.data ?? EMPTY_COMMUNITIES;
  const score = trendScore(trendingPosts, hashtagCounts);
  const totalPeople = trendingPeople.reduce((sum, person) => sum + Number(person.follower_count || 0), 0);
  const activityStats = useMemo(() => {
    const postCount = trendingPosts.length;
    const viewCount = trendingPosts.reduce((sum, post) => sum + post.views_count, 0);
    const likeCount = trendingPosts.reduce((sum, post) => sum + post.likes_count, 0);
    const communityCount = communities.reduce((sum, community) => sum + Number(community.member_count || 0), 0);
    return [
      { label: "Posts", value: formatCompact(postCount), sub: "ranked now", icon: Flame },
      { label: "Views", value: formatCompact(viewCount), sub: "live reach", icon: Eye },
      { label: "Likes", value: formatCompact(likeCount), sub: "social heat", icon: Heart },
      { label: "Groups", value: formatCompact(communityCount), sub: "members", icon: Users },
    ];
  }, [communities, trendingPosts]);
  const activeError =
    tab === "posts" ? storePostQuery.isError :
    tab === "hashtags" ? hashtagQuery.isError :
    tab === "people" ? peopleQuery.isError :
    communityQuery.isError;
  const activeLoading =
    tab === "posts" ? storePostQuery.isLoading :
    tab === "hashtags" ? hashtagQuery.isLoading :
    tab === "people" ? peopleQuery.isLoading :
    communityQuery.isLoading;

  const filteredTags = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return hashtagCounts;
    return hashtagCounts.filter((tag) => tag.tag.includes(needle.replace(/^#/, "")));
  }, [hashtagCounts, query]);

  const retryTrendingQueries = useCallback(async () => {
    if (isRetryingTrending) return;
    setIsRetryingTrending(true);
    try {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["trending-posts"] }),
        queryClient.invalidateQueries({ queryKey: ["trending-hashtags-page"] }),
        queryClient.invalidateQueries({ queryKey: ["trending-people"] }),
        queryClient.invalidateQueries({ queryKey: ["trending-communities"] }),
      ]);
    } finally {
      setIsRetryingTrending(false);
    }
  }, [isRetryingTrending, queryClient]);

  const swipeHandlers = {
    drag: "x" as const,
    dragConstraints: { left: 0, right: 0 },
    onDragEnd: (_: unknown, info: { offset: { x: number } }) => {
      if (Math.abs(info.offset.x) < 70) return;
      const index = tabMeta.findIndex((item) => item.id === tab);
      const next = info.offset.x < 0 ? Math.min(tabMeta.length - 1, index + 1) : Math.max(0, index - 1);
      setTab(tabMeta[next].id);
    },
  };

  return (
    <div className="min-h-screen bg-[#fffdfd] pb-24 text-[#111827]">
      <SEOHead title="Trending | ZIVO" description="Discover what's trending on ZIVO right now." />
      <div className="sticky top-0 z-40 safe-area-top border-b border-pink-100/70 bg-white/82 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white bg-white text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.12)] active:translate-y-0.5">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-xl bg-[linear-gradient(135deg,#ff7a18,#ff2d78,#7c3aed)] text-white shadow-[0_12px_24px_rgba(255,45,120,0.28)]">
              <TrendingUp className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-black leading-tight tracking-normal text-transparent bg-clip-text bg-[linear-gradient(135deg,#ff7a18,#ff2d78,#7c3aed)]">Trending</h1>
              <p className="truncate text-xs font-semibold text-slate-500">What is hot on ZIVO right now</p>
            </div>
          </div>
          <button type="button" aria-label="Search trends" onClick={() => setTab("hashtags")} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white bg-white text-slate-900 shadow-[0_12px_30px_rgba(15,23,42,0.12)] active:translate-y-0.5">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-3xl px-4 py-3">
        <section className="relative overflow-hidden rounded-2xl border border-pink-100 bg-[linear-gradient(135deg,#fff7fb_0%,#fff_58%,#f7f0ff_100%)] px-3 py-2.5 shadow-[0_12px_34px_rgba(236,72,153,0.11)]">
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[radial-gradient(circle_at_30%_20%,#fff_0%,#ff8a00_18%,#ff2d78_48%,#7c3aed_100%)] text-white shadow-[inset_0_6px_10px_rgba(255,255,255,0.45),0_10px_22px_rgba(168,85,247,0.22)]">
              <TrendingUp className="h-5 w-5 drop-shadow" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-2">
                <span className="shrink-0 text-[11px] font-black uppercase text-pink-600">Live</span>
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.12)]" />
                <span className="truncate text-xs font-semibold text-slate-500">Updated from backend</span>
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2">
                <span className="text-xs font-black uppercase text-slate-600">Score</span>
                <span className="text-2xl font-black leading-none text-transparent bg-clip-text bg-[linear-gradient(135deg,#ff7a18,#ff2d78,#7c3aed)]">{score}</span>
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-black text-emerald-700">Real</span>
                <span className="truncate text-xs font-bold text-slate-600">
                  {totalPeople > 0 ? `${formatCompact(totalPeople)} people` : trendingPeople.length > 0 ? `${formatCompact(trendingPeople.length)} people` : "No people trend"}
                </span>
              </div>
            </div>
            <button
              type="button"
              aria-label="Refresh trends"
              onClick={() => void retryTrendingQueries()}
              disabled={isRetryingTrending}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-[0_10px_20px_rgba(15,23,42,0.16)] transition active:translate-y-0.5 disabled:opacity-60"
            >
              <RefreshCw className={cn("h-4 w-4", isRetryingTrending && "animate-spin")} />
            </button>
          </div>
        </section>

        <section className="mt-2 grid grid-cols-4 gap-1.5" aria-label="Trending backend pulse">
          {activityStats.map(({ label, value, icon: Icon }, index) => (
            <button
              key={label}
              type="button"
              onClick={() => setTab(index === 3 ? "communities" : index === 0 ? "posts" : "hashtags")}
              className="group rounded-xl border border-pink-100 bg-white px-2 py-2 text-left shadow-[0_8px_18px_rgba(15,23,42,0.05)] transition active:translate-y-0.5"
            >
              <span className="mb-1 flex items-center justify-between">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-pink-50 text-pink-600 transition group-active:scale-95">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <ArrowUpRight className="h-3 w-3 text-slate-300" />
              </span>
              <span className="block text-base font-black leading-none text-slate-950">{value}</span>
              <span className="mt-0.5 block truncate text-[9px] font-bold uppercase text-slate-400">{label}</span>
            </button>
          ))}
        </section>

        <nav className="mt-2 flex gap-1.5 overflow-x-auto rounded-2xl border border-slate-100 bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)] scrollbar-none" aria-label="Trending sections">
          {tabMeta.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "relative flex min-w-fit flex-1 items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-black transition-all active:translate-y-0.5",
                tab === id ? "text-pink-600 shadow-[0_8px_18px_rgba(236,72,153,0.14)]" : "text-slate-500",
              )}
            >
              {tab === id && <motion.span layoutId="trending-tab-bg" className="absolute inset-0 rounded-xl bg-white shadow-[inset_0_-6px_14px_rgba(236,72,153,0.08)]" />}
              <Icon className="relative h-3.5 w-3.5" />
              <span className="relative">{label}</span>
            </button>
          ))}
        </nav>

        {activeError && (
          <DegradedDataBanner
            className="mt-3"
            message="Some live trend data could not refresh. Showing the best available rankings."
            onRetry={() => void retryTrendingQueries()}
            retryDisabled={isRetryingTrending}
            retryLabel={isRetryingTrending ? "Retrying..." : "Retry"}
            trackingContext="trending"
          />
        )}

        <section className="mt-3">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 text-base font-black text-slate-950"><Flame className="h-4 w-4 text-orange-500" /> Hot topics</h2>
            <button type="button" onClick={() => setTab("hashtags")} className="flex items-center gap-1 text-xs font-bold text-slate-500">See all <ChevronRight className="h-3.5 w-3.5" /></button>
          </div>
          <div className="flex snap-x gap-2 overflow-x-auto pb-1.5 scrollbar-none">
            {hashtagCounts.length === 0 ? (
              <div className="min-w-[190px] rounded-2xl border border-pink-100 bg-white p-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
                <span className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-pink-50 text-pink-600"><Hash className="h-4 w-4" /></span>
                <p className="text-sm font-black text-slate-950">No hashtag trends yet</p>
                <p className="mt-1 text-xs font-semibold text-slate-500">Real hashtags will appear after posts use them.</p>
              </div>
            ) : hashtagCounts.slice(0, 8).map((tag, index) => (
              <button key={tag.tag} type="button" onClick={() => navigate(`/explore?tag=${encodeURIComponent(tag.tag.replace("#", ""))}`)} className="group relative min-w-[116px] snap-start overflow-hidden rounded-2xl border border-pink-100 bg-white p-1.5 text-left shadow-[0_10px_22px_rgba(15,23,42,0.06)] active:translate-y-0.5">
                <div
                  className="grid h-12 place-items-center rounded-xl text-white shadow-[inset_0_12px_18px_rgba(255,255,255,0.22)]"
                  style={{ background: topicGradient(index) }}
                >
                  <Hash className="h-5 w-5 drop-shadow-md" />
                </div>
                <span className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-[linear-gradient(135deg,#ff7a18,#ff2d78,#7c3aed)] text-white shadow-[0_8px_16px_rgba(236,72,153,0.25)]">
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
                <p className="mt-1 truncate text-xs font-black text-slate-950">{tag.tag}</p>
                <p className="text-[11px] font-semibold text-slate-500">{formatCompact(tag.count)} posts</p>
              </button>
            ))}
          </div>
        </section>

        <motion.section className="mt-3 touch-pan-y" {...swipeHandlers}>
          <AnimatePresence mode="wait">
            {activeLoading ? (
              <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => <div key={index} className="h-36 animate-pulse rounded-[1.5rem] bg-slate-100" />)}
              </motion.div>
            ) : tab === "posts" ? (
              <PostRankList posts={trendingPosts} navigate={navigate} />
            ) : tab === "hashtags" ? (
              <HashtagRankList tags={filteredTags} query={query} setQuery={setQuery} navigate={navigate} />
            ) : tab === "people" ? (
              <PeopleRankList people={trendingPeople} navigate={navigate} />
            ) : communityQuery.isError && communities.length === 0 ? (
              <LoadFailureCard title="Communities unavailable" description="We could not load trending communities right now." onRetry={() => void retryTrendingQueries()} retryDisabled={isRetryingTrending} />
            ) : (
              <CommunityRankList communities={communities} navigate={navigate} />
            )}
          </AnimatePresence>
        </motion.section>
      </main>
    </div>
  );
}

function PostRankList({ posts, navigate }: { posts: TrendPost[]; navigate: ReturnType<typeof useNavigate> }) {
  if (posts.length === 0) return <EmptyState icon={Flame} label="No trending posts yet" />;
  return (
    <motion.div key="posts" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
      {posts.map((post, index) => {
        const mediaUrl = post.media_urls.find(Boolean) || null;
        const thumbnailUrl = post.thumbnail_url || null;
        const isVideo = post.media_type === "video" || isVideoUrl(mediaUrl);
        const imageUrl = thumbnailUrl || (!isVideo ? mediaUrl : null);
        const hasMedia = Boolean(mediaUrl || imageUrl);
        return (
          <motion.button
            key={post.id}
            type="button"
            whileTap={{ scale: 0.985 }}
            onClick={() => navigate(post.source === "user" ? `/feed?post=${post.rawId}` : `/store/${post.author_id}`)}
            className="group grid w-full grid-cols-[3.5rem_1fr] gap-3 rounded-[1.6rem] border border-slate-100 bg-white p-3 text-left shadow-[0_18px_40px_rgba(15,23,42,0.08)] sm:grid-cols-[4.25rem_10rem_1fr]"
          >
            <RankBadge index={index} />
            <div className="relative h-28 overflow-hidden rounded-[1.25rem] bg-[radial-gradient(circle_at_20%_15%,#fff7ed_0%,#fce7f3_36%,#eef2ff_100%)] shadow-[inset_0_-18px_30px_rgba(236,72,153,0.08)] sm:h-32">
              {isVideo && mediaUrl ? (
                <video
                  className="h-full w-full object-cover"
                  src={mediaUrl}
                  poster={thumbnailUrl || undefined}
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : imageUrl ? (
                <span
                  aria-hidden="true"
                  className="block h-full w-full bg-cover bg-center opacity-95"
                  style={{
                    backgroundImage: `linear-gradient(180deg,rgba(255,255,255,0.08),rgba(15,23,42,0.12)), url(${imageUrl})`,
                  }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  className="grid h-full w-full place-items-center text-white"
                  style={{ background: topicGradient(index) }}
                >
                  <Sparkles className="h-9 w-9 drop-shadow-md" />
                </span>
              )}
              <span className="absolute left-2 top-2 rounded-full bg-white/80 px-2 py-0.5 text-[9px] font-black uppercase text-pink-600 shadow-sm backdrop-blur">
                {post.source === "store" ? "Local" : "Creator"}
              </span>
              {isVideo && hasMedia && <span className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white backdrop-blur"><Play className="h-4 w-4 fill-white" /></span>}
            </div>
            <div className="col-span-2 min-w-0 sm:col-span-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <Avatar className="h-9 w-9 border-2 border-white shadow-md">
                    <AvatarImage src={optimizeAvatar(post.author_avatar, 36) || undefined} />
                    <AvatarFallback className="bg-[linear-gradient(135deg,#ff7a18,#ff2d78)] text-xs font-black text-white">{post.author_name?.[0] || "Z"}</AvatarFallback>
                  </Avatar>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1">
                      <span className="truncate text-sm font-black text-slate-950">{post.author_name}</span>
                      {isBlueVerified(post.is_verified) && <VerifiedBadge size={13} interactive={false} />}
                    </span>
                    <span className="block text-xs font-semibold text-slate-500">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}</span>
                  </span>
                </div>
                <TrendPill index={index} />
              </div>
              <p className="mt-3 line-clamp-2 text-sm font-semibold leading-5 text-slate-800">{post.caption}</p>
              <div className="mt-3 flex items-center gap-4 text-sm font-bold text-slate-500">
                <span className="flex items-center gap-1"><Heart className="h-4 w-4 text-pink-500" />{formatCompact(post.likes_count)}</span>
                <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{formatCompact(post.comments_count)}</span>
                <span className="flex items-center gap-1"><Eye className="h-4 w-4" />{formatCompact(post.views_count)}</span>
                <MoreHorizontal className="ml-auto h-5 w-5 text-slate-400" />
              </div>
            </div>
          </motion.button>
        );
      })}
    </motion.div>
  );
}

function HashtagRankList({ tags, query, setQuery, navigate }: { tags: TrendTag[]; query: string; setQuery: (value: string) => void; navigate: ReturnType<typeof useNavigate> }) {
  return (
    <motion.div key="hashtags" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search hashtags" className="h-12 w-full rounded-[1.25rem] border border-slate-100 bg-white pl-11 pr-4 text-sm font-bold outline-none shadow-[0_14px_30px_rgba(15,23,42,0.06)] focus:ring-2 focus:ring-pink-200" />
      </label>
      {tags.length === 0 ? <EmptyState icon={Hash} label="No hashtag matches" /> : tags.map((tag, index) => (
        <button key={tag.tag} type="button" onClick={() => navigate(`/explore?tag=${encodeURIComponent(tag.tag.replace("#", ""))}`)} className="flex w-full items-center gap-3 rounded-[1.45rem] border border-slate-100 bg-white p-3 text-left shadow-[0_16px_34px_rgba(15,23,42,0.07)] active:translate-y-0.5">
          <RankBadge index={index} compact />
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-pink-50 text-pink-600"><Hash className="h-6 w-6" /></span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-base font-black text-slate-950">{tag.tag}</span>
            <span className="text-xs font-semibold text-slate-500">{formatCompact(tag.count)} posts · {formatCompact(tag.likes)} likes</span>
          </span>
          <TrendPill index={index} />
        </button>
      ))}
    </motion.div>
  );
}

function PeopleRankList({ people, navigate }: { people: TrendPerson[]; navigate: ReturnType<typeof useNavigate> }) {
  if (people.length === 0) return <EmptyState icon={Users} label="No people yet" />;
  return (
    <motion.div key="people" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
      {people.map((person, index) => (
        <button key={person.id} type="button" onClick={() => navigate(`/user/${person.user_id || person.id}`)} className="flex w-full items-center gap-3 rounded-[1.45rem] border border-slate-100 bg-white p-3 text-left shadow-[0_16px_34px_rgba(15,23,42,0.07)] active:translate-y-0.5">
          <RankBadge index={index} compact />
          <Avatar className="h-14 w-14 border-2 border-white shadow-lg">
            <AvatarImage src={optimizeAvatar(person.avatar_url, 56) || undefined} />
            <AvatarFallback className="bg-[linear-gradient(135deg,#ff7a18,#ff2d78,#7c3aed)] text-lg font-black text-white">{person.full_name?.[0] || "Z"}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate text-base font-black text-slate-950">{person.full_name || "Creator"}</span>
              {isBlueVerified(person.is_verified) && <VerifiedBadge size={14} interactive={false} />}
            </span>
            <span className="block truncate text-xs font-semibold text-slate-500">{person.bio || "No bio yet"}</span>
            <span className="block text-xs font-bold text-pink-600">{formatCompact(person.follower_count)} followers · {formatCompact(person.posts_count)} posts</span>
          </span>
          <span className="rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-[0_10px_20px_rgba(15,23,42,0.18)]">Follow</span>
        </button>
      ))}
    </motion.div>
  );
}

function CommunityRankList({ communities, navigate }: { communities: TrendCommunity[]; navigate: ReturnType<typeof useNavigate> }) {
  if (communities.length === 0) return <EmptyState icon={Users} label="No communities yet" />;
  return (
    <motion.div key="communities" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="space-y-3">
      {communities.map((community, index) => (
        <button key={community.id} type="button" onClick={() => navigate(`/communities/${community.id}`)} className="flex w-full items-center gap-3 rounded-[1.45rem] border border-slate-100 bg-white p-3 text-left shadow-[0_16px_34px_rgba(15,23,42,0.07)] active:translate-y-0.5">
          <RankBadge index={index} compact />
          <Avatar className="h-14 w-14 rounded-2xl border-2 border-white shadow-lg">
            <AvatarImage src={optimizeAvatar(community.avatar_url, 56) || undefined} />
            <AvatarFallback className="rounded-2xl bg-[linear-gradient(135deg,#ff7a18,#ff2d78,#7c3aed)] text-lg font-black text-white">{community.name?.[0] || "C"}</AvatarFallback>
          </Avatar>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1">
              <span className="truncate text-base font-black text-slate-950">{community.name}</span>
              {community.is_verified && <VerifiedBadge size={14} interactive={false} />}
            </span>
            <span className="block truncate text-xs font-semibold text-slate-500">{community.description || "No description yet"}</span>
            <span className="block text-xs font-bold text-pink-600">{formatCompact(community.member_count)} members{community.category ? ` · ${community.category}` : ""}</span>
          </span>
          <ChevronRight className="h-5 w-5 text-slate-400" />
        </button>
      ))}
    </motion.div>
  );
}

function RankBadge({ index, compact = false }: { index: number; compact?: boolean }) {
  const tone = index === 0 ? "from-orange-400 to-pink-500 text-white" : index === 1 ? "from-violet-400 to-purple-600 text-white" : index === 2 ? "from-orange-200 to-rose-100 text-orange-600" : "from-white to-slate-50 text-slate-500";
  return <span className={cn("grid shrink-0 place-items-center rounded-2xl bg-gradient-to-br font-black shadow-[inset_0_-8px_16px_rgba(15,23,42,0.05),0_10px_20px_rgba(15,23,42,0.08)]", compact ? "h-11 w-11 text-base" : "h-14 w-12 text-xl", tone)}>{index + 1}</span>;
}

function TrendPill({ index }: { index: number }) {
  const label = index % 3 === 0 ? "Rising" : index % 3 === 1 ? "Hot" : "Trending";
  return <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-pink-50 px-3 py-1 text-xs font-black text-pink-600"><ArrowUpRight className="h-3.5 w-3.5" />{label}</span>;
}

function EmptyState({ icon: Icon, label }: { icon: typeof Flame; label: string }) {
  return (
    <div className="grid min-h-64 place-items-center rounded-[1.5rem] border border-slate-100 bg-white p-10 text-center shadow-[0_16px_34px_rgba(15,23,42,0.07)]">
      <span className="mb-3 grid h-16 w-16 place-items-center rounded-3xl bg-pink-50 text-pink-500"><Icon className="h-8 w-8" /></span>
      <p className="text-sm font-black text-slate-700">{label}</p>
    </div>
  );
}
