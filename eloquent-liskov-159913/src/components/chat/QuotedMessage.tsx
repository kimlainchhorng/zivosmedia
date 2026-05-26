/**
 * QuotedMessage — displays quoted context in reply
 */
import { forwardRef } from "react";

export interface QuotedMsg {
  id: string;
  senderName: string;
  text: string;
  messageType?: string;
}

interface Props {
  quote: QuotedMsg;
  isMe: boolean;
}

export default forwardRef<HTMLDivElement, Props>(function QuotedMessage({ quote, isMe }, ref) {
  return (
    <div
      ref={ref}
      className={`mb-2 pl-3 border-l-2 ${isMe ? "border-primary/40" : "border-muted-foreground/30"} py-1.5 text-xs`}
    >
      <p className="font-semibold text-foreground/80">{quote.senderName}</p>
      <p className="text-muted-foreground line-clamp-2">{quote.text}</p>
    </div>
  );
});
