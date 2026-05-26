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

function loadLocalAddresses(): DeliveryAddress[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function loadSelectedId(): string | null {
  try {
    return localStorage.getItem(SELECTED_KEY);
  } catch {
    return null;
  }
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
  const [addresses, setAddresses] = useState<DeliveryAddress[]>(loadLocalAddresses);
  const [selectedId, setSelectedIdState] = useState<string | null>(loadSelectedId);
  const [isLoaded, setIsLoaded] = useState(false);
  const syncingRef = useRef(false);

  // Load from Supabase when user logs in
  useEffect(() => {
    if (!user?.id) {
      setIsLoaded(true);
      return;
    }

    const loadFromSupabase = async () => {
      try {
        const { data, error } = await supabase
          .from("saved_locations")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (data && data.length > 0) {
          const mapped: DeliveryAddress[] = data.map((loc, i) => ({
            id: loc.id,
            label: iconToLabel(loc.icon),
            address: loc.address,
            isDefault: i === 0,
            lat: loc.lat,
            lng: loc.lng,
          }));
          setAddresses(mapped);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(mapped));
        } else {
          // If Supabase is empty but localStorage has addresses, migrate them up
          const local = loadLocalAddresses();
          if (local.length > 0) {
            await migrateLocalToSupabase(user.id, local);
          }
        }
      } catch (err) {
        console.error("[useDeliveryAddress] Failed to load from Supabase:", err);
      } finally {
        setIsLoaded(true);
      }
    };

    loadFromSupabase();
  }, [user?.id]);

  // Persist selected ID to localStorage
  useEffect(() => {
    if (selectedId) localStorage.setItem(SELECTED_KEY, selectedId);
  }, [selectedId]);

  // Keep localStorage in sync
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(addresses));
  }, [addresses]);

  const selectedAddress = addresses.find((a) => a.id === selectedId)
    ?? addresses.find((a) => a.isDefault)
    ?? addresses[0]
    ?? null;

  const migrateLocalToSupabase = async (userId: string, localAddrs: DeliveryAddress[]) => {
    for (const addr of localAddrs) {
      try {
        const { data } = await supabase
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

        if (data) {
          // Update local ID to match Supabase ID
          setAddresses((prev) =>
            prev.map((a) => (a.id === addr.id ? { ...a, id: data.id } : a))
          );
        }
      } catch (err) {
        console.error("[useDeliveryAddress] Migration error:", err);
      }
    }
  };

  const addAddress = useCallback(async (addr: Omit<DeliveryAddress, "id">) => {
    const tempId = crypto.randomUUID().slice(0, 8);

    // Optimistically add locally
    setAddresses((prev) => {
      const updated = addr.isDefault
        ? prev.map((a) => ({ ...a, isDefault: false }))
        : prev;
      return [...updated, { ...addr, id: tempId }];
    });
    setSelectedIdState(tempId);

    // Persist to Supabase if logged in
    if (user?.id) {
      try {
        const { data, error } = await supabase
          .from("saved_locations")
          .insert({
            user_id: user.id,
            label: addr.label,
            address: addr.address,
            lat: addr.lat ?? 0,
            lng: addr.lng ?? 0,
            icon: labelToIcon(addr.label),
          })
          .select()
          .single();

        if (!error && data) {
          // Replace temp ID with Supabase ID
          setAddresses((prev) =>
            prev.map((a) => (a.id === tempId ? { ...a, id: data.id } : a))
          );
          setSelectedIdState(data.id);
        }
      } catch (err) {
        console.error("[useDeliveryAddress] Failed to save to Supabase:", err);
      }
    }

    return tempId;
  }, [user?.id]);

  const updateAddress = useCallback(async (id: string, updates: Partial<DeliveryAddress>) => {
    setAddresses((prev) =>
      prev.map((a) => {
        if (a.id === id) return { ...a, ...updates };
        if (updates.isDefault && a.id !== id) return { ...a, isDefault: false };
        return a;
      })
    );

    // Sync to Supabase
    if (user?.id) {
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
            .eq("id", id);
        }
      } catch (err) {
        console.error("[useDeliveryAddress] Failed to update in Supabase:", err);
      }
    }
  }, [user?.id]);

  const removeAddress = useCallback(async (id: string) => {
    setAddresses((prev) => prev.filter((a) => a.id !== id));
    if (selectedId === id) setSelectedIdState(null);

    // Remove from Supabase
    if (user?.id) {
      try {
        await supabase
          .from("saved_locations")
          .delete()
          .eq("id", id);
      } catch (err) {
        console.error("[useDeliveryAddress] Failed to delete from Supabase:", err);
      }
    }
  }, [selectedId, user?.id]);

  const selectAddress = useCallback((id: string) => {
    setSelectedIdState(id);
  }, []);

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
