/**
 * Build R.O. — Drop-off & Tow-in queue.
 * The shop's board of waiting vehicles: every open R.O. whose intake
 * (appointment_type) is "Drop Off" or "Towed In", grouped by intake. Click a
 * ticket to load it into the builder. Completed/picked-up tickets are excluded.
 */
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { KeyRound, Truck, Loader2 } from "lucide-react";

const money = (cents: number) =>
  `$${((cents || 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// Intake is "satisfied" once the vehicle leaves — drop these from the waiting board.
const DONE = new Set(["picked_up", "done", "invoiced", "cancelled"]);

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  onPick: (estimate: any) => void;
}

export default function BuildROIntakeQueueDialog({ open, onOpenChange, storeId, onPick }: Props) {
  const { data = [], isLoading } = useQuery({
    queryKey: ["ar-intake-queue", storeId],
    enabled: open && !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_estimates" as any)
        .select("*")
        .eq("store_id", storeId)
        .in("appointment_type", ["Drop Off", "Towed In"])
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { dropOffs, towIns } = useMemo(() => {
    const live = (data as any[]).filter((e) => !DONE.has(String(e.status || "")));
    return {
      dropOffs: live.filter((e) => e.appointment_type === "Drop Off"),
      towIns: live.filter((e) => e.appointment_type === "Towed In"),
    };
  }, [data]);

  const renderRow = (e: any) => (
    <button
      key={e.id}
      type="button"
      onClick={() => { onPick(e); onOpenChange(false); }}
      className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-muted"
    >
      <span className="min-w-0">
        <span className="font-medium">{e.number || "—"}</span>
        <span className="block truncate text-[11px] text-muted-foreground">
          {e.customer_name || "No customer"}{e.vehicle_label ? ` · ${e.vehicle_label}` : ""}
        </span>
      </span>
      <span className="shrink-0 font-semibold tabular-nums">{money(e.total_cents)}</span>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Truck className="h-4 w-4" /> Drop-off &amp; Tow-in queue</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : dropOffs.length === 0 && towIns.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No dropped-off or towed-in vehicles waiting.</p>
        ) : (
          <div className="max-h-[60vh] space-y-3 overflow-y-auto">
            <div>
              <p className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <KeyRound className="h-3.5 w-3.5" /> Dropped off ({dropOffs.length})
              </p>
              {dropOffs.length ? (
                <div className="space-y-0.5">{dropOffs.map(renderRow)}</div>
              ) : (
                <p className="px-2 py-2 text-center text-[11px] text-muted-foreground">None waiting</p>
              )}
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                <Truck className="h-3.5 w-3.5" /> Towed in ({towIns.length})
              </p>
              {towIns.length ? (
                <div className="space-y-0.5">{towIns.map(renderRow)}</div>
              ) : (
                <p className="px-2 py-2 text-center text-[11px] text-muted-foreground">None waiting</p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
