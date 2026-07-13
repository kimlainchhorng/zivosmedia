import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Search, User, ShoppingBag, Hash, FileText, TrendingUp, X, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SEOHead from "@/components/SEOHead";
import { EmptyState as SharedEmptyState } from "@/components/ui/empty-state";

interface UserResult { id: string; name: string; username: string | null; bio: string | null; avatar: string | null; }
interface PostResult { id: string; author: string; content: string; }
interface CommunityResult { id: string; name: string; members: number; description: string | null; }
interface MarketResult { id: string; title: string; price: string; condition: string | null; }

interface Results {
  users: UserResult[];
  posts: PostResult[];
  communities: CommunityResult[];
  marketplace: MarketResult[];
}

export default function SmartSearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [results, setResults] = useState<Results | null>(null);
  const [loading, setLoading] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("zivo_recent_searches") ?? "[]"); } catch { return []; }
  });

  const { data: trendingTags = [] } = useQuery({
    queryKey: ["smart-search-trending-tags"],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("user_posts").select("caption").order("created_at", { ascending: false }).limit(200);
      const counts: Record<string, number> = {};
      (data || []).forEach((p: any) => {
        ((p.caption || "").match(/#[\w一-鿿؀-ۿ]+/g) || []).forEach((t: string) => {
          counts[t.toLowerCase()] = (counts[t.toLowerCase()] || 0) + 1;
        });
      });
      return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);
    },
    staleTime: 5 * 60_000,
  });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 350);
    return () => clearTimeout(t);
  }, [query]);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 2) { setResults(null); return; }
    setLoading(true);

    const term = `%${q}%`;

    const sb = supabase as any;
    const [usersRes, postsRes, commRes, mktRes] = await Promise.all([
      sb.from("profiles")
        .select("id, full_name, username, bio, avatar_url")
        .or(`full_name.ilike.${term},username.ilike.${term}`)
        .eq("is_of_creator", false)
        .limit(10),
      sb.from("store_posts")
        .select("id, caption, store_profiles!inner(name)")
        .ilike("caption", term)
        .eq("is_published", true)
        .limit(10),
      sb.from("communities")
        .select("id, name, member_count, description")
        .ilike("name", term)
        .limit(8),
      (supabase as any).from("store_products")
        .select("id, name, price_khr, price_usd, condition")
        .ilike("name", term)
        .limit(8),
    ]);

    setResults({
      users: (usersRes.data ?? []).map(u => ({
        id: u.id,
        name: u.full_name ?? u.username ?? "Unknown",
        username: u.username,
        bio: u.bio,
        avatar: u.avatar_url,
      })),
      posts: (postsRes.data ?? []).map((p: any) => ({
        id: p.id,
        author: p.store_profiles?.name ?? "Unknown",
        content: p.caption ?? "",
      })),
      communities: (commRes.data ?? []).map(c => ({
        id: c.id,
        name: c.name,
        members: c.member_count ?? 0,
        description: c.description,
      })),
      marketplace: (mktRes.data ?? []).map((m: any) => ({
        id: m.id,
        title: m.name ?? "Item",
        price: m.price_usd ? `$${m.price_usd}` : m.price_khr ? `${m.price_khr} KHR` : "—",
        condition: m.condition,
      })),
    });

    setLoading(false);
  }, []);

  useEffect(() => { runSearch(debouncedQuery); }, [debouncedQuery, runSearch]);

  const saveSearch = (q: string) => {
    if (!q.trim()) return;
    const updated = [q, ...recentSearches.filter(s => s !== q)].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem("zivo_recent_searches", JSON.stringify(updated));
  };

  const handleSelectSearch = (s: string) => { setQuery(s); saveSearch(s); };
  const clearRecent = () => { setRecentSearches([]); localStorage.removeItem("zivo_recent_searches"); };

  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;
  const hasResults = debouncedQuery.length >= 2;

  return (
    <div className="min-h-screen bg-background pb-20">
      <SEOHead
        title="Search – ZIVO | Find People, Posts & Places"
        description="Search ZIVO for people, posts, communities, and marketplace listings all in one place."
        canonical="/search"
        noIndex
      />
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center gap-2">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search everything..." value={query}
              onChange={(e) => setQuery(e.target.value)}
              onBlur={() => { if (query.trim()) saveSearch(query.trim()); }}
              className="pl-9 pr-9" autoFocus />
            {query && (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" title="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </div>
      </div>

      {!hasResults ? (
        <div className="p-4 space-y-6">
          {recentSearches.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Recent</h3>
                <button type="button" onClick={clearRecent} className="text-xs text-muted-foreground hover:text-foreground">Clear</button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((s, i) => (
                  <button type="button" key={i} onClick={() => handleSelectSearch(s)} className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-accent text-sm text-foreground">
                    <Search className="h-3 w-3 text-muted-foreground" />
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Trending
            </h3>
            <div className="flex flex-wrap gap-2">
              {(trendingTags.length > 0 ? trendingTags : ["#travel", "#photography", "#food", "#fitness", "#tech", "#music"]).map((tag) => (
                <Badge key={tag} variant="outline" className="cursor-pointer" onClick={() => handleSelectSearch(tag.replace("#", ""))}>{tag}</Badge>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {!loading && results && (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start px-4 bg-transparent border-b border-border rounded-none">
                <TabsTrigger value="all">All ({totalResults})</TabsTrigger>
                <TabsTrigger value="users"><User className="h-3 w-3 mr-1" />People</TabsTrigger>
                <TabsTrigger value="posts"><FileText className="h-3 w-3 mr-1" />Posts</TabsTrigger>
                <TabsTrigger value="communities"><Hash className="h-3 w-3 mr-1" />Groups</TabsTrigger>
                <TabsTrigger value="marketplace"><ShoppingBag className="h-3 w-3 mr-1" />Market</TabsTrigger>
              </TabsList>

              <div className="p-4 space-y-4">
                <TabsContent value="all" className="m-0 space-y-4">
                  {results.users.slice(0, 2).map(u => <UserCard key={u.id} user={u} />)}
                  {results.posts.slice(0, 2).map(p => <PostCard key={p.id} post={p} />)}
                  {results.communities.slice(0, 1).map(c => <CommunityCard key={c.id} community={c} />)}
                  {results.marketplace.slice(0, 1).map(m => <MarketCard key={m.id} item={m} />)}
                  {totalResults === 0 && <p className="text-center text-muted-foreground py-8">No results for "{debouncedQuery}"</p>}
                </TabsContent>
                <TabsContent value="users" className="m-0 space-y-3">
                  {results.users.length === 0 ? <EmptyState /> : results.users.map(u => <UserCard key={u.id} user={u} />)}
                </TabsContent>
                <TabsContent value="posts" className="m-0 space-y-3">
                  {results.posts.length === 0 ? <EmptyState /> : results.posts.map(p => <PostCard key={p.id} post={p} />)}
                </TabsContent>
                <TabsContent value="communities" className="m-0 space-y-3">
                  {results.communities.length === 0 ? <EmptyState /> : results.communities.map(c => <CommunityCard key={c.id} community={c} />)}
                </TabsContent>
                <TabsContent value="marketplace" className="m-0 space-y-3">
                  {results.marketplace.length === 0 ? <EmptyState /> : results.marketplace.map(m => <MarketCard key={m.id} item={m} />)}
                </TabsContent>
              </div>
            </Tabs>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mb-3 shadow-lg shadow-rose-500/20">
        <Search className="h-7 w-7 text-white" />
      </div>
      <p className="text-sm font-bold text-foreground">No results found</p>
      <p className="text-xs text-muted-foreground mt-1 max-w-xs">
        Try a different keyword or check your spelling.
      </p>
    </div>
  );
}

function UserCard({ user }: { user: UserResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-3 flex items-center gap-3">
        <Avatar>
          <AvatarImage src={user.avatar ?? undefined} />
          <AvatarFallback className="bg-primary/20 text-primary">{(user.name ?? "U")[0]}</AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{user.name}</p>
          <p className="text-xs text-muted-foreground truncate">{user.username ? `@${user.username}` : user.bio ?? ""}</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-full text-xs shrink-0">Follow</Button>
      </Card>
    </motion.div>
  );
}

function PostCard({ post }: { post: PostResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-3">
        <p className="text-xs text-muted-foreground mb-1">{post.author}</p>
        <p className="text-sm text-foreground line-clamp-3">{post.content}</p>
      </Card>
    </motion.div>
  );
}

function CommunityCard({ community }: { community: CommunityResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0"><Hash className="h-5 w-5 text-primary" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{community.name}</p>
          <p className="text-xs text-muted-foreground">{community.members.toLocaleString()} members</p>
        </div>
        <Button size="sm" variant="outline" className="rounded-full text-xs shrink-0">Join</Button>
      </Card>
    </motion.div>
  );
}

function MarketCard({ item }: { item: MarketResult }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-3 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0"><ShoppingBag className="h-5 w-5 text-primary" /></div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.price}{item.condition ? ` · ${item.condition}` : ""}</p>
        </div>
      </Card>
    </motion.div>
  );
}
