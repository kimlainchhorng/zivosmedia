/**
 * CafeHoursCard — 7-row hours editor that lives on the cafe dashboard.
 * Each row: weekday label, open/closed toggle, opens_at, closes_at.
 * Saves are autosave-on-blur (no Save button) so owners can edit a row,
 * tab away, and move on.
 */
import { useCallback, useEffect, useState } from "react";
import { Clock, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props { storeId: string }

interface HoursRow {
  day_of_week: number;
  is_open: boolean;
  opens_at: string | null; // "HH:MM" or "HH:MM:SS"
  closes_at: string | null;
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Trim "HH:MM:SS" to "HH:MM" so <input type="time"> binds cleanly.
const toTime = (v: string | null) => (v ? v.slice(0, 5) : "");

const defaultRows = (): HoursRow[] =>
  DAY_LABELS.map((_, idx) => ({
    day_of_week: idx,
    is_open: idx >= 1 && idx <= 6, // Mon–Sat open by default
    opens_at: "07:00",
    closes_at: "18:00",
  }));

export default function CafeHoursCard({ storeId }: Props) {
  const [rows, setRows] = useState<HoursRow[]>(defaultRows);
  const [loading, setLoading] = useState(true);
  const [savingDow, setSavingDow] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("cafe_hours" as never)
      .select("day_of_week,is_open,opens_at,closes_at")
      .eq("store_id", storeId);
    if (error) {
      console.error("[CafeHoursCard] load", error);
      setLoading(false);
      return;
    }
    const fetched = (data ?? []) as unknown as HoursRow[];
    const byDow = new Map(fetched.map((r) => [r.day_of_week, r]));
    setRows(DAY_LABELS.map((_, idx) => byDow.get(idx) ?? {
      day_of_week: idx, is_open: false, opens_at: null, closes_at: null,
    }));
    setLoading(false);
  }, [storeId]);

  useEffect(() => { void load(); }, [load]);

  const persistRow = async (row: HoursRow) => {
    setSavingDow(row.day_of_week);
    // Upsert via delete-then-insert keyed on (store_id, day_of_week).
    const del = await supabase
      .from("cafe_hours" as never).delete()
      .eq("store_id", storeId).eq("day_of_week", row.day_of_week);
    if (del.error) {
      console.error("[CafeHoursCard] delete", del.error);
      toast.error("Couldn't save hours.");
      setSavingDow(null);
      return;
    }
    const payload = {
      store_id: storeId,
      day_of_week: row.day_of_week,
      is_open: row.is_open,
      opens_at: row.is_open ? (row.opens_at || "07:00") : null,
      closes_at: row.is_open ? (row.closes_at || "18:00") : null,
    };
    const { error: insErr } = await supabase.from("cafe_hours" as never).insert(payload as never);
    setSavingDow(null);
    if (insErr) {
      console.error("[CafeHoursCard] insert", insErr);
      toast.error("Couldn't save hours.");
      await load();
    }
  };

  const updateRow = (idx: number, patch: Partial<HoursRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-6 flex items-center justify-center text-sm text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading hours…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Clock className="h-4 w-4" /> Hours
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-1">
        {rows.map((row, idx) => (
          <div key={row.day_of_week} className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5",
            !row.is_open && "opacity-60",
          )}>
            <span className="w-10 text-sm font-medium">{DAY_LABELS[row.day_of_week]}</span>
            <Switch
              checked={row.is_open}
              onCheckedChange={(v) => {
                const next: HoursRow = { ...row, is_open: v };
                updateRow(idx, { is_open: v });
                void persistRow(next);
              }}
            />
            {row.is_open ? (
              <>
                <Input
                  type="time"
                  className="h-8 w-28 text-xs"
                  value={toTime(row.opens_at)}
                  onChange={(e) => updateRow(idx, { opens_at: e.target.value })}
                  onBlur={() => persistRow(row)}
                />
                <span className="text-muted-foreground text-xs">–</span>
                <Input
                  type="time"
                  className="h-8 w-28 text-xs"
                  value={toTime(row.closes_at)}
                  onChange={(e) => updateRow(idx, { closes_at: e.target.value })}
                  onBlur={() => persistRow(row)}
                />
              </>
            ) : (
              <span className="text-xs text-muted-foreground">Closed</span>
            )}
            {savingDow === row.day_of_week && (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground ml-auto" />
            )}
          </div>
        ))}
        <p className="text-[10px] text-muted-foreground pt-1">
          Wrap past midnight (e.g. 22:00 → 02:00) for late-night service.
        </p>
      </CardContent>
    </Card>
  );
}
