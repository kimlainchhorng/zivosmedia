import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MoreHorizontal, MessageCircle, User, UserCircle, Share2 } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { getPostShareUrl, getProfileShareUrl, getPublicOrigin } from "@/lib/getPublicOrigin";
import SwipeableSheet from "@/components/social/SwipeableSheet";
import { track } from "@/lib/analytics";

interface ShareSheetProps {
  shareUrl: string;
  shareText: string;
  onClose: () => void;
  /** Use "absolute" for overlays inside a relative container (e.g. Reels), "fixed" for normal pages */
  positioning?: "fixed" | "absolute";
  zIndex?: number;
  /** Original media URL of the content being shared (for Share to Profile) */
  shareMediaUrl?: string;
  /** Original media type of the content being shared */
  shareMediaType?: "image" | "video";
  /** Original post ID being shared */
  sharePostId?: string;
  /** Original post's source table — needed so record_post_share knows
   *  whether to bump store_posts or user_posts. Defaults to "user". */
  postSource?: "store" | "user";
  /** Original post author's user ID */
  sharePostAuthorId?: string;
  /** Original post author's display name */
  sharePostAuthorName?: string;
  /** Callback to navigate to the post owner's profile */
  onVisitProfile?: () => void;
  /** Label for the visit profile button */
  visitProfileLabel?: string;
}

type ShareChannel =
  | "copy_link" | "native" | "email" | "sms"
  | "whatsapp" | "telegram" | "facebook" | "x" | "other";

// Map UnifiedShareSheet's external-button labels to the channel strings
// allowed by post_shares.channel CHECK constraint.
const CHANNEL_FROM_LABEL: Record<string, ShareChannel> = {
  whatsapp: "whatsapp",
  telegram: "telegram",
  facebook: "facebook",
  x: "x",
  email: "email",
  sms: "sms",
};
const toChannel = (label: string | undefined): ShareChannel => {
  const k = (label || "").toLowerCase();
  return CHANNEL_FROM_LABEL[k] ?? "other";
};

const SHARE_OPTION_BG_CLASS: Record<string, string> = {
  WhatsApp: "bg-green-500/15",
  Telegram: "bg-sky-500/15",
  Facebook: "bg-blue-600/15",
  X: "bg-zinc-900/10",
  Email: "bg-red-500/15",
  SMS: "bg-cyan-500/15",
  TikTok: "bg-zinc-900/10",
  Instagram: "bg-pink-500/15",
  Snapchat: "bg-yellow-400/30",
  LinkedIn: "bg-blue-700/15",
  Pinterest: "bg-rose-600/15",
  Reddit: "bg-orange-500/15",
};

export default function ShareSheet({
  shareUrl,
  shareText,
  onClose,
  positioning = "fixed",
  zIndex = 2000,
  shareMediaUrl,
  shareMediaType,
  sharePostId,
  postSource = "user",
  sharePostAuthorId,
  sharePostAuthorName,
  onVisitProfile,
  visitProfileLabel,
}: ShareSheetProps) {
  // Best-effort: log + bump shares_count via the record_post_share RPC.
  // Errors are swallowed so a failed share-count update never blocks the UX.
  const recordShare = (channel: ShareChannel) => {
    if (!sharePostId) return;
    void (supabase as any).rpc("record_post_share", {
      _post_id: sharePostId,
      _source: postSource,
      _channel: channel,
    }).then?.(({ error }: any) => {
      if (error) {
        // Surface as analytics only — never as a toast — to avoid
        // alarming the user when the share itself succeeded.
        track("share_count_failed", { post_id: sharePostId, channel, reason: error.message || "rpc_failed" });
      }
    });
  };
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [sharingToProfile, setSharingToProfile] = useState(false);
  const navigate = useNavigate();

  // Funnel: sheet opened
  useEffect(() => {
    track("share_sheet_opened", { post_id: sharePostId, author_id: sharePostAuthorId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.body.dataset.shareSheetOpen = "true";
    return () => {
      delete document.body.dataset.shareSheetOpen;
    };
  }, []);

  const normalizeShareUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      const postId = parsed.searchParams.get("post");
      if (postId && (parsed.pathname === "/reels" || parsed.pathname === "/feed")) {
        return getPostShareUrl(postId);
      }
    } catch {
      // Keep original URL if parsing fails.
    }

    return url;
  };

  const effectiveShareUrl = normalizeShareUrl(shareUrl);

  const shareEncodedUrl = encodeURIComponent(effectiveShareUrl);
  const shareEncodedText = encodeURIComponent(shareText);

  const handleCopyLink = () => {
    try {
      const ta = document.createElement("textarea");
      ta.value = effectiveShareUrl;
      ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Link copied!");
      track("share_completed", { post_id: sharePostId, author_id: sharePostAuthorId, channel: "copy_link" });
      recordShare("copy_link");
    } catch (e: any) {
      toast.info("Long-press URL bar to copy");
      track("share_failed", { post_id: sharePostId, author_id: sharePostAuthorId, channel: "copy_link", reason: e?.message || "copy_failed" });
    }
    onClose();
  };

  const handleOptionClick = (opt: { label?: string; url: string; copyMessage?: string }) => {
    const channel = (opt.label || "external").toLowerCase();
    if (opt.url === "__copy__") {
      handleCopyLink();
      if (opt.copyMessage) toast.success(opt.copyMessage);
      if (opt.label === "Facebook") {
        setTimeout(() => {
          import("@/lib/openExternalUrl").then(({ openExternalUrl }) =>
            openExternalUrl("https://www.facebook.com/")
          );
        }, 400);
      }
      track("share_completed", { post_id: sharePostId, author_id: sharePostAuthorId, channel });
      recordShare(toChannel(opt.label));
    } else {
      onClose();
      import("@/lib/openExternalUrl")
        .then(({ openExternalUrl }) => {
          openExternalUrl(opt.url);
          track("share_completed", { post_id: sharePostId, author_id: sharePostAuthorId, channel });
          recordShare(toChannel(opt.label));
        })
        .catch((e) => {
          track("share_failed", { post_id: sharePostId, author_id: sharePostAuthorId, channel, reason: e?.message || "external_open_failed" });
        });
    }
  };

  const handleShareToChat = () => {
    onClose();
    navigate("/chat", { state: { shareUrl: effectiveShareUrl, shareText } });
    toast.success("Select a chat to share");
  };

  const handleShareToProfile = async () => {
    if (sharingToProfile) return;
    setSharingToProfile(true);

    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!data.user) throw new Error("Please sign in to share");

      const insertData: any = {
        user_id: data.user.id,
        media_type: shareMediaType || "image",
        media_url: shareMediaUrl || null,
        caption: shareText.trim() || null,
        is_published: true,
      };

      if (sharePostId) insertData.shared_from_post_id = sharePostId;
      if (sharePostAuthorId) insertData.shared_from_user_id = sharePostAuthorId;

      const { error: insertError } = await (supabase as any).from("user_posts").insert(insertData);
      if (insertError) throw insertError;

      // Bump shares_count + log the share via record_post_share RPC.
      // (The RPC unifies what used to be a try-user-posts-then-store-posts dance.)
      recordShare("other");

      // Push notification to original post author about the share
      if (sharePostAuthorId && sharePostAuthorId !== data.user.id) {
        try {
          const { data: sp } = await supabase.from("profiles").select("full_name").eq("user_id", data.user.id).single();
          await supabase.functions.invoke("send-push-notification", {
            body: { user_id: sharePostAuthorId, notification_type: "post_shared", title: "Post Shared 🔄", body: `${sp?.full_name || "Someone"} shared your post`, data: { type: "post_shared", post_id: sharePostId, sharer_id: data.user.id, action_url: `/reels?post=${sharePostId}` } },
          });
        } catch {}
      }

      onClose();
      window.dispatchEvent(new CustomEvent("zivo-feed-refresh"));
      navigate("/reels", { replace: false });
      toast.success("Shared to profile");
      track("share_completed", { post_id: sharePostId, author_id: sharePostAuthorId, channel: "profile_repost" });
    } catch (error: any) {
      toast.error(error.message || "Failed to share to profile");
      track("share_failed", { post_id: sharePostId, author_id: sharePostAuthorId, channel: "profile_repost", reason: error?.message || "repost_failed" });
    } finally {
      setSharingToProfile(false);
    }
  };

  const handleShareAuthorProfile = async () => {
    if (!sharePostAuthorId) {
      toast.error("Author not available");
      return;
    }
    try {
      const { data } = await supabase
        .from("profiles")
        .select("share_code")
        .eq("user_id", sharePostAuthorId)
        .maybeSingle();
      const code = (data as any)?.share_code;
      const profileUrl = code
        ? getProfileShareUrl(code)
        : `${getPublicOrigin()}/user/${sharePostAuthorId}`;
      const text = `Check out ${sharePostAuthorName || "this profile"} on ZIVO`;
      try {
        if (navigator.share) {
          await navigator.share({ title: text, text, url: profileUrl });
          onClose();
          return;
        }
      } catch {}
      const ta = document.createElement("textarea");
      ta.value = profileUrl;
      ta.style.cssText = "position:fixed;opacity:0;left:-9999px";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      toast.success("Profile link copied!");
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to share profile");
    }
  };

  // ── In-app share options (first row) ────────────────────────────────────
  const inAppOptions = [
    { key: "chat", label: "Chat", icon: MessageCircle, color: "hsl(var(--primary))", onClick: handleShareToChat },
    { key: "profile", label: "Profile", icon: User, color: "hsl(var(--primary))", onClick: handleShareToProfile },
    ...(sharePostAuthorId ? [{ key: "share-profile", label: "Share Profile", icon: Share2, color: "hsl(var(--primary))", onClick: handleShareAuthorProfile }] : []),
    ...(onVisitProfile ? [{ key: "visit", label: visitProfileLabel || "Visit Profile", icon: UserCircle, color: "hsl(var(--primary))", onClick: () => { onClose(); onVisitProfile(); } }] : []),
  ];

  // ── External share options ──────────────────────────────────────────────
  const shareOptions = [
    { label: "WhatsApp", color: "#25D366", svg: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.654-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.531 3.488 11.821 11.821 0 0012.05 0zm0 21.785a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.981.998-3.648-.235-.374A9.86 9.86 0 012.15 11.892C2.15 6.443 6.602 1.992 12.053 1.992a9.84 9.84 0 016.988 2.899 9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.9-9.884 9.9z", url: `https://wa.me/?text=${shareEncodedText}%20${shareEncodedUrl}` },
    { label: "Telegram", color: "#0088CC", svg: "M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0h-.056zm5.091 8.104l-1.681 7.927c-.128.564-.46.701-.931.437l-2.57-1.894-1.24 1.193c-.137.137-.253.253-.519.253l.185-2.618 4.763-4.303c.207-.184-.045-.286-.321-.102l-5.889 3.71-2.537-.793c-.552-.172-.563-.552.115-.817l9.915-3.822c.459-.166.861.112.71.827z", url: `https://t.me/share/url?url=${shareEncodedUrl}&text=${shareEncodedText}` },
    { label: "Facebook", color: "#1877F2", svg: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z", url: "__copy__", copyMessage: "Link copied! Open Facebook and paste into a new post" },
    { label: "X", color: "#000000", svg: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z", url: `https://x.com/intent/tweet?text=${shareEncodedText}&url=${shareEncodedUrl}` },
    { label: "Email", color: "#EA4335", svg: "M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z", url: `mailto:?subject=${shareEncodedText}&body=${shareEncodedUrl}` },
    { label: "SMS", color: "#34B7F1", svg: "M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z", url: `sms:?body=${shareEncodedText}%20${shareEncodedUrl}` },
  ];

  const moreShareOptions = [
    { label: "TikTok", color: "#000000", svg: "M12.53.02C13.84 0 15.14.01 16.44 0c.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z", url: "__copy__", copyMessage: "Link copied! Paste it in TikTok" },
    { label: "Instagram", color: "#E4405F", svg: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z", url: "__copy__", copyMessage: "Link copied! Paste it in Instagram" },
    { label: "Snapchat", color: "#FFFC00", svg: "M12 0c-1.62 0-3.066.612-4.152 1.612C6.726 2.726 6.12 4.26 6.12 5.88c0 .66.108 1.32.264 1.956-.132.024-.276.036-.42.036-.384 0-.756-.108-1.08-.3a.636.636 0 00-.336-.096c-.264 0-.492.168-.564.42-.06.204-.012.408.12.564.516.588 1.2.96 1.944 1.14-.06.36-.18.708-.36 1.02-.36.636-.924 1.128-1.608 1.404a.648.648 0 00-.384.588c0 .24.132.456.336.576.66.384 1.38.576 2.1.612.072.324.156.66.264.984.06.18.252.3.444.3h.06c.468-.072 1.008-.156 1.536-.156.396 0 .78.048 1.14.192.516.204 1.044.54 1.74.54h.048c.696 0 1.224-.336 1.74-.54.36-.144.744-.192 1.14-.192.528 0 1.068.084 1.536.156h.06c.192 0 .384-.12.444-.3.108-.324.192-.66.264-.984.72-.036 1.44-.228 2.1-.612a.648.648 0 00.336-.576.648.648 0 00-.384-.588c-.684-.276-1.248-.768-1.608-1.404a3.588 3.588 0 01-.36-1.02c.744-.18 1.428-.552 1.944-1.14a.636.636 0 00.12-.564.588.588 0 00-.564-.42.636.636 0 00-.336.096c-.324.192-.696.3-1.08.3-.144 0-.288-.012-.42-.036.156-.636.264-1.296.264-1.956 0-1.62-.612-3.156-1.728-4.272C15.066.612 13.62 0 12 0z", url: `https://www.snapchat.com/scan?attachmentUrl=${shareEncodedUrl}` },
    { label: "LinkedIn", color: "#0A66C2", svg: "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z", url: `https://www.linkedin.com/sharing/share-offsite/?url=${shareEncodedUrl}` },
    { label: "Pinterest", color: "#E60023", svg: "M12 0C5.373 0 0 5.372 0 12c0 5.084 3.163 9.426 7.627 11.174-.105-.949-.2-2.405.042-3.441.218-.937 1.407-5.965 1.407-5.965s-.359-.719-.359-1.782c0-1.668.967-2.914 2.171-2.914 1.023 0 1.518.769 1.518 1.69 0 1.029-.655 2.568-.994 3.995-.283 1.194.599 2.169 1.777 2.169 2.133 0 3.772-2.249 3.772-5.495 0-2.873-2.064-4.882-5.012-4.882-3.414 0-5.418 2.561-5.418 5.207 0 1.031.397 2.138.893 2.738a.36.36 0 01.083.345l-.333 1.36c-.053.22-.174.267-.402.161-1.499-.698-2.436-2.889-2.436-4.649 0-3.785 2.75-7.262 7.929-7.262 4.163 0 7.398 2.967 7.398 6.931 0 4.136-2.607 7.464-6.227 7.464-1.216 0-2.359-.631-2.75-1.378l-.748 2.853c-.271 1.043-1.002 2.35-1.492 3.146C9.57 23.812 10.763 24 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0z", url: `https://pinterest.com/pin/create/button/?url=${shareEncodedUrl}&description=${shareEncodedText}` },
    { label: "Reddit", color: "#FF4500", svg: "M12 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0zm5.01 4.744c.688 0 1.25.561 1.25 1.249a1.25 1.25 0 01-2.498.056l-2.597-.547-.8 3.747c1.824.07 3.48.632 4.674 1.488.308-.309.73-.491 1.207-.491.968 0 1.754.786 1.754 1.754 0 .716-.435 1.333-1.01 1.614a3.111 3.111 0 01.042.52c0 2.694-3.13 4.87-7.004 4.87-3.874 0-7.004-2.176-7.004-4.87 0-.183.015-.366.043-.534A1.748 1.748 0 014.028 12c0-.968.786-1.754 1.754-1.754.463 0 .898.196 1.207.49 1.207-.883 2.878-1.43 4.744-1.487l.885-4.182a.342.342 0 01.14-.197.35.35 0 01.238-.042l2.906.617a1.214 1.214 0 011.108-.701zM9.25 12C8.561 12 8 12.562 8 13.25c0 .687.561 1.248 1.25 1.248.687 0 1.248-.561 1.248-1.249 0-.688-.561-1.249-1.249-1.249zm5.5 0c-.687 0-1.248.561-1.248 1.25 0 .687.561 1.248 1.249 1.248.688 0 1.249-.561 1.249-1.249 0-.687-.562-1.249-1.25-1.249zm-5.466 3.99a.327.327 0 00-.231.094.33.33 0 000 .463c.842.842 2.484.913 2.961.913.477 0 2.105-.056 2.961-.913a.361.361 0 000-.462.342.342 0 00-.462 0c-.545.533-1.684.73-2.512.73-.828 0-1.979-.196-2.512-.73a.326.326 0 00-.205-.095z", url: `https://reddit.com/submit?url=${shareEncodedUrl}&title=${shareEncodedText}` },
  ];

  return (
    <SwipeableSheet
      open
      onClose={onClose}
      title="Share to"
      ariaLabel="Share options"
      maxHeightVh={showMoreOptions ? 82 : 60}
      zIndex={zIndex}
      positioning={positioning}
    >

        {/* In-app sharing row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-5 py-3">
          {inAppOptions.map((opt) => (
            <button type="button"
              key={opt.key}
              onClick={opt.onClick}
              className="flex flex-col items-center gap-1.5 min-h-[44px]"
            >
              <div className="h-11 w-11 rounded-full bg-primary/10 flex items-center justify-center">
                <opt.icon className="h-5 w-5 text-primary" />
              </div>
              <span className="text-[11px] font-medium text-foreground">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* External sharing row */}
        <div className="grid grid-cols-4 gap-3 px-5 py-2.5 border-t border-border/10">
          {shareOptions.map((opt) => (
            <button type="button"
              key={opt.label}
              onClick={() => handleOptionClick(opt)}
              className="flex flex-col items-center gap-1.5 min-h-[44px]"
            >
              <div className={`h-11 w-11 rounded-full flex items-center justify-center ${SHARE_OPTION_BG_CLASS[opt.label] ?? "bg-muted/40"}`}>
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill={opt.color}><path d={opt.svg} /></svg>
              </div>
              <span className="text-[11px] font-medium text-foreground">{opt.label}</span>
            </button>
          ))}
          <button type="button" onClick={handleCopyLink} className="flex flex-col items-center gap-1.5 min-h-[44px]">
            <div className="h-11 w-11 rounded-full bg-muted/50 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
            </div>
            <span className="text-[11px] font-medium text-foreground">Copy link</span>
          </button>
          <button type="button" onClick={() => setShowMoreOptions(!showMoreOptions)} className="flex flex-col items-center gap-1.5 min-h-[44px]">
            <div className="h-11 w-11 rounded-full bg-muted/50 flex items-center justify-center">
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium text-foreground">{showMoreOptions ? "Less" : "More"}</span>
          </button>
        </div>

        <AnimatePresence>
          {showMoreOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="grid grid-cols-4 gap-3 px-5 py-2.5 border-t border-border/20">
                {moreShareOptions.map((opt) => (
                  <button type="button"
                    key={opt.label}
                    onClick={() => handleOptionClick(opt)}
                    className="flex flex-col items-center gap-1.5 min-h-[44px]"
                  >
                    <div className={`h-11 w-11 rounded-full flex items-center justify-center ${SHARE_OPTION_BG_CLASS[opt.label] ?? "bg-muted/40"}`}>
                      <svg viewBox="0 0 24 24" className="h-5 w-5" fill={opt.color}><path d={opt.svg} /></svg>
                    </div>
                    <span className="text-[11px] font-medium text-foreground">{opt.label}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
      </AnimatePresence>
    </SwipeableSheet>
  );
}
