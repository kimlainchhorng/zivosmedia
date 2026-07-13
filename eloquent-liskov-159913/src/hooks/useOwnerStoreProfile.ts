import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const LODGING_STORE_CATEGORIES = ["hotel", "hotels", "resort", "resorts", "guesthouse", "guest house", "guesthouse / b&b", "bed and breakfast", "b&b"];

export const normalizeStoreCategory = (category?: string | null) =>
  (category || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/b\s*and\s*b/g, "bed and breakfast")
    .replace(/[\/_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const isLodgingStoreCategory = (category?: string | null) => {
  const normalized = normalizeStoreCategory(category);
  return ["hotel", "hotels", "resort", "resorts", "guesthouse", "guest house", "guesthouse bed and breakfast", "bed and breakfast"].includes(normalized);
};

export function useOwnerStoreProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owner-store-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id, name, slug, category, logo_url, setup_complete, owner_id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const stores = (data || []).map((store) => ({ ...store, isLodging: isLodgingStoreCategory(store.category), normalizedCategory: normalizeStoreCategory(store.category) }));
      return stores.find((store) => store.isLodging) || stores[0] || null;
    },
    enabled: !!user,
  });
}

export function useOwnerStores() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["owner-stores", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("store_profiles")
        .select("id, name, slug, category, logo_url, setup_complete, owner_id")
        .eq("owner_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []).map((store) => ({
        ...store,
        isLodging: isLodgingStoreCategory(store.category),
        normalizedCategory: normalizeStoreCategory(store.category),
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}