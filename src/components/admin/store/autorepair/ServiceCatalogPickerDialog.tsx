import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen, Clock, Package, Wrench } from "lucide-react";

export type ServiceCatalogPick = {
  kind: "labor" | "part" | "diagnosis";
  name: string;
  qty: number;
  unit_cents: number;
};

type ServiceRow = {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  labor_hours: number | null;
  labor_rate_cents: number | null;
  parts: Array<{ name?: string; qty?: number; unit_cents?: number }> | null;
  is_active: boolean | null;
};

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  storeId: string;
  /** Called once per service with the expanded line items (labor + parts). */
  onPick: (lines: ServiceCatalogPick[], service: ServiceRow) => void;
  title?: string;
}

const fmt = (cents: number) =>
  `$${((cents ?? 0) / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ServiceCatalogPickerDialog({ open, onOpenChange, storeId, onPick, title = "Price Book" }: Props) {
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");

  const { data: services = [], isLoading } = useQuery({
    queryKey: ["ar-service-catalog-picker", storeId],
    enabled: open && !!storeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_service_catalog" as any)
        .select("*")
        .eq("store_id", storeId)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ServiceRow[];
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    services.forEach((s) => set.add(s.category || "general"));
    return Array.from(set);
  }, [services]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return services.filter(
      (s) =>
        (cat === "All" || (s.category || "general") === cat) &&
        (!q || s.name.toLowerCase().includes(q) || (s.description ?? "").toLowerCase().includes(q))
    );
  }, [services, cat, search]);

  const totalFor = (s: ServiceRow) => {
    const labor = Math.round(Number(s.labor_hours ?? 0) * Number(s.labor_rate_cents ?? 0));
    const parts = (s.parts ?? []).reduce((sum, p) => sum + Math.round(Number(p.qty ?? 0) * Number(p.unit_cents ?? 0)), 0);
    return labor + parts;
  };

  const handlePick = (s: ServiceRow) => {
    const lines: ServiceCatalogPick[] = [];
    const hours = Number(s.labor_hours ?? 0);
    const rate = Number(s.labor_rate_cents ?? 0);
    if (hours > 0 || rate > 0 || (!Array.isArray(s.parts) || s.parts.length === 0)) {
      lines.push({
        kind: "labor",
        name: s.name,
        qty: hours || 1,
        unit_cents: rate,
      });
    }
    (s.parts ?? []).forEach((p) => {
      if (!p?.name) return;
      lines.push({
        kind: "part",
        name: p.name,
        qty: Number(p.qty ?? 1),
        unit_cents: Number(p.unit_cents ?? 0),
      });
    });
    onPick(lines, s);
    onOpenChange(false);
    setSearch("");
    setCat("All");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-5 pt-5 pb-3 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BookOpen className="w-4 h-4" /> {title}
          </DialogTitle>
        </DialogHeader>

        <div className="px-5 py-3 border-b shrink-0 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search services in your Price Book…"
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {categories.length > 1 && (
            <div className="flex gap-1 flex-wrap">
              {categories.map((c) => (
                <Button
                  key={c}
                  size="sm"
                  variant={cat === c ? "default" : "outline"}
                  className="h-6 text-[11px] px-2 capitalize"
                  onClick={() => setCat(c)}
                >
                  {c}
                </Button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 py-2">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-10">Loading…</p>
          ) : services.length === 0 ? (
            <div className="text-center py-10 px-4 space-y-2">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Your Price Book is empty.</p>
              <p className="text-xs text-muted-foreground">
                Add services in the Price Book tab to reuse them in estimates and work orders.
              </p>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No services match "{search}".</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((s) => {
                const partCount = (s.parts ?? []).length;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => handlePick(s)}
                    className="w-full text-left rounded-md px-3 py-2.5 hover:bg-muted/60 transition-colors flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{s.name}</p>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground flex-wrap">
                        {s.category && (
                          <Badge variant="outline" className="text-[9px] h-4 px-1.5 capitalize">
                            {s.category}
                          </Badge>
                        )}
                        {Number(s.labor_hours) > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" /> {Number(s.labor_hours).toFixed(2)}h
                          </span>
                        )}
                        {Number(s.labor_rate_cents) > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Wrench className="w-3 h-3" /> {fmt(Number(s.labor_rate_cents))}/h
                          </span>
                        )}
                        {partCount > 0 && (
                          <span className="flex items-center gap-0.5">
                            <Package className="w-3 h-3" /> {partCount} part{partCount === 1 ? "" : "s"}
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-semibold tabular-nums shrink-0">{fmt(totalFor(s))}</p>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
