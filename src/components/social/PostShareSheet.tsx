/**
 * PostShareSheet — bottom-sheet share menu used by every post in the feed.
 *
 * Replaces the old "silent clipboard copy" share with a proper grid of
 * destinations: Send to a friend (in-app DM), Story, native system sheet,
 * external apps (WhatsApp, Telegram, Messenger, X, Email, SMS), and
 * fallback Copy link.
 */
import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { invalidateAllStoryCaches } from "@/lib/storiesCache";
import { copyText } from "@/lib/native/clipboard";
import { shareContent } from "@/lib/native/share";
import { registerPostShareSheetTargetSetter, type PostShareSheetTarget } from "@/lib/social/postShareSheet";
import Send from "lucide-react/dist/esm/icons/send";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import Link2 from "lucide-react/dist/esm/icons/link-2";
import Mail from "lucide-react/dist/esm/icons/mail";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import Download from "lucide-react/dist/esm/icons/download";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Globe2 from "lucide-react/dist/esm/icons/globe-2";
import Zap from "lucide-react/dist/esm/icons/zap";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";
import XIcon from "lucide-react/dist/esm/icons/x";
import { useHaptic } from "@/hooks/useHaptic";

const externalIntents = (url: string, text: string) => {
  const u = encodeURIComponent(url);
  const t = encodeURIComponent(text);
  return [
    { id: "whatsapp", label: "WhatsApp", color: "bg-emerald-500", href: `https://wa.me/?text=${t}%20${u}` },
    { id: "telegram", label: "Telegram", color: "bg-sky-500", href: `https://t.me/share/url?url=${u}&text=${t}` },
    { id: "messenger", label: "Messenger", color: "bg-blue-500", href: `https://www.facebook.com/dialog/send?link=${u}&app_id=0&redirect_uri=${u}` },
    { id: "x", label: "X", color: "bg-zinc-900", href: `https://twitter.com/intent/tweet?text=${t}&url=${u}` },
    { id: "facebook", label: "Facebook", color: "bg-blue-600", href: `https://www.facebook.com/sharer/sharer.php?u=${u}&quote=${t}` },
    { id: "sms", label: "Messages", color: "bg-green-500", href: `sms:?&body=${t}%20${u}` },
    { id: "email", label: "Email", color: "bg-amber-500", href: `mailto:?subject=${t}&body=${u}` },
  ];
};

const getShareHost = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return "zivo.app";
  }
};

const clampStoryText = (value: string, max = 180) => {
  const clean = value.replace(/\s+/g, " ").trim();
  return clean.length > max ? `${clean.slice(0, max - 1)}...` : clean;
};

const escapeSvgText = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const storyFallbackImage = (title: string, url: string) => {
  const heading = escapeSvgText(clampStoryText(title || "ZIVO post", 72));
  const host = (() => {
    try { return new URL(url).host; } catch { return "zivosmedia.com"; }
  })();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920" viewBox="0 0 1080 1920">
      <defs>
        <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#10b981"/>
          <stop offset="0.52" stop-color="#0891b2"/>
          <stop offset="1" stop-color="#111827"/>
        </linearGradient>
      </defs>
      <rect width="1080" height="1920" fill="url(#bg)"/>
      <circle cx="900" cy="260" r="190" fill="#ffffff" opacity=".11"/>
      <circle cx="170" cy="1530" r="250" fill="#ffffff" opacity=".1"/>
      <rect x="108" y="520" width="864" height="880" rx="52" fill="#06131f" opacity=".48"/>
      <text x="152" y="675" fill="#ffffff" font-family="Inter, Arial, sans-serif" font-size="46" font-weight="800">Shared on ZIVO</text>
      <foreignObject x="152" y="760" width="776" height="360">
        <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: Inter, Arial, sans-serif; color: white; font-size: 72px; font-weight: 800; line-height: 1.08;">${heading}</div>
      </foreignObject>
      <text x="152" y="1280" fill="#d1fae5" font-family="Inter, Arial, sans-serif" font-size="34" font-weight="700">${escapeSvgText(host)}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

/** Mount once at app root so any caller can open the sheet. */
export default function PostShareSheet() {
  const queryClient = useQueryClient();
  const [target, _setTarget] = useState<PostShareSheetTarget | null>(null);
  const [sharingToStory, setSharingToStory] = useState(false);
  const haptic = useHaptic();

  useEffect(() => registerPostShareSheetTargetSetter(_setTarget), []);

  if (!target) return null;

  const { url, title = "ZIVO post", text = title, onSendToFriend, onShared } = target;
  const close = () => _setTarget(null);
  const intents = externalIntents(url, text);
  const host = getShareHost(url);
  const previewText = clampStoryText(text || title, 112);
  const recommendedRoutes = 3 + (onSendToFriend ? 1 : 0);
  const mediaState = target.imageUrl ? "Media ready" : "Link only";

  const copyPostLink = async () => {
    haptic("light");
    try {
      await copyText(url);
      toast.success("Link copied", { description: "Paste it anywhere to share this post." });
      onShared?.("clipboard");
      return true;
    } catch {
      toast("Tap to copy this link", {
        duration: 12000,
        description: url,
        action: {
          label: "Copy",
          onClick: () => {
            void copyText(url).then(() => {
              toast.success("Link copied", { description: "Paste it anywhere to share this post." });
              onShared?.("clipboard");
            }).catch(() => {});
          },
        },
      });
      return false;
    }
  };

  const handleNativeSheet = async () => {
    haptic("light");
    try {
      const result = await shareContent({ title, text, url, dialogTitle: "Share post" });
      if (result.shared) {
        onShared?.("native");
        close();
        return;
      }
      if (result.cancelled) {
        close();
        return;
      }
    } catch { /* fall through to copy fallback */ }
    // No native sheet — copy link as a graceful fallback.
    await copyPostLink();
    close();
  };

  const handleCopy = async () => {
    await copyPostLink();
    close();
  };

  const handleStory = async () => {
    if (sharingToStory) return;
    haptic("medium");
    setSharingToStory(true);
    try {
      const { data, error: authError } = await supabase.auth.getUser();
      if (authError || !data.user) {
        toast("Sign in to add this to your story");
        return;
      }

      const caption = clampStoryText(`${text}\n${url}`, 240);
      const mediaUrl = target.imageUrl || storyFallbackImage(text, url);
      const { error } = await (supabase as any).from("stories").insert({
        user_id: data.user.id,
        media_url: mediaUrl,
        media_type: "image",
        text_overlay: caption,
      });
      if (error) throw error;

      invalidateAllStoryCaches(queryClient, data.user.id);
      onShared?.("story");
      window.dispatchEvent(new CustomEvent("zivo-feed-refresh"));
      toast.success("Added to your story", { description: "It will stay live for 24 hours." });
      close();
    } catch {
      toast.error("Couldn't add this post to your story");
    } finally {
      setSharingToStory(false);
    }
  };

  const handleDownload = async () => {
    haptic("light");
    if (!target.imageUrl) {
      toast("This post has no image to save");
      return;
    }
    try {
      const a = document.createElement("a");
      a.href = target.imageUrl;
      a.target = "_blank";
      a.rel = "noopener";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Image opening — long-press to save");
      onShared?.("download");
    } catch {
      toast.error("Couldn't open image");
    }
    close();
  };

  const handleExternal = (intent: { id: string; href: string; label: string }) => {
    haptic("light");
    try {
      window.open(intent.href, "_blank", "noopener,noreferrer");
      onShared?.(intent.id);
    } catch {
      toast.error(`Couldn't open ${intent.label}`);
    }
    close();
  };

  return (
    <Sheet open={!!target} onOpenChange={(o) => { if (!o) close(); }}>
      <SheetContent side="bottom" hideClose className="zivo-social-sheet-panel rounded-t-3xl px-4 pt-3 pb-[max(1.25rem,var(--zivo-safe-bottom,0px))]">
        <SheetHeader className="zivo-social-header-glass rounded-[1.25rem] px-4 py-3 text-left">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <span className="zivo-social-share-orb flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-primary">
                <Share2 className="h-[18px] w-[18px]" />
              </span>
              <div className="min-w-0">
                <SheetTitle className="truncate text-[17px] font-extrabold tracking-tight">Share post</SheetTitle>
                <p className="truncate text-xs font-medium text-muted-foreground">{host}</p>
              </div>
            </div>
            <SheetClose
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-1 ring-black/10 transition-all hover:opacity-90 active:scale-90 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <XIcon className="h-4 w-4" />
            </SheetClose>
          </div>
          <SheetDescription className="sr-only">
            Choose where to share this post or copy its link.
          </SheetDescription>
        </SheetHeader>

        <div className="zivo-social-share-preview mt-4 overflow-hidden rounded-3xl">
          <div className="flex gap-3 p-3">
            {target.imageUrl ? (
              <img
                src={target.imageUrl}
                alt=""
                className="h-20 w-20 shrink-0 rounded-2xl object-cover shadow-sm"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <div className="zivo-social-share-orb grid h-20 w-20 shrink-0 place-items-center rounded-2xl text-primary">
                <Share2 className="h-8 w-8" />
              </div>
            )}
            <div className="min-w-0 flex-1 py-1">
              <p className="truncate text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                {host}
              </p>
              <p className="mt-1 line-clamp-2 text-[15px] font-extrabold leading-snug">
                {title}
              </p>
              <p className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                {previewText}
              </p>
            </div>
          </div>
          <div className="zivo-social-engagement-summary flex gap-2 px-3 py-2">
            <span className="zivo-social-chip rounded-full px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
              DM ready
            </span>
            <span className="zivo-social-chip rounded-full px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
              Story ready
            </span>
            <span className="zivo-social-chip rounded-full px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
              Public link
            </span>
          </div>
        </div>

        <div className="mt-5 flex items-center justify-between px-1">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Recommended</p>
          <span className="zivo-social-chip inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-primary">
            <Zap className="h-3 w-3" aria-hidden="true" />
            Fast share
          </span>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-2">
          <div className="zivo-social-module-tile rounded-2xl px-3 py-2 text-left">
            <Send className="mb-1.5 h-3.5 w-3.5 text-primary" aria-hidden="true" />
            <p className="text-xs font-black leading-none text-foreground">{recommendedRoutes}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Quick routes</p>
          </div>
          <div className="zivo-social-module-tile rounded-2xl px-3 py-2 text-left">
            <Globe2 className="mb-1.5 h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <p className="text-xs font-black leading-none text-foreground">{intents.length}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">External apps</p>
          </div>
          <div className="zivo-social-module-tile rounded-2xl px-3 py-2 text-left">
            <CheckCircle2 className="mb-1.5 h-3.5 w-3.5 text-fuchsia-500" aria-hidden="true" />
            <p className="truncate text-xs font-black leading-none text-foreground">{mediaState}</p>
            <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Share payload</p>
          </div>
        </div>
        <div className="zivo-social-module-tile mt-2 grid grid-cols-2 gap-2 rounded-2xl px-3 py-2">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                Share scope
              </span>
              <span className="block truncate text-xs font-black text-foreground">Public link</span>
            </span>
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
              <Globe2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[10px] font-black uppercase tracking-[0.12em] text-muted-foreground">
                Payload
              </span>
              <span className="block truncate text-xs font-black text-foreground">{target.imageUrl ? "Media + link" : "Link only"}</span>
            </span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-4 gap-2.5">
          {onSendToFriend && (
            <ShareTile color="bg-ig-gradient text-white" label="Send" description="To chat" onClick={() => { onSendToFriend(); onShared?.("dm"); close(); }}>
              <Send className="h-5 w-5" />
            </ShareTile>
          )}
          <ShareTile color="bg-fuchsia-500 text-white" label={sharingToStory ? "Sharing" : "Story"} description="24h post" onClick={handleStory} disabled={sharingToStory}>
            {sharingToStory ? <Loader2 className="h-5 w-5 animate-spin" /> : <BookOpen className="h-5 w-5" />}
          </ShareTile>
          <ShareTile color="bg-foreground text-background" label="Native" description="System" onClick={handleNativeSheet}>
            <Share2 className="h-5 w-5" />
          </ShareTile>
          <ShareTile color="bg-muted text-foreground" label="Copy" description="Link" onClick={handleCopy}>
            <Link2 className="h-5 w-5" />
          </ShareTile>
        </div>

        <div className="mt-5">
          <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Send via</p>
          <div className="grid grid-cols-4 gap-2.5">
            {intents.map((it) => (
              <ShareTile key={it.id} color={`${it.color} text-white`} label={it.label} onClick={() => handleExternal(it)}>
                {it.id === "sms" ? <MessageCircle className="h-5 w-5" /> :
                 it.id === "email" ? <Mail className="h-5 w-5" /> :
                 <BrandGlyph id={it.id} />}
              </ShareTile>
            ))}
            {target.imageUrl && (
              <ShareTile color="bg-zinc-700 text-white" label="Save" description="Media" onClick={handleDownload}>
                <Download className="h-5 w-5" />
              </ShareTile>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="zivo-social-sheet-row mt-5 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-left transition-all active:scale-[0.99]"
          aria-label="Copy share link"
        >
          <span className="zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl text-primary">
            <Globe2 className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-foreground">Copy public link</span>
            <span className="block truncate text-[11px] font-medium text-muted-foreground">{url}</span>
          </span>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
        </button>
      </SheetContent>
    </Sheet>
  );
}

function ShareTile({
  color,
  label,
  description,
  onClick,
  children,
  disabled,
}: {
  color: string;
  label: string;
  description?: string;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={description ? `${label}: ${description}` : label}
      className="zivo-social-share-tile group flex min-h-[86px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1.5 py-2 text-center transition-transform hover:-translate-y-0.5 active:scale-95 disabled:cursor-wait disabled:opacity-70"
    >
      <span className={`flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm transition-transform group-hover:scale-105 ${color}`}>{children}</span>
      <span className="text-[11px] font-extrabold leading-tight text-foreground">{label}</span>
      {description && <span className="text-[9px] font-semibold leading-tight text-muted-foreground">{description}</span>}
    </button>
  );
}

// Real brand glyphs as inline SVG paths — pulled from simple-icons (CC0).
// Inlining avoids a new dependency and keeps the share grid pixel-crisp.
function BrandGlyph({ id }: { id: string }) {
  switch (id) {
    case "whatsapp":
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden>
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347zM12.057 21.785h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884zm8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden>
          <path d="M11.944 0A12 12 0 000 12a12 12 0 0012 12 12 12 0 0012-12A12 12 0 0012 0a12 12 0 00-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 01.171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.139-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
        </svg>
      );
    case "messenger":
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden>
          <path d="M.001 11.639C.001 4.949 5.241 0 12.001 0S24 4.95 24 11.639c0 6.689-5.24 11.638-12 11.638-1.21 0-2.371-.16-3.46-.46a.96.96 0 00-.64.05l-2.39 1.05a.96.96 0 01-1.35-.85l-.07-2.14a.97.97 0 00-.32-.68A11.39 11.389 0 01.002 11.64zm8.32-2.19l-3.52 5.6c-.35.53.32 1.13.82.74L9.4 13.04a.73.73 0 01.87 0l2.79 2.09c.84.62 2.04.4 2.6-.49l3.52-5.6c.35-.53-.32-1.13-.82-.74L14.6 10.96a.73.73 0 01-.87 0l-2.79-2.09a1.85 1.85 0 00-2.6.49z"/>
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden>
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      );
    case "facebook":
      return (
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" aria-hidden>
          <path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 011.141.195v3.325a8.623 8.623 0 00-.653-.036 26.805 26.805 0 00-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 00-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647z"/>
        </svg>
      );
    default:
      return <span className="font-bold text-[13px]">?</span>;
  }
}
