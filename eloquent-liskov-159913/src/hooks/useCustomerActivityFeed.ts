/**
 * Customer Activity Feed — queries activity_feed table from Supabase
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityItem {
  id: string;
  eventType: string;
  eventData: any;
  createdAt: string;
  role: string | null;
}

export function useCustomerActivityFeed() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["customer-activity-feed", user?.id],
    queryFn: async (): Promise<ActivityItem[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("activity_feed")
        .select("id, event_type, event_data, created_at, role")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return (data || []).map(a => ({
        id: a.id,
        eventType: a.event_type || "",
        eventData: a.event_data,
        createdAt: a.created_at || "",
        role: a.role,
      }));
    },
    enabled: !!user,
    staleTime: 30_000,
  });

  const items = query.data || [];
  return {
    activities: items,
    items,
    isLoading: query.isLoading,
    hasActiveItems: items.length > 0,
  };
}
