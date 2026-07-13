import { useCallback, useEffect, useState } from "react";

export interface RecentSetting {
  href: string;
  label: string;
  visitedAt: number;
}

const STORAGE_KEY = "zivo_recent_settings";
const MAX_RECENTS = 5;

function load(): RecentSetting[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as RecentSetting[];
    return Array.isArray(parsed) ? parsed.slice(0, MAX_RECENTS) : [];
  } catch {
    return [];
  }
}

function save(items: RecentSetting[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

export function useRecentSettings() {
  const [items, setItems] = useState<RecentSetting[]>(load);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setItems(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const record = useCallback((href: string, label: string) => {
    setItems((prev) => {
      const filtered = prev.filter((i) => i.href !== href);
      const next = [{ href, label, visitedAt: Date.now() }, ...filtered].slice(0, MAX_RECENTS);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    save([]);
    setItems([]);
  }, []);

  return { items, record, clear };
}
