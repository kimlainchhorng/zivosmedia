import { ArrowLeft, Wallet, TrendingUp, DollarSign } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "@/components/app/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PayrollRow {
  employee_id: string;
  employee_name: string;
  base_pay: number;
  truck_sales_total: number;
  rides_total: number;
  commission: number;
  total_pay: number;
  currency: string;
}

interface RoiRow {
  store_id: string;
  ad_spend: number;
  verified_sales: number;
  roi_percent: number;
}

export default function ShopPayrollPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [basePay, setBasePay] = useState<number>(0);
  const [truckPct, setTruckPct] = useState<number>(0);
  const [ridesPct, setRidesPct] = useState<number>(0);
  const [rows, setRows] = useState<PayrollRow[]>([]);
  const [roi, setRoi] = useState<RoiRow | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData.user?.id;
      if (!uid) return;

      const { data: store } = await (supabase as any)
        .from("store_profiles")
        .select("id")
        .eq("owner_id", uid)
        .limit(1)
        .maybeSingle();

      if (!store?.id) return;
      setStoreId(store.id);

      const [{ data: cfg }, { data: payrollData }, { data: roiData }] = await Promise.all([
        (supabase as any)
          .from("store_payroll_configs")
          .select("base_pay, truck_sales_commission_pct, rides_commission_pct")
          .eq("store_id", store.id)
          .maybeSingle(),
        (supabase as any).rpc("get_employee_payroll_summary", { p_store_id: store.id }),
        (supabase as any).rpc("get_merchant_roi", { p_store_id: store.id }),
      ]);

      setBasePay(Number(cfg?.base_pay || 0));
      setTruckPct(Number(cfg?.truck_sales_commission_pct || 0));
      setRidesPct(Number(cfg?.rides_commission_pct || 0));
      setRows((payrollData || []) as PayrollRow[]);
      setRoi((roiData?.[0] || null) as RoiRow | null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.base += Number(row.base_pay || 0);
        acc.commission += Number(row.commission || 0);
        acc.total += Number(row.total_pay || 0);
        return acc;
      },
      { base: 0, commission: 0, total: 0 },
    );
  }, [rows]);

  const saveConfig = async () => {
    if (!storeId) return;
    const { error } = await (supabase as any).from("store_payroll_configs").upsert({
      store_id: storeId,
      base_pay: basePay,
      truck_sales_commission_pct: truckPct,
      rides_commission_pct: ridesPct,
      currency: "USD",
    }, { onConflict: "store_id" });

    if (error) {
      toast.error("Failed to save payroll config");
      return;
    }

    toast.success("Payroll config saved");
    loadData();
  };

  return (
    <AppLayout title="Payroll" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24">
        <div className="flex items-center gap-2.5 mb-6">
          <button type="button" aria-label="Go back" onClick={() => navigate(-1)} className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"><ArrowLeft className="w-4 h-4" /></button>
          <h1 className="font-bold text-[17px]">Payroll</h1>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading payroll and ROI...</div>
        ) : !storeId ? (
          <div className="text-sm text-muted-foreground">No owner store found for this account.</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/30 p-3 bg-card">
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-emerald-500" />
                <p className="text-sm font-semibold">Automated Payroll Formula</p>
              </div>
              <p className="text-xs text-muted-foreground mb-3">Base Pay + Commission (% Truck Sales + % Rides)</p>
              <div className="grid grid-cols-3 gap-2">
                <input value={basePay} onChange={(e) => setBasePay(Number(e.target.value) || 0)} type="number" className="h-9 rounded-lg border border-border/40 px-2 text-xs" placeholder="Base Pay" />
                <input value={truckPct} onChange={(e) => setTruckPct(Number(e.target.value) || 0)} type="number" className="h-9 rounded-lg border border-border/40 px-2 text-xs" placeholder="Truck %" />
                <input value={ridesPct} onChange={(e) => setRidesPct(Number(e.target.value) || 0)} type="number" className="h-9 rounded-lg border border-border/40 px-2 text-xs" placeholder="Rides %" />
              </div>
              <button type="button" onClick={saveConfig} className="mt-2 h-9 w-full rounded-lg bg-primary text-primary-foreground text-xs font-semibold">Save Payroll Rules</button>
            </div>

            <div className="rounded-2xl border border-border/30 p-3 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="w-4 h-4 text-blue-500" />
                <p className="text-sm font-semibold">Payroll Breakdown</p>
              </div>
              {rows.length === 0 ? (
                <p className="text-xs text-muted-foreground">No active employees found for payroll.</p>
              ) : (
                <div className="space-y-2">
                  {rows.map((row) => (
                    <div key={row.employee_id} className="rounded-lg bg-muted/30 px-2 py-2 text-xs">
                      <div className="flex justify-between font-semibold mb-1">
                        <span>{row.employee_name}</span>
                        <span>${Number(row.total_pay).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Base ${Number(row.base_pay).toFixed(2)}</span>
                        <span>Commission ${Number(row.commission).toFixed(2)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-3 rounded-lg border border-border/30 px-2 py-2 text-xs">
                <div className="flex justify-between"><span>Total Base</span><span>${totals.base.toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Total Commission</span><span>${totals.commission.toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold mt-1"><span>Total Payroll</span><span>${totals.total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="rounded-2xl border border-border/30 p-3 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold">Merchant ROI Dashboard</p>
              </div>
              <p className="text-xs text-muted-foreground mb-2">You spent $X on ads, and ZiVo sent $Y in verified sales.</p>
              <div className="rounded-lg bg-muted/30 px-2 py-2 text-xs space-y-1">
                <div className="flex justify-between"><span>Ad Spend (X)</span><span>${Number(roi?.ad_spend || 0).toFixed(2)}</span></div>
                <div className="flex justify-between"><span>Verified Sales (Y)</span><span>${Number(roi?.verified_sales || 0).toFixed(2)}</span></div>
                <div className="flex justify-between font-semibold"><span>ROI</span><span>{Number(roi?.roi_percent || 0).toFixed(2)}%</span></div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
