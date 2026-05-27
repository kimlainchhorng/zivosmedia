/**
 * ReplyComposerBar — Quoted-reply preview shown above the chat input
 */
import X from "lucide-react/dist/esm/icons/x";
import Reply from "lucide-react/dist/esm/icons/reply";
import type { DirectMessage } from "@/hooks/useMessageActions";

interface Props {
  message: DirectMessage;
  onCancel: () => void;
}

export default function ReplyComposerBar({ message, onCancel }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-l-2 border-primary bg-muted/40">
      <Reply className="w-4 h-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-primary">Replying to</div>
        <div className="text-sm text-muted-foreground truncate">
          {message.message || (message.image_url ? "📷 Photo" : message.voice_url ? "🎤 Voice" : "Attachment")}
        </div>
      </div>
      <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-muted" aria-label="Cancel reply">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
