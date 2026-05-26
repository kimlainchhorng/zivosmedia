import { useCallback, useEffect, useState } from "react";

export type DistanceUnit = "km" | "mi";
export type TemperatureUnit = "c" | "f";
export type TimeFormat = "24h" | "12h";
export type DateFormat = "ymd" | "dmy" | "mdy";

export interface UnitPreferences {
  distance: DistanceUnit;
  temperature: TemperatureUnit;
  timeFormat: TimeFormat;
  dateFormat: DateFormat;
}

const STORAGE_KEY = "zivo_unit_preferences";

const defaults: UnitPreferences = {
  distance: "km",
  temperature: "c",
  timeFormat: "24h",
  dateFormat: "ymd",
};

function load(): UnitPreferences {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<UnitPreferences>) };
  } catch {
    return defaults;
  }
}

export function useUnitPreferences() {
  const [prefs, setPrefs] = useState<UnitPreferences>(load);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setPrefs(load());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const update = useCallback(<K extends keyof UnitPreferences>(key: K, value: UnitPreferences[K]) => {
    setPrefs((prev) => {
      const next = { ...prev, [key]: value };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore quota errors — value still updates in memory
      }
      return next;
    });
  }, []);

  return { prefs, update };
}
