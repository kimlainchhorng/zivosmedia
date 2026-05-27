import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type TripStatus = "planning" | "booked" | "completed" | "cancelled";
export type ItemType = "flight" | "hotel" | "car" | "activity" | "note";
export type ItemStatus = "planned" | "booked" | "confirmed" | "cancelled";

export interface TripItinerary {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  cover_image_url: string | null;
  is_public: boolean;
  share_token: string | null;
  status: TripStatus;
  total_estimated_cost_cents: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripItem {
  id: string;
  itinerary_id: string;
  user_id: string;
  item_type: ItemType;
  title: string;
  description: string | null;
  start_datetime: string | null;
  end_datetime: string | null;
  location: string | null;
  estimated_cost_cents: number;
  currency: string;
  booking_reference: string | null;
  booking_url: string | null;
  provider_name: string | null;
  status: ItemStatus;
  metadata: Record<string, string | number | boolean | null>;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = "tripItineraries";
const ITEMS_KEY = "tripItems";

export function useTripItineraries() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [QUERY_KEY, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("trip_itineraries")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TripItinerary[];
    },
    enabled: !!user?.id,
  });
}

export function useTripItinerary(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: [QUERY_KEY, id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("trip_itineraries")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as TripItinerary;
    },
    enabled: !!id && !!user?.id,
  });
}

export function useTripItems(itineraryId: string | undefined) {
  return useQuery({
    queryKey: [ITEMS_KEY, itineraryId],
    queryFn: async () => {
      if (!itineraryId) return [];
      const { data, error } = await supabase
        .from("trip_items")
        .select("*")
        .eq("itinerary_id", itineraryId)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as TripItem[];
    },
    enabled: !!itineraryId,
  });
}

export function useCreateTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<TripItinerary>) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("trip_itineraries")
        .insert({ ...input, user_id: user.id, title: input.title || "Untitled Trip" })
        .select()
        .single();
      if (error) throw error;
      return data as TripItinerary;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Trip created");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TripItinerary> & { id: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("trip_itineraries")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Trip updated");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteTrip() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("trip_itineraries")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
      toast.success("Trip deleted");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useCreateTripItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Partial<TripItem> & { itinerary_id: string; item_type: ItemType; title: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { itinerary_id, item_type, title, ...rest } = input;
      const insertData: Record<string, unknown> = {
        ...rest,
        itinerary_id,
        item_type,
        title,
        user_id: user.id,
      };
      const { data, error } = await supabase
        .from("trip_items")
        .insert(insertData as any)
        .select()
        .single();
      if (error) throw error;
      return data as TripItem;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, variables.itinerary_id] });
      toast.success("Item added to trip");
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useUpdateTripItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TripItem> & { id: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("trip_items")
        .update(updates as any)
        .eq("id", id)
        .eq("user_id", user.id)
        .select()
        .single();
      if (error) throw error;
      return data as TripItem;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, data.itinerary_id] });
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useDeleteTripItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, itineraryId }: { id: string; itineraryId: string }) => {
      if (!user?.id) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("trip_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);
      if (error) throw error;
      return itineraryId;
    },
    onSuccess: (itineraryId) => {
      queryClient.invalidateQueries({ queryKey: [ITEMS_KEY, itineraryId] });
      toast.success("Item removed");
    },
    onError: (err) => toast.error(err.message),
  });
}
