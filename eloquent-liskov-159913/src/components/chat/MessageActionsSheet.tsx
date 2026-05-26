/**
 * MessageActionsSheet — Long-press action menu for a chat message
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import Reply from "lucide-react/dist/esm/icons/reply";
import Forward from "lucide-react/dist/esm/icons/forward";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Copy from "lucide-react/dist/esm/icons/copy";
import Pin from "lucide-react/dist/esm/icons/pin";
import PinOff from "lucide-react/dist/esm/icons/pin-off";
import Smile from "lucide-react/dist/esm/icons/smile";
import Languages from "lucide-react/dist/esm/icons/languages";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import type { DirectMessage } from "@/hooks/useMessageActions";
import type { ComponentType, SVGProps } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: DirectMessage | null;
  isOwn: boolean;
  onReply: () => void;
  onForward: () => void;
  onEdit: () => void;
  onCopy: () => void;
  onTogglePin: () => void;
  onReact: () => void;
  onTranslate: () => void;
  onDelete: () => void;
}

export default function MessageActionsSheet({
  open, onOpenChange, message, isOwn,
  onReply, onForward, onEdit, onCopy, onTogglePin, onReact, onTranslate, onDelete,
}: Props) {
  if (!message) return null;
  const ageHours = (Date.now() - new Date(message.created_at).getTime()) / 36e5;
  const canEdit = isOwn && ageHours < 48 && !!message.message;

  const Item = ({ icon: Icon, label, onClick, danger = false }: {
    icon: ComponentType<SVGProps<SVGSVGElement>>;
    label: string;
    onClick: () => void;
    danger?: boolean;
  }) => (
    <Button
      variant="ghost"
      onClick={() => { onClick(); onOpenChange(false); }}
      className={`w-full justify-start h-12 ${danger ? "text-destructive" : ""}`}
    >
      <Icon className="w-5 h-5 mr-3" />
      {label}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
        <SheetHeader>
          <SheetTitle className="text-left text-sm text-muted-foreground">Message actions</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1 mt-2">
          <Item icon={Smile} label="React" onClick={onReact} />
          <Item icon={Reply} label="Reply" onClick={onReply} />
          <Item icon={Forward} label="Forward" onClick={onForward} />
          {canEdit && <Item icon={Pencil} label="Edit" onClick={onEdit} />}
          {message.message && <Item icon={Copy} label="Copy" onClick={onCopy} />}
          <Item
            icon={message.is_pinned ? PinOff : Pin}
            label={message.is_pinned ? "Unpin" : "Pin"}
            onClick={onTogglePin}
          />
          <Item icon={Languages} label="Translate" onClick={onTranslate} />
          {isOwn && <Item icon={Trash2} label="Delete" onClick={onDelete} danger />}
        </div>
      </SheetContent>
    </Sheet>
  );
}
