/**
 * Ticket Chat Message
 * Individual message bubble in the chat interface
 */

import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { User, Shield } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { assessChatMessageRisk } from "@/lib/security/chatContentSafety";

interface TicketChatMessageProps {
  message: string;
  isAdmin: boolean;
  createdAt: string;
  isCurrentUser?: boolean;
}

export function TicketChatMessage({
  message,
  isAdmin,
  createdAt,
  isCurrentUser = false,
}: TicketChatMessageProps) {
  const isRight = isAdmin;
  const risk = assessChatMessageRisk(message || "");

  return (
    <div
      className={cn(
        "flex gap-3 max-w-[85%]",
        isRight ? "ml-auto flex-row-reverse" : ""
      )}
    >
      <Avatar className="h-8 w-8 shrink-0">
        <AvatarFallback
          className={cn(
            isAdmin
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {isAdmin ? (
            <Shield className="h-4 w-4" />
          ) : (
            <User className="h-4 w-4" />
          )}
        </AvatarFallback>
      </Avatar>

      <div className={cn("flex flex-col gap-1", isRight ? "items-end" : "")}>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="font-medium">
            {isAdmin ? "Support Team" : "Customer"}
          </span>
          <span>•</span>
          <span>{format(new Date(createdAt), "MMM d, h:mm a")}</span>
        </div>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap",
            isAdmin
              ? "bg-primary text-primary-foreground rounded-tr-sm"
              : "bg-muted text-foreground rounded-tl-sm"
          )}
        >
          {message}
          {!isCurrentUser && risk.warnings.length > 0 && (
            <p className="text-[10px] mt-1 font-medium text-amber-600">
              Suspicious link pattern detected.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default TicketChatMessage;
