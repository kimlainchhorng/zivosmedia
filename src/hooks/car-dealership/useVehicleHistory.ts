/**
 * Loads the full economics history for a single dealership vehicle:
 * linked expenses (reconditioning / detailing / transport / parts),
 * any deals it appears in, and scheduled or completed test drives.
 *
 * Used by the vehicle detail sheet in CarDealershipInventorySection.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleExpenseSummary {
  id: string;
  category: string;
  description: string;
  amount_cents: number;
  vendor: string | null;
  paid_at: string;
}

export interface VehicleDealSummary {
  id: string;
  deal_number: string;
  customer_name: string;
  total_cents: number;
  sale_price_cents: number;
  status: string;
  sold_at: string | null;
  created_at: string;
}

export interface VehicleTestDriveSummary {
  id: string;
  customer_name: string;
  scheduled_at: string;
  status: string;
  duration_minutes: number;
}

export interface VehicleHistoryData {
  expenses: VehicleExpenseSummary[];
  deals: VehicleDealSummary[];
  testDrives: VehicleTestDriveSummary[];
}

export function useVehicleHistory(storeId: string, vehicleId: string | null) {
  const [data, setData] = useState<VehicleHistoryData>({
    expenses: [],
    deals: [],
    testDrives: [],
  });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!storeId || !vehicleId) {
      setData({ expenses: [], deals: [], testDrives: [] });
      return;
    }
    setLoading(true);

    const [expRes, dealRes, driveRes] = await Promise.all([
      supabase
        .from("car_dealership_expenses")
        .select("id, category, description, amount_cents, vendor, paid_at")
        .eq("store_id", storeId)
        .eq("vehicle_id", vehicleId)
        .order("paid_at", { ascending: false }),

      supabase
        .from("car_dealership_sales")
        .select("id, deal_number, customer_name, total_cents, sale_price_cents, status, sold_at, created_at")
        .eq("store_id", storeId)
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false }),

      supabase
        .from("car_dealership_test_drives")
        .select("id, customer_name, scheduled_at, status, duration_minutes")
        .eq("store_id", storeId)
        .eq("vehicle_id", vehicleId)
        .order("scheduled_at", { ascending: false })
        .limit(10),
    ]);

    setData({
      expenses: (expRes.data ?? []) as VehicleExpenseSummary[],
      deals: (dealRes.data ?? []) as VehicleDealSummary[],
      testDrives: (driveRes.data ?? []) as VehicleTestDriveSummary[],
    });
    setLoading(false);
  }, [storeId, vehicleId]);

  useEffect(() => { void load(); }, [load]);

  return { ...data, loading, refresh: load };
}
