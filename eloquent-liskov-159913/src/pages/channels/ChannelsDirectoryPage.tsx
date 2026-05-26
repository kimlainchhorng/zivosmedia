import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChevronLeft, Plus, Search, Users, Megaphone, Sparkles, Check } from "lucide-react";
import { format, formatDistanceToNow, isToday } from "date-fns";
import { toast } from "sonner";
import SEOHead from "@/components/SEOHead";

type Channel = {
  id: string;
  handle: string;
  name: string;
  description: string | null;
  avatar_url: string | null;
  subscriber_count: number;
  created_at: string;
  last_post_at?: string | null;
  last_post_preview?: string | null;
};

const fallbackInitials = (name?: string | null) =>
  (name ?? "??").trim().slice(0, 2).toUpperCase() || "??";

const postPreview = (body: string | null | undefined, media: unknown): string => {
  const text = (body ?? "").trim();
  if (text) return text.replace(/\s+/g, " ");
  if (Array.isArray(media) && media.length > 0) return "Media post";
  return "No posts yet";
};

const formatListTime = (iso?: string | null): string => {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return isToday(dt) ? format(dt, "HH:mm") : format(dt, "MMM d");
};

export default function ChannelsDirectoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [subscribedIds, setSubscribedIds] = useState<Set<string>>(new Set());
  const [pendingId, setPendingId] = useState<string | null>(null);

  // Debounce search input — 250ms is the sweet spot for typing without flicker
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  // Fetch channels (and last post time per channel for "active" signals)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      let query = supabase
        .from("channels")
        .select("id, handle, name, description, avatar_url, subscriber_count, created_at")
        .eq("is_public", true)
        .order("subscriber_count", { ascending: false })
        .limit(80);
      if (debouncedQ) {
        query = query.or(`name.ilike.%${debouncedQ}%,handle.ilike.%${debouncedQ}%`);
      }
      const { data: chs } = await query;
      if (cancelled) return;
      const list = (chs ?? []) as Channel[];

      // Pull last_post_at for these channels in a single round trip
      if (list.length > 0) {
        const ids = list.map((c) => c.id);
        const { data: posts } = await (supabase as any)
          .from("channel_posts")
          .select("channel_id, published_at, body, media")
          .in("channel_id", ids)
          .not("published_at", "is", null)
          .order("published_at", { ascending: false });
        if (cancelled) return;
        const lastByChan = new Map<string, { published_at: string; preview: string }>();
        (posts ?? []).forEach((p: { channel_id: string; published_at: string; body: string | null; media: unknown }) => {
          if (!lastByChan.has(p.channel_id)) {
            lastByChan.set(p.channel_id, {
              published_at: p.published_at,
              preview: postPreview(p.body, p.media),
            });
          }
        });
        list.forEach((c) => {
          const last = lastByChan.get(c.id);
          c.last_post_at = last?.published_at ?? null;
          c.last_post_preview = last?.preview ?? null;
        });
      }

      setChannels(list);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [debouncedQ]);

  // Track which channels the user already follows so we can show the right CTA
  useEffect(() => {
    if (!user?.id) { setSubscribedIds(new Set()); return; }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("channel_subscribers")
        .select("channel_id")
        .eq("user_id", user.id);
      if (cancelled) return;
      setSubscribedIds(new Set((data ?? []).map((r: { channel_id: string }) => r.channel_id)));
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const handleToggleFollow = async (c: Channel) => {
    if (!user?.id) {
      toast.error("Sign in to follow channels");
      navigate("/auth");
      return;
    }
    if (pendingId) return;
    const isSubbed = subscribedIds.has(c.id);
    setPendingId(c.id);
    // Optimistic UI
    setSubscribedIds((prev) => {
      const next = new Set(prev);
      if (isSubbed) next.delete(c.id); else next.add(c.id);
      return next;
    });
    setChannels((prev) => prev.map((x) =>
      x.id === c.id
        ? { ...x, subscriber_count: x.subscriber_count + (isSubbed ? -1 : 1) }
        : x
    ));
    try {
      if (isSubbed) {
        const { error } = await (supabase as any)
          .from("channel_subscribers")
          .delete()
          .eq("channel_id", c.id)
          .eq("user_id", user.id);
        if (error) throw error;
        toast.success(`Unfollowed ${c.name}`);
      } else {
        const { error } = await (supabase as any)
          .from("channel_subscribers")
          .insert({ channel_id: c.id, user_id: user.id });
        if (error) throw error;
        toast.success(`Following ${c.name}`);
      }
    } catch {
      // Revert on failure
      setSubscribedIds((prev) => {
        const next = new Set(prev);
        if (isSubbed) next.add(c.id); else next.delete(c.id);
        return next;
      });
      setChannels((prev) => prev.map((x) =>
        x.id === c.id
          ? { ...x, subscriber_count: x.subscriber_count + (isSubbed ? 1 : -1) }
          : x
      ));
      toast.error("Couldn't update — try again");
    } finally {
      setPendingId(null);
    }
  };

  // Split into Trending (top by subscribers) and Recent (newest) — only when not searching
  const sections = useMemo(() => {
    if (debouncedQ) return null;
    const trending = [...channels]
      .sort((a, b) => b.subscriber_count - a.subscriber_count)
      .slice(0, 12);
    const trendingIds = new Set(trending.map((c) => c.id));
    const recent = [...channels]
      .filter((c) => !trendingIds.has(c.id))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))
      .slice(0, 24);
    return { trending, recent };
  }, [channels, debouncedQ]);

  const renderRow = (c: Channel) => {
    const isSubbed = subscribedIds.has(c.id);
    return (
      <div
        key={c.id}
        className="flex items-center gap-3 rounded-2xl border border-transparent bg-card/60 p-3 transition-colors hover:border-border/60 hover:bg-card"
      >
        <Link to={`/c/${c.handle}`} className="flex items-center gap-3 min-w-0 flex-1">
          <Avatar className="h-12 w-12">
            <AvatarImage src={c.avatar_url ?? undefined} />
            <AvatarFallback>{fallbackInitials(c.name)}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{c.name}</span>
              {isSubbed && <Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" aria-label="Following" />}
              {c.last_post_at && (
                <span className="ml-auto text-[11px] text-muted-foreground/80 shrink-0">{formatListTime(c.last_post_at)}</span>
              )}
            </div>
            <div className="line-clamp-1 text-sm text-muted-foreground mt-0.5">
              {c.last_post_preview ?? c.description ?? "No posts yet"}
            </div>
            <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground/80">
              <span className="truncate">@{c.handle}</span>
              <span className="inline-flex items-center gap-0.5 shrink-0">
                <Users className="h-3 w-3" /> {c.subscriber_count.toLocaleString()}
              </span>
              {c.last_post_at && (
                <span className="truncate text-muted-foreground/70">
                  active {formatDistanceToNow(new Date(c.last_post_at), { addSuffix: true })}
                </span>
              )}
            </div>
            {c.description && !c.last_post_preview && (
              <div className="line-clamp-1 text-xs text-muted-foreground/75 mt-0.5">{c.description}</div>
            )}
          </div>
        </Link>
        <Button
          size="sm"
          variant={isSubbed ? "ghost" : "default"}
          disabled={pendingId === c.id}
          onClick={() => handleToggleFollow(c)}
          className="shrink-0 min-w-[72px]"
        >
          {pendingId === c.id ? "..." : isSubbed ? "Joined" : "Join"}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Channels – ZIVO | Follow Topics & Communities"
        description="Browse and join channels on ZIVO. Follow your interests in travel, tech, food, wellness, and more."
        canonical="/channels"
      />
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button"
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/feed"))}
          className="p-2 -ml-2 rounded-full hover:bg-muted"
          aria-label="Back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1 inline-flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" /> Channels
        </h1>
        <Button asChild size="sm" className="gap-1">
          <Link to="/channels/new"><Plus className="h-4 w-4" /> New</Link>
        </Button>
      </header>

      <div className="mx-auto max-w-2xl p-4">
        <div className="relative mb-4">
          <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search channels by name or handle"
            className="pl-9"
          />
        </div>

        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
                <div className="h-12 w-12 rounded-full bg-muted animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
                  <div className="h-2 w-1/3 bg-muted/70 rounded animate-pulse" />
                </div>
                <div className="h-8 w-20 rounded-md bg-muted animate-pulse" />
              </div>
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border p-8 text-center">
            <Megaphone className="h-8 w-8 mx-auto mb-2 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No channels found</p>
            <p className="text-xs text-muted-foreground mt-1">
              {debouncedQ ? "Try a different search." : "Be the first to start a channel."}
            </p>
            {!debouncedQ && (
              <Button asChild size="sm" className="gap-1 mt-4">
                <Link to="/channels/new"><Plus className="h-4 w-4" /> Create channel</Link>
              </Button>
            )}
          </div>
        ) : sections ? (
          <div className="space-y-6">
            {sections.trending.length > 0 && (
              <section>
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Trending</h2>
                </div>
                <div className="space-y-2">
                  {sections.trending.map(renderRow)}
                </div>
              </section>
            )}
            {sections.recent.length > 0 && (
              <section>
                <div className="flex items-center gap-1.5 px-1 mb-2">
                  <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Newly created</h2>
                </div>
                <div className="space-y-2">
                  {sections.recent.map(renderRow)}
                </div>
              </section>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map(renderRow)}
          </div>
        )}
      </div>
    </div>
  );
}
