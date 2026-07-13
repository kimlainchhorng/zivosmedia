import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type PostgresEvent = "*" | "INSERT" | "UPDATE" | "DELETE";
type PoolListener = (payload: RealtimePostgresChangesPayload<any>) => void;

type PoolSubscription = {
  poolKey: string;
  event: PostgresEvent;
  schema: string;
  table: string;
  filter?: string;
};

type PoolGroupSubscription = {
  event: PostgresEvent;
  schema: string;
  table: string;
  filter?: string;
};

type PoolGroupListenerPayload = {
  subscription: PoolGroupSubscription;
  payload: RealtimePostgresChangesPayload<any>;
};

type PoolGroupListener = (update: PoolGroupListenerPayload) => void;
type PoolStatusListener = (status: string) => void;

type PoolEntry = {
  channel: ReturnType<typeof supabase.channel>;
  channelKey: string;
  listeners: Map<string, PoolListener>;
  releaseTimer: ReturnType<typeof setTimeout> | null;
};

const channelPool = new Map<string, PoolEntry>();
const channelGroupPool = new Map<string, {
  channel: ReturnType<typeof supabase.channel>;
  channelKey: string;
  listeners: Map<string, PoolGroupListener>;
  statusListeners: Map<string, PoolStatusListener>;
  releaseTimer: ReturnType<typeof setTimeout> | null;
}>();
const releaseDelayMs = 1_000;

export function getChatRealtimePoolStats() {
  let listenerCount = 0;
  channelPool.forEach((entry) => {
    listenerCount += entry.listeners.size;
  });
  channelGroupPool.forEach((entry) => {
    listenerCount += entry.listeners.size;
  });

  return {
    channelCount: channelPool.size + channelGroupPool.size,
    listenerCount,
    channelKeys: [
      ...Array.from(channelPool.keys()),
      ...Array.from(channelGroupPool.keys()),
    ],
  };
}

function getListenerId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `listener-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function stableChannelKey(subscription: PoolSubscription) {
  const filter = subscription.filter || "";
  return [
    subscription.poolKey,
    subscription.event,
    subscription.schema,
    subscription.table,
    filter,
  ].join("|");
}

function stableGroupKey(poolKey: string, subscriptions: PoolGroupSubscription[]) {
  const signature = subscriptions
    .map((sub) => [sub.event, sub.schema, sub.table, sub.filter || ""].join("|"))
    .sort()
    .join(";");
  return `${poolKey}::${signature}`;
}

function toChannelName(channelKey: string) {
  let hash = 0;
  for (let i = 0; i < channelKey.length; i += 1) {
    hash = (hash << 5) - hash + channelKey.charCodeAt(i);
    hash |= 0;
  }
  const safePoolName = channelKey
    .split("|")[0]
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .slice(0, 28);
  return `chat-pool-${safePoolName}-${Math.abs(hash)}`;
}

export function subscribeToPooledPostgresChanges(
  subscription: PoolSubscription,
  listener: PoolListener,
) {
  const channelKey = stableChannelKey(subscription);
  const listenerId = getListenerId();
  let entry = channelPool.get(channelKey);

  if (!entry) {
    const listeners = new Map<string, PoolListener>();
    const channel = supabase
      .channel(toChannelName(channelKey))
      .on(
        "postgres_changes",
        {
          event: subscription.event,
          schema: subscription.schema,
          table: subscription.table,
          filter: subscription.filter,
        },
        (payload) => {
          const current = channelPool.get(channelKey);
          if (!current) return;
          current.listeners.forEach((cb) => cb(payload));
        },
      )
      .subscribe();

    entry = {
      channel,
      channelKey,
      listeners,
      releaseTimer: null,
    };

    channelPool.set(channelKey, entry);
  }

  if (entry.releaseTimer) {
    clearTimeout(entry.releaseTimer);
    entry.releaseTimer = null;
  }

  entry.listeners.set(listenerId, listener);

  return () => {
    const current = channelPool.get(channelKey);
    if (!current) return;

    current.listeners.delete(listenerId);
    if (current.listeners.size > 0) return;

    current.releaseTimer = setTimeout(() => {
      const finalEntry = channelPool.get(channelKey);
      if (!finalEntry || finalEntry.listeners.size > 0) return;

      supabase.removeChannel(finalEntry.channel);
      channelPool.delete(channelKey);
    }, releaseDelayMs);
  };
}

export function subscribeToPooledPostgresChangesGroup(
  poolKey: string,
  subscriptions: PoolGroupSubscription[],
  listener: PoolGroupListener,
  options?: { onStatusChange?: PoolStatusListener },
) {
  const groupKey = stableGroupKey(poolKey, subscriptions);
  const listenerId = getListenerId();
  let entry = channelGroupPool.get(groupKey);

  if (!entry) {
    const listeners = new Map<string, PoolGroupListener>();
    const statusListeners = new Map<string, PoolStatusListener>();
    const channel = supabase.channel(toChannelName(groupKey));

    subscriptions.forEach((subscription) => {
      channel.on(
        "postgres_changes",
        {
          event: subscription.event,
          schema: subscription.schema,
          table: subscription.table,
          filter: subscription.filter,
        },
        (payload) => {
          const current = channelGroupPool.get(groupKey);
          if (!current) return;
          current.listeners.forEach((cb) => cb({ subscription, payload }));
        },
      );
    });

    channel.subscribe((status) => {
      const current = channelGroupPool.get(groupKey);
      if (!current) return;
      current.statusListeners.forEach((cb) => cb(status));
    });

    entry = {
      channel,
      channelKey: groupKey,
      listeners,
      statusListeners,
      releaseTimer: null,
    };

    channelGroupPool.set(groupKey, entry);
  }

  if (entry.releaseTimer) {
    clearTimeout(entry.releaseTimer);
    entry.releaseTimer = null;
  }

  entry.listeners.set(listenerId, listener);
  if (options?.onStatusChange) {
    entry.statusListeners.set(listenerId, options.onStatusChange);
  }

  return () => {
    const current = channelGroupPool.get(groupKey);
    if (!current) return;

    current.listeners.delete(listenerId);
    current.statusListeners.delete(listenerId);
    if (current.listeners.size > 0) return;

    current.releaseTimer = setTimeout(() => {
      const finalEntry = channelGroupPool.get(groupKey);
      if (!finalEntry || finalEntry.listeners.size > 0) return;

      supabase.removeChannel(finalEntry.channel);
      channelGroupPool.delete(groupKey);
    }, releaseDelayMs);
  };
}
