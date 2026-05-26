/**
 * Personalized Home Hook
 * Time-aware, behavior-driven content for AppHome
 */
import { useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface HomeRestaurant {
  id: string;
  name: string;
  cuisine_type: string | null;
  rating: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
}

type TimePeriod = "morning" | "lunch" | "afternoon" | "evening" | "late_night";

interface TimeContext {
  period: TimePeriod;
  headline: string;
  iconName: string;
}

function getTimeContext(): TimeContext {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) return { period: "morning", headline: "Breakfast Spots", iconName: "coffee" };
  if (hour >= 11 && hour < 14) return { period: "lunch", headline: "Lunchtime Picks", iconName: "utensils-crossed" };
  if (hour >= 14 && hour < 17) return { period: "afternoon", headline: "Afternoon Bites", iconName: "cup-soda" };
  if (hour >= 17 && hour < 22) return { period: "evening", headline: "Dinner & Delivery", iconName: "moon" };
  return { period: "late_night", headline: "Late Night Cravings", iconName: "bird" };
}

const TIME_CUISINE_FILTERS: Record<TimePeriod, string[]> = {
  morning: ["cafe", "bakery", "breakfast", "coffee", "brunch"],
  lunch: [], // all restaurants
  afternoon: ["cafe", "bakery", "coffee", "dessert", "juice"],
  evening: ["dinner", "pizza", "sushi", "italian", "mexican", "indian", "chinese", "thai", "japanese"],
  late_night: ["pizza", "burger", "fast food", "chinese", "mexican", "24"],
};

const STALE_TIME = 60_000;

export function usePersonalizedHome() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const timeContext = useMemo(() => getTimeContext(), []);

  useEffect(() => {
    if (!user?.id) return;

    const invalidatePersonalizedHome = () => {
      void queryClient.invalidateQueries({ queryKey: ["home-time-suggestions"] });
      void queryClient.invalidateQueries({ queryKey: ["home-order-again", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["home-favorites", user.id] });
      void queryClient.invalidateQueries({ queryKey: ["home-recommended", user.id] });
    };

    const channel = supabase
      .channel(`personalized-home-${user.id}-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_orders", filter: `customer_id=eq.${user.id}` },
        invalidatePersonalizedHome,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "food_orders", filter: `user_id=eq.${user.id}` },
        invalidatePersonalizedHome,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_favorites", filter: `user_id=eq.${user.id}` },
        invalidatePersonalizedHome,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "restaurants" },
        invalidatePersonalizedHome,
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  // Time-based suggestions
  const { data: timeSuggestions = [], isLoading: timeLoading } = useQuery({
    queryKey: ["home-time-suggestions", timeContext.period],
    queryFn: async (): Promise<HomeRestaurant[]> => {
      const filters = TIME_CUISINE_FILTERS[timeContext.period];
      const base = supabase
        .from("restaurants")
        .select("id, name, cuisine_type, rating, logo_url, cover_image_url")
        .eq("status", "active")
        .order("rating", { ascending: false })
        .limit(8);

      const { data, error } = filters.length > 0
        ? await base.or(filters.map((f) => `cuisine_type.ilike.%${f}%`).join(","))
        : await base;
      if (error) { console.error("Time suggestions error:", error); return []; }
      return (data || []) as HomeRestaurant[];
    },
    staleTime: STALE_TIME,
  });

  // Order Again — last 5 distinct delivered restaurants
  const { data: orderAgain = [], isLoading: orderLoading } = useQuery({
    queryKey: ["home-order-again", user?.id],
    queryFn: async (): Promise<HomeRestaurant[]> => {
      const db = supabase as any;
      const userFilter = `user_id.eq.${user!.id},customer_id.eq.${user!.id}`;
      const { data, error } = await db
        .from("food_orders")
        .select("restaurant_id, restaurants(id, name, cuisine_type, rating, logo_url, cover_image_url)")
        .or(userFilter)
        .in("status", ["delivered", "completed"])
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) { console.error("Order again error:", error); return []; }

      // Deduplicate by restaurant_id, keep first occurrence (most recent)
      const seen = new Set<string>();
      const results: HomeRestaurant[] = [];
      for (const row of data || []) {
        const r = row.restaurants as any;
        if (!r?.id || seen.has(r.id)) continue;
        seen.add(r.id);
        results.push({ id: r.id, name: r.name, cuisine_type: r.cuisine_type, rating: r.rating, logo_url: r.logo_url, cover_image_url: r.cover_image_url });
        if (results.length >= 5) break;
      }
      return results;
    },
    enabled: !!user?.id,
    staleTime: STALE_TIME,
  });

  // Favorites
  const { data: favorites = [], isLoading: favLoading } = useQuery({
    queryKey: ["home-favorites", user?.id],
    queryFn: async (): Promise<HomeRestaurant[]> => {
      const { data, error } = await supabase
        .from("user_favorites")
        .select("item_id, item_data")
        .eq("user_id", user!.id)
        .eq("item_type", "restaurant")
        .order("created_at", { ascending: false })
        .limit(8);

      if (error) { console.error("Favorites error:", error); return []; }
      if (!data || data.length === 0) {
        // Fallback: top-rated restaurants
        const { data: topRated } = await supabase
          .from("restaurants")
          .select("id, name, cuisine_type, rating, logo_url, cover_image_url")
          .eq("status", "active")
          .order("rating", { ascending: false })
          .limit(6);
        return (topRated || []) as HomeRestaurant[];
      }

      return data.map((fav) => {
        const d = fav.item_data as any;
        return {
          id: fav.item_id,
          name: d?.name || "Restaurant",
          cuisine_type: d?.cuisine_type || null,
          rating: d?.rating || null,
          logo_url: d?.logo_url || null,
          cover_image_url: d?.cover_image_url || null,
        };
      });
    },
    enabled: !!user?.id,
    staleTime: STALE_TIME,
  });

  // Recommended for You
  const { data: recommended = [], isLoading: recLoading } = useQuery({
    queryKey: ["home-recommended", user?.id],
    queryFn: async (): Promise<HomeRestaurant[]> => {
      const db = supabase as any;
      const userFilter = `user_id.eq.${user!.id},customer_id.eq.${user!.id}`;
      // Step 1: Get user's most-ordered cuisine types
      const { data: orderHistory } = await db
        .from("food_orders")
        .select("restaurant_id, restaurants(cuisine_type)")
        .or(userFilter)
        .in("status", ["delivered", "completed"])
        .limit(50);

      const cuisineCounts: Record<string, number> = {};
      const orderedIds = new Set<string>();
      for (const row of orderHistory || []) {
        if (row.restaurant_id) orderedIds.add(row.restaurant_id);
        const cuisine = (row.restaurants as any)?.cuisine_type;
        if (cuisine) cuisineCounts[cuisine] = (cuisineCounts[cuisine] || 0) + 1;
      }

      const topCuisines = Object.entries(cuisineCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([c]) => c);

      // Step 2: Fetch matching restaurants
      let query = supabase
        .from("restaurants")
        .select("id, name, cuisine_type, rating, logo_url, cover_image_url")
        .eq("status", "active")
        .order("rating", { ascending: false })
        .limit(20);

      if (topCuisines.length > 0) {
        query = query.in("cuisine_type", topCuisines);
      }

      const { data: candidates } = await query;

      // Step 3: Score and filter
      const scored = (candidates || [])
        .filter((r) => !orderedIds.has(r.id))
        .map((r) => {
          const cuisineMatch = topCuisines.includes(r.cuisine_type || "") ? 0.4 : 0;
          const ratingScore = ((r.rating || 0) / 5) * 0.4;
          const score = cuisineMatch + ratingScore + 0.2; // open bonus placeholder
          return { ...r, score };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 6);

      if (scored.length === 0) {
        // Fallback: top-rated
        const { data: fallback } = await supabase
          .from("restaurants")
          .select("id, name, cuisine_type, rating, logo_url, cover_image_url")
          .eq("status", "active")
          .order("rating", { ascending: false })
          .limit(6);
        return (fallback || []) as HomeRestaurant[];
      }

      return scored as HomeRestaurant[];
    },
    enabled: !!user?.id,
    staleTime: STALE_TIME,
  });

  return {
    timeContext,
    timeSuggestions,
    orderAgain,
    favorites,
    recommended,
    isLoading: timeLoading || orderLoading || favLoading || recLoading,
  };
}
