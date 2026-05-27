/**
 * Loads the full activity history for a single dealership customer:
 * closed + open deals, test drives, and financing applications.
 *
 * Designed to power the customer-360 profile sheet — lightweight targeted
 * queries rather than loading every record in each hook.
 */
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface CustomerSaleSummary {
  id: string;
  deal_number: string;
  vehicle_label: string;
  total_cents: number;
  status: string;
  sold_at: string | null;
  created_at: string;
}

export interface CustomerTestDriveSummary {
  id: string;
  vehicle_label: string;
  scheduled_at: string;
  status: string;
  duration_minutes: number;
}

export interface CustomerFinancingSummary {
  id: string;
  lender_name: string | null;
  amount_financed_cents: number;
  monthly_payment_cents: number;
  apr_bps: number;
  term_months: number;
  status: string;
  created_at: string;
}

export interface CustomerProfileData {
  sales: CustomerSaleSummary[];
  testDrives: CustomerTestDriveSummary[];
  financing: CustomerFinancingSummary[];
}

export function useCustomerProfile(storeId: string, customerId: string | null) {
  const [data, setData] = useState<CustomerProfileData>({ sales: [], testDrives: [], financing: [] });
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!storeId || !customerId) { setData({ sales: [], testDrives: [], financing: [] }); return; }
    setLoading(true);

    const [salesRes, drivesRes, finRes] = await Promise.all([
      supabase
        .from("car_dealership_sales")
        .select("id, deal_number, vehicle_label, total_cents, status, sold_at, created_at")
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(20),

      supabase
        .from("car_dealership_test_drives")
        .select("id, vehicle_label, scheduled_at, status, duration_minutes")
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .order("scheduled_at", { ascending: false })
        .limit(20),

      supabase
        .from("car_dealership_financing")
        .select("id, lender_name, amount_financed_cents, monthly_payment_cents, apr_bps, term_months, status, created_at")
        .eq("store_id", storeId)
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    setData({
      sales: (salesRes.data ?? []) as CustomerSaleSummary[],
      testDrives: (drivesRes.data ?? []) as CustomerTestDriveSummary[],
      financing: (finRes.data ?? []) as CustomerFinancingSummary[],
    });
    setLoading(false);
  }, [storeId, customerId]);

  useEffect(() => { void load(); }, [load]);

  return { ...data, loading, refresh: load };
}
