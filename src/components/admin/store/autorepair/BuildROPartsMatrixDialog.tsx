/**
 * Build R.O. — "Parts Matrix" editor.
 * Cost-tiered markup table (Start Cost / End Cost / Multiplier / Markup%).
 * Persists to store_profiles.ar_settings.parts_matrix; the Build R.O. line grid
 * uses it to auto-price a part's Sell from its Cost.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { type MatrixTier, DEFAULT_PARTS_MATRIX, multiplierOf, normalizeMatrix } from "@/lib/admin/partsMatrix";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  initial?: MatrixTier[];
}

export default function BuildROPartsMatrixDialog({ open, onOpenChange, storeId, initial }: Props) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<MatrixTier[]>(DEFAULT_PARTS_MATRIX);

  useEffect(() => {
    if (open) setRows(normalizeMatrix(initial));
  }, [open, initial]);

  const setMarkup = (i: number, v: string) =>
    setRows((r) => r.map((t, idx) => (idx === i ? { ...t, markup: Number(v) || 0 } : t)));
  const setBound = (i: number, key: "start" | "end", v: string) =>
    setRows((r) => r.map((t, idx) => (idx === i ? { ...t, [key]: v === "" ? (key === "end" ? null : 0) : Number(v) } : t)));

  const valid = useMemo(() => rows.every((t) => !isNaN(t.start) && !isNaN(t.markup)), [rows]);

  const save = useMutation({
    mutationFn: async () => {
      // Merge into ar_settings without clobbering other keys.
      const { data } = await supabase.from("store_profiles").select("ar_settings").eq("id", storeId).maybeSingle();
      const settings = ((data as any)?.ar_settings || {}) as Record<string, any>;
      settings.parts_matrix = rows;
      const { error } = await supabase.from("store_profiles").update({ ar_settings: settings }).eq("id", storeId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parts Matrix saved");
      qc.invalidateQueries({ queryKey: ["ar-build-ro-defaults", storeId] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-sky-600">Parts Matrix</DialogTitle>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-2 py-1.5 text-left font-semibold">Start Cost</th>
                <th className="px-2 py-1.5 text-left font-semibold">End Cost</th>
                <th className="px-2 py-1.5 text-center font-semibold">Multiplier</th>
                <th className="px-2 py-1.5 text-center font-semibold">Markup</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t, i) => (
                <tr key={i} className="border-t">
                  <td className="px-2 py-1">
                    <Input className="h-8 text-center text-sm" type="number" value={t.start}
                      onChange={(e) => setBound(i, "start", e.target.value)} />
                  </td>
                  <td className="px-2 py-1">
                    <Input className="h-8 text-center text-sm" placeholder="MAX"
                      value={t.end == null ? "" : String(t.end)}
                      onChange={(e) => setBound(i, "end", e.target.value)} />
                  </td>
                  <td className="px-2 py-1 text-center font-semibold text-violet-500">
                    {multiplierOf(t.markup).toFixed(2)}x
                  </td>
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-center gap-1">
                      <Input className="h-8 w-20 text-center text-sm font-semibold text-sky-600" type="number" value={t.markup}
                        onChange={(e) => setMarkup(i, e.target.value)} />
                      <span className="text-muted-foreground">%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-center text-[11px] text-muted-foreground">
          Sell = Cost × Multiplier. New parts you enter a cost for will price automatically; you can still override any line.
        </p>

        <DialogFooter className="sm:justify-center">
          <Button onClick={() => save.mutate()} disabled={save.isPending || !valid} className="bg-sky-500 px-10 hover:bg-sky-600">
            {save.isPending ? "Saving…" : "Save"}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
