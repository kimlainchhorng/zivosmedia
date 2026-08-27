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
  /** Authenticated account that created this queued send. */
  ownerId: string;
  /** Immutable identity for this exact enqueue, even when id is reused. */
  revision: string;
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

export interface OutboxFilter {
  table?: OutboxItem["table"];
  chatKey?: string;
}

type PendingOutboxItem = Omit<
  OutboxItem,
  "ownerId" | "revision" | "createdAt" | "attempts"
>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isValidIdentifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value.trim() === value;

const hasOwn = (value: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, key);

let revisionCounter = 0;
const createRevision = (): string => {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  revisionCounter += 1;
  return `${Math.random().toString(36).slice(2)}-${revisionCounter.toString(36)}`;
};

/**
 * Treat persisted browser data as untrusted. Ownerless v1 rows are accepted
 * only when their payload already carries a usable sender_id; modern rows must
 * have an exact owner/sender match.
 */
const normalizeStoredItem = (value: unknown): OutboxItem | null => {
  if (!isRecord(value) || !isRecord(value.payload)) return null;

  const senderId = value.payload.sender_id;
  if (!isValidIdentifier(senderId)) return null;

  let ownerId: string;
  if (hasOwn(value, "ownerId")) {
    if (!isValidIdentifier(value.ownerId) || value.ownerId !== senderId)
      return null;
    ownerId = value.ownerId;
  } else {
    // Legacy zivo.chat.outbox.v1 rows did not include ownerId.
    ownerId = senderId;
  }

  let revision: string;
  if (hasOwn(value, "revision")) {
    if (!isValidIdentifier(value.revision)) return null;
    revision = value.revision;
  } else {
    // Normalize legacy rows once; safeRead persists this generated revision.
    revision = createRevision();
  }

  const optimistic = value.optimistic;
  const lastError = value.lastError;

  if (
    !isValidIdentifier(value.id) ||
    !isValidIdentifier(value.chatKey) ||
    (value.table !== "direct_messages" && value.table !== "group_messages") ||
    typeof value.createdAt !== "number" ||
    !Number.isFinite(value.createdAt) ||
    value.createdAt < 0 ||
    typeof value.attempts !== "number" ||
    !Number.isInteger(value.attempts) ||
    value.attempts < 0
  ) {
    return null;
  }
  if (optimistic !== undefined && !isRecord(optimistic)) return null;
  if (lastError !== undefined && typeof lastError !== "string") return null;

  const normalized: OutboxItem = {
    ownerId,
    revision,
    id: value.id,
    table: value.table,
    chatKey: value.chatKey,
    payload: value.payload,
    createdAt: value.createdAt,
    attempts: value.attempts,
  };
  if (optimistic !== undefined) {
    normalized.optimistic = optimistic as Record<string, unknown>;
  }
  if (lastError !== undefined) normalized.lastError = lastError as string;
  return normalized;
};

const dispatchChange = (ownerId?: string) => {
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { ownerId } }));
};

const safeWrite = (items: OutboxItem[], ownerId?: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    dispatchChange(ownerId);
  } catch {
    // Quota exceeded or storage disabled — the caller still retains its UI state.
  }
};

const safeRead = (): OutboxItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const items = parsed.flatMap((item) => {
      const normalized = normalizeStoredItem(item);
      return normalized ? [normalized] : [];
    });

    // Persist legacy owner normalization and remove malformed/mismatched rows
    // from the active queue so they cannot become reachable on a later write.
    if (JSON.stringify(items) !== JSON.stringify(parsed)) {
      safeWrite(items);
    }
    return items;
  } catch {
    return [];
  }
};

const sendingIds = new Set<string>();
const sendingKey = (ownerId: string, id: string) =>
  JSON.stringify([ownerId, id]);

export function beginSend(ownerId: string, id: string): boolean {
  if (!isValidIdentifier(ownerId) || !isValidIdentifier(id)) return false;
  const key = sendingKey(ownerId, id);
  if (sendingIds.has(key)) return false;
  sendingIds.add(key);
  return true;
}

export function finishSend(ownerId: string, id: string) {
  if (!isValidIdentifier(ownerId) || !isValidIdentifier(id)) return;
  sendingIds.delete(sendingKey(ownerId, id));
}

export function enqueue(ownerId: string, item: PendingOutboxItem) {
  if (!isValidIdentifier(ownerId)) return;

  const normalized = normalizeStoredItem({
    ...item,
    ownerId,
    revision: createRevision(),
    createdAt: Date.now(),
    attempts: 0,
  });
  if (!normalized) return;

  const items = safeRead().filter(
    (existing) => existing.ownerId !== ownerId || existing.id !== normalized.id,
  );
  items.push(normalized);
  safeWrite(items, ownerId);
}

export function remove(ownerId: string, id: string) {
  if (!isValidIdentifier(ownerId) || !isValidIdentifier(id)) return;
  const items = safeRead();
  const remaining = items.filter(
    (item) => item.ownerId !== ownerId || item.id !== id,
  );
  if (remaining.length !== items.length) safeWrite(remaining, ownerId);
}

const isSameRevision = (candidate: OutboxItem, expected: OutboxItem): boolean =>
  candidate.ownerId === expected.ownerId &&
  candidate.id === expected.id &&
  candidate.revision === expected.revision;

const removeIfCurrent = (expected: OutboxItem) => {
  const items = safeRead();
  const remaining = items.filter(
    (candidate) => !isSameRevision(candidate, expected),
  );
  if (remaining.length !== items.length) safeWrite(remaining, expected.ownerId);
};

export function list(ownerId: string, filter?: OutboxFilter): OutboxItem[] {
  if (!isValidIdentifier(ownerId)) return [];
  const items = safeRead().filter((item) => item.ownerId === ownerId);
  if (!filter) return items;
  return items.filter(
    (i) =>
      (filter.table == null || i.table === filter.table) &&
      (filter.chatKey == null || i.chatKey === filter.chatKey),
  );
}

export function subscribe(ownerId: string, handler: () => void): () => void {
  if (!isValidIdentifier(ownerId)) return () => {};

  const fn = (event: Event) => {
    const changedOwnerId = (event as CustomEvent<{ ownerId?: string }>).detail
      ?.ownerId;
    if (changedOwnerId == null || changedOwnerId === ownerId) handler();
  };
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

type FlushResult = { sent: number; failed: number };
type PendingFlushState = {
  rerunRequested: boolean;
  promise: Promise<FlushResult>;
};
const EMPTY_FLUSH_RESULT: FlushResult = { sent: 0, failed: 0 };
const pendingFlushes = new Map<string, PendingFlushState>();
let flushTail: Promise<void> = Promise.resolve();

/**
 * Try to insert the requested owner's queued payloads. Successful items are
 * removed; failures stay queued with attempts incremented. Flushes serialize
 * across account switches so a new owner's initial drain is not skipped.
 */
async function flushOwner(ownerId: string): Promise<FlushResult> {
  let sent = 0;
  let failed = 0;
  const items = list(ownerId);

  for (const item of items) {
    if (!beginSend(ownerId, item.id)) continue;
    let stopForAuthChange = false;
    try {
      let authenticatedOwnerId: string | undefined;
      try {
        const { data: auth, error: authError } = await supabase.auth.getUser();
        if (!authError) authenticatedOwnerId = auth?.user?.id;
      } catch {
        // A failed identity check is not a send failure. Keep the queue intact.
      }

      if (authenticatedOwnerId !== ownerId) {
        stopForAuthChange = true;
      } else {
        const { error } = await (
          supabase as unknown as {
            from: (t: string) => {
              insert: (
                p: Record<string, unknown>,
              ) => Promise<{ error: unknown }>;
            };
          }
        )
          .from(item.table)
          .insert(item.payload);
        if (error) throw error;
        removeIfCurrent(item);
        sent += 1;
      }
    } catch (e) {
      failed += 1;
      const latestItems = safeRead();
      const updatedItems = latestItems.map((latest) =>
        isSameRevision(latest, item)
          ? {
              ...latest,
              attempts: latest.attempts + 1,
              lastError: (e as { message?: string })?.message || "send_failed",
            }
          : latest,
      );
      safeWrite(updatedItems, ownerId);
    } finally {
      finishSend(ownerId, item.id);
    }

    if (stopForAuthChange) break;
  }

  return { sent, failed };
}

const scheduleFlushPass = (ownerId: string): Promise<FlushResult> => {
  const pass = flushTail.then(
    () => flushOwner(ownerId),
    () => flushOwner(ownerId),
  );
  flushTail = pass.then(
    () => undefined,
    () => undefined,
  );
  return pass;
};

const runPendingFlush = async (
  ownerId: string,
  state: PendingFlushState,
): Promise<FlushResult> => {
  let sent = 0;
  let failed = 0;
  try {
    do {
      state.rerunRequested = false;
      const result = await scheduleFlushPass(ownerId);
      sent += result.sent;
      failed += result.failed;
    } while (state.rerunRequested);
    return { sent, failed };
  } finally {
    // Delete before the returned promise settles so a later call cannot attach
    // to a completed snapshot and lose its fresh drain request.
    if (pendingFlushes.get(ownerId) === state) pendingFlushes.delete(ownerId);
  }
};

export function flush(ownerId: string): Promise<FlushResult> {
  if (!isValidIdentifier(ownerId))
    return Promise.resolve({ ...EMPTY_FLUSH_RESULT });

  const pending = pendingFlushes.get(ownerId);
  if (pending) {
    pending.rerunRequested = true;
    return pending.promise;
  }

  let resolveFlush!: (result: FlushResult) => void;
  let rejectFlush!: (reason?: unknown) => void;
  const promise = new Promise<FlushResult>((resolve, reject) => {
    resolveFlush = resolve;
    rejectFlush = reject;
  });
  const state: PendingFlushState = { rerunRequested: false, promise };
  pendingFlushes.set(ownerId, state);
  void runPendingFlush(ownerId, state).then(resolveFlush, rejectFlush);
  return promise;
}
