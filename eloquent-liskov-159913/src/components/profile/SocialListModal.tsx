/**
 * SocialListModal — Shows Friends, Followers, or Following list
 * with unfriend/unfollow actions, confirmation dialogs, and sort
 */
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronRight,
  Clock,
  Loader2,
  MessageCircle,
  MoreVertical,
  Search,
  ShieldCheck,
  Sparkles,
  UserCheck,
  UserMinus,
  UserRoundX,
  Users,
  UserX,
} from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence, useDragControls, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";

type Tab = "friends" | "followers" | "following";
type SortOrder = "newest" | "oldest";
type ActionType = "unfriend" | "unfollow" | "remove_follower";

interface SocialUser {
  id: string;
  relationId: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  followRelationId?: string | null; // for friends tab: the follow relation
}

interface Props {
  open: boolean;
  onClose: () => void;
  initialTab?: Tab;
  onCountsChange?: (friends: number, followers: number, following: number) => void;
}

interface ConfirmAction {
  type: ActionType;
  item: SocialUser;
}

export default function SocialListModal({ open, onClose, initialTab = "friends", onCountsChange }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const dragControls = useDragControls();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [sort, setSort] = useState<SortOrder>("newest");
  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<SocialUser[]>([]);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab]);

  useEffect(() => {
    setQuery("");
  }, [tab]);

  useEffect(() => {
    if (!open || !user?.id) return;
    loadList();
  }, [open, user?.id, tab, sort]);

  const filteredList = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return list;
    return list.filter((item) => (item.full_name || "Unknown").toLowerCase().includes(needle));
  }, [list, query]);

  const tabMeta = useMemo(() => {
    const followingCount = list.filter((item) => item.followRelationId).length;
    return {
      total: list.length,
      followingCount,
      availableToFollow: list.length - followingCount,
    };
  }, [list]);

  const loadList = async () => {
    if (!user?.id) return;
    setLoading(true);
    setExpandedItem(null);
    try {
      let items: SocialUser[] = [];

      if (tab === "friends") {
        const { data } = await (supabase as any)
          .from("friendships")
          .select("id, user_id, friend_id, created_at")
          .eq("status", "accepted")
          .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
          .order("created_at", { ascending: sort === "oldest" });

        if (data) {
          const otherIds = data.map((r: any) => r.user_id === user.id ? r.friend_id : r.user_id);
          const [{ data: profiles }, { data: followData }] = await Promise.all([
            supabase.from("public_profiles" as any).select("id, full_name, avatar_url").in("id", otherIds),
            (supabase as any).from("followers").select("id, following_id").eq("follower_id", user.id).in("following_id", otherIds),
          ]);
          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          const followMap = new Map((followData || []).map((f: any) => [f.following_id, f.id]));
          items = data.map((r: any) => {
            const otherId = r.user_id === user.id ? r.friend_id : r.user_id;
            const p = profileMap.get(otherId);
            return {
              id: otherId,
              relationId: r.id,
              full_name: p?.full_name || null,
              avatar_url: p?.avatar_url || null,
              created_at: r.created_at,
              followRelationId: followMap.get(otherId) || null,
            };
          });
        }
      } else if (tab === "followers") {
        const { data } = await (supabase as any)
          .from("followers")
          .select("id, follower_id, created_at")
          .eq("following_id", user.id)
          .order("created_at", { ascending: sort === "oldest" });

        if (data) {
          const ids = data.map((r: any) => r.follower_id);
          const [{ data: profiles }, { data: followData }] = await Promise.all([
            supabase.from("public_profiles" as any).select("id, full_name, avatar_url").in("id", ids),
            (supabase as any).from("followers").select("id, following_id").eq("follower_id", user.id).in("following_id", ids),
          ]);
          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          const followMap = new Map((followData || []).map((f: any) => [f.following_id, f.id]));
          items = data.map((r: any) => {
            const p = profileMap.get(r.follower_id);
            return {
              id: r.follower_id,
              relationId: r.id,
              full_name: p?.full_name || null,
              avatar_url: p?.avatar_url || null,
              created_at: r.created_at,
              followRelationId: followMap.get(r.follower_id) || null,
            };
          });
        }
      } else {
        const { data } = await (supabase as any)
          .from("followers")
          .select("id, following_id, created_at")
          .eq("follower_id", user.id)
          .order("created_at", { ascending: sort === "oldest" });

        if (data) {
          const ids = data.map((r: any) => r.following_id);
          const { data: profiles } = await supabase.from("public_profiles" as any).select("id, full_name, avatar_url").in("id", ids);
          const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));
          items = data.map((r: any) => {
            const p = profileMap.get(r.following_id);
            return {
              id: r.following_id,
              relationId: r.id,
              full_name: p?.full_name || null,
              avatar_url: p?.avatar_url || null,
              created_at: r.created_at,
              followRelationId: r.id,
            };
          });
        }
      }
      setList(items);
    } catch (err) {
      console.error("Failed to load social list", err);
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: ConfirmAction) => {
    if (!user?.id) return;
    const { type, item } = action;
    setActionLoading(`${item.relationId}-${type}`);
    try {
      if (type === "unfriend") {
        await (supabase as any).from("friendships").delete().eq("id", item.relationId);
        // Also unfollow if follow relation exists
        if (item.followRelationId) {
          await (supabase as any).from("followers").delete().eq("id", item.followRelationId);
        }
        toast.success(`Unfriended ${item.full_name || "user"}`);
        setList((prev) => prev.filter((i) => i.relationId !== item.relationId));
      } else if (type === "unfollow") {
        if (tab === "friends" && item.followRelationId) {
          await (supabase as any).from("followers").delete().eq("id", item.followRelationId);
          toast.success(`Unfollowed ${item.full_name || "user"}`);
          // Update follow status in list without removing
          setList((prev) => prev.map((i) => i.relationId === item.relationId ? { ...i, followRelationId: null } : i));
        } else {
          await (supabase as any).from("followers").delete().eq("id", item.relationId);
          toast.success(`Unfollowed ${item.full_name || "user"}`);
          setList((prev) => prev.filter((i) => i.relationId !== item.relationId));
        }
      } else if (type === "remove_follower") {
        await (supabase as any).from("followers").delete().eq("id", item.relationId);
        toast.success(`Removed ${item.full_name || "user"} from followers`);
        setList((prev) => prev.filter((i) => i.relationId !== item.relationId));
      }

      onCountsChange?.(0, 0, 0);
    } catch (err: any) {
      toast.error(err.message || "Action failed");
    } finally {
      setActionLoading(null);
      setExpandedItem(null);
      setConfirmAction(null);
    }
  };

  const handleFollow = async (item: SocialUser) => {
    if (!user?.id || item.followRelationId) return;
    setActionLoading(`${item.relationId}-follow`);
    try {
      const { data, error } = await (supabase as any)
        .from("followers")
        .insert({ follower_id: user.id, following_id: item.id })
        .select("id")
        .maybeSingle();

      if (error && error.code !== "23505") throw error;

      setList((prev) =>
        prev.map((row) =>
          row.id === item.id
            ? { ...row, followRelationId: data?.id || row.followRelationId || `local-${item.id}` }
            : row
        )
      );
      toast.success(`Following ${item.full_name || "user"}`);
      onCountsChange?.(0, 0, 0);
      setExpandedItem(null);
    } catch (err: any) {
      toast.error(err.message || "Could not follow");
    } finally {
      setActionLoading(null);
    }
  };

  const openProfile = (item: SocialUser) => {
    onClose();
    navigate(`/user/${item.id}`);
  };

  const getDestructiveAction = (item: SocialUser): ConfirmAction => {
    if (tab === "friends") return { type: "unfriend", item };
    if (tab === "followers") return { type: "remove_follower", item };
    return { type: "unfollow", item };
  };

  const getRelationshipCopy = (item: SocialUser) => {
    if (tab === "friends") return item.followRelationId ? "Friend and following" : "Friend";
    if (tab === "followers") return item.followRelationId ? "Follows you · followed back" : "Follows you";
    return "Following";
  };

  const getInitials = (name: string | null) =>
    (name || "U").split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  const tabItems: { key: Tab; label: string }[] = [
    { key: "friends", label: "Friends" },
    { key: "followers", label: "Followers" },
    { key: "following", label: "Following" },
  ];

  const getConfirmText = (type: ActionType, name: string) => {
    switch (type) {
      case "unfriend": return `Are you sure you want to unfriend ${name}? This will also remove the follow connection.`;
      case "unfollow": return `Are you sure you want to unfollow ${name}? You'll stop seeing their updates.`;
      case "remove_follower": return `Are you sure you want to remove ${name} from your followers?`;
    }
  };

  const getConfirmTitle = (type: ActionType) => {
    switch (type) {
      case "unfriend": return "Unfriend";
      case "unfollow": return "Unfollow";
      case "remove_follower": return "Remove Follower";
    }
  };

  const handlePullDownClose = (_event: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 850) {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="!fixed !inset-0 z-[2000] bg-background flex min-h-[100dvh] w-screen flex-col overflow-hidden"
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        drag="y"
        dragControls={dragControls}
        dragListener={false}
        dragConstraints={{ top: 0, bottom: 220 }}
        dragElastic={0.16}
        dragSnapToOrigin
        onDragEnd={handlePullDownClose}
      >
        <div className="sticky top-0 z-10 bg-background/95 px-4 pb-3 pt-safe backdrop-blur-xl border-b border-border/30">
          <button
            type="button"
            aria-label="Swipe down to close"
            onPointerDown={(event) => dragControls.start(event)}
            className="mx-auto mb-1 flex h-5 w-20 touch-none items-center justify-center rounded-full active:cursor-grabbing"
          >
            <span className="h-1.5 w-12 rounded-full bg-muted-foreground/25" />
          </button>
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose} className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full hover:bg-muted/70">
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-primary">ZIVO Social</p>
              <h1 className="text-2xl font-black leading-tight text-foreground">People</h1>
            </div>
            <div className="rounded-full border border-border bg-card px-3 py-2 text-right shadow-sm">
              <p className="text-lg font-black leading-none text-foreground">{tabMeta.total}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{tab}</p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            {tabItems.map((t) => (
              <button
                type="button"
                key={t.key}
                onClick={() => setTab(t.key)}
                className={cn(
                  "relative min-h-[48px] rounded-2xl border px-2 text-sm font-bold transition-all",
                  tab === t.key
                    ? "border-foreground bg-foreground text-background shadow-sm"
                    : "border-border/70 bg-card text-muted-foreground hover:bg-muted/60"
                )}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-border/70 bg-muted/40 px-3 py-2">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Search ${tab}...`}
              className="min-h-[36px] flex-1 bg-transparent text-[15px] font-medium outline-none placeholder:text-muted-foreground"
            />
            {query && (
              <button type="button" onClick={() => setQuery("")} className="rounded-full px-2 text-xs font-bold text-muted-foreground">
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gradient-to-b from-muted/25 via-background to-background">
          <div className="px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="truncate">
                  {tabMeta.availableToFollow > 0 && tab !== "following"
                    ? `${tabMeta.availableToFollow} ready to follow back`
                    : "Swipe cards for quick actions"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSort((s) => (s === "newest" ? "oldest" : "newest"))}
                className="flex shrink-0 items-center gap-1.5 rounded-full border border-border/70 bg-card px-3 py-2 text-xs font-bold text-foreground shadow-sm"
              >
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {sort === "newest" ? "Newest" : "Oldest"}
                <ArrowUpDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center h-56 gap-3 text-muted-foreground">
              <Loader2 className="h-7 w-7 animate-spin text-primary" />
              <p className="text-sm font-semibold">Loading people...</p>
            </div>
          ) : list.length === 0 ? (
            <div className="mx-4 mt-10 rounded-[28px] border border-dashed border-border bg-card p-8 text-center shadow-sm">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Users className="h-7 w-7" />
              </div>
              <h2 className="text-lg font-black text-foreground">No {tab} yet</h2>
              <p className="mt-1 text-sm text-muted-foreground">When you connect with people on ZIVO, they will show up here.</p>
              <Button className="mt-5 rounded-full" onClick={() => { onClose(); navigate("/chat/find-contacts"); }}>
                Find people
              </Button>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="mx-4 mt-10 rounded-[28px] border border-border bg-card p-8 text-center shadow-sm">
              <Search className="mx-auto mb-3 h-7 w-7 text-muted-foreground" />
              <h2 className="text-base font-black text-foreground">No matches</h2>
              <p className="mt-1 text-sm text-muted-foreground">Try a different name.</p>
            </div>
          ) : (
            <div className="space-y-3 px-4 pb-28">
              {filteredList.map((item, index) => {
                const canFollow = tab !== "following" && !item.followRelationId;
                const destructive = getDestructiveAction(item);
                return (
                  <motion.div
                    key={item.relationId}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.025, 0.18) }}
                    className="relative overflow-hidden rounded-[26px]"
                  >
                    <div className="absolute inset-0 flex items-stretch justify-between rounded-[26px] bg-muted">
                      <button
                        type="button"
                        onClick={() => (canFollow ? handleFollow(item) : openProfile(item))}
                        className={cn(
                          "flex w-28 flex-col items-center justify-center gap-1 text-xs font-black",
                          canFollow ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground"
                        )}
                      >
                        {canFollow ? <UserCheck className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                        {canFollow ? "Follow" : "Open"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmAction(destructive)}
                        className="flex w-32 flex-col items-center justify-center gap-1 bg-red-500 text-xs font-black text-white"
                      >
                        {destructive.type === "remove_follower" ? <UserRoundX className="h-5 w-5" /> : <UserMinus className="h-5 w-5" />}
                        {destructive.type === "unfriend" ? "Unfriend" : destructive.type === "unfollow" ? "Unfollow" : "Remove"}
                      </button>
                    </div>

                    <motion.div
                      drag="x"
                      dragConstraints={{ left: -116, right: canFollow ? 104 : 78 }}
                      dragElastic={0.08}
                      onDragEnd={(_, info) => {
                        if (info.offset.x < -88) setConfirmAction(destructive);
                        if (info.offset.x > 84) {
                          if (canFollow) handleFollow(item);
                          else openProfile(item);
                        }
                      }}
                      className="relative rounded-[26px] border border-border/70 bg-card p-4 shadow-sm"
                    >
                      <div className="flex items-start gap-3">
                        <button type="button" onClick={() => openProfile(item)} className="relative shrink-0">
                          <Avatar className="h-14 w-14 border-2 border-background shadow-sm">
                            <AvatarImage src={item.avatar_url || undefined} />
                            <AvatarFallback className="text-sm font-black bg-muted text-muted-foreground">
                              {getInitials(item.full_name)}
                            </AvatarFallback>
                          </Avatar>
                          {item.followRelationId && (
                            <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-emerald-500 text-white">
                              <ShieldCheck className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <button type="button" onClick={() => openProfile(item)} className="block max-w-full text-left">
                            <p className="truncate text-[17px] font-black leading-tight text-foreground">{item.full_name || "Unknown"}</p>
                            <p className="mt-1 text-xs font-semibold text-muted-foreground">{getRelationshipCopy(item)}</p>
                          </button>
                          <div className="mt-3 flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-bold text-muted-foreground">
                              {new Date(item.created_at).toLocaleDateString()}
                            </span>
                            {canFollow && (
                              <button
                                type="button"
                                disabled={actionLoading === `${item.relationId}-follow`}
                                onClick={() => handleFollow(item)}
                                className="rounded-full bg-emerald-500 px-3 py-1 text-[11px] font-black text-white disabled:opacity-60"
                              >
                                {actionLoading === `${item.relationId}-follow` ? "Following..." : "Follow back"}
                              </button>
                            )}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setExpandedItem(expandedItem === item.relationId ? null : item.relationId)}
                          className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-full bg-muted/70 hover:bg-muted"
                        >
                          <MoreVertical className="h-5 w-5 text-muted-foreground" />
                        </button>
                      </div>

                      <AnimatePresence>
                        {expandedItem === item.relationId && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden"
                          >
                            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3">
                              <Button variant="secondary" className="rounded-2xl" onClick={() => { onClose(); navigate(`/chat?user=${item.id}`); }}>
                                <MessageCircle className="mr-2 h-4 w-4" />
                                Message
                              </Button>
                              <Button variant="outline" className="rounded-2xl" onClick={() => openProfile(item)}>
                                Profile
                                <ChevronRight className="ml-2 h-4 w-4" />
                              </Button>
                              {canFollow ? (
                                <Button className="col-span-2 rounded-2xl bg-emerald-500 text-white hover:bg-emerald-600" onClick={() => handleFollow(item)} disabled={!!actionLoading}>
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  Follow back
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  className="col-span-2 rounded-2xl border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                  disabled={!!actionLoading}
                                  onClick={() => setConfirmAction(destructive)}
                                >
                                  {destructive.type === "unfriend" ? <UserX className="mr-2 h-4 w-4" /> : <UserMinus className="mr-2 h-4 w-4" />}
                                  {destructive.type === "unfriend" ? "Unfriend" : destructive.type === "unfollow" ? "Unfollow" : "Remove follower"}
                                </Button>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{confirmAction ? getConfirmTitle(confirmAction.type) : ""}</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmAction ? getConfirmText(confirmAction.type, confirmAction.item.full_name || "this user") : ""}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => confirmAction && executeAction(confirmAction)}
              >
                {confirmAction ? getConfirmTitle(confirmAction.type) : "Confirm"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </motion.div>
    </AnimatePresence>
  );
}
