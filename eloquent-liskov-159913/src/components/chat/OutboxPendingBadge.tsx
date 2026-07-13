/**
 * OutboxPendingBadge — shows a count of queued offline messages
 * Subscribes to outbox changes and surfaces a chip in chat headers so users
 * always know when something is waiting to send.
 */
import { useEffect, useState } from "react";
import Clock from "lucide-react/dist/esm/icons/clock";
import { list as outboxList, subscribe as outboxSubscribe, flush as outboxFlush } from "@/lib/chat/messageOutbox";

interface Props {
  /** Optional: filter to a specific chat (recipientId or groupId) */
  chatKey?: string;
}

export default function OutboxPendingBadge({ chatKey }: Props) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const recompute = () => {
      const items = outboxList(chatKey ? { chatKey } : undefined);
      setCount(items.length);
    };
    recompute();
    const unsub = outboxSubscribe(recompute);
    return unsub;
  }, [chatKey]);

  if (count === 0) return null;

  return (
    <button type="button"
      onClick={() => void outboxFlush()}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-[10px] font-bold text-amber-700 dark:text-amber-400 hover:bg-amber-500/25 active:scale-95 transition"
      aria-label={`${count} pending — tap to retry`}
    >
      <Clock className="w-3 h-3" />
      {count} pending
    </button>
  );
}
