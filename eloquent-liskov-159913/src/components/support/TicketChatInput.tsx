/**
 * Ticket Chat Input
 * Message input with send button for support chat
 */

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

interface TicketChatInputProps {
  onSend: (message: string) => void;
  disabled?: boolean;
  isPending?: boolean;
  placeholder?: string;
}

export function TicketChatInput({
  onSend,
  disabled = false,
  isPending = false,
  placeholder = "Type your message...",
}: TicketChatInputProps) {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = () => {
    if (!message.trim() || disabled || isPending) return;
    onSend(message.trim());
    setMessage("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Submit on Enter without Shift
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(
        textareaRef.current.scrollHeight,
        120
      )}px`;
    }
  }, [message]);

  return (
    <div className="flex items-end gap-2 p-4 border-t border-border bg-card">
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled || isPending}
        className="min-h-[44px] max-h-[120px] resize-none"
        rows={1}
      />
      <Button
        onClick={handleSubmit}
        disabled={!message.trim() || disabled || isPending}
        size="icon"
        aria-label="Send message"
        className="shrink-0 h-11 w-11"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
}

export default TicketChatInput;
