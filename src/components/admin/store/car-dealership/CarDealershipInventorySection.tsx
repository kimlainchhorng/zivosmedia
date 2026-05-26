/**
 * Vehicle inventory section — list, search, filter, add, edit, delete.
 * Clicking a vehicle card opens a detail Sheet with its full cost history,
 * linked deals, and per-unit economics.
 */
import { memo, useMemo, useState, useEffect, useCallback } from "react";
import {
  Plus, Search, Pencil, Trash2, Car, Loader2, Download,
  Receipt, FileSignature, Calendar, DollarSign, ChevronRight, Printer,
  ChevronLeft, X as XIcon, Upload, Star, CheckSquare, Square,
  Eye, EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  useDealershipInventory,
  type DealershipVehicle,
  type DealershipVehicleStatus,
  type DealershipVehicleDraft,
} from "@/hooks/car-dealership/useDealershipInventory";
import { useVehicleHistory } from "@/hooks/car-dealership/useVehicleHistory";
import CarDealershipVehicleDialog from "./CarDealershipVehicleDialog";
import CarDealershipVehicleImportDialog from "./CarDealershipVehicleImportDialog";
import { exportInventoryCsv } from "@/lib/car-dealership/inventoryCsvExport";
import { printWindowSticker } from "@/lib/car-dealership/windowStickerPdf";

// ─── helpers ─────────────────────────────────────────────────────────────────

const fmtPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100);

const fmtDate = (iso: string | null | undefined) => {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
};

// ─── status metadata ──────────────────────────────────────────────────────────

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

const CATEGORY_LABEL: Record<string, string> = {
  acquisition: "Acquisition", reconditioning: "Recon", detailing: "Detailing",
  transport: "Transport", parts: "Parts", advertising: "Advertising",
  rent: "Rent", utilities: "Utilities", insurance: "Insurance",
  payroll: "Payroll", licensing: "Licensing", general: "General",
};

const DEAL_BADGE: Record<string, string> = {
  quote: "bg-zinc-500/15 text-zinc-700",
  pending: "bg-blue-500/15 text-blue-700",
  completed: "bg-emerald-500/15 text-emerald-700",
  delivered: "bg-emerald-600/15 text-emerald-800",
  cancelled: "bg-red-500/15 text-red-700",
};

// ─── Vehicle detail sheet ─────────────────────────────────────────────────────

interface DetailSheetProps {
  storeId: string;
  storeName?: string;
  vehicle: DealershipVehicle;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onEdit: () => void;
}

// ─── inline lightbox ─────────────────────────────────────────────────────────

interface LightboxProps {
  photos: string[];
  initialIndex: number;
  onClose: () => void;
}

function Lightbox({ photos, initialIndex, onClose }: LightboxProps) {
  const [idx, setIdx] = useState(initialIndex);

  const next = useCallback(() => setIdx((i) => (i + 1) % photos.length), [photos.length]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + photos.length) % photos.length), [photos.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [next, prev, onClose]);

  if (photos.length === 0) return null;

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center"
      onClick={onClose}
    >
      <button
        type="button"
        className="absolute top-4 right-4 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        aria-label="Close"
      >
        <XIcon className="h-5 w-5" />
      </button>

      <img
        src={photos[idx]}
        alt=""
        className="max-h-[90vh] max-w-[90vw] object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); prev(); }}
            aria-label="Previous"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 hover:bg-white/20 p-2 text-white transition-colors"
            onClick={(e) => { e.stopPropagation(); next(); }}
            aria-label="Next"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-xs text-white">
            {idx + 1} / {photos.length}
          </div>
        </>
      )}
    </div>
  );
}

// ─── detail sheet ────────────────────────────────────────────────────────────

function VehicleDetailSheet({ storeId, storeName, vehicle, open, onOpenChange, onEdit }: DetailSheetProps) {
  const { expenses, deals, testDrives, loading } = useVehicleHistory(
    storeId,
    open ? vehicle.id : null,
  );
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  // Photos to render: prefer photo_urls array; fall back to single photo_url.
  const photos = useMemo(() => {
    if (vehicle.photo_urls && vehicle.photo_urls.length > 0) return vehicle.photo_urls;
    if (vehicle.photo_url) return [vehicle.photo_url];
    return [];
  }, [vehicle.photo_url, vehicle.photo_urls]);

  // ── per-vehicle economics ──────────────────────────────────────────────────
  const economics = useMemo(() => {
    const acquisition = vehicle.cost_cents;
    const recon = expenses.reduce((s, e) => s + e.amount_cents, 0);
    const totalCost = acquisition + recon;

    const closedDeal = deals.find((d) => ["completed", "delivered"].includes(d.status));
    const salePrice = closedDeal?.sale_price_cents ?? 0;
    const dealTotal = closedDeal?.total_cents ?? 0;

    const frontGross = salePrice > 0 && totalCost > 0 ? salePrice - totalCost : null;
    const dealGross = dealTotal > 0 && totalCost > 0 ? dealTotal - totalCost : null;

    return { acquisition, recon, totalCost, salePrice, dealTotal, frontGross, dealGross, closedDeal };
  }, [vehicle.cost_cents, expenses, deals]);

  const label = [vehicle.year, vehicle.make, vehicle.model, vehicle.trim]
    .filter(Boolean).join(" ");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto flex flex-col gap-0 p-0">
        {/* ── Header ── */}
        <div className="p-6 pb-4 border-b">
          <SheetHeader>
            <div className="flex items-start gap-3">
              {photos.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setLightboxIdx(0)}
                  className="h-16 w-24 rounded-lg overflow-hidden shrink-0 relative hover:ring-2 hover:ring-primary/40 transition-all"
                  title="Open gallery"
                >
                  <img
                    src={photos[0]}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                  {photos.length > 1 && (
                    <span className="absolute bottom-0.5 right-0.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
                      +{photos.length - 1}
                    </span>
                  )}
                </button>
              ) : (
                <div className="grid h-16 w-24 shrink-0 place-items-center rounded-lg bg-muted">
                  <Car className="h-8 w-8 text-muted-foreground/40" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base leading-tight">{label}</SheetTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className={cn("border-0 text-[10px]", statusStyles[vehicle.status])}>
                    {statusLabel[vehicle.status]}
                  </Badge>
                  {vehicle.is_featured && (
                    <Badge className="border-0 bg-amber-500/15 text-amber-700 text-[10px]">★ Featured</Badge>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                  {vehicle.stock_number && <span>#{vehicle.stock_number}</span>}
                  {vehicle.vin && <span className="font-mono truncate max-w-[140px]" title={vehicle.vin}>{vehicle.vin}</span>}
                </div>
              </div>
              <div className="flex gap-1.5">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => printWindowSticker(vehicle, storeName)}
                  title="Print window sticker"
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="outline" onClick={onEdit}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />Edit
                </Button>
              </div>
            </div>

            {/* Quick facts */}
            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: "Asking price", value: fmtPrice(vehicle.asking_price_cents) },
                { label: "Days on lot", value: `${vehicle.days_on_lot}d` },
                { label: "Condition", value: vehicle.condition.replace(/_/g, " ") },
              ].map(({ label: l, value }) => (
                <div key={l} className="rounded-lg bg-muted/50 p-2 text-center">
                  <p className="text-sm font-bold capitalize">{value}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{l}</p>
                </div>
              ))}
            </div>

            {/* Gallery — only render if we have more than one photo, or the single
                photo is more than a small thumbnail's worth of context. */}
            {photos.length > 1 && (
              <div className="mt-4">
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-6 px-6 snap-x">
                  {photos.map((url, i) => (
                    <button
                      key={url + i}
                      type="button"
                      onClick={() => setLightboxIdx(i)}
                      className={cn(
                        "shrink-0 snap-start overflow-hidden rounded-lg border h-24 w-32 relative hover:ring-2 hover:ring-primary/40 transition-all",
                        i === 0 && "ring-1 ring-primary/30",
                      )}
                    >
                      <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </SheetHeader>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* ── Unit economics ── */}
            {(economics.totalCost > 0 || economics.salePrice > 0) && (
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Unit economics</p>
                </div>
                <div className="rounded-lg border p-3 space-y-1.5 text-sm">
                  {economics.acquisition > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Acquisition cost</span>
                      <span>{fmtPrice(economics.acquisition)}</span>
                    </div>
                  )}
                  {economics.recon > 0 && (
                    <div className="flex justify-between text-muted-foreground">
                      <span>Reconditioning ({expenses.length} expense{expenses.length !== 1 ? "s" : ""})</span>
                      <span>{fmtPrice(economics.recon)}</span>
                    </div>
                  )}
                  {economics.totalCost > 0 && (
                    <div className="flex justify-between font-medium border-t pt-1.5">
                      <span>Total cost in</span>
                      <span>{fmtPrice(economics.totalCost)}</span>
                    </div>
                  )}
                  {economics.salePrice > 0 && (
                    <div className="flex justify-between text-muted-foreground mt-1">
                      <span>Sale price</span>
                      <span>{fmtPrice(economics.salePrice)}</span>
                    </div>
                  )}
                  {economics.frontGross != null && (
                    <div className={cn(
                      "flex justify-between font-bold border-t pt-1.5",
                      economics.frontGross >= 0 ? "text-emerald-700" : "text-red-700",
                    )}>
                      <span>Front-end gross</span>
                      <span>{economics.frontGross >= 0 ? "+" : ""}{fmtPrice(economics.frontGross)}</span>
                    </div>
                  )}
                  {economics.dealGross != null && economics.dealGross !== economics.frontGross && (
                    <div className={cn(
                      "flex justify-between text-xs",
                      economics.dealGross >= 0 ? "text-emerald-600" : "text-red-600",
                    )}>
                      <span>Total deal gross (incl. F&amp;I)</span>
                      <span>{economics.dealGross >= 0 ? "+" : ""}{fmtPrice(economics.dealGross)}</span>
                    </div>
                  )}
                  {economics.totalCost > 0 && economics.salePrice === 0 && (
                    <div className="flex justify-between text-muted-foreground text-xs border-t pt-1.5">
                      <span>Min to break even</span>
                      <span>{fmtPrice(economics.totalCost)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Expenses ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Receipt className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Expenses ({expenses.length})
                  {expenses.length > 0 && (
                    <span className="ml-1 font-normal normal-case text-muted-foreground">
                      · {fmtPrice(expenses.reduce((s, e) => s + e.amount_cents, 0))} total
                    </span>
                  )}
                </p>
              </div>
              {expenses.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No expenses linked to this vehicle.</p>
              ) : (
                <div className="space-y-1.5">
                  {expenses.map((e) => (
                    <div key={e.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">{e.description}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABEL[e.category] ?? e.category}
                          {e.vendor ? ` · ${e.vendor}` : ""}
                          {" · "}{fmtDate(e.paid_at)}
                        </p>
                      </div>
                      <span className="font-bold text-sm shrink-0">{fmtPrice(e.amount_cents)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Deals ── */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileSignature className="h-4 w-4 text-muted-foreground" />
                <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  Deals ({deals.length})
                </p>
              </div>
              {deals.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">No deals linked.</p>
              ) : (
                <div className="space-y-1.5">
                  {deals.map((d) => (
                    <div key={d.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium">#{d.deal_number}</span>
                          <Badge className={cn("border-0 text-[9px] py-0", DEAL_BADGE[d.status] ?? "bg-zinc-500/15 text-zinc-700")}>
                            {d.status.replace(/_/g, " ")}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{d.customer_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold">{fmtPrice(d.total_cents)}</p>
                        {d.sold_at && <p className="text-[10px] text-muted-foreground">{fmtDate(d.sold_at)}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Test drives ── */}
            {testDrives.length > 0 && (
              <>
                <Separator />
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      Test drives ({testDrives.length})
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    {testDrives.map((d) => (
                      <div key={d.id} className="flex items-center gap-2 rounded-lg border p-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium">{d.customer_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {fmtDate(d.scheduled_at)} · {d.duration_minutes} min
                          </p>
                        </div>
                        <Badge className="border-0 text-[9px] bg-zinc-500/15 text-zinc-700">
                          {d.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </SheetContent>

      {/* ── Lightbox ── */}
      {lightboxIdx !== null && photos.length > 0 && (
        <Lightbox
          photos={photos}
          initialIndex={lightboxIdx}
          onClose={() => setLightboxIdx(null)}
        />
      )}
    </Sheet>
  );
}

// ─── main section ─────────────────────────────────────────────────────────────

interface Props { storeId: string; storeName?: string; }

function CarDealershipInventorySectionInner({ storeId, storeName }: Props) {
  const {
    vehicles, loading, saving,
    create, createMany, update, updateMany, remove, removeMany,
  } = useDealershipInventory(storeId);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | DealershipVehicleStatus>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipVehicle | null>(null);
  const [detailVehicle, setDetailVehicle] = useState<DealershipVehicle | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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
  const handleDetail = (v: DealershipVehicle) => { setDetailVehicle(v); setDetailOpen(true); };
  const handleDelete = async (v: DealershipVehicle) => {
    if (!window.confirm(`Delete ${v.year ?? ""} ${v.make} ${v.model}?`)) return;
    const ok = await remove(v.id);
    if (ok) toast.success("Vehicle removed.");
    else toast.error("Couldn't delete vehicle.");
  };

  // ── selection helpers ────────────────────────────────────────────────────
  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const clearSelection = () => setSelectedIds(new Set());

  // ── bulk actions ─────────────────────────────────────────────────────────
  const bulkSetStatus = async (status: DealershipVehicleStatus) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const n = await updateMany(ids, { status });
    if (n > 0) {
      toast.success(`Updated ${n} vehicle${n !== 1 ? "s" : ""} to ${statusLabel[status]}.`);
      clearSelection();
    } else {
      toast.error("Bulk update failed.");
    }
  };

  const bulkSetFlag = async (flag: "is_featured" | "is_active", value: boolean) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    const n = await updateMany(ids, { [flag]: value } as Partial<DealershipVehicleDraft>);
    if (n > 0) {
      const verb =
        flag === "is_featured"
          ? value ? "marked featured" : "unmarked featured"
          : value ? "activated" : "deactivated";
      toast.success(`${n} vehicle${n !== 1 ? "s" : ""} ${verb}.`);
      clearSelection();
    } else {
      toast.error("Bulk update failed.");
    }
  };

  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!window.confirm(`Delete ${ids.length} vehicle${ids.length !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    const n = await removeMany(ids);
    if (n > 0) {
      toast.success(`Deleted ${n} vehicle${n !== 1 ? "s" : ""}.`);
      clearSelection();
    } else {
      toast.error("Bulk delete failed.");
    }
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
      {/* ── header ── */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Vehicle Inventory</h2>
          <p className="text-sm text-muted-foreground">
            {counts.all} vehicles · {counts.available} available · {counts.pending_sale} pending · {counts.sold} sold
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            onClick={() => setImportOpen(true)}
            title="Bulk-import vehicles from a CSV file"
          >
            <Upload className="h-4 w-4 mr-1" />Import CSV
          </Button>
          {vehicles.length > 0 && (
            <Button
              variant="outline"
              onClick={() => exportInventoryCsv(filtered)}
              title={filtered.length < vehicles.length
                ? `Export ${filtered.length} filtered vehicles`
                : `Export all ${vehicles.length} vehicles`}
            >
              <Download className="h-4 w-4 mr-1" />
              Export CSV
              {filtered.length < vehicles.length && (
                <span className="ml-1 text-[10px] text-muted-foreground">({filtered.length})</span>
              )}
            </Button>
          )}
          <Button onClick={handleAdd}><Plus className="h-4 w-4 mr-1" />Add vehicle</Button>
        </div>
      </div>

      {/* ── filters ── */}
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

      {/* ── grid ── */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Car className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">{vehicles.length === 0 ? "No vehicles yet" : "No matches"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {vehicles.length === 0
              ? "Add your first vehicle to start building inventory."
              : "Try a different search or filter."}
          </p>
          {vehicles.length === 0 && (
            <Button onClick={handleAdd} className="mt-4"><Plus className="h-4 w-4 mr-1" />Add vehicle</Button>
          )}
        </Card>
      ) : (
        <>
          {/* Select-all-in-view toggle */}
          {filtered.length > 1 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
                onClick={() => {
                  const allSelected = filtered.every((v) => selectedIds.has(v.id));
                  if (allSelected) {
                    // Deselect only the filtered ones
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      for (const v of filtered) next.delete(v.id);
                      return next;
                    });
                  } else {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      for (const v of filtered) next.add(v.id);
                      return next;
                    });
                  }
                }}
              >
                {filtered.every((v) => selectedIds.has(v.id))
                  ? <CheckSquare className="h-3.5 w-3.5 text-primary" />
                  : <Square className="h-3.5 w-3.5" />}
                Select all {filtered.length} in view
              </button>
              {selectedIds.size > 0 && (
                <button type="button" className="hover:text-foreground" onClick={clearSelection}>
                  Clear selection ({selectedIds.size})
                </button>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((v) => {
            const isSelected = selectedIds.has(v.id);
            return (
            <Card
              key={v.id}
              className={cn(
                "overflow-hidden cursor-pointer hover:shadow-md transition-all group relative",
                isSelected && "ring-2 ring-primary",
              )}
              onClick={() => handleDetail(v)}
            >
              {/* Selection checkbox — top-right corner, replaces featured badge position */}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleSelected(v.id); }}
                className={cn(
                  "absolute top-2 right-2 z-10 grid h-6 w-6 place-items-center rounded transition-all",
                  isSelected
                    ? "bg-primary text-primary-foreground shadow"
                    : "bg-black/40 text-white opacity-0 group-hover:opacity-100 hover:bg-black/60",
                )}
                aria-label={isSelected ? "Deselect vehicle" : "Select vehicle"}
                title={isSelected ? "Deselect" : "Select for bulk action"}
              >
                {isSelected ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4" />}
              </button>

              <div className="aspect-[16/10] bg-muted relative">
                {v.photo_url ? (
                  <img
                    src={v.photo_url}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center">
                    <Car className="h-10 w-10 text-muted-foreground/40" />
                  </div>
                )}
                <Badge className={cn("absolute top-2 left-2 border-0 text-[10px] font-bold", statusStyles[v.status])}>
                  {statusLabel[v.status]}
                </Badge>
                {v.is_featured && (
                  <Badge className="absolute top-10 right-2 border-0 bg-amber-500/90 text-white text-[10px]">
                    ★ Featured
                  </Badge>
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
                  <p className="text-base font-bold text-primary shrink-0">{fmtPrice(v.asking_price_cents)}</p>
                </div>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  {v.mileage != null && <span>{v.mileage.toLocaleString()} {v.mileage_unit}</span>}
                  <span className="capitalize">{v.condition.replace(/_/g, " ")}</span>
                  {v.stock_number && <span className="font-mono">#{v.stock_number}</span>}
                </div>
                <div className="mt-3 flex justify-end gap-1">
                  {/* Stop propagation so card click doesn't also trigger these */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); printWindowSticker(v, storeName); }}
                    title="Print window sticker"
                  >
                    <Printer className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleEdit(v); }}
                    title="Edit vehicle"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => { e.stopPropagation(); handleDelete(v); }}
                    title="Delete vehicle"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 self-center ml-1 group-hover:text-muted-foreground transition-colors" />
                </div>
              </div>
            </Card>
            );
          })}
          </div>
        </>
      )}

      {/* ── Floating bulk-action bar ── */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 rounded-xl border bg-card shadow-lg flex items-center gap-2 px-3 py-2 max-w-[95vw] flex-wrap">
          <Badge className="border-0 bg-primary text-primary-foreground">
            {selectedIds.size} selected
          </Badge>

          <Select
            onValueChange={(v) => bulkSetStatus(v as DealershipVehicleStatus)}
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue placeholder="Set status..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="available">Available</SelectItem>
              <SelectItem value="reserved">Reserved</SelectItem>
              <SelectItem value="pending_sale">Pending sale</SelectItem>
              <SelectItem value="sold">Sold</SelectItem>
              <SelectItem value="in_transit">In transit</SelectItem>
              <SelectItem value="service">In service</SelectItem>
              <SelectItem value="retired">Retired</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkSetFlag("is_featured", true)}
            disabled={saving}
            title="Mark all selected as featured"
          >
            <Star className="h-3.5 w-3.5 mr-1 fill-amber-400 text-amber-400" />Feature
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkSetFlag("is_featured", false)}
            disabled={saving}
            title="Remove featured flag from all selected"
          >
            <Star className="h-3.5 w-3.5 mr-1" />Unfeature
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkSetFlag("is_active", true)}
            disabled={saving}
            title="Show on storefront"
          >
            <Eye className="h-3.5 w-3.5 mr-1" />Activate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => bulkSetFlag("is_active", false)}
            disabled={saving}
            title="Hide from storefront"
          >
            <EyeOff className="h-3.5 w-3.5 mr-1" />Deactivate
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={bulkDelete}
            disabled={saving}
            className="text-destructive border-destructive/40 hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5 mr-1" />Delete
          </Button>

          <Button
            size="sm"
            variant="ghost"
            onClick={clearSelection}
            title="Clear selection"
            aria-label="Clear selection"
          >
            <XIcon className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* ── Vehicle detail sheet ── */}
      {detailVehicle && (
        <VehicleDetailSheet
          storeId={storeId}
          storeName={storeName}
          vehicle={detailVehicle}
          open={detailOpen}
          onOpenChange={setDetailOpen}
          onEdit={() => { setDetailOpen(false); handleEdit(detailVehicle); }}
        />
      )}

      <CarDealershipVehicleDialog
        storeId={storeId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        saving={saving}
        onSubmit={handleSubmit}
      />

      <CarDealershipVehicleImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        existingVehicles={vehicles}
        onImport={async (drafts) => {
          const count = await createMany(drafts);
          if (count > 0) toast.success(`Imported ${count} vehicle${count !== 1 ? "s" : ""}.`);
          else toast.error("Bulk insert failed — see console.");
          return count;
        }}
      />
    </div>
  );
}

// React.memo guards against React 19 + Radix Slot ref-cleanup loops when the
// parent layout re-renders for unrelated reasons (e.g. realtime badge updates).
const CarDealershipInventorySection = memo(CarDealershipInventorySectionInner);
export default CarDealershipInventorySection;
