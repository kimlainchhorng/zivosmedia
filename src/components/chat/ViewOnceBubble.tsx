/**
 * ViewOnceBubble — renders a 1:1 "view once" photo/video.
 *
 * Recipient sees a gated "Tap to view" placeholder; tapping consumes the
 * message server-side (single view enforced) and opens it fullscreen once.
 * The sender sees a non-opening "View-once photo" chip; once opened, both
 * sides show an "Opened" placeholder.
 */
import { useState } from "react";
import Flame from "lucide-react/dist/esm/icons/flame";
import Eye from "lucide-react/dist/esm/icons/eye";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import { toast } from "sonner";
import { consumeViewOnce, type ViewOnceState } from "@/lib/chat/viewOnce";
import { openMedia } from "@/lib/chat/openMedia";

interface Props {
  messageId: string;
  state: Exclude<ViewOnceState, "none">;
  isVideo: boolean;
  isMe: boolean;
}

export default function ViewOnceBubble({ messageId, state, isVideo, isMe }: Props) {
  const [loading, setLoading] = useState(false);
  const [opened, setOpened] = useState(false);

  const label = isVideo ? "video" : "photo";
  const tone = isMe
    ? "bg-primary/15 text-primary-foreground/90 ring-primary/25"
    : "bg-muted/70 text-foreground ring-border/50";

  // Already consumed.
  if (state === "opened" || opened) {
    return (
      <div className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 ring-1 ${tone}`}>
        <Eye className="h-4 w-4 opacity-70" />
        <span className="text-[13px] font-medium opacity-80">Opened</span>
      </div>
    );
  }

  // Sender's own — cannot reopen.
  if (state === "sent") {
    return (
      <div className={`flex items-center gap-2 rounded-2xl px-3.5 py-2.5 ring-1 ${tone}`}>
        <Flame className="h-4 w-4 opacity-80" />
        <span className="text-[13px] font-semibold">View-once {label}</span>
      </div>
    );
  }

  // Recipient gate — tap to view once.
  const handleOpen = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { url, type } = await consumeViewOnce(messageId);
      openMedia({ url, type, id: messageId, protected: true });
      setOpened(true);
    } catch {
      toast.error("This photo can't be opened");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleOpen}
      disabled={loading}
      aria-label={`View ${label} once`}
      className={`flex items-center gap-2.5 rounded-2xl px-3.5 py-3 ring-1 transition-colors hover:bg-muted active:scale-[0.98] ${tone}`}
    >
      {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Flame className="h-5 w-5" />}
      <span className="flex flex-col items-start leading-tight">
        <span className="text-[13px] font-semibold">View-once {label}</span>
        <span className="text-[11px] opacity-70">{loading ? "Opening…" : "Tap to view once"}</span>
      </span>
    </button>
  );
}
