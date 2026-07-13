/**
 * ConfirmAddContactSheet — profile preview + optional message before sending a contact request.
 * Used by Suggested row, Find-by-phone matches, and AddContactSheet so every "Add" action
 * routes through the same approval flow.
 */
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import { useContactRequests } from "@/hooks/useContactRequests";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export type AddTarget = {
  user_id: string;
  full_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target: AddTarget | null;
  onSent?: (userId: string) => void;
}

export default function ConfirmAddContactSheet({ open, onOpenChange, target, onSent }: Props) {
  const { send } = useContactRequests();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  if (!target) return null;
  const name = target.full_name || (target.username ? `@${target.username}` : "ZIVO user");

  async function handleSend() {
    if (!target) return;
    setSending(true);
    const r: any = await send(target.user_id, message.trim() || undefined);
    setSending(false);
    if (!r.ok) {
      toast.error(r.error || "Couldn't send request");
      return;
    }
    if (r.duplicate) {
      toast.success("Already pending — view in Sent.", {
        action: { label: "View", onClick: () => navigate("/chat/contacts/requests?tab=out") },
      });
    } else {
      toast.success("Request sent", {
        action: { label: "View", onClick: () => navigate("/chat/contacts/requests?tab=out") },
      });
    }
    onSent?.(target.user_id);
    setMessage("");
    onOpenChange(false);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="zivo-chat-popover-glass rounded-t-[1.75rem] pb-8">
        <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-muted-foreground/25 shadow-[0_0_14px_hsl(var(--foreground)/0.12)]" />
        <SheetHeader>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">Connect</p>
          <SheetTitle className="font-black">Send contact request</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center text-center pt-4 pb-3">
          <Avatar className="zivo-chat-avatar-ring w-20 h-20 mb-2">
            <AvatarImage src={target.avatar_url ?? undefined} />
            <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="font-semibold text-base">{name}</div>
          {target.username && (
            <div className="text-xs text-muted-foreground">@{target.username}</div>
          )}
        </div>
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, 200))}
          placeholder="Add a message (optional)"
          rows={3}
          aria-label="Optional message"
          className="zivo-chat-search mb-3 rounded-2xl"
        />
        <div className="text-[11px] text-muted-foreground mb-3 text-right">{message.length}/200</div>
        <div className="flex gap-2">
          <Button variant="outline" className="zivo-chat-chip flex-1 rounded-xl font-bold" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            className="zivo-chat-chip-active flex-1 gap-2 rounded-xl font-black text-white"
            onClick={handleSend}
            disabled={sending}
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Send request
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
