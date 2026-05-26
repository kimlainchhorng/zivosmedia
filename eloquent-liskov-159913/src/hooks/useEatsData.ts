/**
 * useEatsData - Fetch restaurants & menu items from Supabase
 * Replaces hardcoded mock data in EatsLanding
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EatsRestaurant {
  id: string;
  name: string;
  cuisine_type: string;
  rating: number | null;
  avg_prep_time: number | null;
  delivery_fee_cents: number | null;
  logo_url: string | null;
  cover_image_url: string | null;
  address: string;
  is_open: boolean | null;
  description: string | null;
  accepts_delivery: boolean | null;
  accepts_pickup: boolean | null;
  min_order_cents: number | null;
  lat: number | null;
  lng: number | null;
  service_fee_percent: number | null;
  rating_count: number | null;
}

export interface EatsMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category: string;
  category_id: string | null;
  is_available: boolean | null;
  is_featured: boolean | null;
  preparation_time: number | null;
  restaurant_id: string;
}

export interface EatsCartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  restaurantId: string;
  imageUrl?: string | null;
  specialInstructions?: string;
}

/** Fetch open restaurants that accept delivery */
export function useEatsRestaurants() {
  return useQuery({
    queryKey: ["eats-restaurants"],
    queryFn: async (): Promise<EatsRestaurant[]> => {
      const { data, error } = await supabase
        .from("restaurants")
        .select(
          "id, name, cuisine_type, rating, avg_prep_time, delivery_fee_cents, logo_url, cover_image_url, address, is_open, description, accepts_delivery, accepts_pickup, min_order_cents, lat, lng, service_fee_percent, rating_count"
        )
        .eq("accepts_delivery", true)
        .order("rating", { ascending: false });

      if (error) throw error;
      return (data ?? []) as EatsRestaurant[];
    },
    staleTime: 60_000,
  });
}

/** Fetch menu items for a specific restaurant */
export function useEatsMenu(restaurantId: string | null) {
  return useQuery({
    queryKey: ["eats-menu", restaurantId],
    queryFn: async (): Promise<EatsMenuItem[]> => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("menu_items")
        .select(
          "id, name, description, price, image_url, category, category_id, is_available, is_featured, preparation_time, restaurant_id"
        )
        .eq("restaurant_id", restaurantId)
        .eq("is_available", true)
        .order("is_featured", { ascending: false })
        .order("name");

      if (error) throw error;
      return (data ?? []) as EatsMenuItem[];
    },
    enabled: !!restaurantId,
    staleTime: 30_000,
  });
}

/** Fetch menu categories for a restaurant */
export function useEatsCategories(restaurantId: string | null) {
  return useQuery({
    queryKey: ["eats-categories", restaurantId],
    queryFn: async () => {
      if (!restaurantId) return [];
      const { data, error } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("restaurant_id", restaurantId)
        .eq("is_active", true)
        .order("sort_order");

      if (error) throw error;
      return data ?? [];
    },
    enabled: !!restaurantId,
    staleTime: 60_000,
  });
}

/** Create a food order in Supabase */
export async function createFoodOrder(params: {
  customerId: string;
  restaurantId: string;
  items: EatsCartItem[];
  deliveryAddress: string;
  deliveryLat: number;
  deliveryLng: number;
  subtotal: number;
  deliveryFee: number;
  serviceFee: number;
  tipAmount: number;
  totalAmount: number;
  paymentType: "cash" | "card" | "wallet" | "paypal" | "square";
  specialInstructions?: string;
  isScheduled?: boolean;
  scheduledFor?: string;
  isExpress?: boolean;
  expressFee?: number;
  promoCode?: string;
  discountAmount?: number;
}) {
  const trackingCode = `ZE-${Date.now().toString(36).toUpperCase().slice(-6)}`;

  const { data, error } = await supabase
    .from("food_orders")
    .insert({
      customer_id: params.customerId,
      restaurant_id: params.restaurantId,
      items: params.items.map((i) => ({
        id: i.menuItemId,
        name: i.name,
        price: i.price,
        quantity: i.quantity,
        specialInstructions: i.specialInstructions,
      })),
      delivery_address: params.deliveryAddress,
      delivery_lat: params.deliveryLat,
      delivery_lng: params.deliveryLng,
      subtotal: params.subtotal,
      delivery_fee: params.deliveryFee,
      service_fee: params.serviceFee,
      tip_amount: params.tipAmount,
      total_amount: params.totalAmount,
      payment_type: params.paymentType,
      special_instructions: params.specialInstructions || null,
      is_scheduled: params.isScheduled || false,
      scheduled_for: params.scheduledFor || null,
      is_express: params.isExpress || false,
      express_fee_cents: Math.round((params.expressFee || 0) * 100),
      promo_code: params.promoCode || null,
      discount_amount: params.discountAmount || null,
      tracking_code: trackingCode,
      status: "pending",
      payment_status: params.paymentType === "cash" ? "pending" : "pending",
      needs_driver: true,
      credit_used_amount: 0,
    })
    .select()
    .single();

  if (error) throw error;
  return { order: data, trackingCode };
}
