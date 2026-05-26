/**
 * ChatSocialBubble — structured "share my social profile" card.
 *
 * Renders a brand-coloured pill with the platform's logo, a label, the user's
 * handle, and an "Open" button that launches the URL in the system browser
 * (Capacitor Browser plugin on native, falls back to window.open in web).
 */
import AtSign from "lucide-react/dist/esm/icons/at-sign";
import BriefcaseBusiness from "lucide-react/dist/esm/icons/briefcase-business";
import Camera from "lucide-react/dist/esm/icons/camera";
import CirclePlay from "lucide-react/dist/esm/icons/circle-play";
import Music2 from "lucide-react/dist/esm/icons/music-2";
import Music from "lucide-react/dist/esm/icons/music";
import Disc from "lucide-react/dist/esm/icons/disc";
import Headphones from "lucide-react/dist/esm/icons/headphones";
import Send from "lucide-react/dist/esm/icons/send";
import Heart from "lucide-react/dist/esm/icons/heart";
import Hash from "lucide-react/dist/esm/icons/hash";
import LinkIcon from "lucide-react/dist/esm/icons/link";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import type { ComponentType, SVGProps } from "react";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { cn } from "@/lib/utils";

interface Props {
  platform: string;
  platformLabel: string;
  url: string;
  handle: string;
  isMe: boolean;
  time: string;
}

interface Brand {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  bg: string;
  iconClass?: string;
}

const BRANDS: Record<string, Brand> = {
  facebook:   { icon: LinkIcon,   bg: "bg-[#1877F2]", iconClass: "text-white" },
  instagram:  { icon: Camera,     bg: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]", iconClass: "text-white" },
  x:          { icon: AtSign,     bg: "bg-black", iconClass: "text-white" },
  tiktok:     { icon: Music2,     bg: "bg-black", iconClass: "text-white" },
  youtube:    { icon: CirclePlay, bg: "bg-[#FF0000]", iconClass: "text-white" },
  snapchat:   { icon: Hash,       bg: "bg-[#FFFC00]", iconClass: "text-black" },
  telegram:   { icon: Send,       bg: "bg-[#229ED9]", iconClass: "text-white" },
  linkedin:   { icon: BriefcaseBusiness, bg: "bg-[#0A66C2]", iconClass: "text-white" },
  spotify:    { icon: Disc,       bg: "bg-[#1DB954]", iconClass: "text-white" },
  applemusic: { icon: Headphones, bg: "bg-[#FA243C]", iconClass: "text-white" },
  soundcloud: { icon: Music,      bg: "bg-[#FF5500]", iconClass: "text-white" },
  ytmusic:    { icon: Music2,     bg: "bg-[#FF0000]", iconClass: "text-white" },
  onlyfans:   { icon: Heart,      bg: "bg-[#00AFF0]", iconClass: "text-white" },
};

const FALLBACK: Brand = { icon: LinkIcon, bg: "bg-muted", iconClass: "text-foreground" };

export default function ChatSocialBubble({ platform, platformLabel, url, handle, isMe, time }: Props) {
  const brand = BRANDS[platform] ?? FALLBACK;
  const Icon = brand.icon;
  const cleanHandle = handle.replace(/^@/, "");
  const open = () => { void openExternalUrl(url).catch(() => { window.open(url, "_blank"); }); };

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <button
        type="button"
        onClick={open}
        className={cn(
          "max-w-[78%] min-w-[240px] rounded-2xl border overflow-hidden text-left active:scale-[0.99] transition",
          isMe ? "bg-primary/8 border-primary/30" : "bg-muted/40 border-border/40",
        )}
      >
        <div className="flex items-center gap-3 px-3.5 py-3">
          <span className={cn("h-11 w-11 rounded-2xl flex items-center justify-center shrink-0", brand.bg)}>
            <Icon className={cn("h-5 w-5", brand.iconClass)} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70">
              {platformLabel}
            </p>
            <p className="text-[14px] font-semibold text-foreground leading-tight truncate">
              {cleanHandle ? `@${cleanHandle}` : url}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">{url}</p>
          </div>
          <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <div className="px-3.5 pb-2 text-[10px] text-muted-foreground/70 text-right">{time}</div>
      </button>
    </div>
  );
}
