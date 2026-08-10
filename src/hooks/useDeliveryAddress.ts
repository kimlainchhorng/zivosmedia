/**
 * useDeliveryAddress - Manage saved delivery addresses (Home, Work, Custom)
 * Syncs to Supabase saved_locations when logged in, falls back to localStorage.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export interface DeliveryAddress {
  id: string;
  label: "Home" | "Work" | "Other";
  address: string;
  apt?: string;
  instructions?: string;
  isDefault: boolean;
  lat?: number;
  lng?: number;
}

const STORAGE_KEY = "zivo_delivery_addresses";
const SELECTED_KEY = "zivo_selected_address";
const GUEST_SCOPE = "guest";

const scopedStorageKey = (baseKey: string, userId: string | null): string =>
  `${baseKey}:${userId ?? GUEST_SCOPE}`;

function loadLocalAddresses(userId: string | null): DeliveryAddress[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(scopedStorageKey(STORAGE_KEY, userId));
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is DeliveryAddress => {
      if (!value || typeof value !== "object") return false;
      const candidate = value as Partial<DeliveryAddress>;
      return typeof candidate.id === "string"
        && (candidate.label === "Home" || candidate.label === "Work" || candidate.label === "Other")
        && typeof candidate.address === "string"
        && typeof candidate.isDefault === "boolean";
    });
  } catch {
    return [];
  }
}

function writeLocalAddresses(userId: string | null, addresses: DeliveryAddress[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(scopedStorageKey(STORAGE_KEY, userId), JSON.stringify(addresses));
  } catch {}
}

function loadSelectedId(userId: string | null): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(scopedStorageKey(SELECTED_KEY, userId));
  } catch {
    return null;
  }
}

function writeSelectedId(userId: string | null, selectedId: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const key = scopedStorageKey(SELECTED_KEY, userId);
    if (selectedId) window.localStorage.setItem(key, selectedId);
    else window.localStorage.removeItem(key);
  } catch {}
}

function labelToIcon(label: string): string {
  if (label === "Home") return "home";
  if (label === "Work") return "briefcase";
  return "pin";
}

function iconToLabel(icon: string): "Home" | "Work" | "Other" {
  if (icon === "home") return "Home";
  if (icon === "briefcase") return "Work";
  return "Other";
}

export function useDeliveryAddress() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [addressesState, setAddressesState] = useState<{ userId: string | null; items: DeliveryAddress[] }>(() => ({
    userId,
    items: loadLocalAddresses(userId),
  }));
  const [selectedState, setSelectedState] = useState<{ userId: string | null; value: string | null }>(() => ({
    userId,
    value: loadSelectedId(userId),
  }));
  const [isLoaded, setIsLoaded] = useState(false);
  const addresses = addressesState.userId === userId ? addressesState.items : loadLocalAddresses(userId);
  const selectedId = selectedState.userId === userId ? selectedState.value : loadSelectedId(userId);

  const updateAddresses = useCallback((updater: DeliveryAddress[] | ((previous: DeliveryAddress[]) => DeliveryAddress[])) => {
    setAddressesState((previous) => {
      const current = previous.userId === userId ? previous.items : loadLocalAddresses(userId);
      const next = typeof updater === "function" ? updater(current) : updater;
      writeLocalAddresses(userId, next);
      return { userId, items: next };
    });
  }, [userId]);

  const replaceAddresses = useCallback((next: DeliveryAddress[]) => {
    writeLocalAddresses(userId, next);
    setAddressesState({ userId, items: next });
  }, [userId]);

  const setActiveSelectedId = useCallback((next: string | null | ((previous: string | null) => string | null)) => {
    setSelectedState((previous) => {
      const current = previous.userId === userId ? previous.value : loadSelectedId(userId);
      const value = typeof next === "function" ? next(current) : next;
      writeSelectedId(userId, value);
      return { userId, value };
    });
  }, [userId]);

  // Load from Supabase for the active account. Account-scoped local state is
  // used as a safe offline fallback; the legacy unscoped key is intentionally
  // not read or migrated into a different account.
  useEffect(() => {
    const requestUserId = userId;
    let active = true;
    setIsLoaded(false);

    if (!requestUserId) {
      setIsLoaded(true);
      return () => { active = false; };
    }

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("saved_locations")
          .select("*")
          .eq("user_id", requestUserId)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!active) return;

        if (data && data.length > 0) {
          const mapped: DeliveryAddress[] = data.map((loc, i) => ({
            id: loc.id,
            label: iconToLabel(loc.icon),
            address: loc.address,
            isDefault: i === 0,
            lat: loc.lat,
            lng: loc.lng,
          }));
          replaceAddresses(mapped);
          const cachedSelectedId = loadSelectedId(requestUserId);
          setActiveSelectedId(
            cachedSelectedId && mapped.some((address) => address.id === cachedSelectedId)
              ? cachedSelectedId
              : mapped.find((address) => address.isDefault)?.id ?? null,
          );
        } else {
          // Only migrate a cache already scoped to this same account. Guest
          // addresses and the legacy global cache never cross an account boundary.
          const local = loadLocalAddresses(requestUserId);
          if (local.length > 0) {
            const migrated = await migrateLocalToSupabase(requestUserId, local);
            if (!active) return;
            replaceAddresses(migrated);
          } else {
            replaceAddresses([]);
            setActiveSelectedId(null);
          }
        }
      } catch (err) {
        if (active) console.error("[useDeliveryAddress] Failed to load from Supabase:", err);
      } finally {
        if (active) setIsLoaded(true);
      }
    };

    void loadFromSupabase();
    return () => { active = false; };
  }, [replaceAddresses, setActiveSelectedId, userId]);

  const selectedAddress = addresses.find((a) => a.id === selectedId)
    ?? addresses.find((a) => a.isDefault)
    ?? addresses[0]
    ?? null;

  const migrateLocalToSupabase = async (targetUserId: string, localAddrs: DeliveryAddress[]): Promise<DeliveryAddress[]> => {
    const migrated: DeliveryAddress[] = [];
    for (const addr of localAddrs) {
      try {
        const { data } = await supabase
          .from("saved_locations")
          .insert({
            user_id: targetUserId,
            label: addr.label,
            address: addr.address,
            lat: addr.lat ?? 0,
            lng: addr.lng ?? 0,
            icon: labelToIcon(addr.label),
          })
          .select()
          .single();

        migrated.push(data ? { ...addr, id: data.id } : addr);
      } catch (err) {
        console.error("[useDeliveryAddress] Migration error:", err);
        migrated.push(addr);
      }
    }
    return migrated;
  };

  const addAddress = useCallback(async (addr: Omit<DeliveryAddress, "id">) => {
    const tempId = crypto.randomUUID().slice(0, 8);

    // Optimistically add locally in the active account/guest scope.
    updateAddresses((prev) => {
      const updated = addr.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [...updated, { ...addr, id: tempId }];
    });
    setActiveSelectedId(tempId);

    // Persist to Supabase if logged in.
    if (userId) {
      try {
        const { data, error } = await supabase
          .from("saved_locations")
          .insert({
            user_id: userId,
            label: addr.label,
            address: addr.address,
            lat: addr.lat ?? 0,
            lng: addr.lng ?? 0,
            icon: labelToIcon(addr.label),
          })
          .select()
          .single();

        if (!error && data) {
          // Replace temp ID with Supabase ID in the same account scope.
          updateAddresses((prev) => prev.map((a) => (a.id === tempId ? { ...a, id: data.id } : a)));
          setActiveSelectedId(data.id);
        }
      } catch (err) {
        console.error("[useDeliveryAddress] Failed to save to Supabase:", err);
      }
    }

    return tempId;
  }, [setActiveSelectedId, updateAddresses, userId]);

  const updateAddress = useCallback(async (id: string, updates: Partial<DeliveryAddress>) => {
    updateAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) return { ...a, ...updates };
        if (updates.isDefault && a.id !== id) return { ...a, isDefault: false };
        return a;
      })
    );

    // Sync to Supabase with an explicit owner filter.
    if (userId) {
      try {
        const supabaseUpdates: Record<string, any> = {};
        if (updates.address !== undefined) supabaseUpdates.address = updates.address;
        if (updates.label !== undefined) {
          supabaseUpdates.label = updates.label;
          supabaseUpdates.icon = labelToIcon(updates.label);
        }
        if (updates.lat !== undefined) supabaseUpdates.lat = updates.lat;
        if (updates.lng !== undefined) supabaseUpdates.lng = updates.lng;

        if (Object.keys(supabaseUpdates).length > 0) {
          await supabase
            .from("saved_locations")
            .update(supabaseUpdates as any)
            .eq("id", id)
            .eq("user_id", userId);
        }
      } catch (err) {
        console.error("[useDeliveryAddress] Failed to update in Supabase:", err);
      }
    }
  }, [updateAddresses, userId]);

  const removeAddress = useCallback(async (id: string) => {
    updateAddresses((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setActiveSelectedId(null);

    // Remove from Supabase with an explicit owner filter.
    if (userId) {
      try {
        await supabase
          .from("saved_locations")
          .delete()
          .eq("id", id)
          .eq("user_id", userId);
      } catch (err) {
        console.error("[useDeliveryAddress] Failed to delete from Supabase:", err);
      }
    }
  }, [selectedId, setActiveSelectedId, updateAddresses, userId]);

  const selectAddress = useCallback((id: string) => {
    setActiveSelectedId(id);
  }, [setActiveSelectedId]);

  return {
    addresses,
    selectedAddress,
    selectedId,
    addAddress,
    updateAddress,
    removeAddress,
    selectAddress,
  };
}
