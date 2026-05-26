/**
 * ChatContactBubble — structured contact-share bubble.
 *
 * Renders an avatar, name, and @username for a contact shared into the chat,
 * plus a "Message" button that jumps directly to that user's chat. Works
 * whether the contact has a ZIVO account (linked user_id) or not — in the
 * unlinked case the button is hidden.
 */
import { useNavigate } from "react-router-dom";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import UserSquare from "lucide-react/dist/esm/icons/user-square";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Props {
  userId: string | null;
  fullName: string;
  username: string | null;
  avatarUrl: string | null;
  isMe: boolean;
  time: string;
}

export default function ChatContactBubble({ userId, fullName, username, avatarUrl, isMe, time }: Props) {
  const navigate = useNavigate();
  const initial = (fullName?.[0] || username?.[0] || "?").toUpperCase();

  return (
    <div className={cn("flex", isMe ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[78%] min-w-[240px] rounded-2xl border overflow-hidden",
          isMe ? "bg-primary/8 border-primary/30" : "bg-muted/40 border-border/40",
        )}
      >
        <div className="flex items-center gap-3 px-3.5 pt-3 pb-2">
          <Avatar className="h-11 w-11">
            <AvatarImage src={avatarUrl || undefined} alt={fullName} />
            <AvatarFallback className="bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-sm font-bold">
              {initial}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground/70 flex items-center gap-1">
              <UserSquare className="h-3 w-3" />
              Contact
            </p>
            <p className="text-[14px] font-semibold text-foreground leading-tight truncate">{fullName}</p>
            {username && (
              <p className="text-[12px] text-muted-foreground truncate">@{username}</p>
            )}
          </div>
        </div>

        {userId && (
          <button
            type="button"
            onClick={() => navigate(`/chat/${userId}`)}
            className="w-full flex items-center justify-center gap-1.5 px-3.5 py-2.5 border-t border-border/30 text-[13px] font-bold text-primary hover:bg-primary/5 active:scale-[0.99] transition"
          >
            <MessageCircle className="h-4 w-4" />
            Message
          </button>
        )}

        <div className={cn("px-3.5 pb-2 text-[10px] text-muted-foreground/70 text-right", !userId && "pt-1")}>
          {time}
        </div>
      </div>
    </div>
  );
}
