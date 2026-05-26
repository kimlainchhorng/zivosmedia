/**
 * useNowTick — returns Date.now() that re-renders on a fixed interval.
 * Single shared subscription per interval, so 100 cards calling
 * useNowTick(60_000) cost one timer, not 100. Pauses while the document
 * is hidden so we don't burn battery on a backgrounded tab.
 */
import { useSyncExternalStore } from "react";

type Subscriber = () => void;

class TickStore {
  private subs = new Set<Subscriber>();
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private now = Date.now();
  private visListenerInstalled = false;

  constructor(private readonly intervalMs: number) {}

  getSnapshot = () => this.now;

  subscribe = (fn: Subscriber) => {
    this.subs.add(fn);
    this.ensureRunning();
    return () => {
      this.subs.delete(fn);
      if (this.subs.size === 0) this.stop();
    };
  };

  private ensureRunning() {
    if (this.intervalId != null) return;
    if (typeof document !== "undefined" && document.hidden) return;
    this.intervalId = setInterval(() => {
      this.now = Date.now();
      for (const s of this.subs) s();
    }, this.intervalMs);
    if (!this.visListenerInstalled && typeof document !== "undefined") {
      this.visListenerInstalled = true;
      document.addEventListener("visibilitychange", this.onVisChange);
    }
  }

  private stop() {
    if (this.intervalId != null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private onVisChange = () => {
    if (document.hidden) {
      this.stop();
    } else if (this.subs.size > 0) {
      this.now = Date.now();
      for (const s of this.subs) s();
      this.ensureRunning();
    }
  };
}

const stores = new Map<number, TickStore>();

function getStore(intervalMs: number): TickStore {
  let s = stores.get(intervalMs);
  if (!s) {
    s = new TickStore(intervalMs);
    stores.set(intervalMs, s);
  }
  return s;
}

export function useNowTick(intervalMs = 60_000): number {
  const store = getStore(intervalMs);
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
}
