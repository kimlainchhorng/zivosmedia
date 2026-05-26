/**
 * CommunityDetailPage — View a community's posts and members
 * Route: /communities/:id
 */
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Users, MessageSquare, Plus, Send, Globe, Lock,
  Shield, MoreVertical, Heart, X, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SafeCaption from "@/components/social/SafeCaption";
import { confirmContentSafe } from "@/lib/security/contentLinkValidation";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function CommunityDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showPostForm, setShowPostForm] = useState(false);
  const [postText, setPostText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: community, isLoading: communityLoading } = useQuery({
    queryKey: ["community", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("communities")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const { data: membership } = useQuery({
    queryKey: ["community-membership", id, user?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("community_members")
        .select("role")
        .eq("community_id", id)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: posts = [], isLoading: postsLoading } = useQuery({
    queryKey: ["community-posts", id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_posts")
        .select("id, content, created_at, user_id, like_count")
        .eq("community_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const posts = data || [];
      const userIds = [...new Set(posts.map((p: any) => p.user_id))] as string[];
      if (userIds.length === 0) return posts;
      const { data: profiles } = await (supabase as any)
        .from("profiles")
        .select("id, user_id, full_name, avatar_url")
        .or(`id.in.(${userIds.join(",")}),user_id.in.(${userIds.join(",")})`);
      const profileMap = new Map<string, any>();
      (profiles || []).forEach((p: any) => {
        if (p.id) profileMap.set(p.id, p);
        if (p.user_id) profileMap.set(p.user_id, p);
      });
      return posts.map((p: any) => ({ ...p, profile: profileMap.get(p.user_id) }));
    },
    enabled: !!id,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Login required");
      if (membership) {
        await (supabase as any).from("community_members").delete().eq("community_id", id).eq("user_id", user.id);
      } else {
        await (supabase as any).from("community_members").insert({ community_id: id, user_id: user.id, role: "member" });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-membership", id, user?.id] });
      queryClient.invalidateQueries({ queryKey: ["communities"] });
      toast.success(membership ? "Left community" : "Joined community!");
    },
  });

  const handlePost = async () => {
    if (!postText.trim() || !user) return;
    if (!confirmContentSafe(postText, "community post")) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("community_posts")
        .insert({ community_id: id, user_id: user.id, content: postText.trim() });
      if (error) throw error;
      toast.success("Post shared!");
      setPostText("");
      setShowPostForm(false);
      queryClient.invalidateQueries({ queryKey: ["community-posts", id] });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to post");
    } finally {
      setSubmitting(false);
    }
  };

  if (communityLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (!community) {
    return (
      <div className="min-h-dvh bg-background flex flex-col items-center justify-center gap-3">
        <p className="text-sm font-medium">Community not found</p>
        <button type="button" onClick={() => navigate("/communities")} className="text-primary text-sm">Browse communities</button>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title={`${community.name} – ZIVO Community`} description={community.description || `Join ${community.name} on ZIVO.`} noIndex />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-base font-bold flex-1 truncate">{community.name}</h1>
          {user && membership && (
            <button type="button" onClick={() => setShowPostForm(!showPostForm)} className="p-2 rounded-full bg-primary text-primary-foreground">
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Community header */}
        <div className="rounded-2xl border border-border/30 bg-card p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-14 w-14 rounded-xl">
              <AvatarImage src={community.avatar_url} />
              <AvatarFallback className="rounded-xl bg-primary/10 text-primary text-xl font-bold">
                {community.name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="font-bold text-[15px]">{community.name}</h2>
                {community.is_verified && <Shield className="w-3.5 h-3.5 text-primary shrink-0" />}
                {community.privacy === "private" ? <Lock className="w-3.5 h-3.5 text-muted-foreground" /> : <Globe className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
              <div className="flex gap-3 text-[10px] text-muted-foreground mt-1">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{community.member_count || 0} members</span>
                <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{community.post_count || 0} posts</span>
                {community.category && <span className="flex items-center gap-1"><TrendingUp className="w-3 h-3" />{community.category}</span>}
              </div>
            </div>
          </div>
          {community.description && (
            <p className="text-[13px] text-muted-foreground"><SafeCaption text={community.description} /></p>
          )}
          {user && (
            <button type="button"
              onClick={() => joinMutation.mutate()}
              disabled={joinMutation.isPending}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold transition-colors",
                membership ? "bg-muted text-foreground" : "bg-primary text-primary-foreground"
              )}
            >
              {membership ? "Leave Community" : "Join Community"}
            </button>
          )}
        </div>

        {/* Post form */}
        <AnimatePresence>
          {showPostForm && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-2xl border border-border/30 bg-card p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <p className="font-semibold text-sm">Share with community</p>
                <button type="button" onClick={() => setShowPostForm(false)}><X className="w-4 h-4 text-muted-foreground" /></button>
              </div>
              <textarea
                value={postText}
                onChange={(e) => setPostText(e.target.value)}
                placeholder="What's on your mind?"
                rows={3}
                className="w-full px-3 py-2 rounded-xl bg-muted/40 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setShowPostForm(false)} className="px-4 py-2 rounded-xl bg-muted text-sm font-medium">Cancel</button>
                <button type="button"
                  onClick={handlePost}
                  disabled={!postText.trim() || submitting}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? "Posting…" : "Post"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Posts */}
        <div>
          <p className="font-semibold text-sm mb-3">Posts</p>
          {postsLoading ? (
            <div className="py-8 text-center text-sm text-muted-foreground">Loading posts…</div>
          ) : posts.length === 0 ? (
            <div className="py-10 text-center space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-muted-foreground/30" />
              <p className="text-sm font-medium">No posts yet</p>
              <p className="text-xs text-muted-foreground">
                {membership ? "Be the first to post in this community!" : "Join the community to post"}
              </p>
              {user && !membership && (
                <button type="button" onClick={() => joinMutation.mutate()} className="text-primary text-sm font-medium">Join to post</button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {posts.map((post: any, i: number) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-2xl border border-border/30 bg-card p-4"
                >
                  <div className="flex items-center gap-2.5 mb-2.5">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={post.profile?.avatar_url} />
                      <AvatarFallback className="text-xs bg-primary/10 text-primary font-bold">
                        {(post.profile?.full_name?.[0] || "U").toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold">{post.profile?.full_name || "Community Member"}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {post.created_at ? formatDistanceToNow(new Date(post.created_at), { addSuffix: true }) : ""}
                      </p>
                    </div>
                    {user?.id === post.user_id && (
                      <button type="button"
                        className="p-1 rounded-full hover:bg-muted/50"
                        onClick={async () => {
                          if (!confirm("Delete this post?")) return;
                          await (supabase as any).from("community_posts").delete().eq("id", post.id);
                          queryClient.invalidateQueries({ queryKey: ["community-posts", id] });
                          toast.success("Post deleted");
                        }}
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  <p className="text-[13px] text-foreground/90 leading-relaxed">
                    <SafeCaption text={post.content} />
                  </p>
                  {post.like_count > 0 && (
                    <div className="flex items-center gap-1 mt-2 text-[11px] text-muted-foreground">
                      <Heart className="w-3.5 h-3.5 text-foreground fill-rose-400" />
                      <span>{post.like_count}</span>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
