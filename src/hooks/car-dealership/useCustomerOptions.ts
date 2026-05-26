/**
 * Lightweight hook for customer picker dropdowns.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerOption {
  id: string;
  display_name: string;
  phone: string | null;
  email: string | null;
  total_purchases: number;
}

export function useCustomerOptions(storeId: string | undefined) {
  const [options, setOptions] = useState<CustomerOption[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    const { data } = await supabase
      .from("car_dealership_customers")
      .select("id, display_name, phone, email, total_purchases")
      .eq("store_id", storeId)
      .order("display_name");
    setOptions((data ?? []) as unknown as CustomerOption[]);
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  return { options, loading };
}
