/**
 * useLocalSavedPlaces — localStorage-backed quick-pick places
 * (Home, Work, plus user-named custom entries) used by /rides and the
 * after-ride save flow.
 *
 * The existing `useSavedLocations` hook hits Supabase; this lightweight
 * counterpart works offline and for guests, and is the source of truth for
 * the after-ride save UI.
 */
import { useCallback, useEffect, useState } from "react";

export type SavedPlaceKind = "home" | "work" | "custom";

export interface SavedPlace {
  id: string;
  kind: SavedPlaceKind;
  /** Display label — for kind=home/work this is enforced as "Home"/"Work". */
  label: string;
  address: string;
  addedAt: number;
}

const STORAGE_KEY = "zivo:saved-places";
const EVENT_NAME = "zivo:saved-places:changed";

function readAll(): SavedPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (p): p is SavedPlace =>
        p && typeof p.id === "string" && typeof p.address === "string" &&
        (p.kind === "home" || p.kind === "work" || p.kind === "custom"),
    );
  } catch {
    return [];
  }
}

function writeAll(entries: SavedPlace[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  } catch {
    /* ignore */
  }
}

function defaultLabel(kind: SavedPlaceKind): string {
  if (kind === "home") return "Home";
  if (kind === "work") return "Work";
  return "Saved place";
}

export function useLocalSavedPlaces() {
  const [places, setPlaces] = useState<SavedPlace[]>(() => readAll());

  useEffect(() => {
    const refresh = () => setPlaces(readAll());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(EVENT_NAME, refresh);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(EVENT_NAME, refresh);
    };
  }, []);

  const findByKind = useCallback(
    (kind: SavedPlaceKind): SavedPlace | undefined => places.find((p) => p.kind === kind),
    [places],
  );

  const findByAddress = useCallback(
    (address: string): SavedPlace | undefined =>
      places.find((p) => p.address.trim().toLowerCase() === address.trim().toLowerCase()),
    [places],
  );

  /**
   * Save a place. For `home` and `work` this replaces the existing entry of
   * that kind (there's only one of each). For `custom` it allows multiple.
   */
  const save = useCallback(
    (kind: SavedPlaceKind, address: string, label?: string) => {
      const cleanAddress = address.trim();
      if (!cleanAddress) return;
      const all = readAll();
      const baseLabel = (label ?? "").trim() || defaultLabel(kind);
      let next: SavedPlace[];
      if (kind === "home" || kind === "work") {
        const others = all.filter((p) => p.kind !== kind);
        next = [
          { id: kind, kind, label: defaultLabel(kind), address: cleanAddress, addedAt: Date.now() },
          ...others,
        ];
      } else {
        // Dedup custom by address
        const filtered = all.filter(
          (p) => !(p.kind === "custom" && p.address.trim().toLowerCase() === cleanAddress.toLowerCase()),
        );
        next = [
          {
            id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            kind: "custom" as const,
            label: baseLabel,
            address: cleanAddress,
            addedAt: Date.now(),
          },
          ...filtered,
        ].slice(0, 25);
      }
      writeAll(next);
      setPlaces(next);
    },
    [],
  );

  const remove = useCallback((id: string) => {
    const next = readAll().filter((p) => p.id !== id);
    writeAll(next);
    setPlaces(next);
  }, []);

  return { places, findByKind, findByAddress, save, remove };
}
