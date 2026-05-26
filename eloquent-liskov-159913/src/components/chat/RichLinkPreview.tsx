/**
 * RichLinkPreview — render an OG-style preview card under any URL in chat.
 *
 * Lightweight by design: extracts the first http(s) URL from message text
 * and shows host + path. Real OG fetching can be plugged in later via an
 * edge function — until then this gives every link a consistent, branded card.
 */
import { useMemo } from "react";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import { openExternalUrl } from "@/lib/openExternalUrl";

interface Props {
  text: string;
  isMe: boolean;
}

const URL_RX = /(https?:\/\/[^\s]+)/i;

export default function RichLinkPreview({ text, isMe }: Props) {
  const url = useMemo(() => {
    const match = text.match(URL_RX);
    return match ? match[0].replace(/[).,!?]+$/, "") : null;
  }, [text]);

  if (!url) return null;

  let host = url;
  let path = "";
  try {
    const u = new URL(url);
    host = u.host.replace(/^www\./, "");
    path = u.pathname === "/" ? "" : u.pathname.slice(0, 30);
  } catch { /* keep raw */ }

  return (
    <button type="button"
      onClick={(e) => { e.stopPropagation(); openExternalUrl(url); }}
      className={`mt-1.5 w-full text-left flex items-center gap-2 px-2.5 py-2 rounded-xl border transition active:scale-[0.98] ${
        isMe ? "border-primary-foreground/20 bg-primary-foreground/5" : "border-border/40 bg-muted/40"
      } hover:opacity-90`}
    >
      <ExternalLink className="w-3.5 h-3.5 shrink-0 opacity-70" />
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-bold truncate">{host}</p>
        {path && <p className="text-[10px] opacity-70 truncate">{path}</p>}
      </div>
    </button>
  );
}
