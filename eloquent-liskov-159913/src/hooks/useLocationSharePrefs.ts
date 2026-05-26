/**
 * useLocationSharePrefs — User toggles for shared-location card behaviour.
 * Persisted in localStorage, keyed by user id.
 *
 *   showAddress  → reverse-geocode + display street/city (default OFF for privacy)
 *   showRoute    → show distance + ETA from current location (default OFF — needs geo permission)
 */
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

export interface LocationSharePrefs {
  showAddress: boolean;
  showRoute: boolean;
}

const DEFAULTS: LocationSharePrefs = {
  showAddress: false,
  showRoute: false,
};

const key = (uid?: string) => `zivo:location-share-prefs:${uid || "anon"}`;

function load(uid?: string): LocationSharePrefs {
  try {
    const raw = localStorage.getItem(key(uid));
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(uid: string | undefined, p: LocationSharePrefs) {
  try { localStorage.setItem(key(uid), JSON.stringify(p)); } catch { /* noop */ }
}

export function useLocationSharePrefs() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<LocationSharePrefs>(() => load(user?.id));

  useEffect(() => { setPrefs(load(user?.id)); }, [user?.id]);

  // Cross-tab sync
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === key(user?.id)) setPrefs(load(user?.id));
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [user?.id]);

  const update = useCallback(<K extends keyof LocationSharePrefs>(k: K, v: LocationSharePrefs[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [k]: v };
      save(user?.id, next);
      return next;
    });
  }, [user?.id]);

  return { prefs, update };
}
