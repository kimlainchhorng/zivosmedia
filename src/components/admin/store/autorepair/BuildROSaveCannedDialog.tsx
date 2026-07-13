/**
 * Build R.O. — "Save as Canned Job".
 * Turns the current R.O.'s line items into a reusable ar_service_catalog
 * (Price Book) entry, so it shows up under the left-rail "Canned" picker and
 * the "From Price Book" button next time. Closes the loop: build once, reuse.
 */
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { BookOpen } from "lucide-react";

export type CannedLine = { kind: string; description: string; qty: number; unit_cents: number };

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  lines: CannedLine[];
}

const money = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const isLabor = (k: string) => k === "labor" || k === "diagnosis";

export default function BuildROSaveCannedDialog({ open, onOpenChange, storeId, lines }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");

  const resetCannedState = () => {
    setName("");
    setCategory("general");
  };

  useEffect(() => {
    if (open) resetCannedState();
  }, [open]);

  const handleOpenChange = (v: boolean) => {
    if (!v) resetCannedState();
    onOpenChange(v);
  };

  const usable = useMemo(
    () => lines.filter((l) => l.description.trim() && (l.kind !== "note" && l.kind !== "concern")),
    [lines],
  );
  const laborLines = usable.filter((l) => isLabor(l.kind));
  const partLines = usable.filter((l) => !isLabor(l.kind));
  const laborHours = laborLines.reduce((s, l) => s + (l.qty || 0), 0);
  const laborRateCents = laborLines[0]?.unit_cents ?? 0;

  const save = useMutation({
    mutationFn: async () => {
      if (!name.trim()) throw new Error("Give the canned job a name");
      if (usable.length === 0) throw new Error("Add at least one line first");
      const payload = {
        store_id: storeId,
        name: name.trim(),
        category: category.trim() || "general",
        labor_hours: laborHours,
        labor_rate_cents: laborRateCents,
        parts: partLines.map((l) => ({ name: l.description, qty: l.qty || 1, unit_cents: l.unit_cents })),
        is_active: true,
      };
      const { error } = await supabase.from("ar_service_catalog" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Saved to Price Book as a canned job");
      qc.invalidateQueries({ queryKey: ["ar-service-catalog-picker", storeId] });
      qc.invalidateQueries({ queryKey: ["ar-service-catalog", storeId] });
      handleOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed to save"),
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><BookOpen className="h-4 w-4" /> Save as Canned Job</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">Name *</Label>
            <Input placeholder="e.g. Front Brake Job" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Category</Label>
            <Input placeholder="general" value={category} onChange={(e) => setCategory(e.target.value)} />
          </div>
          <div className="rounded-lg border bg-muted/30 p-2.5 text-xs">
            <p className="mb-1 font-medium">Captures {usable.length} line{usable.length === 1 ? "" : "s"}:</p>
            <ul className="space-y-0.5 text-muted-foreground">
              {laborHours > 0 && <li>Labor: {laborHours}h @ {money(laborRateCents)}/h</li>}
              {partLines.slice(0, 5).map((l, i) => (
                <li key={i} className="truncate">• {l.description} ×{l.qty} — {money(l.unit_cents)}</li>
              ))}
              {partLines.length > 5 && <li>…and {partLines.length - 5} more</li>}
              {usable.length === 0 && <li className="text-amber-600">No saveable lines — add labor or parts first.</li>}
            </ul>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || usable.length === 0}>
            {save.isPending ? "Saving…" : "Save to Price Book"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
