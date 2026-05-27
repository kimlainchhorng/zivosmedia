import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft, Plus, Plane, Hotel, Car, MapPin, StickyNote, Calendar,
  DollarSign, Trash2, ExternalLink, GripVertical, Edit2, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useTripItinerary, useTripItems, useUpdateTrip, useCreateTripItem,
  useDeleteTripItem,
} from "@/hooks/useTripItineraries";
import type { ItemType, TripItem } from "@/hooks/useTripItineraries";
import { format } from "date-fns";
import { ReservationStatusTimeline, type LodgeStatus } from "@/components/lodging/ReservationStatusTimeline";
import { ReservationStatusHistory } from "@/components/lodging/ReservationStatusHistory";
import { LodgingPaymentBadge } from "@/components/lodging/LodgingPaymentBadge";
import { PolicyAcknowledgementCard } from "@/components/lodging/PolicyAcknowledgementCard";
import { useReservationLive } from "@/hooks/lodging/useReservationLive";
import { downloadAuditCsv } from "@/lib/lodging/auditCsv";
import { supabase } from "@/integrations/supabase/client";
import { Download } from "lucide-react";
import { toast } from "sonner";

const itemIcons: Record<ItemType, typeof Plane> = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
  activity: MapPin,
  note: StickyNote,
};

const itemColors: Record<ItemType, string> = {
  flight: "bg-sky-500/20 text-sky-400",
  hotel: "bg-violet-500/20 text-violet-400",
  car: "bg-amber-500/20 text-amber-400",
  activity: "bg-emerald-500/20 text-emerald-400",
  note: "bg-muted text-muted-foreground",
};

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: trip, isLoading: tripLoading } = useTripItinerary(id);
  const { data: items = [], isLoading: itemsLoading } = useTripItems(id);
  const updateTrip = useUpdateTrip();
  const createItem = useCreateTripItem();
  const deleteItem = useDeleteTripItem();

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");

  // Add item form state
  const [newItemType, setNewItemType] = useState<ItemType>("flight");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemLocation, setNewItemLocation] = useState("");
  const [newItemCost, setNewItemCost] = useState("");
  const [newItemStart, setNewItemStart] = useState("");
  const [newItemEnd, setNewItemEnd] = useState("");
  const [newItemProvider, setNewItemProvider] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");

  if (tripLoading) {
    return (
      <div className="min-h-screen bg-background safe-area-top flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading trip…</div>
      </div>
    );
  }

  if (!trip) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Trip not found</p>
        <Button variant="outline" onClick={() => navigate("/trips")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Trips
        </Button>
      </div>
    );
  }

  const totalCost = items.reduce((sum, i) => sum + (i.estimated_cost_cents || 0), 0);

  const handleAddItem = async () => {
    if (!newItemTitle.trim()) return;
    await createItem.mutateAsync({
      itinerary_id: trip.id,
      item_type: newItemType,
      title: newItemTitle.trim(),
      location: newItemLocation.trim() || null,
      estimated_cost_cents: newItemCost ? Math.round(parseFloat(newItemCost) * 100) : 0,
      start_datetime: newItemStart || null,
      end_datetime: newItemEnd || null,
      provider_name: newItemProvider.trim() || null,
      description: newItemDescription.trim() || null,
      sort_order: items.length,
    });
    resetAddForm();
    setAddDialogOpen(false);
    // Update total
    updateTrip.mutate({ id: trip.id, total_estimated_cost_cents: totalCost + (newItemCost ? Math.round(parseFloat(newItemCost) * 100) : 0) });
  };

  const resetAddForm = () => {
    setNewItemTitle("");
    setNewItemLocation("");
    setNewItemCost("");
    setNewItemStart("");
    setNewItemEnd("");
    setNewItemProvider("");
    setNewItemDescription("");
    setNewItemType("flight");
  };

  const handleSaveTitle = () => {
    if (titleDraft.trim() && titleDraft.trim() !== trip.title) {
      updateTrip.mutate({ id: trip.id, title: titleDraft.trim() });
    }
    setEditingTitle(false);
  };

  const groupedItems = (["flight", "hotel", "car", "activity", "note"] as ItemType[]).reduce(
    (acc, type) => {
      const typeItems = items.filter((i) => i.item_type === type);
      if (typeItems.length > 0) acc.push({ type, items: typeItems });
      return acc;
    },
    [] as { type: ItemType; items: TripItem[] }[]
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-6">
        {/* Header */}
        <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate("/trips")}>
          <ArrowLeft className="w-4 h-4 mr-1" /> All Trips
        </Button>

        <div className="flex items-start justify-between mb-6">
          <div className="flex-1">
            {editingTitle ? (
              <div className="flex items-center gap-2">
                <Input
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  className="text-2xl font-bold h-auto py-1"
                  maxLength={100}
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTitle()}
                />
                <Button aria-label="Save title" size="icon" variant="ghost" onClick={handleSaveTitle}>
                  <Check className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <h1
                className="text-2xl font-bold cursor-pointer hover:text-primary transition-colors flex items-center gap-2"
                onClick={() => { setTitleDraft(trip.title); setEditingTitle(true); }}
              >
                {trip.title}
                <Edit2 className="w-4 h-4 opacity-0 group-hover:opacity-100" />
              </h1>
            )}
            {trip.destination && (
              <p className="text-muted-foreground flex items-center gap-1 mt-1">
                <MapPin className="w-4 h-4" /> {trip.destination}
              </p>
            )}
          </div>
          <Badge className="capitalize">{trip.status}</Badge>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Items</p>
              <p className="text-xl font-bold">{items.length}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Est. Cost</p>
              <p className="text-xl font-bold">${(totalCost / 100).toFixed(0)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Dates</p>
              <p className="text-sm font-semibold">
                {trip.start_date ? format(new Date(trip.start_date), "MMM d") : "TBD"}
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator className="mb-6" />

        {/* Lodging reservation timeline (auto-rendered if trip has linked lodge_reservation_id in metadata) */}
        {(trip as any).lodge_reservation_id && (
          <LodgingTimelineBlock reservationId={(trip as any).lodge_reservation_id} />
        )}

        {/* Add item button */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Itinerary</h2>
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1">
                <Plus className="w-4 h-4" /> Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add to Itinerary</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Type</Label>
                  <Select value={newItemType} onValueChange={(v) => setNewItemType(v as ItemType)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(["flight", "hotel", "car", "activity", "note"] as ItemType[]).map((t) => {
                        const Icon = itemIcons[t];
                        return (
                          <SelectItem key={t} value={t}>
                            <span className="flex items-center gap-2 capitalize">
                              <Icon className="w-4 h-4" /> {t}
                            </span>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Title</Label>
                  <Input placeholder="e.g. JFK → CDG" value={newItemTitle} onChange={(e) => setNewItemTitle(e.target.value)} maxLength={100} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Location</Label>
                    <Input placeholder="City or venue" value={newItemLocation} onChange={(e) => setNewItemLocation(e.target.value)} maxLength={100} />
                  </div>
                  <div>
                    <Label>Provider</Label>
                    <Input placeholder="e.g. Delta" value={newItemProvider} onChange={(e) => setNewItemProvider(e.target.value)} maxLength={50} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Start</Label>
                    <Input type="datetime-local" value={newItemStart} onChange={(e) => setNewItemStart(e.target.value)} />
                  </div>
                  <div>
                    <Label>End</Label>
                    <Input type="datetime-local" value={newItemEnd} onChange={(e) => setNewItemEnd(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label>Estimated Cost ($)</Label>
                  <Input type="number" min="0" step="0.01" placeholder="0.00" value={newItemCost} onChange={(e) => setNewItemCost(e.target.value)} />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea placeholder="Additional details…" value={newItemDescription} onChange={(e) => setNewItemDescription(e.target.value)} maxLength={500} rows={2} />
                </div>
                <Button className="w-full" onClick={handleAddItem} disabled={!newItemTitle.trim() || createItem.isPending}>
                  {createItem.isPending ? "Adding…" : "Add Item"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Items list */}
        {itemsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Card key={i} className="animate-pulse h-20" />)}
          </div>
        ) : items.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground text-sm">
                No items yet. Add flights, hotels, cars, or activities to build your itinerary.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {groupedItems.map(({ type, items: groupItems }) => {
              const Icon = itemIcons[type];
              return (
                <div key={type}>
                  <h3 className="text-xs uppercase text-muted-foreground font-semibold mb-2 flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5" /> {type}s ({groupItems.length})
                  </h3>
                  <div className="space-y-2">
                    <AnimatePresence mode="popLayout">
                      {groupItems.map((item) => (
                        <TripItemCard
                          key={item.id}
                          item={item}
                          onDelete={() => deleteItem.mutate({ id: item.id, itineraryId: trip.id })}
                        />
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TripItemCard({ item, onDelete }: { item: TripItem; onDelete: () => void }) {
  const Icon = itemIcons[item.item_type];
  const colorClass = itemColors[item.item_type];

  return (
    <motion.div layout initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }}>
      <Card className="hover:border-primary/30 transition-colors">
        <CardContent className="p-3 flex items-start gap-3">
          <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center shrink-0", colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{item.title}</p>
              {item.provider_name && (
                <Badge variant="outline" className="text-[10px] h-5">{item.provider_name}</Badge>
              )}
            </div>
            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
              {item.location && (
                <span className="flex items-center gap-0.5">
                  <MapPin className="w-3 h-3" /> {item.location}
                </span>
              )}
              {item.start_datetime && (
                <span className="flex items-center gap-0.5">
                  <Calendar className="w-3 h-3" /> {format(new Date(item.start_datetime), "MMM d, h:mm a")}
                </span>
              )}
              {item.estimated_cost_cents > 0 && (
                <span className="flex items-center gap-0.5">
                  <DollarSign className="w-3 h-3" /> ${(item.estimated_cost_cents / 100).toFixed(0)}
                </span>
              )}
            </div>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>
            )}
          </div>
          <Button aria-label="Delete" variant="ghost" size="icon" className="h-7 w-7 text-destructive/60 hover:text-destructive shrink-0" onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function LodgingTimelineBlock({ reservationId }: { reservationId: string }) {
  const { data: live } = useReservationLive(reservationId);

  const handleRetryPayment = async () => {
    if (!live) return;
    try {
      const { data, error } = await supabase.functions.invoke("create-lodging-deposit", {
        body: {
          reservation_id: live.id,
          store_id: live.store_id,
          deposit_cents: (live as any).deposit_cents || live.total_cents || 0,
          mode: "deposit",
        },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
        toast.success("Opening secure Stripe checkout…");
      }
    } catch (e: any) {
      toast.error(e?.message || "Could not retry payment");
    }
  };

  const exportCsv = async () => {
    try {
      const { data, error } = await supabase
        .from("lodge_reservation_audit" as any)
        .select("created_at, from_status, to_status, actor_role, actor_user_id, note")
        .eq("reservation_id", reservationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []).map((r: any) => ({
        created_at: r.created_at,
        from_status: r.from_status,
        to_status: r.to_status,
        actor_role: r.actor_role,
        actor_name: r.actor_user_id ? r.actor_user_id.slice(0, 8) : null,
        note: r.note,
      }));
      if (!rows.length) {
        toast.info("No history to export yet");
        return;
      }
      const ref = (live as any)?.number || reservationId.slice(0, 8);
      downloadAuditCsv(ref, rows);
      toast.success("History downloaded");
    } catch (e: any) {
      toast.error(e?.message || "Could not export history");
    }
  };

  if (!live) return null;
  const consent = (live as any).policy_consent;
  const consentVersion = (live as any).policy_consent_version;

  return (
    <div className="mb-6 space-y-3">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className="text-sm font-bold flex items-center gap-1.5"><Hotel className="h-3.5 w-3.5 text-primary" /> Booking status</h3>
            {live.payment_status && live.payment_status !== "unpaid" && (
              <LodgingPaymentBadge
                status={live.payment_status}
                amountCents={(live as any).deposit_cents || live.total_cents}
                onRetry={handleRetryPayment}
              />
            )}
          </div>
          <ReservationStatusTimeline status={live.status as LodgeStatus} />
        </CardContent>
      </Card>
      {(consent?.rules || consent?.cancellation) && (
        <PolicyAcknowledgementCard consent={consent} versionStamp={consentVersion} />
      )}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase text-muted-foreground">Status history</h3>
            <Button size="sm" variant="outline" className="h-7 text-[11px] gap-1" onClick={exportCsv}>
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          </div>
          <ReservationStatusHistory reservationId={reservationId} />
        </CardContent>
      </Card>
    </div>
  );
}
