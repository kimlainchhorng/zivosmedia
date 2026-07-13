/**
 * ChatContactInfo — Facebook Messenger-style contact info overlay
 * Opens when tapping the header / "Tap here for info" in PersonalChat
 * Enhanced with shared media thumbnails, mutual friends, favorites
 */

import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { getPublicOrigin, getProfileShareUrl } from "@/lib/getPublicOrigin";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import SafeCaption from "@/components/social/SafeCaption";
import ChatBackupExport from "./ChatBackupExport";
import MuteDurationSheet from "./MuteDurationSheet";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Bell from "lucide-react/dist/esm/icons/bell";
import BellOff from "lucide-react/dist/esm/icons/bell-off";
import Search from "lucide-react/dist/esm/icons/search";
import ImageIcon from "lucide-react/dist/esm/icons/image";
import ImagePlay from "lucide-react/dist/esm/icons/image-play";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import UserRound from "lucide-react/dist/esm/icons/user-round";
import Palette from "lucide-react/dist/esm/icons/palette";
import Shield from "lucide-react/dist/esm/icons/shield";
import Lock from "lucide-react/dist/esm/icons/lock";
import Ban from "lucide-react/dist/esm/icons/ban";
import Flag from "lucide-react/dist/esm/icons/flag";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Phone from "lucide-react/dist/esm/icons/phone";
import Video from "lucide-react/dist/esm/icons/video";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import History from "lucide-react/dist/esm/icons/history";
import Zap from "lucide-react/dist/esm/icons/zap";
import Clock from "lucide-react/dist/esm/icons/clock";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Star from "lucide-react/dist/esm/icons/star";
import StarOff from "lucide-react/dist/esm/icons/star-off";
import Gift from "lucide-react/dist/esm/icons/gift";
import Users from "lucide-react/dist/esm/icons/users";
import Copy from "lucide-react/dist/esm/icons/copy";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import BriefcaseBusiness from "lucide-react/dist/esm/icons/briefcase-business";
import Camera from "lucide-react/dist/esm/icons/camera";
import Hash from "lucide-react/dist/esm/icons/hash";
import Music2 from "lucide-react/dist/esm/icons/music-2";
import Send from "lucide-react/dist/esm/icons/send";
import Heart from "lucide-react/dist/esm/icons/heart";
import { toast } from "sonner";
import { openExternalUrl } from "@/lib/openExternalUrl";
import onlyfansLogo from "@/assets/brand-logos/onlyfans.png";
import Pin from "lucide-react/dist/esm/icons/pin";
import Archive from "lucide-react/dist/esm/icons/archive";
import Mail from "lucide-react/dist/esm/icons/mail";
import { useThreadSettings, buildThreadId } from "@/hooks/useThreadSettings";
import { useChatPrefs } from "@/hooks/useChatPrefs";
import { useSignedMedia } from "@/hooks/useSignedMedia";
import type { Database } from "@/integrations/supabase/types";
import {
  normalizeChatMediaMessages,
  type ChatMediaGalleryItem,
  type ChatMediaGalleryMessage,
} from "./chatMediaGalleryModel";

const CHAT_MEDIA_BUCKET = "chat-media-files";

type FollowingRow = {
  following_id: string;
};

type MutualProfileRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
};

type MutualFriend = {
  id: string;
  name: string;
  avatar: string | null;
};

type RecipientProfileRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  city: string | null;
  country: string | null;
  social_links_visible: boolean | null;
  social_facebook: string | null;
  social_onlyfans: string | null;
  social_instagram: string | null;
  social_tiktok: string | null;
  social_snapchat: string | null;
  social_x: string | null;
  social_linkedin: string | null;
  social_telegram: string | null;
};

type PublicTableName = keyof Database["public"]["Tables"];
const dbFrom = (table: PublicTableName) => (supabase as any).from(table);

interface ChatContactInfoProps {
  recipientId: string;
  recipientName: string;
  recipientAvatar?: string | null;
  isOnline?: boolean;
  lastSeen?: string | null;
  onClose: () => void;
  onStartCall?: (type: "voice" | "video") => void;
  onOpenMediaGallery?: () => void;
  onOpenSearch?: () => void;
  onOpenCallHistory?: () => void;
  onOpenPersonalization?: () => void;
  onOpenSecurity?: () => void;
  onOpenMiniApps?: () => void;
  onOpenNotifSettings?: () => void;
  onOpenFiles?: () => void;
  onOpenLinks?: () => void;
  onOpenGifs?: () => void;
  onOpenMusic?: () => void;
  onOpenGift?: () => void;
}

export default function ChatContactInfo({
  recipientId,
  recipientName,
  recipientAvatar,
  isOnline,
  lastSeen,
  onClose,
  onStartCall,
  onOpenMediaGallery,
  onOpenSearch,
  onOpenCallHistory,
  onOpenPersonalization,
  onOpenSecurity,
  onOpenMiniApps,
  onOpenNotifSettings,
  onOpenFiles,
  onOpenLinks,
  onOpenGifs,
  onOpenMusic,
  onOpenGift,
}: ChatContactInfoProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteBusy, setFavoriteBusy] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showMuteSheet, setShowMuteSheet] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    let alive = true;
    (async () => {
      const { data } = await dbFrom("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("item_type", "chat_user")
        .eq("item_id", recipientId)
        .maybeSingle();
      if (alive) setIsFavorite(!!data);
    })();
    return () => { alive = false; };
  }, [user?.id, recipientId]);
  const threadId = buildThreadId("dm", recipientId);
  const { isPinned, isArchived, isMuted, pin, unpin, archive, unarchive, mute, setMode, get: getThread } = useThreadSettings();
  const localPrefs = useChatPrefs(user?.id);
  // Hub list reads useChatPrefs (localStorage, raw recipient id). Mirror state from there
  // so the toggles below stay correct even before the cross-device row hydrates.
  const pinned = isPinned(threadId) || localPrefs.isPinned(recipientId);
  const archived = isArchived(threadId) || localPrefs.isArchived(recipientId);
  const muted = isMuted(threadId) || localPrefs.isMuted(recipientId);
  const notifMode = getThread(threadId).notification_mode;

  const initials = (recipientName || "U")
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Fetch shared media preview from the same message shape used by the full gallery.
  const { data: sharedMediaRows = [] } = useQuery({
    queryKey: ["chat-shared-media", user?.id, recipientId],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await dbFrom("direct_messages")
        .select("id, sender_id, image_url, video_url, voice_url, message_type, message, file_payload, created_at")
        .or(`and(sender_id.eq.${user!.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user!.id})`)
        .or("image_url.not.is.null,video_url.not.is.null,message_type.eq.image,message_type.eq.video,message_type.eq.gif,message_type.eq.media_album,message_type.eq.locked_image,message_type.eq.locked_video,message_type.eq.locked_album")
        .order("created_at", { ascending: false })
        .limit(80);
      return (data || []) as ChatMediaGalleryMessage[];
    },
  });

  const sharedMediaItems = useMemo(
    () => normalizeChatMediaMessages(sharedMediaRows, {
      currentUserId: user?.id,
      peerName: recipientName,
    }).filter((item) => item.kind === "photos" || item.kind === "videos" || item.kind === "gif").slice(0, 6),
    [recipientName, sharedMediaRows, user?.id],
  );

  // Fetch mutual friends
  const { data: mutualFriends = [] } = useQuery({
    queryKey: ["mutual-friends", user?.id, recipientId],
    enabled: !!user,
    queryFn: async () => {
      // Get my followers/following
      const [{ data: myFollowing }, { data: theirFollowing }] = await Promise.all([
        dbFrom("user_followers")
          .select("following_id")
          .eq("follower_id", user!.id),
        dbFrom("user_followers")
          .select("following_id")
          .eq("follower_id", recipientId),
      ]);

      if (!myFollowing?.length || !theirFollowing?.length) return [];

      const myRows = (myFollowing || []) as FollowingRow[];
      const theirRows = (theirFollowing || []) as FollowingRow[];
      const mySet = new Set(myRows.map((f) => f.following_id));
      const mutualIds = theirRows
        .map((f) => f.following_id)
        .filter((id: string) => mySet.has(id) && id !== user!.id && id !== recipientId);

      if (mutualIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, avatar_url")
        .in("user_id", mutualIds.slice(0, 8));

      return ((profiles || []) as MutualProfileRow[]).map((p): MutualFriend => ({
        id: p.user_id,
        name: p.full_name || "User",
        avatar: p.avatar_url || null,
      }));
    },
  });

  // Fetch recipient profile details
  const { data: recipientProfile } = useQuery({
    queryKey: ["recipient-profile", recipientId],
    queryFn: async () => {
      const { data } = await dbFrom("profiles")
        .select("user_id, full_name, avatar_url, bio, email, city, country, social_links_visible, social_facebook, social_onlyfans, social_instagram, social_tiktok, social_snapchat, social_x, social_linkedin, social_telegram")
        .eq("user_id", recipientId)
        .maybeSingle();
      return (data || null) as RecipientProfileRow | null;
    },
  });

  const socialLinks = (() => {
    if (!recipientProfile || recipientProfile.social_links_visible === false) return [] as { id: string; label: string; url: string }[];
    const buildUrl = (raw: string | null, prefix: string): string | null => {
      const v = (raw || "").trim();
      if (!v) return null;
      if (/^https?:\/\//i.test(v)) return v;
      return prefix + v.replace(/^@/, "");
    };
    const items = [
      { id: "facebook",  label: "Facebook",  url: buildUrl(recipientProfile.social_facebook,  "https://facebook.com/") },
      { id: "onlyfans",  label: "OnlyFans",  url: buildUrl(recipientProfile.social_onlyfans,  "https://onlyfans.com/") },
      { id: "instagram", label: "Instagram", url: buildUrl(recipientProfile.social_instagram, "https://instagram.com/") },
      { id: "x",         label: "X",         url: buildUrl(recipientProfile.social_x,         "https://x.com/") },
      { id: "tiktok",    label: "TikTok",    url: buildUrl(recipientProfile.social_tiktok,    "https://tiktok.com/@") },
      { id: "snapchat",  label: "Snapchat",  url: buildUrl(recipientProfile.social_snapchat,  "https://snapchat.com/add/") },
      { id: "linkedin",  label: "LinkedIn",  url: buildUrl(recipientProfile.social_linkedin,  "https://linkedin.com/in/") },
      { id: "telegram",  label: "Telegram",  url: buildUrl(recipientProfile.social_telegram,  "https://t.me/") },
    ];
    return items.filter((x): x is { id: string; label: string; url: string } => !!x.url);
  })();

  const handleViewProfile = () => {
    onClose();
    navigate(`/user/${recipientId}`);
  };

  const handleBlock = () => {
    toast.info(`Block ${recipientName}?`, {
      description: "Conversation will also be archived and muted.",
      action: {
        label: "Block",
        onClick: async () => {
          if (!user?.id) return;
          const { error } = await supabase.functions.invoke("block-user-manage", {
            body: { action: "block", blocked_id: recipientId },
          });
          if (error) {
            toast.error("Could not block");
            return;
          }
          // Defensive UX: hide the conversation and silence pings on block.
          try {
            if (!localPrefs.isArchived(recipientId)) localPrefs.toggleArchive(recipientId);
            if (!localPrefs.isMuted(recipientId)) localPrefs.toggleMute(recipientId);
            await Promise.all([archive(threadId), mute(threadId, 0)]);
          } catch { /* non-fatal; block already succeeded */ }
          toast.success(`${recipientName} blocked`);
        },
      },
    });
  };

  const handleReport = () => {
    toast.info(`Report ${recipientName}?`, {
      action: {
        label: "Report",
        onClick: async () => {
          if (!user?.id) return;
          const { error } = await dbFrom("user_reports").insert({
            reporter_id: user.id,
            reported_id: recipientId,
            reason: "chat_profile",
            details: `Reported from chat contact info for ${recipientName}`,
          });
          if (error) {
            toast.error("Could not submit report");
            return;
          }
          toast.success("Report submitted", {
            description: `Want to block ${recipientName} too?`,
            action: {
              label: "Block",
              onClick: handleBlock,
            },
          });
        },
      },
    });
  };

  const handleDeleteConversation = () => {
    toast.info("Delete this entire conversation?", {
      action: {
        label: "Delete",
        onClick: async () => {
          if (!user?.id) return;
          const { error } = await dbFrom("direct_messages")
            .delete()
            .or(`and(sender_id.eq.${user.id},receiver_id.eq.${recipientId}),and(sender_id.eq.${recipientId},receiver_id.eq.${user.id})`);
          if (error) {
            toast.error("Could not delete conversation");
            return;
          }
          toast.success("Conversation deleted");
          onClose();
        },
      },
    });
  };

  const handleCopyProfile = async () => {
    const { data: byProfileId } = await supabase
      .from("profiles")
      .select("id, share_code")
      .eq("id", recipientId)
      .maybeSingle();

    const data = byProfileId ?? (await supabase
      .from("profiles")
      .select("id, share_code")
      .eq("user_id", recipientId)
      .maybeSingle()).data;

    const targetId = data?.id || recipientId;
    const url = data?.share_code ? getProfileShareUrl(data.share_code) : `${getPublicOrigin()}/user/${targetId}`;
    navigator.clipboard.writeText(url);
    toast.success("Profile link copied");
  };

  const toggleFavorite = async () => {
    if (!user?.id || favoriteBusy) return;
    setFavoriteBusy(true);
    const next = !isFavorite;
    setIsFavorite(next);
    try {
      if (next) {
        const { error } = await dbFrom("user_favorites").insert({
          user_id: user.id,
          item_type: "chat_user",
          item_id: recipientId,
          item_data: { name: recipientName, avatar_url: recipientAvatar },
        });
        if (error && !String(error.message).match(/duplicate|unique/i)) throw error;
        toast.success("Added to favorites");
      } else {
        const { error } = await dbFrom("user_favorites")
          .delete()
          .eq("user_id", user.id)
          .eq("item_type", "chat_user")
          .eq("item_id", recipientId);
        if (error) throw error;
        toast.success("Removed from favorites");
      }
    } catch (e) {
      setIsFavorite(!next);
      toast.error("Couldn't update favorite");
    } finally {
      setFavoriteBusy(false);
    }
  };

  return (
    <motion.div
      className="fixed inset-0 z-[60] flex flex-col bg-background"
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", damping: 25, stiffness: 300 }}
    >
      {/* Header */}
      <div className="zivo-chat-header-glass sticky top-0 z-10 safe-area-top">
        <div className="px-2 py-2.5 flex items-center gap-3">
          <button type="button"
            onClick={onClose}
            className="zivo-chat-icon-button min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-[22px] w-[22px] text-foreground" />
          </button>
          <div>
            <p className="text-ig-gradient text-[9.5px] font-black uppercase tracking-[0.22em]">Profile room</p>
            <p className="text-[16px] font-black text-foreground tracking-tight leading-tight">Contact Info</p>
          </div>
          <div className="flex-1" />
          <button type="button"
            onClick={handleCopyProfile}
            className="zivo-chat-icon-button min-h-[44px] min-w-[44px] flex items-center justify-center active:scale-90 transition-transform"
            aria-label="Copy profile link"
            title="Copy profile link"
          >
            <ExternalLink className="h-[18px] w-[18px] text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto scrollbar-hide overscroll-contain">
        {/* Profile hero */}
        <div className="mx-4 mt-3 flex flex-col items-center rounded-[1.75rem] border border-white/10 bg-background/45 px-4 pb-3 pt-5 shadow-xl backdrop-blur-2xl">
          <div className="relative">
            <div className="ring-ig-gradient rounded-full p-[3px] shadow-[0_2px_16px_rgba(236,72,153,0.22)]">
              <Avatar className="h-[78px] w-[78px] ring-[2.5px] ring-background/80">
                <AvatarImage src={recipientAvatar || undefined} className="object-cover" />
                <AvatarFallback className="text-[22px] font-black bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </div>
            {isOnline && (
              <span className="absolute bottom-1 right-1 h-[14px] w-[14px] rounded-full bg-emerald-500 border-[2px] border-background shadow-sm" />
            )}
          </div>
          <h2 className="text-[18px] font-black text-foreground mt-2.5 text-center leading-tight">
            {recipientName}
          </h2>
          {recipientProfile?.bio && (
            <p className="text-[13px] text-muted-foreground text-center mt-1 max-w-[240px] line-clamp-2">
              <SafeCaption text={recipientProfile.bio} />
            </p>
          )}
          <div className="flex items-center gap-1.5 mt-1">
            {isOnline ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[12px] font-bold text-emerald-600">Active now</span>
              </>
            ) : lastSeen ? (
              <>
                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">Last seen {lastSeen}</span>
              </>
            ) : (
              <>
                <Clock className="h-2.5 w-2.5 text-muted-foreground" />
                <span className="text-[12px] text-muted-foreground">Offline</span>
              </>
            )}
          </div>
          {recipientProfile?.city && (
            <p className="text-[10.5px] text-muted-foreground/70 mt-0.5">
              📍 {recipientProfile.city}{recipientProfile.country ? `, ${recipientProfile.country}` : ""}
            </p>
          )}
        </div>

        {/* Quick action buttons row */}
        <div className="mx-4 mt-2 mb-1 rounded-[1.75rem] border border-white/10 bg-background/40 px-3 py-3 shadow-sm backdrop-blur-xl">
          <div className="flex justify-around">
            {[
              { icon: Phone, label: "Audio", action: () => onStartCall?.("voice") },
              { icon: Video, label: "Video", action: () => onStartCall?.("video") },
              { icon: Gift, label: "Gift", action: onOpenGift },
              { icon: Search, label: "Search", action: onOpenSearch },
              { icon: UserRound, label: "Profile", action: handleViewProfile },
              { icon: isFavorite ? StarOff : Star, label: isFavorite ? "Unfav" : "Favorite", action: toggleFavorite },
            ].map(({ icon: Icon, label, action }) => (
              <motion.button type="button"
                key={label}
                whileTap={{ scale: 0.88 }}
                onClick={action}
                className="flex flex-col items-center gap-1.5"
                aria-label={label}
                title={label}
              >
                <div className="bg-muted/60 flex h-10 w-10 items-center justify-center rounded-2xl border border-border/30 shadow-sm">
                  <Icon className="h-[16px] w-[16px] text-foreground/80" />
                </div>
                <span className="text-[9.5px] font-black text-muted-foreground tracking-wide">
                  {label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        <div className="mx-4 h-px bg-border/35" />

        {/* Shared Media Preview */}
        {sharedMediaItems.length > 0 && (
          <>
            <Section title="Shared Media">
              <div className="px-4 pb-3">
                <div className="grid grid-cols-3 gap-2 overflow-hidden rounded-2xl">
                  {sharedMediaItems.map((item) => (
                    <SharedMediaTile
                      key={item.id}
                      item={item}
                      onOpen={onOpenMediaGallery}
                    />
                  ))}
                </div>
                <button type="button"
                  onClick={onOpenMediaGallery}
                  className="bg-ig-gradient mt-3 w-full flex items-center justify-center rounded-full py-2 text-[11px] font-black text-white shadow-[0_2px_8px_rgba(236,72,153,0.25)] active:opacity-80 transition-opacity"
                >
                  View All Media →
                </button>
              </div>
            </Section>
            <div className="mx-4 h-px bg-border/35" />
          </>
        )}

        {/* Social Links — recipient's external profiles (Facebook, OnlyFans, Instagram, etc.) */}
        {socialLinks.length > 0 && (
          <>
            <Section title="Social Links">
              <div className="px-4 pb-3 grid grid-cols-2 gap-2">
                {socialLinks.map((link) => {
                  const meta = SOCIAL_META[link.id];
                  if (!meta) return null;
                  const Icon = meta.icon;
                  return (
                    <button type="button"
                      key={link.id}
                      onClick={async () => {
                        try { await openExternalUrl(link.url); }
                        catch { toast.error("Couldn't open link"); }
                      }}
                      className="zivo-chat-row flex items-center gap-3 px-3 py-2.5 active:scale-[0.98]"
                    >
                      <div className={`w-9 h-9 rounded-xl ${meta.color} flex items-center justify-center flex-shrink-0 overflow-hidden ${meta.brandImage ? "border border-border/40" : ""}`}>
                        {meta.brandImage ? (
	                          <img
	                            src={meta.brandImage}
	                            alt={link.label}
	                            className="w-7 h-7 object-contain"
	                            loading="lazy"
	                            decoding="async"
	                          />
                        ) : (
                          <Icon className="w-[16px] h-[16px] text-white" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1 text-left">
                        <p className="text-[13px] font-black text-foreground">{link.label}</p>
                        <p className="text-[11px] font-semibold text-muted-foreground truncate">{link.url.replace(/^https?:\/\//, "")}</p>
                      </div>
                      <ExternalLink className="w-3.5 h-3.5 text-muted-foreground/60 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
              <button type="button"
                onClick={() => {
                  const text = socialLinks.map((l) => `${l.label}: ${l.url}`).join("\n");
                  navigator.clipboard.writeText(text);
                  toast.success(`Copied ${socialLinks.length} link${socialLinks.length > 1 ? "s" : ""}`);
                }}
                className="w-full px-4 pb-3 -mt-1 text-[12px] font-black text-primary text-center active:opacity-70"
              >
                Copy all links
              </button>
            </Section>
            <div className="mx-4 h-px bg-border/35" />
          </>
        )}

        {/* Mutual Friends */}
        {mutualFriends.length > 0 && (
          <>
            <Section title={`${mutualFriends.length} Mutual Friend${mutualFriends.length > 1 ? "s" : ""}`}>
              <div className="px-4 pb-3">
                <div className="flex flex-wrap gap-2">
                  {mutualFriends.slice(0, 6).map((friend) => (
                    <button type="button"
                      key={friend.id}
                      onClick={() => { onClose(); navigate(`/user/${friend.id}`); }}
                      className="zivo-chat-chip flex items-center gap-2 px-3 py-2 active:scale-95 transition-transform"
                    >
                      <div className="w-7 h-7 rounded-full overflow-hidden bg-muted flex-shrink-0">
                        {friend.avatar ? (
	                          <img
	                            src={friend.avatar}
	                            alt=""
	                            className="w-full h-full object-cover"
	                            loading="lazy"
	                            decoding="async"
	                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                            {friend.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <span className="text-xs font-bold text-foreground max-w-[80px] truncate">
                        {friend.name.split(" ")[0]}
                      </span>
                    </button>
                  ))}
                </div>
                {mutualFriends.length > 6 && (
                  <p className="text-[11px] text-muted-foreground mt-2 px-1">
                    +{mutualFriends.length - 6} more mutual friends
                  </p>
                )}
              </div>
            </Section>
            <div className="mx-4 h-px bg-border/35" />
          </>
        )}

        {/* Sections */}
        <div className="pb-24">
          {/* Media & Files section */}
          <Section title="Media, Files & Links">
            <SectionButton icon={ImageIcon} label="Media" chevron onClick={onOpenMediaGallery} />
            <SectionButton icon={ImagePlay} label="GIFs" chevron onClick={onOpenGifs} />
            <SectionButton icon={Music2} label="Music" chevron onClick={onOpenMusic} />
            <SectionButton icon={FileText} label="Files" chevron onClick={onOpenFiles} />
            <SectionButton icon={Link2} label="Links" chevron onClick={onOpenLinks} />
          </Section>
          <div className="mx-4 my-1.5 h-px bg-border/35" />

          {/* Customize section */}
          <Section title="Customize Chat">
            <SectionButton
              icon={Pin}
              label={pinned ? "Unpin Conversation" : "Pin Conversation"}
              onClick={async () => {
                if (pinned) {
                  if (localPrefs.isPinned(recipientId)) localPrefs.togglePin(recipientId);
                  await unpin(threadId);
                  toast.success("Conversation unpinned");
                } else {
                  if (!localPrefs.isPinned(recipientId)) localPrefs.togglePin(recipientId);
                  await pin(threadId);
                  toast.success("Pinned to top");
                }
              }}
            />
            <SectionButton
              icon={Mail}
              label={localPrefs.isMarkedUnread(recipientId) ? "Mark as Read" : "Mark as Unread"}
              onClick={() => {
                const wasUnread = localPrefs.isMarkedUnread(recipientId);
                localPrefs.toggleMarkUnread(recipientId);
                toast.success(wasUnread ? "Marked as read" : "Marked as unread");
              }}
            />
            <SectionButton
              icon={Archive}
              label={archived ? "Unarchive Conversation" : "Archive Conversation"}
              onClick={async () => {
                if (archived) {
                  if (localPrefs.isArchived(recipientId)) localPrefs.toggleArchive(recipientId);
                  await unarchive(threadId);
                  toast.success("Restored from archive");
                } else {
                  if (!localPrefs.isArchived(recipientId)) localPrefs.toggleArchive(recipientId);
                  await archive(threadId);
                  toast.success("Conversation archived");
                }
              }}
            />
            <SectionButton icon={Palette} label="Theme & Wallpaper" chevron onClick={onOpenPersonalization} />
            <SectionButton icon={Zap} label="Mini Apps" chevron onClick={onOpenMiniApps} />
            <SectionButton icon={History} label="Call History" chevron onClick={onOpenCallHistory} />
            <SectionButton icon={FileText} label="Export Chat" chevron onClick={() => setShowExport(true)} />
          </Section>

          <ChatBackupExport open={showExport} onClose={() => setShowExport(false)} recipientId={recipientId} recipientName={recipientName} />

          <div className="mx-4 my-1.5 h-px bg-border/35" />

          {/* Notifications */}
          <Section title="Notifications">
            <button type="button"
              onClick={() => setShowMuteSheet(true)}
              className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 transition-colors hover:bg-muted/20"
            >
              <div className="flex items-center gap-2.5">
                <div className="zivo-chat-avatar-ring h-8 w-8 shrink-0 rounded-full flex items-center justify-center">
                  {muted ? (
                    <BellOff className="h-[14px] w-[14px] text-muted-foreground" />
                  ) : (
                    <Bell className="h-[14px] w-[14px] text-muted-foreground" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-[13px] font-black text-foreground">
                    {muted ? "Notifications muted" : "Mute Notifications"}
                  </p>
                  {muted && (() => {
                    const until = getThread(threadId).muted_until;
                    if (!until) return null;
                    if (until.startsWith("2099")) return <p className="text-[10.5px] text-muted-foreground mt-0.5">Forever — tap to change</p>;
                    return <p className="text-[10.5px] text-muted-foreground mt-0.5">Until {new Date(until).toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>;
                  })()}
                </div>
              </div>
              <ChevronRight className="h-[14px] w-[14px] text-muted-foreground/40" />
            </button>
            <MuteDurationSheet
              open={showMuteSheet}
              onClose={() => setShowMuteSheet(false)}
              isMuted={muted}
              threadName={recipientName}
              onPick={async (hours) => {
                if (hours < 0) {
                  if (localPrefs.isMuted(recipientId)) localPrefs.toggleMute(recipientId);
                  await mute(threadId, -1);
                  toast.success("Unmuted");
                } else {
                  if (!localPrefs.isMuted(recipientId)) localPrefs.toggleMute(recipientId);
                  await mute(threadId, hours);
                  toast.success(hours === 0 ? "Muted forever" : `Muted for ${hours < 24 ? `${hours}h` : hours === 24 ? "1 day" : `${hours / 24} days`}`);
                }
              }}
            />
            <div className="px-3 py-2 flex items-center justify-between gap-3">
              <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
                Notification Mode
              </span>
              <div className="zivo-chat-chip flex rounded-full p-0.5">
                {(["all", "mentions", "none"] as const).map((m) => (
                  <button type="button"
                    key={m}
                    onClick={async () => {
                      await setMode(threadId, m);
                      toast.success(m === "all" ? "All messages" : m === "mentions" ? "Mentions only" : "Silenced");
                    }}
                    className={`px-2.5 py-1 rounded-full text-[10.5px] font-black transition-all ${
                      notifMode === m
                        ? "bg-ig-gradient text-white shadow-[0_2px_8px_rgba(236,72,153,0.25)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m === "all" ? "All" : m === "mentions" ? "Mentions" : "Off"}
                  </button>
                ))}
              </div>
            </div>
            <SectionButton
              icon={MessageCircle}
              label="Notification Settings"
              chevron
              onClick={onOpenNotifSettings}
            />
          </Section>

          <div className="mx-4 my-1.5 h-px bg-border/35" />

          {/* Privacy & Safety */}
          <Section title="Privacy & Safety">
            <SectionButton
              icon={Lock}
              label="Start Secret Chat"
              chevron
              onClick={() => navigate(`/chat/secret/${recipientId}`)}
            />
            <SectionButton icon={Shield} label="Privacy Settings" chevron onClick={onOpenSecurity} />
            <SectionButton icon={Ban} label="Block" className="text-destructive" onClick={handleBlock} />
            <SectionButton icon={Flag} label="Report" className="text-destructive" onClick={handleReport} />
          </Section>

          <div className="mx-4 my-1.5 h-px bg-border/35" />

          {/* Delete conversation */}
          <div className="py-1.5">
            <button type="button"
              onClick={handleDeleteConversation}
              className="zivo-chat-row mx-4 w-[calc(100%-2rem)] flex items-center gap-2.5 px-3 py-2.5 text-destructive"
            >
              <div className="h-8 w-8 shrink-0 rounded-full bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-[14px] w-[14px] text-destructive" />
              </div>
              <span className="text-[13px] font-black text-destructive">
                Delete Conversation
              </span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Helpers ─── */

const SOCIAL_META: Record<string, { icon: React.ComponentType<{ className?: string }>; color: string; brandImage?: string }> = {
  facebook:  { icon: MessageCircle, color: "bg-[#1877F2]" },
  onlyfans:  { icon: Heart,     color: "bg-white", brandImage: onlyfansLogo },
  instagram: { icon: Camera,    color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]" },
  x:         { icon: AtSign,    color: "bg-black" },
  tiktok:    { icon: Music2,    color: "bg-black" },
  snapchat:  { icon: Hash,      color: "bg-[#FFFC00]" },
  linkedin:  { icon: BriefcaseBusiness, color: "bg-[#0A66C2]" },
  telegram:  { icon: Send,      color: "bg-[#229ED9]" },
};

function SharedMediaTile({
  item,
  onOpen,
}: {
  item: ChatMediaGalleryItem;
  onOpen?: () => void;
}) {
  const isVideo = item.kind === "videos";
  const resolvedUrl = useSignedMedia(item.url, CHAT_MEDIA_BUCKET, isVideo ? "display" : "thumbnail");
  const [failed, setFailed] = useState(false);
  const label = isVideo ? "Open shared video" : item.kind === "gif" ? "Open shared GIF" : "Open shared photo";
  const showFallback = !resolvedUrl || failed;

  useEffect(() => {
    setFailed(false);
  }, [resolvedUrl]);

  return (
    <button type="button"
      onClick={onOpen}
      className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-muted/50 shadow-sm"
      aria-label={label}
      title={label}
    >
      {showFallback ? (
        <div className="flex h-full w-full items-center justify-center bg-muted/70">
          {isVideo ? (
            <Video className="h-6 w-6 text-muted-foreground/70" />
          ) : (
            <ImageIcon className="h-6 w-6 text-muted-foreground/70" />
          )}
        </div>
      ) : isVideo ? (
        <video
          src={resolvedUrl}
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          preload="metadata"
          muted
          playsInline
          onError={() => setFailed(true)}
        />
      ) : (
        <img
          src={resolvedUrl}
          alt=""
          className="h-full w-full object-cover transition-transform group-hover:scale-105"
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
        />
      )}
      {(isVideo || item.kind === "gif" || item.locked) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
          <span className="rounded-full bg-black/65 px-2 py-1 text-[10px] font-black text-white shadow-lg backdrop-blur-md">
            {item.locked ? "Preview" : item.kind === "gif" ? "GIF" : "Video"}
          </span>
        </div>
      )}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1">
      <p className="text-ig-gradient px-4 pt-2 pb-1 text-[10px] font-black uppercase tracking-[0.14em]">
        {title}
      </p>
      <div className="mx-4 rounded-3xl border border-white/10 bg-background/40 py-0.5 shadow-sm backdrop-blur-xl">{children}</div>
    </div>
  );
}

function SectionButton({
  icon: Icon,
  label,
  chevron,
  className,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  chevron?: boolean;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 rounded-2xl px-3 py-2.5 active:bg-muted/40 transition-colors hover:bg-muted/20"
    >
      <div className={`h-8 w-8 shrink-0 rounded-full flex items-center justify-center ${className ? "bg-destructive/10" : "zivo-chat-avatar-ring"}`}>
        <Icon className={`h-[14px] w-[14px] ${className || "text-muted-foreground"}`} />
      </div>
      <span className={`text-[13px] font-bold flex-1 text-left ${className || "text-foreground"}`}>
        {label}
      </span>
      {chevron && <ChevronRight className="h-[14px] w-[14px] text-muted-foreground/40" />}
    </button>
  );
}
