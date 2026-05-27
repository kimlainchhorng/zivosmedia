/**
 * PublicUserProfilePage — view any user's public profile
 * Route: /user/:userId
 */
import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import UserX from "lucide-react/dist/esm/icons/user-x";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

interface UserProfile {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
}

interface FriendshipRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
}

type FriendStatus = "none" | "pending_outgoing" | "pending_incoming" | "accepted";

export default function PublicUserProfilePage() {
  const { userId } = useParams<{ userId: string }>();
  const { user: authUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendship, setFriendship] = useState<FriendshipRow | null>(null);
  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [actionLoading, setActionLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const refetchFriendship = useCallback(async () => {
    if (!authUser?.id || !userId || authUser.id === userId) {
      setFriendship(null);
      setFriendStatus("none");
      return;
    }
    // A friendship row exists with either (me, them) or (them, me).
    const { data } = await (supabase as any)
      .from("friendships")
      .select("id, user_id, friend_id, status")
      .or(
        `and(user_id.eq.${authUser.id},friend_id.eq.${userId}),and(user_id.eq.${userId},friend_id.eq.${authUser.id})`,
      )
      .limit(1)
      .maybeSingle();
    const row = (data as FriendshipRow | null) ?? null;
    setFriendship(row);
    if (!row) { setFriendStatus("none"); return; }
    if (row.status === "accepted") { setFriendStatus("accepted"); return; }
    if (row.status === "pending") {
      setFriendStatus(row.user_id === authUser.id ? "pending_outgoing" : "pending_incoming");
      return;
    }
    setFriendStatus("none");
  }, [authUser?.id, userId]);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, username, avatar_url, bio")
        .eq("user_id", userId)
        .single();
      setProfile(data as UserProfile);
      await refetchFriendship();
      setLoading(false);
    };
    load();
  }, [userId, refetchFriendship]);

  const sendFriendRequest = async () => {
    if (!authUser?.id || !profile) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("friendships")
        .insert({ user_id: authUser.id, friend_id: profile.user_id, status: "pending" });
      if (error) throw error;
      toast.success("Friend request sent");
      await refetchFriendship();
    } catch (e) {
      toast.error("Failed to send request");
    } finally {
      setActionLoading(false);
    }
  };

  const cancelFriendRequest = async () => {
    if (!friendship) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("friendships")
        .delete()
        .eq("id", friendship.id);
      if (error) throw error;
      toast.success("Request cancelled");
      await refetchFriendship();
    } catch (e) {
      toast.error("Could not cancel");
    } finally {
      setActionLoading(false);
    }
  };

  const acceptFriendRequest = async () => {
    if (!friendship) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("friendships")
        .update({ status: "accepted", accepted_at: new Date().toISOString() })
        .eq("id", friendship.id);
      if (error) throw error;
      toast.success("You are now friends");
      await refetchFriendship();
    } catch (e) {
      toast.error("Could not accept");
    } finally {
      setActionLoading(false);
    }
  };

  const unfriend = async () => {
    if (!friendship) return;
    setActionLoading(true);
    try {
      const { error } = await (supabase as any)
        .from("friendships")
        .delete()
        .eq("id", friendship.id);
      if (error) throw error;
      toast.success("Removed from friends");
      await refetchFriendship();
    } catch (e) {
      toast.error("Could not remove");
    } finally {
      setActionLoading(false);
    }
  };

  const openChat = () => {
    if (profile?.user_id) navigate(`/chat/direct/${profile.user_id}`);
  };

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-background">
        <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border/30 pt-safe">
          <div className="flex items-center justify-between px-2 py-2">
            <button type="button" onClick={goBack} className="h-10 w-10 rounded-full hover:bg-muted/50 flex items-center justify-center" aria-label="Back">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <div className="h-10 w-10" />
          </div>
        </header>
        <main className="pt-10 pb-16 container mx-auto px-4">
          <div className="max-w-md mx-auto text-center space-y-4">
            <Skeleton className="w-28 h-28 rounded-full mx-auto" />
            <Skeleton className="h-6 w-40 mx-auto" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
        </main>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-[100dvh] bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">User not found</p>
          <Button onClick={goBack}>Go back</Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = authUser?.id === profile.user_id;

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/30 pt-safe">
        <div className="flex items-center justify-between px-2 py-2">
          <button type="button"
            onClick={goBack}
            className="h-10 w-10 rounded-full hover:bg-muted/50 flex items-center justify-center"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <p className="text-sm font-semibold text-foreground truncate max-w-[60%]">
            {profile.username ? `@${profile.username}` : profile.full_name || "Profile"}
          </p>
          <div className="relative">
            <button type="button"
              onClick={() => setShowMenu((v) => !v)}
              className="h-10 w-10 rounded-full hover:bg-muted/50 flex items-center justify-center"
              aria-label="More options"
            >
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {showMenu && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[180px] rounded-xl border border-border bg-card shadow-lg overflow-hidden">
                  <button type="button"
                    onClick={() => {
                      setShowMenu(false);
                      const url = `${window.location.origin}/user/${profile.user_id}`;
                      if (navigator.share) {
                        void navigator.share({ url, title: profile.full_name || "ZIVO profile" }).catch(() => {});
                      } else if (navigator.clipboard) {
                        void navigator.clipboard.writeText(url);
                        toast.success("Profile link copied");
                      }
                    }}
                    className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted/50"
                  >
                    Share profile
                  </button>
                  {!isOwnProfile && friendStatus === "accepted" && (
                    <button type="button"
                      onClick={() => { setShowMenu(false); void unfriend(); }}
                      className="w-full px-3 py-2.5 text-left text-sm text-rose-500 hover:bg-muted/50"
                    >
                      Unfriend
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="pt-10 pb-16 container mx-auto px-4">
        <div className="max-w-md mx-auto text-center space-y-6">
          <Avatar className="w-28 h-28 mx-auto">
            <AvatarImage src={profile.avatar_url || undefined} />
            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
              {(profile.full_name || profile.username || "?").slice(0, 1).toUpperCase()}
            </AvatarFallback>
          </Avatar>

          <div>
            <h1 className="text-2xl font-bold text-ig-gradient">{profile.full_name || "User"}</h1>
            {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
          </div>

          {profile.bio && <p className="text-sm text-foreground/80 whitespace-pre-line">{profile.bio}</p>}

          {/* Smart install banner — shown only on mobile web (not in the
              native app) when the viewer is signed-out. Gives scanned-QR /
              shared-link visitors a clean path to download. */}
          {!authUser && !Capacitor.isNativePlatform() && (() => {
            const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
            const isIOS = /iPhone|iPad|iPod/i.test(ua);
            const isAndroid = /Android/i.test(ua);
            const isMobile = isIOS || isAndroid;
            if (!isMobile) return null;
            const APP_STORE = "https://apps.apple.com/us/app/zivo-customer/id6759480121";
            const PLAY_STORE = "https://play.google.com/store/apps/details?id=com.myzivo.app";
            return (
              <div className="rounded-2xl bg-primary/8 border border-primary/30 p-4 text-left space-y-2">
                <p className="text-sm font-bold text-foreground">Add {profile.full_name || "this contact"} on ZIVO</p>
                <p className="text-xs text-muted-foreground">
                  Get the app to message, send money, and stay connected. After installing,
                  open this link again to add them in one tap.
                </p>
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  {isIOS && (
                    <a href={APP_STORE} className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl bg-foreground text-background text-sm font-bold active:scale-[0.98]">
                      Download for iPhone
                    </a>
                  )}
                  {isAndroid && (
                    <a href={PLAY_STORE} className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl bg-foreground text-background text-sm font-bold active:scale-[0.98]">
                      Get it on Google Play
                    </a>
                  )}
                  <button type="button"
                    onClick={() => navigate(`/auth?redirect=${encodeURIComponent(`/user/${profile.user_id}`)}`)}
                    className="flex-1 inline-flex items-center justify-center px-3 py-2 rounded-xl bg-muted text-foreground text-sm font-semibold active:scale-[0.98]"
                  >
                    Sign in instead
                  </button>
                </div>
              </div>
            );
          })()}

          {!isOwnProfile && authUser && (
            <div className="flex gap-2 pt-4">
              <Button variant="outline" className="flex-1" onClick={openChat} disabled={actionLoading}>
                <MessageCircle className="w-4 h-4 mr-2" />
                Message
              </Button>
              {friendStatus === "none" && (
                <Button className="flex-1" onClick={sendFriendRequest} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
                  Add Friend
                </Button>
              )}
              {friendStatus === "pending_outgoing" && (
                <Button variant="outline" className="flex-1" onClick={cancelFriendRequest} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserX className="w-4 h-4 mr-2" />}
                  Cancel request
                </Button>
              )}
              {friendStatus === "pending_incoming" && (
                <Button className="flex-1" onClick={acceptFriendRequest} disabled={actionLoading}>
                  {actionLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserCheck className="w-4 h-4 mr-2" />}
                  Accept request
                </Button>
              )}
              {friendStatus === "accepted" && (
                <Button variant="outline" className="flex-1 text-emerald-600 border-emerald-500/30 cursor-default" disabled>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Friends
                </Button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
