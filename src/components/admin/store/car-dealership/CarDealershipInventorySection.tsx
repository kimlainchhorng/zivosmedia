/**
 * Vehicle inventory section — list, search, filter, add, edit, delete.
 */
import { memo, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Car, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDealershipInventory, type DealershipVehicle, type DealershipVehicleStatus } from "@/hooks/car-dealership/useDealershipInventory";
import CarDealershipVehicleDialog from "./CarDealershipVehicleDialog";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const statusStyles: Record<DealershipVehicleStatus, string> = {
  available: "bg-emerald-500/15 text-emerald-700",
  reserved: "bg-blue-500/15 text-blue-700",
  pending_sale: "bg-amber-500/15 text-amber-700",
  sold: "bg-zinc-500/15 text-zinc-700",
  in_transit: "bg-indigo-500/15 text-indigo-700",
  service: "bg-orange-500/15 text-orange-700",
  retired: "bg-red-500/15 text-red-700",
};

const statusLabel: Record<DealershipVehicleStatus, string> = {
  available: "Available",
  reserved: "Reserved",
  pending_sale: "Pending sale",
  sold: "Sold",
  in_transit: "In transit",
  service: "In service",
  retired: "Retired",
};

interface Props { storeId: string; }

function CarDealershipInventorySectionInner({ storeId }: Props) {
  const { vehicles, loading, saving, create, update, remove } = useDealershipInventory(storeId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DealershipVehicleStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipVehicle | null>(null);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return vehicles.filter((v) => {
      if (statusFilter !== "all" && v.status !== statusFilter) return false;
      if (!term) return true;
      const hay = `${v.year ?? ""} ${v.make} ${v.model} ${v.trim ?? ""} ${v.vin ?? ""} ${v.stock_number ?? ""}`.toLowerCase();
      return hay.includes(term);
    });
  }, [vehicles, search, statusFilter]);

  const handleAdd = () => { setEditing(null); setDialogOpen(true); };
  const handleEdit = (v: DealershipVehicle) => { setEditing(v); setDialogOpen(true); };
  const handleDelete = async (v: DealershipVehicle) => {
    if (!window.confirm(`Delete ${v.year ?? ""} ${v.make} ${v.model}?`)) return;
    const ok = await remove(v.id);
    if (ok) toast.success("Vehicle removed.");
    else toast.error("Couldn't delete vehicle.");
  };
  const handleSubmit = async (draft: Parameters<typeof create>[0]) => {
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Vehicle updated."); setDialogOpen(false); }
      else toast.error("Couldn't save changes.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Vehicle added."); setDialogOpen(false); }
      else toast.error("Couldn't add vehicle.");
    }
  };

  const counts = useMemo(() => {
    const out = { all: vehicles.length, available: 0, pending_sale: 0, sold: 0 };
    for (const v of vehicles) {
      if (v.status === "available") out.available++;
      else if (v.status === "pending_sale") out.pending_sale++;
      else if (v.status === "sold") out.sold++;
    }
    return out;
  }, [vehicles]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Vehicle Inventory</h2>
          <p className="text-sm text-muted-foreground">
            {counts.all} vehicles · {counts.available} available · {counts.pending_sale} pending · {counts.sold} sold
          </p>
        </div>
        <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />Add vehicle</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search make, model, VIN, stock #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="available">Available</SelectItem>
            <SelectItem value="reserved">Reserved</SelectItem>
            <SelectItem value="pending_sale">Pending sale</SelectItem>
            <SelectItem value="sold">Sold</SelectItem>
            <SelectItem value="in_transit">In transit</SelectItem>
            <SelectItem value="service">In service</SelectItem>
            <SelectItem value="retired">Retired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Car className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">{vehicles.length === 0 ? "No vehicles yet" : "No matches"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicles.length === 0 ? "Add your first vehicle to start building inventory." : "Try a different search or filter."}
          </p>
          {vehicles.length === 0 && (
            <Button onClick={handleAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />Add vehicle</Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((v) => (
            <Card key={v.id} className="overflow-hidden">
              <div className="aspect-[16/10] bg-muted relative">
                {v.photo_url ? (
                  <img src={v.photo_url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <Car className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <Badge className={cn("absolute top-2 left-2 border-0 text-[10px] font-bold", statusStyles[v.status])}>
                  {statusLabel[v.status]}
                </Badge>
                {v.is_featured && (
                  <Badge className="absolute top-2 right-2 border-0 bg-amber-500/90 text-white text-[10px]">★ Featured</Badge>
                )}
              </div>
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {v.year ?? ""} {v.make} {v.model}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {v.trim ?? ""} {v.exterior_color ? `· ${v.exterior_color}` : ""}
                    </p>
                  </div>
                  <p className="text-base font-bold text-primary shrink-0">{formatPrice(v.asking_price_cents)}</p>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {v.mileage != null && <span>{v.mileage.toLocaleString()} {v.mileage_unit}</span>}
                  <span className="capitalize">{v.condition.replace(/_/g, " ")}</span>
                  {v.stock_number && <span className="font-mono">#{v.stock_number}</span>}
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleEdit(v)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(v)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <CarDealershipVehicleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />
    </div>
  );
}

// React.memo guards against React 19 + Radix Slot ref-cleanup loops when the
// parent layout re-renders for unrelated reasons (e.g. realtime badge updates).
// See src/components/ui/switch.tsx for the underlying issue.
const CarDealershipInventorySection = memo(CarDealershipInventorySectionInner);
export default CarDealershipInventorySection;
