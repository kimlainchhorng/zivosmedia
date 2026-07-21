/**
 * OutboxPendingBadge — shows a count of queued offline messages
 * Subscribes to outbox changes and surfaces a chip in chat headers so users
 * always know when something is waiting to send.
 */
import { useEffect, useState } from "react";
import Clock from "lucide-react/dist/esm/icons/clock";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { list as outboxList, subscribe as outboxSubscribe, flush as outboxFlush, remove as outboxRemove, type OutboxItem } from "@/lib/chat/messageOutbox";

interface Props {
  /** Optional: filter to a specific chat (recipientId or groupId) */
  chatKey?: string;
}

export default function OutboxPendingBadge({ chatKey }: Props) {
  const [items, setItems] = useState<OutboxItem[]>([]);
  const [retrying, setRetrying] = useState(false);

  useEffect(() => {
    const recompute = () => {
      setItems(outboxList(chatKey ? { chatKey } : undefined));
    };
    recompute();
    const unsub = outboxSubscribe(recompute);
    return unsub;
  }, [chatKey]);

  const count = items.length;
  if (count === 0) return null;

  const retryNow = async () => {
    setRetrying(true);
    try {
      await outboxFlush();
      setItems(outboxList(chatKey ? { chatKey } : undefined));
    } finally {
      setRetrying(false);
    }
  };

  const discard = (id: string) => {
    outboxRemove(id);
    setItems(outboxList(chatKey ? { chatKey } : undefined));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/15 px-2 text-[10px] font-bold text-amber-700 transition hover:bg-amber-500/25 active:scale-95 dark:text-amber-400"
          aria-label={`${count} pending - review outbox`}
        >
          <Clock className="w-3 h-3" />
          {count} pending
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-border/50 px-3 py-2">
          <p className="text-sm font-semibold text-foreground">Pending outbox</p>
          <p className="text-xs text-muted-foreground">{count} waiting to send</p>
        </div>
        <div className="max-h-64 overflow-y-auto p-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-md px-2 py-2 hover:bg-muted/50">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-xs font-medium text-foreground">{describeItem(item)}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {item.table === "group_messages" ? "Group" : "Chat"} - {item.attempts} {item.attempts === 1 ? "try" : "tries"}
                  </p>
                  {item.lastError && (
                    <p className="mt-0.5 line-clamp-2 text-[11px] text-destructive/80">{item.lastError}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => discard(item.id)}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Discard ${describeItem(item)}`}
                  title="Discard"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-border/50 p-2">
          <button
            type="button"
            onClick={() => void retryNow()}
            disabled={retrying}
            className="inline-flex h-8 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} />
            Retry now
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function describeItem(item: OutboxItem): string {
  const source = item.optimistic ?? item.payload;
  const filePayload = source.file_payload as { filename?: string; source?: string } | undefined;
  const type = String(source.message_type || "message").replace(/_/g, " ");
  const text = typeof source.message === "string" ? source.message.trim() : "";
  if (filePayload?.filename) return filePayload.filename;
  if (text) return text;
  return type.charAt(0).toUpperCase() + type.slice(1);
}
