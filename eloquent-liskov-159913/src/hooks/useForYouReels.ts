/**
 * useForYouReels — AI recommendation engine for Reels feed
 * Prioritizes content within 3km radius + purchase-category matching
 */
import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface ReelRecommendation {
  postId: string;
  storeId: string;
  storeName: string;
  distanceKm: number | null;
  categoryMatch: boolean;
  score: number;
}

interface UserLocation {
  lat: number;
  lng: number;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function useForYouReels() {
  const { user } = useAuth();
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);

  // Get user GPS
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => { /* silent */ },
      { enableHighAccuracy: false, timeout: 5000 }
    );
  }, []);

  // Get user's purchase categories
  const { data: purchaseCategories = [] } = useQuery({
    queryKey: ["user-purchase-categories", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const db = supabase as any;
      const { data } = await db
        .from("store_orders")
        .select("store_id, store_profiles(category, name)")
        .eq("user_id", user.id)
        .in("status", ["completed", "delivered"])
        .order("created_at", { ascending: false })
        .limit(50);

      const categoryCounts: Record<string, number> = {};
      for (const row of data || []) {
        const cat = (row.store_profiles as any)?.category;
        if (cat) categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      }
      return Object.entries(categoryCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([c]) => c.toLowerCase());
    },
    enabled: !!user?.id,
    staleTime: 300_000,
  });

  // Get store Reels with location data
  const { data: storeReels = [], isLoading } = useQuery({
    queryKey: ["for-you-reels", userLocation?.lat, userLocation?.lng],
    queryFn: async () => {
      const db = supabase as any;
      const { data } = await db
        .from("posts")
        .select("id, store_id, store_profiles(id, name, latitude, longitude, category)")
        .not("store_id", "is", null)
        .eq("is_published", true)
        .order("created_at", { ascending: false })
        .limit(100);

      return (data || []).map((post: any) => ({
        postId: post.id,
        storeId: post.store_id,
        storeName: (post.store_profiles as any)?.name || "Shop",
        lat: (post.store_profiles as any)?.latitude,
        lng: (post.store_profiles as any)?.longitude,
        category: ((post.store_profiles as any)?.category || "").toLowerCase(),
      }));
    },
    staleTime: 60_000,
  });

  // Score and rank
  const rankedReels = useMemo((): ReelRecommendation[] => {
    return storeReels
      .map((reel: any) => {
        let distanceKm: number | null = null;
        let proximityScore = 0;

        if (userLocation && reel.lat && reel.lng) {
          distanceKm = haversineKm(userLocation.lat, userLocation.lng, reel.lat, reel.lng);
          // Within 3km gets max proximity score, decays linearly to 10km
          if (distanceKm <= 3) proximityScore = 1.0;
          else if (distanceKm <= 10) proximityScore = 1.0 - (distanceKm - 3) / 7;
        }

        const categoryMatch = purchaseCategories.some(
          (cat) => reel.category.includes(cat) || cat.includes(reel.category)
        );
        const categoryScore = categoryMatch ? 0.8 : 0;

        // Weighted: proximity 50%, category match 40%, recency 10%
        const score = proximityScore * 0.5 + categoryScore * 0.4 + 0.1;

        return {
          postId: reel.postId,
          storeId: reel.storeId,
          storeName: reel.storeName,
          distanceKm,
          categoryMatch,
          score,
        };
      })
      .sort((a: ReelRecommendation, b: ReelRecommendation) => b.score - a.score);
  }, [storeReels, userLocation, purchaseCategories]);

  // Highlight coffee shops (or user's top category) on map
  const mapHighlights = useMemo(() => {
    if (purchaseCategories.length === 0) return [];
    const topCategory = purchaseCategories[0];
    return storeReels
      .filter((r: any) => r.category.includes(topCategory) && r.lat && r.lng)
      .map((r: any) => ({
        storeId: r.storeId,
        storeName: r.storeName,
        lat: r.lat,
        lng: r.lng,
        category: topCategory,
        hasActiveReels: true,
      }));
  }, [storeReels, purchaseCategories]);

  return {
    rankedReels,
    mapHighlights,
    topCategory: purchaseCategories[0] || null,
    isLoading,
    userLocation,
  };
}
