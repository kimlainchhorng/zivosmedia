/** Service maintenance — reads from service_maintenance table or app_settings */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useServiceMaintenance(service: string) {
  const query = useQuery({
    queryKey: ["service-maintenance", service],
    queryFn: async () => {
      // Check announcements for maintenance windows
      const { data } = await supabase
        .from("announcements")
        .select("id, title, content, type, is_active")
        .eq("type", "maintenance")
        .eq("is_active", true)
        .or(`target_zone.eq.${service},target_zone.is.null`)
        .limit(1)
        .maybeSingle();
      return !!data;
    },
    staleTime: 60_000,
  });

  return {
    isInMaintenance: query.data || false,
    isLoading: query.isLoading,
  };
}
