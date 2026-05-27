/**
 * Ticket Chat
 * Complete chat interface for support tickets
 */

import { useEffect, useRef } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, MessageSquare } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useTicketMessages, useSendTicketMessage, useTicketChatRealtime } from "@/hooks/useSupportChat";
import type { TicketReply } from "@/hooks/useSupportChat";
import { TicketChatMessage } from "./TicketChatMessage";
import { TicketChatInput } from "./TicketChatInput";
import { toast } from "sonner";

interface TicketChatProps {
  ticketId: string;
  isAdmin?: boolean;
  readOnly?: boolean;
  ticketStatus?: string;
}

export function TicketChat({
  ticketId,
  isAdmin = false,
  readOnly = false,
  ticketStatus,
}: TicketChatProps) {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [], isLoading } = useTicketMessages(ticketId);
  const sendMessage = useSendTicketMessage();

  // Real-time subscription
  useTicketChatRealtime(ticketId, (newMessage: TicketReply) => {
    // Show toast for messages from the other party
    const isFromOther = isAdmin ? !newMessage.is_admin : newMessage.is_admin;
    if (isFromOther) {
      toast.info("New message received");
    }
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (message: string) => {
    await sendMessage.mutateAsync({
      ticketId,
      message,
      isAdmin,
    });
  };

  const isClosed = ticketStatus === "closed" || ticketStatus === "resolved";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-3 opacity-50" />
            <p className="text-sm">No messages yet</p>
            <p className="text-xs mt-1">
              {isAdmin
                ? "Send a message to respond to this ticket"
                : "Send a message to get help from our support team"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <TicketChatMessage
                key={msg.id}
                message={msg.message}
                isAdmin={msg.is_admin}
                createdAt={msg.created_at}
                isCurrentUser={msg.user_id === user?.id}
              />
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input area */}
      {!readOnly && !isClosed && (
        <TicketChatInput
          onSend={handleSend}
          isPending={sendMessage.isPending}
          placeholder={
            isAdmin
              ? "Type your response..."
              : "Describe your issue or reply..."
          }
        />
      )}

      {isClosed && (
        <div className="p-4 border-t border-border bg-muted/50 text-center text-sm text-muted-foreground">
          This ticket has been {ticketStatus}. Please create a new ticket if you need
          further assistance.
        </div>
      )}
    </div>
  );
}

export default TicketChat;
