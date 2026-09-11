import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface RecentEatsRestaurant { store_id: string; store_name: string; cuisine: string }
export async function fetchRecentEatsOrders(userId: string): Promise<RecentEatsRestaurant[]> {
  // Keep the live relationship projection explicit: generated multi-project
  // database types are not the authority for this joined response.
  const { data, error } = await (supabase as any).from("food_orders")
    .select("restaurant_id, restaurants!food_orders_restaurant_id_fkey(name, cuisine_type)")
    .eq("customer_id", userId).order("created_at", { ascending: false }).limit(15);
  if (error) throw error;
  const seen = new Set<string>();
  const rows: RecentEatsRestaurant[] = [];
  if (data != null && !Array.isArray(data)) throw new Error("Order history response unavailable");
  for (const order of data ?? []) {
    if (!order.restaurant_id || seen.has(order.restaurant_id)) continue;
    seen.add(order.restaurant_id);
    const restaurant = order.restaurants;
    // Legacy orders can reference a restaurant unavailable to this requester.
    if (!restaurant) continue;
    if (typeof restaurant.name !== "string") throw new Error("Restaurant details unavailable");
    rows.push({ store_id: order.restaurant_id, store_name: restaurant.name, cuisine: restaurant.cuisine_type ?? "" });
    if (rows.length === 4) break;
  }
  return rows;
}
export function useRecentEatsOrders(userId?: string) {
  return useQuery({ queryKey: ["eats-recent-orders", userId],
    queryFn: () => fetchRecentEatsOrders(userId!), enabled: !!userId,
    retry: false, staleTime: 60_000 });
}
