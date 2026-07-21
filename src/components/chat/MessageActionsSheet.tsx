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
      className={`h-12 w-full justify-start rounded-2xl px-3 font-bold hover:bg-muted/20 ${danger ? "text-destructive hover:text-destructive" : ""}`}
    >
      <span className={`mr-3 flex h-9 w-9 items-center justify-center rounded-full ${danger ? "bg-destructive/10" : "zivo-chat-avatar-ring"}`}>
        <Icon className="h-4 w-4" />
      </span>
      {label}
    </Button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="zivo-chat-popover-glass rounded-t-[1.75rem] border-white/10 px-0 pb-safe shadow-2xl">
        <div className="zivo-chat-header-glass px-5 pb-4 pt-5">
          <div className="mx-auto mb-4 h-1 w-11 rounded-full bg-foreground/20" />
          <SheetHeader>
            <p className="text-left text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">Message tools</p>
            <SheetTitle className="text-left text-lg font-black text-foreground">Message actions</SheetTitle>
        </SheetHeader>
        </div>
        <div className="mx-4 mt-3 flex flex-col gap-1 rounded-3xl border border-white/10 bg-background/40 p-1 shadow-sm backdrop-blur-xl">
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
        <div className="h-4" />
      </SheetContent>
    </Sheet>
  );
}
