/**
 * ChatSocialShareSheet — Bottom sheet to share an external social profile link
 * inside a chat (Facebook, OnlyFans, Instagram, X, TikTok, YouTube, Snapchat,
 * Telegram, LinkedIn). Prefills the user's saved handle from their profile and
 * lets them edit before sending. Resulting URL is appended to the composer
 * input via `onShareLink`.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import X from "lucide-react/dist/esm/icons/x";
import Heart from "lucide-react/dist/esm/icons/heart";
import LinkIcon from "lucide-react/dist/esm/icons/link";
import UserRound from "lucide-react/dist/esm/icons/user-round";
import FacebookLogo from "@/lib/icons/facebook";
import InstagramLogo from "@/lib/icons/instagram";
import LinkedinLogo from "@/lib/icons/linkedin";
import XLogo from "@/lib/icons/twitter";
import YoutubeLogo from "@/lib/icons/youtube";
import { useAuth } from "@/contexts/AuthContext";
import { getProfileShareUrl, getPublicOrigin } from "@/lib/getPublicOrigin";
import { supabase } from "@/integrations/supabase/client";
import { useUserProfile } from "@/hooks/useUserProfile";
import { openExternalUrl } from "@/lib/openExternalUrl";
import onlyfansLogo from "@/assets/brand-logos/onlyfans.png";

type Platform =
  | "facebook"
  | "onlyfans"
  | "instagram"
  | "x"
  | "tiktok"
  | "youtube"
  | "snapchat"
  | "telegram"
  | "linkedin"
  | "spotify"
  | "applemusic"
  | "soundcloud"
  | "ytmusic";

type BrandIconProps = { className?: string };

function TikTokLogo({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.6 2c.4 2.4 1.8 4 4.1 4.2v3.4c-1.6.1-3.1-.4-4.4-1.3v6.4c0 4.2-2.5 7.1-6.4 7.1-3.5 0-6.3-2.4-6.3-5.8 0-3.6 2.9-6.1 6.8-5.8v3.5c-1.7-.3-3 .6-3 2.1 0 1.4 1.1 2.3 2.5 2.3 1.7 0 2.7-1 2.7-3.4V2h4Z" />
    </svg>
  );
}

function SnapchatLogo({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2.2c-3 0-5.2 2.2-5.2 5.3 0 .6.1 1.2.2 1.7-.4.2-.9.3-1.4.3-.8 0-1.2.9-.6 1.5.7.7 1.5 1.1 2.3 1.3-.3 1.1-1.1 2-2.3 2.5-.7.3-.7 1.3 0 1.7.7.4 1.5.6 2.3.6.2.5.4 1.1.6 1.6.2.5.7.7 1.2.6.8-.2 1.5-.3 2.1 0 .5.2 1 .7 1.8.7s1.3-.5 1.8-.7c.6-.3 1.3-.2 2.1 0 .5.1 1-.1 1.2-.6.2-.5.4-1.1.6-1.6.8 0 1.6-.2 2.3-.6.7-.4.7-1.4 0-1.7-1.2-.5-2-1.4-2.3-2.5.8-.2 1.6-.6 2.3-1.3.6-.6.2-1.5-.6-1.5-.5 0-1-.1-1.4-.3.1-.5.2-1.1.2-1.7 0-3.1-2.2-5.3-5.2-5.3Z" />
    </svg>
  );
}

function TelegramLogo({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21.7 3.4 18.5 20c-.2 1.1-.9 1.4-1.8.9l-5-3.7-2.4 2.3c-.3.3-.5.5-1 .5l.4-5.1L18 6.5c.4-.4-.1-.6-.6-.2L5.9 13.5 1 12c-1.1-.3-1.1-1.1.2-1.6L20.4 3c.9-.3 1.6.2 1.3.4Z" />
    </svg>
  );
}

function SpotifyLogo({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.6 14.4c-.2.3-.6.4-.9.2-2.5-1.5-5.6-1.8-9.3-1-.4.1-.7-.1-.8-.5-.1-.4.1-.7.5-.8 4-.9 7.5-.5 10.3 1.1.3.3.4.7.2 1Zm1.2-2.7c-.3.4-.7.5-1.1.3-2.8-1.7-7.2-2.2-10.5-1.2-.4.1-.9-.1-1-.6-.1-.4.1-.9.6-1 3.8-1.1 8.7-.6 12 1.4.4.2.5.7.2 1.1Zm.1-2.8C14.5 8.9 8.8 8.7 5.6 9.7c-.5.2-1-.1-1.2-.6-.2-.5.1-1 .6-1.2 3.7-1.1 10-.9 13.9 1.4.5.3.6.9.3 1.3-.3.5-.8.6-1.3.3Z" />
    </svg>
  );
}

function AppleMusicLogo({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M18.8 3.1c.4.3.7.8.7 1.4v10.8c0 2.1-1.4 3.4-3.4 3.4-1.6 0-2.8-.9-2.8-2.2s1.1-2.3 2.8-2.3c.5 0 1 .1 1.4.3V8.2l-8.6 1.7v7.5c0 2.1-1.4 3.4-3.4 3.4-1.6 0-2.8-.9-2.8-2.2s1.1-2.3 2.8-2.3c.5 0 .9.1 1.4.3V7c0-.8.5-1.5 1.3-1.7l8.8-1.8c.6-.1 1.2 0 1.8.4Z" />
    </svg>
  );
}

function SoundCloudLogo({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M9.7 8.5c.3 0 .5.2.5.5v8.4c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9c0-.3.2-.5.5-.5Zm-2 .9c.3 0 .5.2.5.5v7.5c0 .3-.2.5-.5.5s-.5-.2-.5-.5V9.9c0-.3.2-.5.5-.5Zm-2 .9c.3 0 .5.2.5.5v6.6c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-6.6c0-.3.2-.5.5-.5Zm-2 .9c.3 0 .5.2.5.5v5.7c0 .3-.2.5-.5.5s-.5-.2-.5-.5v-5.7c0-.3.2-.5.5-.5Zm8-4c2.9 0 5.3 2.1 5.8 4.9.3-.1.7-.2 1.1-.2 2.1 0 3.8 1.7 3.8 3.8s-1.7 3.8-3.8 3.8h-6.9c-.3 0-.5-.2-.5-.5V7.7c0-.3.2-.5.5-.5Z" />
    </svg>
  );
}

function YouTubeMusicLogo({ className }: BrandIconProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 3.2a6.8 6.8 0 1 1 0 13.6 6.8 6.8 0 0 1 0-13.6Zm-2.2 3.7v6.2l5.3-3.1-5.3-3.1Z" />
    </svg>
  );
}

const PLATFORMS: {
  id: Platform;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  brandImage?: string;
  color: string;
  prefix: string;
  placeholder: string;
}[] = [
  { id: "facebook",  label: "Facebook",  icon: FacebookLogo, color: "bg-[#1877F2]",                                  prefix: "https://facebook.com/",   placeholder: "yourname" },
  { id: "onlyfans",  label: "OnlyFans",  icon: Heart,     brandImage: onlyfansLogo, color: "bg-white",                prefix: "https://onlyfans.com/",   placeholder: "yourname" },
  { id: "instagram", label: "Instagram", icon: InstagramLogo, color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]", prefix: "https://instagram.com/", placeholder: "yourname" },
  { id: "x",         label: "X",         icon: XLogo,        color: "bg-black",                                      prefix: "https://x.com/",          placeholder: "yourname" },
  { id: "tiktok",    label: "TikTok",    icon: TikTokLogo,   color: "bg-black",                                      prefix: "https://tiktok.com/@",    placeholder: "yourname" },
  { id: "youtube",   label: "YouTube",   icon: YoutubeLogo,  color: "bg-[#FF0000]",                                  prefix: "https://youtube.com/@",   placeholder: "yourchannel" },
  { id: "snapchat",  label: "Snapchat",  icon: SnapchatLogo, color: "bg-[#FFFC00] text-black",                       prefix: "https://snapchat.com/add/", placeholder: "yourname" },
  { id: "telegram",  label: "Telegram",  icon: TelegramLogo, color: "bg-[#229ED9]",                                  prefix: "https://t.me/",           placeholder: "yourname" },
  { id: "linkedin",  label: "LinkedIn",  icon: LinkedinLogo, color: "bg-[#0A66C2]",                                  prefix: "https://linkedin.com/in/", placeholder: "yourname" },
  { id: "spotify",    label: "Spotify",     icon: SpotifyLogo,      color: "bg-[#1DB954]", prefix: "https://open.spotify.com/user/",  placeholder: "your-spotify-id or paste track URL" },
  { id: "applemusic", label: "Apple Music", icon: AppleMusicLogo,   color: "bg-[#FA243C]", prefix: "https://music.apple.com/profile/", placeholder: "your-apple-id or paste song URL" },
  { id: "soundcloud", label: "SoundCloud",  icon: SoundCloudLogo,   color: "bg-[#FF5500]", prefix: "https://soundcloud.com/",          placeholder: "yourname or paste track URL" },
  { id: "ytmusic",    label: "YT Music",    icon: YouTubeMusicLogo, color: "bg-[#FF0000]", prefix: "https://music.youtube.com/channel/", placeholder: "channel id or paste song URL" },
];

export interface SocialCardPayload {
  platform: string;
  platform_label: string;
  url: string;
  handle: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** Receives a final URL to insert/append into the composer. */
  onShareLink: (url: string) => void;
  /** When provided, the sheet's primary action sends a structured social card
   *  bubble; falls back to onShareLink (text-only) when omitted. */
  onShareSocialCard?: (payload: SocialCardPayload) => void;
}

const RECENT_KEY = "chat:social-share:recent";

function loadRecent(): Platform[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.filter((p): p is Platform => PLATFORMS.some((x) => x.id === p));
  } catch { return []; }
}

function pushRecent(p: Platform) {
  try {
    const current = loadRecent().filter((x) => x !== p);
    const next = [p, ...current].slice(0, 4);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch { /* noop */ }
}

export default function ChatSocialShareSheet({ open, onClose, onShareLink, onShareSocialCard }: Props) {
  const { data: profile } = useUserProfile();
  const { user } = useAuth();
  const [selected, setSelected] = useState<Platform | null>(null);
  const [handle, setHandle] = useState("");
  const [recent, setRecent] = useState<Platform[]>([]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => setRecent(loadRecent()), 0);
    return () => window.clearTimeout(id);
  }, [open]);

  const pickPlatform = (id: Platform) => {
    setSelected(id);
    pushRecent(id);
    setRecent(loadRecent());
  };

  const shareMyZivoProfile = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("profiles")
      .select("share_code")
      .eq("user_id", user.id)
      .maybeSingle();
    const url = data?.share_code ? getProfileShareUrl(data.share_code) : `${getPublicOrigin()}/user/${user.id}`;
    onShareLink(url);
    onClose();
  };

  const savedHandle = useMemo(() => {
    if (!selected || !profile) return "";
    const raw =
      selected === "facebook"  ? profile.social_facebook :
      selected === "onlyfans"  ? profile.social_onlyfans :
      selected === "instagram" ? profile.social_instagram :
      selected === "tiktok"    ? profile.social_tiktok :
      selected === "snapchat"  ? profile.social_snapchat :
      selected === "x"         ? profile.social_x :
      selected === "linkedin"  ? profile.social_linkedin :
      selected === "telegram"  ? profile.social_telegram :
      "";
    return (raw || "").trim();
  }, [selected, profile]);

  useEffect(() => {
    if (open) return;
    const id = window.setTimeout(() => {
      setSelected(null);
      setHandle("");
    }, 0);
    return () => window.clearTimeout(id);
  }, [open]);

  useEffect(() => {
    if (!selected) return;
    const id = window.setTimeout(() => {
      if (savedHandle) setHandle(stripPrefix(savedHandle, PLATFORMS.find(p => p.id === selected)!.prefix));
      else setHandle("");
    }, 0);
    return () => window.clearTimeout(id);
  }, [selected, savedHandle]);

  const platform = PLATFORMS.find(p => p.id === selected);

  const finalUrl = useMemo(() => {
    if (!platform) return "";
    const trimmed = handle.trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return platform.prefix + trimmed.replace(/^@/, "");
  }, [platform, handle]);

  const handleShare = () => {
    if (!finalUrl) return;
    onShareLink(finalUrl);
    onClose();
  };

  const handleSendAsCard = () => {
    if (!finalUrl || !platform || !onShareSocialCard) return;
    onShareSocialCard({
      platform: platform.id,
      platform_label: platform.label,
      url: finalUrl,
      handle: handle.trim(),
    });
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="social-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-[1500] bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            key="social-sheet"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed left-0 right-0 bottom-0 z-[1501] bg-background rounded-t-3xl shadow-2xl border-t border-border/30 max-h-[85vh] overflow-hidden flex flex-col"
            style={{ paddingBottom: "max(var(--zivo-safe-bottom,0px), 0.5rem)" }}
          >
            <div className="flex items-center justify-between px-4 pt-3 pb-2">
              <div className="w-10 h-1.5 rounded-full bg-muted mx-auto" />
            </div>
            <div className="px-5 pb-2 flex items-center justify-between">
              <h3 className="text-[17px] font-bold text-foreground">
                {platform ? `Share ${platform.label}` : "Share Social Profile"}
              </h3>
              <button type="button"
                onClick={onClose}
                className="h-9 w-9 rounded-full hover:bg-muted/50 flex items-center justify-center"
                aria-label="Close"
              >
                <X className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>

            <div className="overflow-y-auto px-5 pb-5">
              {!platform ? (
                <>
                  <button type="button"
                    onClick={shareMyZivoProfile}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-r from-primary/10 to-primary/5 hover:from-primary/15 hover:to-primary/10 active:scale-[0.99] transition-all mb-3"
                  >
                    <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center flex-shrink-0">
                      <UserRound className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div className="min-w-0 flex-1 text-left">
                      <p className="text-[14px] font-semibold text-foreground">Share My ZIVO Profile</p>
                      <p className="text-[12px] text-muted-foreground">Send your profile link in this chat</p>
                    </div>
                  </button>
                  {recent.length > 0 && (
                    <div className="mb-3">
                      <p className="text-[11px] font-bold text-muted-foreground/70 uppercase tracking-wider mb-2">Recent</p>
                      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
                        {recent.map((rid) => {
                          const rp = PLATFORMS.find((x) => x.id === rid);
                          if (!rp) return null;
                          const RIcon = rp.icon;
                          return (
                            <button type="button"
                              key={`recent-${rid}`}
                              onClick={() => pickPlatform(rid)}
                              className="flex items-center gap-2 px-3 py-2 rounded-full bg-muted/50 hover:bg-muted/80 active:scale-95 transition-all flex-shrink-0"
                            >
                              <div className={`w-6 h-6 rounded-full ${rp.color} flex items-center justify-center overflow-hidden border border-border/40`}>
                                {rp.brandImage ? (
	                                  <img
	                                    src={rp.brandImage}
	                                    alt={rp.label}
	                                    className="w-full h-full object-contain"
	                                    loading="lazy"
	                                    decoding="async"
	                                  />
                                ) : (
                                  <RIcon className="w-3.5 h-3.5 text-white" />
                                )}
                              </div>
                              <span className="text-[12px] font-semibold text-foreground">{rp.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 pt-1">
                    {PLATFORMS.map((p) => (
                    <button type="button"
                      key={p.id}
                      onClick={() => pickPlatform(p.id)}
                      className="flex flex-col items-center gap-2 group"
                    >
                      <div className={`w-14 h-14 rounded-2xl ${p.color} flex items-center justify-center shadow-sm group-active:scale-90 transition-transform overflow-hidden border ${p.brandImage ? "border-border/40" : "border-transparent"}`}>
                        {p.brandImage ? (
	                          <img
	                            src={p.brandImage}
	                            alt={p.label}
	                            className="w-10 h-10 object-contain"
	                            loading="lazy"
	                            decoding="async"
	                          />
                        ) : (
                          <p.icon className="w-6 h-6 text-white" />
                        )}
                      </div>
                      <span className="text-[11.5px] font-medium text-foreground/80 group-hover:text-foreground transition-colors">
                        {p.label}
                      </span>
                    </button>
                  ))}
                  </div>
                </>
              ) : (
                <div className="pt-2 space-y-4">
                  <div className="flex items-center gap-3 p-3 rounded-2xl bg-muted/40">
                    <div className={`w-12 h-12 rounded-2xl ${platform.color} flex items-center justify-center flex-shrink-0 overflow-hidden ${platform.brandImage ? "border border-border/40" : ""}`}>
                      {platform.brandImage ? (
	                        <img
	                          src={platform.brandImage}
	                          alt={platform.label}
	                          className="w-9 h-9 object-contain"
	                          loading="lazy"
	                          decoding="async"
	                        />
                      ) : (
                        <platform.icon className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[14px] font-semibold text-foreground">{platform.label}</p>
                      <p className="text-[12px] text-muted-foreground truncate">{platform.prefix}…</p>
                    </div>
                    <button type="button"
                      onClick={() => setSelected(null)}
                      className="text-[12px] font-medium text-primary hover:opacity-70"
                    >
                      Change
                    </button>
                  </div>

                  <div>
                    <label className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
                      Handle or URL
                    </label>
                    <div className="mt-1.5 flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border/40 bg-background focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                      <LinkIcon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleShare(); }}
                        placeholder={platform.placeholder}
                        className="flex-1 bg-transparent outline-none text-[14px] text-foreground placeholder:text-muted-foreground/60"
                      />
                    </div>
                    {finalUrl && (
                      <p className="mt-1.5 text-[11.5px] text-muted-foreground truncate">
                        Preview: <span className="text-foreground font-medium">{finalUrl}</span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {onShareSocialCard && (
                      <button type="button"
                        onClick={handleSendAsCard}
                        disabled={!finalUrl}
                        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                      >
                        Send card
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button type="button"
                        onClick={async () => { if (finalUrl) { try { await openExternalUrl(finalUrl); } catch { /* noop */ } } }}
                        disabled={!finalUrl}
                        className="px-4 py-3 rounded-xl bg-muted/60 text-foreground font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform"
                      >
                        Open
                      </button>
                      <button type="button"
                        onClick={handleShare}
                        disabled={!finalUrl}
                        className={`flex-1 py-3 rounded-xl ${onShareSocialCard ? "bg-muted/60 text-foreground" : "bg-primary text-primary-foreground"} font-semibold text-[15px] disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98] transition-transform`}
                      >
                        Add to text
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}

function stripPrefix(value: string, prefix: string): string {
  const v = value.trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) {
    try {
      const u = new URL(v);
      const path = u.pathname.replace(/^\/+/, "").replace(/^@/, "");
      return path;
    } catch { return v; }
  }
  return v.replace(/^@/, "").replace(prefix, "");
}
