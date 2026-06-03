/**
 * Lightweight client-side analytics helper.
 * Fire-and-forget — never throws, never blocks UI.
 *
 * Resilience:
 *  - Each event gets a unique `event_id` (UUID) for downstream dedupe.
 *  - On insert failure, the event is queued in localStorage (capped at 200).
 *  - Queue is flushed on module load, on `online` events, and lazily after
 *    every successful insert (up to 25 queued events at a time).
 */
import { supabase } from "@/integrations/supabase/client";

export type AnalyticsProps = Record<string, unknown>;

const QUEUE_KEY = "zivo:analytics_queue";
const MAX_QUEUE = 200;
const FLUSH_BATCH = 25;
const ANALYTICS_EDGE_ENABLED =
  ((import.meta as any).env?.MODE === "test") ||
  ((import.meta as any).env?.VITE_ANALYTICS_EVENT_TRACK_ENABLED === "true");

interface QueuedEvent {
  event_name: string;
  properties: AnalyticsProps;
  created_at: string;
}

function uuid(): string {
  try {
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
  } catch {
    /* ignore */
  }
  // Fallback: not cryptographically strong but unique enough for dedupe.
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readQueue(): QueuedEvent[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeQueue(q: QueuedEvent[]) {
  try {
    if (typeof localStorage === "undefined") return;
    const trimmed = q.length > MAX_QUEUE ? q.slice(q.length - MAX_QUEUE) : q;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(trimmed));
  } catch {
    /* swallow */
  }
}

function enqueue(ev: QueuedEvent) {
  try {
    const q = readQueue();
    q.push(ev);
    writeQueue(q);
  } catch {
    /* swallow */
  }
}

export type AnalyticsEventPayload = {
  event_name: string;
  session_id?: string;
  page?: string | null;
  meta?: AnalyticsProps;
  created_at?: string;
  order_id?: string;
  value?: number;
  device_type?: string;
  traffic_source?: string;
  is_new_user?: boolean;
  country?: string;
};

async function writeAnalyticsEvent(payload: AnalyticsEventPayload) {
  return supabase.functions.invoke("analytics-event-track", { body: payload });
}

export async function trackRawAnalyticsEvent(payload: AnalyticsEventPayload): Promise<void> {
  if (!ANALYTICS_EDGE_ENABLED) {
    enqueue({
      event_name: payload.event_name,
      properties: payload.meta ?? {},
      created_at: payload.created_at ?? new Date().toISOString(),
    });
    return;
  }

  try {
    const res = await writeAnalyticsEvent(payload);
    if (res?.error) {
      enqueue({
        event_name: payload.event_name,
        properties: payload.meta ?? {},
        created_at: payload.created_at ?? new Date().toISOString(),
      });
    } else {
      void flushQueue();
    }
  } catch {
    enqueue({
      event_name: payload.event_name,
      properties: payload.meta ?? {},
      created_at: payload.created_at ?? new Date().toISOString(),
    });
  }
}

let flushing = false;
async function flushQueue() {
  if (!ANALYTICS_EDGE_ENABLED) return;
  if (flushing) return;
  flushing = true;
  try {
    const q = readQueue();
    if (!q.length) return;
    const batch = q.slice(0, FLUSH_BATCH);
    const remaining = q.slice(batch.length);
    const results = await Promise.allSettled(
      batch.map((ev) =>
        writeAnalyticsEvent({
          event_name: ev.event_name,
          meta: { ...ev.properties, flushed_at: new Date().toISOString() },
          page: typeof window !== "undefined" ? window.location.pathname : null,
          created_at: ev.created_at,
        }),
      ),
    );
    // Re-queue any events that still failed; drop the successful ones.
    const requeue: QueuedEvent[] = [];
    results.forEach((r, i) => {
      const ok = r.status === "fulfilled" && !(r.value as any)?.error;
      if (!ok) requeue.push(batch[i]);
    });
    writeQueue([...requeue, ...remaining]);
  } catch {
    /* swallow */
  } finally {
    flushing = false;
  }
}

// Wire up automatic flushing.
if (typeof window !== "undefined") {
  // On module load (covers reload after offline).
  setTimeout(() => {
    void flushQueue();
  }, 1500);
  window.addEventListener("online", () => {
    void flushQueue();
  });
}

// In-memory dedupe keyed by `event_name + post_id` (when present).
// Repeated taps within `dedupeMs` are dropped before insert.
const recentEvents = new Map<string, number>();
const DEFAULT_DEDUPE_MS = 1500;

function dedupeKey(event: string, props: AnalyticsProps): string | null {
  const postId = (props as any)?.post_id;
  if (!postId) return null;
  return `${event}::${postId}`;
}

function pruneRecent(now: number) {
  // Cheap LRU: drop anything older than 30s.
  for (const [k, t] of recentEvents) {
    if (now - t > 30_000) recentEvents.delete(k);
  }
}

export function track(event: string, props: AnalyticsProps = {}) {
  const dedupeMs =
    typeof (props as any).dedupeMs === "number" ? (props as any).dedupeMs : DEFAULT_DEDUPE_MS;
  const now = Date.now();
  const key = dedupeKey(event, props);

  if (key && dedupeMs > 0) {
    const last = recentEvents.get(key);
    if (last !== undefined && now - last < dedupeMs) {
      if (typeof window !== "undefined" && (window as any).__zivo_debug_analytics) {
         
        console.debug("[analytics] deduped", event, props);
      }
      return;
    }
    recentEvents.set(key, now);
    pruneRecent(now);
  }

  const event_id = uuid();
  const created_at = new Date().toISOString();
  // Strip dedupeMs from the persisted payload — it is a client-only hint.
  const { dedupeMs: _omit, ...rest } = props as Record<string, unknown>;
  const properties: AnalyticsProps = { ...rest, event_id };
  const page = typeof window !== "undefined" ? window.location.pathname : null;

  try {
    void trackRawAnalyticsEvent({
      event_name: event,
      meta: properties,
      page,
      created_at,
    });
  } catch {
    enqueue({ event_name: event, properties, created_at });
  }

  if (typeof window !== "undefined" && (window as any).__zivo_debug_analytics) {
     
    console.debug("[analytics]", event, properties);
  }
}

// Test-only helper to clear dedupe state between unit tests.
export function __resetAnalyticsDedupe() {
  recentEvents.clear();
}
