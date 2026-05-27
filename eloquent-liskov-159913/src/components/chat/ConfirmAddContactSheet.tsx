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
      <SheetContent side="bottom" className="rounded-t-3xl pb-8">
        <SheetHeader>
          <SheetTitle>Send contact request</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col items-center text-center pt-4 pb-3">
          <Avatar className="w-20 h-20 mb-2">
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
          className="mb-3"
        />
        <div className="text-[11px] text-muted-foreground mb-3 text-right">{message.length}/200</div>
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancel
          </Button>
          <Button
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white gap-2"
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
