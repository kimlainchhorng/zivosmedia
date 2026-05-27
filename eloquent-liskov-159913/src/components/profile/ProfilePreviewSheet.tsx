/**
 * ProfilePreviewSheet — Quick-peek bottom sheet for any user profile.
 *
 * Used wherever we want to show "who is this person" without a full
 * navigation away (Message Requests, mentions, follower lists, …).
 * Shows avatar/name/bio/last-seen and offers Message / Add / Block /
 * View full profile actions inline.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import BadgeCheck from "lucide-react/dist/esm/icons/badge-check";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import UserCheck from "lucide-react/dist/esm/icons/user-check";
import Ban from "lucide-react/dist/esm/icons/ban";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useContacts } from "@/hooks/useContacts";
import { toast } from "sonner";

interface ProfilePreviewSheetProps {
  userId: string | null;
  onClose: () => void;
  /** Called after a successful add — useful for refetching parent list. */
  onAdded?: () => void;
  /** Called after a successful block — same idea. */
  onBlocked?: () => void;
}

interface PreviewProfile {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_verified: boolean | null;
  last_seen: string | null;
}

export default function ProfilePreviewSheet({
  userId,
  onClose,
  onAdded,
  onBlocked,
}: ProfilePreviewSheetProps) {
  const open = !!userId;
  const navigate = useNavigate();
  const { user } = useAuth();
  const { contacts, add: addContact } = useContacts();
  const [busy, setBusy] = useState<"add" | "block" | null>(null);

  const { data: profile, isLoading } = useQuery<PreviewProfile | null>({
    queryKey: ["profile-preview", userId],
    enabled: !!userId,
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await (supabase as any)
        .from("profiles")
        .select("user_id, full_name, username, avatar_url, bio, is_verified, last_seen")
        .eq("user_id", userId)
        .maybeSingle();
      return (data as PreviewProfile) || null;
    },
  });

  const isContact = !!userId && contacts.some((c) => c.contact_user_id === userId);
  const isSelf = !!userId && user?.id === userId;

  // Reset busy state whenever the sheet closes / target changes so the next
  // open doesn't render a stale spinner.
  useEffect(() => {
    if (!open) setBusy(null);
  }, [open]);

  const handleMessage = () => {
    if (!userId) return;
    onClose();
    navigate(`/chat?with=${userId}`);
  };

  const handleViewProfile = () => {
    if (!userId) return;
    onClose();
    navigate(`/user/${userId}`);
  };

  const handleAdd = async () => {
    if (!userId || isContact || isSelf) return;
    setBusy("add");
    const res = await addContact(userId, { via: "profile-preview" as any });
    setBusy(null);
    if (!res.ok) {
      toast.error(res.error || "Couldn't add contact");
      return;
    }
    toast.success(`${profile?.full_name || "Contact"} added`);
    onAdded?.();
  };

  const handleBlock = async () => {
    if (!user?.id || !userId || isSelf) return;
    setBusy("block");
    const { error } = await (supabase as any)
      .from("blocked_users")
      .insert({ blocker_id: user.id, blocked_id: userId });
    setBusy(null);
    if (error) {
      toast.error("Couldn't block user");
      return;
    }
    toast.success(`${profile?.full_name || "User"} blocked`);
    onBlocked?.();
    onClose();
  };

  const lastSeenLabel = (() => {
    if (!profile?.last_seen) return null;
    const ms = Date.now() - new Date(profile.last_seen).getTime();
    if (ms < 2 * 60 * 1000) return "Active now";
    return `Active ${formatDistanceToNow(new Date(profile.last_seen), { addSuffix: true })}`;
  })();

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl pb-8 max-h-[80vh] overflow-y-auto"
      >
        <SheetHeader className="pb-2">
          <SheetTitle className="sr-only">Profile preview</SheetTitle>
        </SheetHeader>

        {isLoading || !profile ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 pt-2">
            <Avatar className="h-20 w-20 ring-2 ring-border/40">
              <AvatarImage src={profile.avatar_url ?? undefined} />
              <AvatarFallback>
                {(profile.full_name || profile.username || "?").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <div className="flex items-center gap-1 justify-center">
                <h2 className="text-lg font-bold">
                  {profile.full_name || profile.username || "User"}
                </h2>
                {profile.is_verified && (
                  <BadgeCheck className="h-4 w-4 text-primary fill-primary/20" />
                )}
              </div>
              {profile.username && (
                <p className="text-[12px] text-muted-foreground">@{profile.username}</p>
              )}
              {lastSeenLabel && (
                <p className="text-[11px] text-muted-foreground/80 mt-0.5">{lastSeenLabel}</p>
              )}
            </div>
            {profile.bio && (
              <p className="text-[13px] text-foreground text-center max-w-[280px] mt-1 leading-snug">
                {profile.bio}
              </p>
            )}

            <div className="grid grid-cols-2 gap-2 w-full mt-4">
              <button type="button"
                onClick={handleMessage}
                disabled={isSelf}
                className="h-10 rounded-full bg-primary text-primary-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-40"
              >
                <MessageCircle className="h-4 w-4" />
                Message
              </button>
              <button type="button"
                onClick={handleViewProfile}
                className="h-10 rounded-full bg-muted text-foreground font-semibold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <ExternalLink className="h-4 w-4" />
                View profile
              </button>
            </div>

            {!isSelf && (
              <div className="grid grid-cols-2 gap-2 w-full">
                <button type="button"
                  onClick={handleAdd}
                  disabled={isContact || busy !== null}
                  className="h-10 rounded-full bg-card border border-border text-foreground font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {busy === "add" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : isContact ? (
                    <>
                      <UserCheck className="h-4 w-4" />
                      In contacts
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4" />
                      Add
                    </>
                  )}
                </button>
                <button type="button"
                  onClick={handleBlock}
                  disabled={busy !== null}
                  className="h-10 rounded-full bg-destructive/10 text-destructive font-medium text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform disabled:opacity-50"
                >
                  {busy === "block" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Ban className="h-4 w-4" />
                      Block
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
