/**
 * Daily prep forecast — calls the cafe_prep_forecast RPC. The RPC averages
 * sales on the *same weekday* over the last 4 occurrences (so a Tuesday
 * forecast averages the last 4 Tuesdays). Suggested prep includes a 20%
 * safety buffer baked into the SQL.
 */
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CafePrepForecastRow {
  menu_item_id: string;
  item_name: string;
  category_id: string | null;
  category_name: string | null;
  weeks_observed: number;
  total_qty: number;
  avg_qty: number;
  suggested_prep: number;
}

export function useCafePrepForecast(storeId: string | undefined, targetDate?: string) {
  const [rows, setRows] = useState<CafePrepForecastRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const args: Record<string, unknown> = { p_store_id: storeId, p_limit: 10 };
    if (targetDate) args.p_target_date = targetDate;
    const { data, error: err } = await supabase.rpc("cafe_prep_forecast" as never, args as never);
    if (err) {
      console.error("[useCafePrepForecast] load", err);
      setError("Couldn't load prep forecast.");
      setLoading(false);
      return;
    }
    setRows((data ?? []) as unknown as CafePrepForecastRow[]);
    setLoading(false);
  }, [storeId, targetDate]);

  useEffect(() => { void load(); }, [load]);

  return { rows, loading, error, refresh: load };
}
