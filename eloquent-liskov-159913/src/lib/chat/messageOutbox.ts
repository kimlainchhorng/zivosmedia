/**
 * messageOutbox — durable failed-send queue.
 *
 * Persisted to localStorage so a refresh, app kill, or crash mid-send doesn't
 * lose the user's message. Chats restore their failed bubbles on mount; an
 * app-level flush retries the queue on boot and whenever the network comes
 * back online.
 *
 * Payloads are kept opaque (`Record<string, unknown>`) because direct_messages
 * and group_messages share no schema. The only requirement is that the row
 * inserts cleanly via supabase.from(table).insert(payload).
 */
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "zivo.chat.outbox.v1";
const CHANGE_EVENT = "zivo:outbox:change";

export interface OutboxItem {
  id: string;
  table: "direct_messages" | "group_messages";
  /** Stable key the originating chat can match on (e.g. recipientId or groupId). */
  chatKey: string;
  payload: Record<string, unknown>;
  /** Optimistic message displayed before the insert succeeded — restored on mount. */
  optimistic?: Record<string, unknown>;
  createdAt: number;
  attempts: number;
  lastError?: string;
}

const safeRead = (): OutboxItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as OutboxItem[]) : [];
  } catch {
    return [];
  }
};

const safeWrite = (items: OutboxItem[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // Quota exceeded or storage disabled — silently degrade; queue lives in memory only.
  }
};

export function enqueue(item: Omit<OutboxItem, "createdAt" | "attempts">) {
  const items = safeRead().filter((i) => i.id !== item.id);
  items.push({ ...item, createdAt: Date.now(), attempts: 0 });
  safeWrite(items);
}

export function remove(id: string) {
  const items = safeRead().filter((i) => i.id !== id);
  safeWrite(items);
}

export function list(filter?: { table?: string; chatKey?: string }): OutboxItem[] {
  const items = safeRead();
  if (!filter) return items;
  return items.filter(
    (i) =>
      (filter.table == null || i.table === filter.table) &&
      (filter.chatKey == null || i.chatKey === filter.chatKey),
  );
}

export function subscribe(handler: () => void): () => void {
  const fn = () => handler();
  window.addEventListener(CHANGE_EVENT, fn);
  // Cross-tab sync via the storage event.
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) handler();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, fn);
    window.removeEventListener("storage", onStorage);
  };
}

let flushing = false;
/**
 * Try to insert every queued payload. Successful items are removed; failures
 * stay queued with attempts incremented. Safe to call multiple times — guarded
 * to avoid concurrent floods.
 */
export async function flush(): Promise<{ sent: number; failed: number }> {
  if (flushing) return { sent: 0, failed: 0 };
  flushing = true;
  let sent = 0;
  let failed = 0;
  try {
    const items = safeRead();
    if (items.length === 0) return { sent: 0, failed: 0 };

    const { data: auth } = await supabase.auth.getUser();
    if (!auth?.user?.id) return { sent: 0, failed: 0 };

    for (const item of items) {
      try {
        const { error } = await (supabase as unknown as {
          from: (t: string) => {
            insert: (p: Record<string, unknown>) => Promise<{ error: unknown }>;
          };
        })
          .from(item.table)
          .insert(item.payload);
        if (error) throw error;
        remove(item.id);
        sent += 1;
      } catch (e) {
        failed += 1;
        const items2 = safeRead().map((i) =>
          i.id === item.id
            ? {
                ...i,
                attempts: i.attempts + 1,
                lastError: (e as { message?: string })?.message || "send_failed",
              }
            : i,
        );
        safeWrite(items2);
      }
    }
    return { sent, failed };
  } finally {
    flushing = false;
  }
}
