/**
 * SafeCaption — renders post captions with auto-linkified URLs that are
 * passed through the platform's url-safety heuristics. Suspicious or blocked
 * links are rendered as non-clickable text with a warning tooltip.
 */
import { useMemo, useState } from "react";
import { AtSign, Hash, ShieldAlert, ShieldCheck, ExternalLink, Sparkles, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { assessLinkSync, type LinkRiskLevel } from "@/hooks/useLinkRisk";
import { openExternalUrl } from "@/lib/openExternalUrl";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface SafeCaptionProps {
  text: string;
  className?: string;
}

// Combined matcher: URLs (or bare domains), hashtags, and @mentions.
// The capture groups let the consumer figure out which alternative matched.
//   group 1: full URL/domain
//   group 2: hashtag word (without leading #)
//   group 3: mention word (without leading @)
// Hashtags/mentions require a non-word char (or start of string) to the left
// so we don't pick up `email@host` or `array#index`.
const TOKEN_REGEX = /(?:^|(?<=[^\w]))(?:((?:https?:\/\/|www\.)[^\s<>"]+|(?:[a-z0-9-]+\.)+[a-z]{2,}\/[^\s<>"]*)|#([a-zA-Z0-9_]{2,30})|@([a-zA-Z0-9_.]{2,30}))/g;

interface Segment {
  type: "text" | "link" | "hashtag" | "mention";
  value: string;
  href?: string;
  risk?: LinkRiskLevel;
  warnings?: string[];
  /** Hashtag/mention payload without the # or @ prefix */
  token?: string;
}

function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIdx = 0;

  for (const match of text.matchAll(TOKEN_REGEX)) {
    const idx = match.index ?? 0;
    if (idx > lastIdx) {
      segments.push({ type: "text", value: text.slice(lastIdx, idx) });
    }
    const [raw, urlGroup, hashtagGroup, mentionGroup] = match;

    if (urlGroup) {
      // Strip trailing punctuation that's likely not part of the URL
      const cleaned = raw.replace(/[.,;:!?)"']+$/g, "");
      const trail = raw.slice(cleaned.length);
      const href = cleaned.startsWith("http") ? cleaned : `https://${cleaned}`;
      const assessment = assessLinkSync(href);
      segments.push({
        type: "link",
        value: cleaned,
        href,
        risk: assessment.level,
        warnings: assessment.warnings,
      });
      if (trail) segments.push({ type: "text", value: trail });
    } else if (hashtagGroup) {
      segments.push({ type: "hashtag", value: `#${hashtagGroup}`, token: hashtagGroup });
    } else if (mentionGroup) {
      segments.push({ type: "mention", value: `@${mentionGroup}`, token: mentionGroup });
    }
    lastIdx = idx + raw.length;
  }
  if (lastIdx < text.length) {
    segments.push({ type: "text", value: text.slice(lastIdx) });
  }
  return segments;
}

const LINK_STYLES: Record<LinkRiskLevel, string> = {
  trusted: "border-primary/20 bg-primary/10 text-primary hover:bg-primary/15",
  neutral: "border-cyan-400/20 bg-cyan-400/10 text-cyan-600 dark:text-cyan-300 hover:bg-cyan-400/15",
  suspicious: "border-amber-400/30 bg-amber-400/12 text-amber-700 dark:text-amber-300",
  blocked: "border-destructive/25 bg-destructive/10 text-destructive line-through cursor-not-allowed",
};

export default function SafeCaption({ text, className }: SafeCaptionProps) {
  const segments = useMemo(() => tokenize(text), [text]);
  const [pendingLink, setPendingLink] = useState<Segment | null>(null);
  const navigate = useNavigate();

  const handleLinkClick = (e: React.MouseEvent, seg: Segment) => {
    e.stopPropagation();
    e.preventDefault();
    if (seg.risk === "blocked") return;
    if (seg.risk === "suspicious" || seg.risk === "neutral") {
      setPendingLink(seg);
      return;
    }
    if (seg.href) openExternalUrl(seg.href);
  };

  const handleHashtagClick = (e: React.MouseEvent, tag: string) => {
    e.stopPropagation();
    e.preventDefault();
    navigate(`/tag/${encodeURIComponent(tag.toLowerCase())}`);
  };

  const handleMentionClick = async (e: React.MouseEvent, username: string) => {
    e.stopPropagation();
    e.preventDefault();
    // Resolve @username → user_id via the usernames table, then navigate.
    // Falls back to a toast if the handle has no claim.
    try {
      const { data } = await (supabase as any)
        .from("usernames")
        .select("user_id")
        .eq("username", username.toLowerCase())
        .maybeSingle();
      if (data?.user_id) {
        navigate(`/user/${data.user_id}`);
      } else {
        toast.info(`@${username} isn't on ZIVO`);
      }
    } catch {
      toast.error("Couldn't open that mention");
    }
  };

  const proceed = () => {
    if (pendingLink?.href) openExternalUrl(pendingLink.href);
    setPendingLink(null);
  };
  const linkSafetySignal = pendingLink?.risk === "suspicious"
    ? { label: "Review needed", detail: `${pendingLink.warnings?.length || 1} warning${(pendingLink.warnings?.length || 1) === 1 ? "" : "s"} found`, width: "62%" }
    : pendingLink?.risk === "neutral"
      ? { label: "Standard caution", detail: "External destination", width: "78%" }
      : { label: "Safety check", detail: "Destination looks clear", width: "100%" };

  return (
    <>
      <span className={cn("whitespace-pre-wrap break-words", className)}>
        {segments.map((seg, i) => {
          if (seg.type === "text") return <span key={i}>{seg.value}</span>;
          if (seg.type === "hashtag") {
            // Per product direction: hashtags in feed/reel render as plain
            // inline text (no emerald highlight, no underline) but remain
            // clickable so users can still tap through to /tag/<token>.
            // Use <span role="button"> so SafeCaption can be safely nested
            // inside another <button type="button"> (post tap-to-expand) without producing
            // invalid DOM (button-in-button).
            return (
              <span
                key={i}
                role="button"
                tabIndex={0}
                onClick={(e) => handleHashtagClick(e, seg.token!)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleHashtagClick(e as any, seg.token!); } }}
                title={`Open #${seg.token}`}
                aria-label={`Open hashtag ${seg.token}`}
                className="mx-0.5 inline-flex items-center gap-0.5 rounded-full border border-white/25 bg-white/15 px-1.5 py-0.5 text-inherit font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_14px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-transform hover:-translate-y-0.5 active:opacity-70"
              >
                <Hash className="h-3 w-3" aria-hidden />
                {seg.value}
              </span>
            );
          }
          if (seg.type === "mention") {
            return (
              <span
                key={i}
                role="button"
                tabIndex={0}
                onClick={(e) => handleMentionClick(e, seg.token!)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleMentionClick(e as any, seg.token!); } }}
                title={`Open @${seg.token}`}
                aria-label={`Open profile mention ${seg.token}`}
                className="mx-0.5 inline-flex items-center gap-0.5 rounded-full border border-primary/25 bg-primary/10 px-1.5 py-0.5 font-black text-primary shadow-[0_6px_14px_hsl(var(--primary)/0.08)] transition-transform hover:-translate-y-0.5 active:opacity-70"
              >
                <AtSign className="h-3 w-3" aria-hidden />
                {seg.value}
              </span>
            );
          }
          const risk = seg.risk ?? "neutral";
          return (
            <a
              key={i}
              href={seg.href}
              onClick={(e) => handleLinkClick(e, seg)}
              title={seg.warnings?.length ? seg.warnings.join(" · ") : seg.href}
              aria-label={`${risk === "blocked" ? "Blocked" : risk === "suspicious" ? "Suspicious" : risk === "trusted" ? "Trusted" : "External"} link: ${seg.value}`}
              className={cn(
                "mx-0.5 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[0.95em] font-black shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_6px_14px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-all hover:-translate-y-0.5",
                LINK_STYLES[risk]
              )}
              aria-disabled={risk === "blocked"}
            >
              {(risk === "blocked" || risk === "suspicious") ? (
                <ShieldAlert className="h-3 w-3 shrink-0" aria-hidden />
              ) : risk === "trusted" ? (
                <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <ExternalLink className="h-3 w-3 shrink-0" aria-hidden />
              )}
              <span className="max-w-[16rem] truncate align-bottom">{seg.value}</span>
            </a>
          );
        })}
      </span>

      <Dialog open={!!pendingLink} onOpenChange={(o) => !o && setPendingLink(null)}>
        <DialogContent hideClose className="zivo-social-sheet-panel max-w-sm overflow-hidden border-0 p-0">
          <div className="px-3 pt-3">
            <DialogHeader className="zivo-social-header-glass rounded-[1.25rem] px-4 py-3 text-left">
              <div className="flex items-center justify-between gap-3">
                <DialogTitle className="flex items-center gap-3 text-base font-black">
                  <span className={cn(
                    "zivo-social-share-orb flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
                    pendingLink?.risk === "suspicious" && "text-amber-500",
                  )}>
                    {pendingLink?.risk === "suspicious" ? (
                      <ShieldAlert className="h-5 w-5" />
                    ) : (
                      <ShieldCheck className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{pendingLink?.risk === "suspicious" ? "Caution: external link" : "Leaving ZIVO"}</span>
                    <span className="block truncate text-[11px] font-semibold text-muted-foreground">
                      Check the destination before continuing
                    </span>
                  </span>
                </DialogTitle>
                <DialogClose
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background shadow-md ring-1 ring-black/10 transition-all hover:opacity-90 active:scale-90 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <X className="h-4 w-4" />
                </DialogClose>
              </div>
            </DialogHeader>
          </div>
          <div className="px-5 pb-5 pt-3">
          <div className="mb-3 grid grid-cols-2 gap-2">
            <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
              <span className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-xl",
                pendingLink?.risk === "suspicious" ? "bg-amber-500/10 text-amber-600" : "bg-emerald-500/10 text-emerald-600",
              )}>
                {pendingLink?.risk === "suspicious" ? <ShieldAlert className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black capitalize leading-none text-foreground">{pendingLink?.risk ?? "Link"}</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Risk check</p>
              </div>
            </div>
            <div className="zivo-social-module-tile flex items-center gap-2 rounded-2xl px-3 py-2">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0">
                <p className="text-xs font-black leading-none text-foreground">External</p>
                <p className="mt-1 truncate text-[10px] font-semibold text-muted-foreground">Destination</p>
              </div>
            </div>
          </div>
          <div className="zivo-social-module-tile mb-3 rounded-2xl px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                <span className={cn(
                  "zivo-social-share-orb flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl",
                  pendingLink?.risk === "suspicious" ? "text-amber-500" : "text-primary",
                )}>
                  {pendingLink?.risk === "suspicious" ? <ShieldAlert className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-foreground">{linkSafetySignal.label}</span>
                  <span className="block truncate text-[11px] font-semibold text-muted-foreground">{linkSafetySignal.detail}</span>
                </span>
              </span>
              <span className={cn(
                "rounded-full border px-2.5 py-1 text-[10px] font-black uppercase",
                pendingLink?.risk === "suspicious"
                  ? "border-amber-400/20 bg-amber-400/10 text-amber-600"
                  : "border-primary/15 bg-primary/10 text-primary",
              )}>
                Link
              </span>
            </div>
            <div className="zivo-social-chip mt-3 h-1.5 overflow-hidden rounded-full p-0">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-300",
                  pendingLink?.risk === "suspicious" ? "bg-gradient-to-r from-amber-400 via-orange-400 to-primary" : "bg-gradient-to-r from-emerald-400 via-primary to-fuchsia-500",
                )}
                style={{ width: linkSafetySignal.width }}
              />
            </div>
          </div>
          <DialogDescription className="zivo-social-sheet-input break-all rounded-2xl p-3 text-xs font-semibold">
            {pendingLink?.href}
          </DialogDescription>
          {pendingLink?.warnings?.length ? (
            <ul className="zivo-social-module-tile mt-3 space-y-2 rounded-2xl p-3 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {pendingLink.warnings.map((w, i) => (
                <li key={i} className="flex gap-2">
                  <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="zivo-social-module-tile mt-3 rounded-2xl p-3 text-[11px] font-semibold leading-5 text-muted-foreground">
              This link goes to a third-party site outside ZIVO. Verify the URL before continuing.
            </p>
          )}
          <DialogFooter className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setPendingLink(null)} className="zivo-social-chip min-h-[40px] rounded-full font-black">
              Cancel
            </Button>
            <Button size="sm" onClick={proceed} className="min-h-[40px] gap-1.5 rounded-full font-black">
              <ExternalLink className="h-3.5 w-3.5" /> Continue
            </Button>
          </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
