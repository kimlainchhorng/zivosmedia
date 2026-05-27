/**
 * EditMessageBar — Inline edit indicator above the chat composer
 */
import X from "lucide-react/dist/esm/icons/x";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import type { DirectMessage } from "@/hooks/useMessageActions";

interface Props {
  message: DirectMessage;
  onCancel: () => void;
}

export default function EditMessageBar({ message, onCancel }: Props) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 border-l-2 border-amber-500 bg-amber-500/10">
      <Pencil className="w-4 h-4 text-amber-500 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium text-amber-500">Editing message</div>
        <div className="text-sm text-muted-foreground truncate">{message.message}</div>
      </div>
      <button type="button" onClick={onCancel} className="p-1 rounded hover:bg-muted" aria-label="Cancel edit">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
