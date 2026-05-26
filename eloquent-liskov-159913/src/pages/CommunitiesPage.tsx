/**
 * CommunitiesPage — Topic-based groups & forums
 */
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SafeCaption from "@/components/social/SafeCaption";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";
import SEOHead from "@/components/SEOHead";
import DegradedDataBanner from "@/components/reliability/DegradedDataBanner";
import LoadFailureCard from "@/components/reliability/LoadFailureCard";
import { ArrowLeft, Plus, Users, Shield, Globe, Lock, Search, MessageSquare, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function CommunitiesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [tab, setTab] = useState<"discover" | "joined">("discover");
  const [newCommunity, setNewCommunity] = useState({ name: "", description: "", category: "General", privacy: "public" });

  const { data: communities = [], isLoading, isFetching, isError: hasCommunitiesError, refetch } = useQuery({
    queryKey: ["communities"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("communities")
        .select("*")
        .order("member_count", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: myMemberships = [] } = useQuery({
    queryKey: ["my-communities", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_members")
        .select("community_id, role")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const joinMutation = useMutation({
    mutationFn: async (communityId: string) => {
      if (!user) throw new Error("Login required");
      const isMember = memberSet.has(communityId);
      if (isMember) {
        await (supabase as any).from("community_members").delete().eq("community_id", communityId).eq("user_id", user.id);
      } else {
        const { error } = await (supabase as any).from("community_members").insert({
          community_id: communityId, user_id: user.id, role: "member",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-communities"] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      toast.success("Updated!");
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      if (!confirmContentSafe(`${newCommunity.name}\n${newCommunity.description}`, "community details")) {
        throw new Error("Blocked content");
      }
      const { error } = await (supabase as any).from("communities").insert({
        ...newCommunity,
        created_by: user.id,
        slug: newCommunity.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      toast.success("Community created!");
      setShowCreate(false);
      setNewCommunity({ name: "", description: "", category: "General", privacy: "public" });
    },
  });

  const memberSet = new Set(myMemberships.map((m: any) => m.community_id));
  const displayList = tab === "joined"
    ? communities.filter((c: any) => memberSet.has(c.id))
    : communities;
  const filtered = displayList.filter((c: any) =>
    !searchQuery || c.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead
        title="Communities – ZIVO | Join Groups & Connect"
        description="Discover and join communities on ZIVO. Connect with people who share your interests in travel, food, tech, wellness, and more."
        canonical="/communities"
      />
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" aria-label="Go back" title="Go back" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold flex-1">Communities</h1>
          {user && (
            <button type="button" aria-label="Create community" title="Create community" onClick={() => setShowCreate(true)} className="p-2 rounded-full bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-4 pb-2">
          {(["discover", "joined"] as const).map((t) => (
            <button type="button"
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition-all ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-muted/40 text-muted-foreground"
              }`}
            >
              {t === "discover" ? "Discover" : "My Communities"}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search communities..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-4 space-y-3">
        {hasCommunitiesError && communities.length > 0 && (
          <DegradedDataBanner
            className="mb-3"
            message="Showing cached communities. Refresh failed."
            onRetry={() => {
              void refetch();
            }}
            trackingContext="communities"
            rightSlot={
              <button
                type="button"
                onClick={() => {
                  void refetch();
                }}
                disabled={isFetching}
                className="shrink-0 rounded-full bg-foreground px-3 py-1 text-[11px] font-bold text-background disabled:opacity-50"
              >
                {isFetching ? "Refreshing..." : "Retry"}
              </button>
            }
          />
        )}

        {hasCommunitiesError && communities.length === 0 && !isLoading ? (
          <LoadFailureCard
            className="py-4"
            title="Could not load communities"
            description="We could not fetch communities right now. Retry to reconnect and load fresh results."
            onRetry={() => {
              void refetch();
            }}
            onSecondary={() => navigate("/")}
            secondaryLabel="Go Home"
            trackingContext="communities"
          />
        ) : isLoading ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {tab === "joined" ? "You haven't joined any communities yet" : "No communities found"}
            </p>
          </div>
        ) : (
          filtered.map((community: any, i: number) => {
            const isMember = memberSet.has(community.id);
            return (
              <motion.div
                key={community.id}
                initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="bg-card rounded-2xl border border-border/30 p-4 cursor-pointer hover:bg-muted/10 transition-colors"
                onClick={() => navigate(`/communities/${community.id}`)}
              >
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 rounded-xl">
                    <AvatarImage src={community.avatar_url} />
                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold">
                      {community.name?.[0]?.toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-foreground truncate">{community.name}</h3>
                      {community.is_verified && <Shield className="h-3.5 w-3.5 text-primary shrink-0" />}
                      {community.privacy === "private" ? (
                        <Lock className="h-3 w-3 text-muted-foreground shrink-0" />
                      ) : (
                        <Globe className="h-3 w-3 text-muted-foreground shrink-0" />
                      )}
                    </div>
                    {community.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5"><SafeCaption text={community.description} /></p>
                    )}
                    <div className="flex gap-3 mt-2 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" /> {community.member_count || 0} members
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" /> {community.post_count || 0} posts
                      </span>
                      {community.category && (
                        <span className="flex items-center gap-1">
                          <TrendingUp className="h-3 w-3" /> {community.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {user && (
                  <button type="button"
                    onClick={(e) => { e.stopPropagation(); joinMutation.mutate(community.id); }}
                    disabled={joinMutation.isPending}
                    className={`w-full mt-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      isMember
                        ? "bg-muted text-foreground"
                        : "bg-primary text-primary-foreground"
                    }`}
                  >
                    {isMember ? "Leave" : "Join Community"}
                  </button>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Create Community Sheet */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-end justify-center bg-black/50"
            onClick={() => setShowCreate(false)}
          >
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-background rounded-t-3xl pb-8"
            >
              <div className="flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
              <div className="px-5 space-y-4">
                <h3 className="text-base font-bold">Create Community</h3>
                <input
                  value={newCommunity.name}
                  onChange={(e) => setNewCommunity({ ...newCommunity, name: e.target.value })}
                  placeholder="Community name"
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <textarea
                  value={newCommunity.description}
                  onChange={(e) => setNewCommunity({ ...newCommunity, description: e.target.value })}
                  placeholder="Description"
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl bg-muted/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
                <div className="flex gap-2">
                  {["public", "private"].map((p) => (
                    <button type="button"
                      key={p}
                      onClick={() => setNewCommunity({ ...newCommunity, privacy: p })}
                      className={`flex-1 py-2.5 rounded-xl text-xs font-medium ${
                        newCommunity.privacy === p
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted/40 text-muted-foreground"
                      }`}
                    >
                      {p === "public" ? "🌍 Public" : "🔒 Private"}
                    </button>
                  ))}
                </div>
                <button type="button"
                  onClick={() => createMutation.mutate()}
                  disabled={!newCommunity.name || createMutation.isPending}
                  className="w-full py-3.5 rounded-2xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
                >
                  {createMutation.isPending ? "Creating..." : "Create Community"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ZivoMobileNav />
    </div>
  );
}
