/**
 * StoryReplyBubble — Inline preview rendered above a reply when the message
 * was sent as a response to a story (message_type === "story_reply").
 * Looks for `story_payload` JSON on the message (added by the story viewer).
 */
import { useNavigate } from "react-router-dom";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

interface Props {
  thumb?: string | null;
  caption?: string | null;
  storyId?: string | null;
  isMine: boolean;
}

export default function StoryReplyBubble({ thumb, caption, storyId, isMine }: Props) {
  const nav = useNavigate();
  return (
    <button type="button"
      onClick={() => storyId && nav(`/stories/${storyId}`)}
      className={`flex items-center gap-2 mb-1 px-2 py-1.5 rounded-xl border w-full max-w-[260px] active:scale-[0.98] transition-all ${
        isMine ? "bg-white/15 border-white/20" : "bg-muted/40 border-border/30"
      }`}
    >
      <div className="relative shrink-0 w-9 h-9 rounded-md overflow-hidden bg-muted">
        {thumb ? (
	          <img src={thumb} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
        )}
      </div>
      <div className="min-w-0 text-left">
        <div className={`text-[10px] font-semibold uppercase tracking-wider ${isMine ? "text-white/80" : "text-primary"}`}>
          Replied to story
        </div>
        <div className={`text-[11px] truncate ${isMine ? "text-white/85" : "text-muted-foreground"}`}>
          {caption || "Story"}
        </div>
      </div>
    </button>
  );
}
