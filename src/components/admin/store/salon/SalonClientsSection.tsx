/**
 * SalonClientsSection — manage the salon's client book (address book).
 * Bookings later attach to a client_id so service history rolls up here.
 */
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Users, Plus, Edit, Trash2, Loader2, AlertCircle,
  Search, Mail, Phone, Ban, Cake, NotebookText, ChevronDown, AlertTriangle,
  CalendarPlus, Star, History as HistoryIcon,
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  useSalonClients,
  type SalonClient,
  type SalonClientDraft,
} from "@/hooks/salon/useSalonClients";
import { useSalonStylists } from "@/hooks/salon/useSalonStylists";
import { supabase } from "@/integrations/supabase/client";
import { writeBookingPreset } from "@/lib/salon/bookingPreset";

interface SalonClientsSectionProps {
  storeId: string;
  onJumpToTab?: (tab: string) => void;
}

const EMPTY_DRAFT: SalonClientDraft = {
  display_name: "",
  phone: "",
  email: "",
  birthday: null,
  notes: "",
  preferred_stylist_id: null,
  is_blocked: false,
};

const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const formatCurrency = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDate = (iso: string | null) => {
  if (!iso) return null;
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return null;
  }
};

export default function SalonClientsSection({ storeId, onJumpToTab }: SalonClientsSectionProps) {
  const { clients, loading, saving, error, create, update, remove } = useSalonClients(storeId);
  const { stylists } = useSalonStylists(storeId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<SalonClientDraft>(EMPTY_DRAFT);
  const [search, setSearch] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stylistById = useMemo(() => {
    const m: Record<string, string> = {};
    stylists.forEach((s) => { m[s.id] = s.display_name; });
    return m;
  }, [stylists]);

  const openAdd = () => {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    setDialogOpen(true);
  };

  const openEdit = (c: SalonClient) => {
    setEditingId(c.id);
    setDraft({
      display_name: c.display_name,
      phone: c.phone ?? "",
      email: c.email ?? "",
      birthday: c.birthday,
      notes: c.notes ?? "",
      preferred_stylist_id: c.preferred_stylist_id,
      is_blocked: c.is_blocked,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const cleanName = draft.display_name.trim();
    if (cleanName.length < 1) {
      toast.error("Client name is required.");
      return;
    }
    if (!draft.phone?.trim() && !draft.email?.trim()) {
      toast.error("Add at least a phone or email so you can reach them.");
      return;
    }
    const payload: SalonClientDraft = { ...draft, display_name: cleanName };
    if (editingId) {
      await update(editingId, payload);
      toast.success("Client updated.");
    } else {
      const created = await create(payload);
      if (created) toast.success("Client added.");
    }
    setDialogOpen(false);
  };

  const handleDelete = async () => {
    if (!confirmDeleteId) return;
    await remove(confirmDeleteId);
    setConfirmDeleteId(null);
    toast.success("Client removed.");
  };

  // All tags across all clients, ranked by frequency for the filter bar.
  const allTags = useMemo(() => {
    const tally = new Map<string, number>();
    for (const c of clients) for (const t of c.tags ?? []) tally.set(t, (tally.get(t) ?? 0) + 1);
    return Array.from(tally.entries()).sort((a, b) => b[1] - a[1]).map(([t]) => t);
  }, [clients]);
  const [activeTagFilter, setActiveTagFilter] = useState<string | null>(null);

  const filtered = clients.filter((c) => {
    if (activeTagFilter && !(c.tags ?? []).includes(activeTagFilter)) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.display_name.toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q) ||
      (c.email || "").toLowerCase().includes(q) ||
      (c.tags ?? []).some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Clients
            {clients.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                {clients.length}
              </span>
            )}
          </CardTitle>
          <Button onClick={openAdd} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" /> Add client
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {clients.length > 0 && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name, phone, email, or tag…"
                className="pl-9"
              />
            </div>
          )}
          {allTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Tags</span>
              {allTags.slice(0, 12).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setActiveTagFilter((prev) => (prev === t ? null : t))}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors",
                    activeTagFilter === t
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card text-foreground/80 hover:bg-muted"
                  )}
                >
                  {t}
                </button>
              ))}
              {activeTagFilter && (
                <button
                  type="button"
                  onClick={() => setActiveTagFilter(null)}
                  className="text-[11px] text-muted-foreground underline"
                >
                  clear
                </button>
              )}
            </div>
          )}

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading clients…
            </div>
          ) : clients.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center">
              <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/60" />
              <p className="text-sm font-semibold text-foreground">No clients yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add clients here, or they'll be added automatically when you create their first booking.
              </p>
              <Button onClick={openAdd} size="sm" className="mt-4 gap-1.5">
                <Plus className="h-4 w-4" /> Add your first client
              </Button>
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No clients match "{search}".</p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {filtered.map((c) => {
                const isExpanded = expandedId === c.id;
                return (
                  <div key={c.id} className={cn(c.is_blocked && "bg-destructive/5")}>
                    <button
                      type="button"
                      onClick={() => setExpandedId(isExpanded ? null : c.id)}
                      className="flex w-full items-center gap-3 p-3 text-left hover:bg-muted/40"
                    >
                      <div className={cn(
                        "grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                        c.is_blocked ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"
                      )}>
                        {initialsOf(c.display_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-semibold text-foreground">{c.display_name}</p>
                          {c.is_blocked && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                              <Ban className="h-3 w-3" /> Blocked
                            </span>
                          )}
                          {(c.no_show_count ?? 0) >= 2 && (
                            <span
                              className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300"
                              title={`${c.no_show_count} no-shows on record`}
                            >
                              <AlertTriangle className="h-3 w-3" /> {c.no_show_count} no-show{c.no_show_count === 1 ? "" : "s"}
                            </span>
                          )}
                          {(c.tags ?? []).slice(0, 4).map((t) => (
                            <span key={t} className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
                              {t}
                            </span>
                          ))}
                          {(c.tags ?? []).length > 4 && (
                            <span className="text-[10px] text-muted-foreground">+{(c.tags ?? []).length - 4}</span>
                          )}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                          {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {c.phone}</span>}
                          {c.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {c.email}</span>}
                          {c.visits_count > 0 && (
                            <span>{c.visits_count} visit{c.visits_count === 1 ? "" : "s"} · {formatCurrency(c.total_spent_cents)}</span>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                    </button>
                    {isExpanded && (
                      <div className="space-y-3 border-t border-border bg-muted/20 p-3 text-sm">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {c.preferred_stylist_id && stylistById[c.preferred_stylist_id] && (
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Preferred stylist</p>
                              <p className="mt-0.5 text-foreground">{stylistById[c.preferred_stylist_id]}</p>
                            </div>
                          )}
                          {c.birthday && (
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Birthday</p>
                              <p className="mt-0.5 inline-flex items-center gap-1 text-foreground">
                                <Cake className="h-3.5 w-3.5" /> {formatDate(c.birthday)}
                              </p>
                            </div>
                          )}
                          {c.last_visit_at && (
                            <div>
                              <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Last visit</p>
                              <p className="mt-0.5 text-foreground">{formatDate(c.last_visit_at)}</p>
                            </div>
                          )}
                        </div>
                        {c.notes && (
                          <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                              <NotebookText className="-mt-0.5 mr-1 inline h-3 w-3" /> Stylist notes
                            </p>
                            <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">{c.notes}</p>
                          </div>
                        )}

                        <ClientTagEditor
                          tags={c.tags ?? []}
                          suggestions={allTags}
                          onChange={async (next) => { await update(c.id, { tags: next } as never); }}
                        />

                        <ClientActivityPanel storeId={storeId} clientId={c.id} loyaltyPoints={c.loyalty_points ?? 0} />

                        <div className="flex flex-wrap gap-2 pt-1">
                          <Button
                            type="button" size="sm"
                            onClick={() => {
                              writeBookingPreset({
                                client_id: c.id,
                                client_name: c.display_name,
                                client_phone: c.phone ?? "",
                                stylist_id: c.preferred_stylist_id ?? undefined,
                              });
                              if (onJumpToTab) onJumpToTab("salon-bookings");
                              else window.dispatchEvent(new CustomEvent("lodge-set-tab", { detail: { tab: "salon-bookings" } }));
                            }}
                            className="gap-1.5"
                          >
                            <CalendarPlus className="h-3.5 w-3.5" /> Book again
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => openEdit(c)} disabled={saving} className="gap-1.5">
                            <Edit className="h-3.5 w-3.5" /> Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => void update(c.id, { is_blocked: !c.is_blocked })}
                            disabled={saving}
                            className="gap-1.5"
                          >
                            <Ban className="h-3.5 w-3.5" /> {c.is_blocked ? "Unblock" : "Block"}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => setConfirmDeleteId(c.id)}
                            disabled={saving}
                            className="gap-1.5 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit client" : "Add client"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="clName">Name *</Label>
              <Input
                id="clName"
                value={draft.display_name}
                onChange={(e) => setDraft({ ...draft, display_name: e.target.value })}
                placeholder="e.g. Jamie Chen"
                maxLength={120}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="clPhone">Phone</Label>
                <Input
                  id="clPhone"
                  type="tel"
                  value={draft.phone ?? ""}
                  onChange={(e) => setDraft({ ...draft, phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clEmail">Email</Label>
                <Input
                  id="clEmail"
                  type="email"
                  value={draft.email ?? ""}
                  onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                  placeholder="jamie@example.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="clBirthday">Birthday</Label>
                <Input
                  id="clBirthday"
                  type="date"
                  value={draft.birthday ?? ""}
                  onChange={(e) => setDraft({ ...draft, birthday: e.target.value || null })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="clStylist">Preferred stylist</Label>
                <select
                  id="clStylist"
                  value={draft.preferred_stylist_id ?? ""}
                  onChange={(e) => setDraft({ ...draft, preferred_stylist_id: e.target.value || null })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">No preference</option>
                  {stylists.filter((s) => s.is_active).map((s) => (
                    <option key={s.id} value={s.id}>{s.display_name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clNotes">Stylist notes</Label>
              <Textarea
                id="clNotes"
                value={draft.notes ?? ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                placeholder="Allergies, color formulas, preferences…"
                rows={4}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">Private — only visible to your team.</p>
            </div>

            <label className="flex items-start justify-between gap-3 rounded-xl border border-border p-3 cursor-pointer hover:border-primary/40">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">Block this client</p>
                <p className="text-xs text-muted-foreground">Prevent them from booking. Use for no-shows or other concerns.</p>
              </div>
              <Switch
                checked={draft.is_blocked}
                onCheckedChange={(v) => setDraft({ ...draft, is_blocked: v })}
              />
            </label>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={saving} className="gap-1.5">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingId ? "Save changes" : "Add client"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDeleteId !== null} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this client?</AlertDialogTitle>
            <AlertDialogDescription>
              Their service history and any past bookings will keep their records, but the client entry will be removed from your address book. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>Keep client</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={saving}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ClientActivityPanelProps {
  storeId: string;
  clientId: string;
  loyaltyPoints: number;
}

interface RecentBooking {
  id: string;
  service_name: string;
  stylist_name: string | null;
  start_at: string;
  status: string;
  price_cents: number;
  tip_cents: number;
  internal_notes: string | null;
}

interface LoyaltyEvent {
  id: string;
  event_type: string;
  points_delta: number;
  reason: string | null;
  created_at: string;
}

const statusColor: Record<string, string> = {
  pending: "text-amber-700 dark:text-amber-300",
  confirmed: "text-sky-700 dark:text-sky-300",
  completed: "text-emerald-700 dark:text-emerald-300",
  cancelled: "text-muted-foreground line-through",
  no_show: "text-destructive",
};

function ClientActivityPanel({ storeId, clientId, loyaltyPoints }: ClientActivityPanelProps) {
  const [bookings, setBookings] = useState<RecentBooking[]>([]);
  const [events, setEvents] = useState<LoyaltyEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [bRes, eRes] = await Promise.all([
        supabase.from("salon_bookings")
          .select("id, service_name, stylist_name, start_at, status, price_cents, tip_cents, internal_notes")
          .eq("store_id", storeId).eq("client_id", clientId)
          .order("start_at", { ascending: false }).limit(5),
        supabase.from("salon_loyalty_events")
          .select("id, event_type, points_delta, reason, created_at")
          .eq("store_id", storeId).eq("client_id", clientId)
          .order("created_at", { ascending: false }).limit(5),
      ]);
      if (cancelled) return;
      setBookings((bRes.data ?? []) as unknown as RecentBooking[]);
      setEvents((eRes.data ?? []) as unknown as LoyaltyEvent[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, clientId]);

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-lg border border-border bg-card p-3">
        <p className="mb-2 inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <HistoryIcon className="h-3 w-3" /> Recent visits
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>
        ) : bookings.length === 0 ? (
          <p className="text-xs text-muted-foreground">No visits yet.</p>
        ) : (
          <ul className="divide-y divide-border text-xs">
            {bookings.map((b) => (
              <li key={b.id} className="space-y-1 py-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{b.service_name}</p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {new Date(b.start_at).toLocaleDateString()}{b.stylist_name ? ` · ${b.stylist_name}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className={cn("text-[10px] font-bold uppercase tracking-wider", statusColor[b.status] ?? "text-muted-foreground")}>
                      {b.status}
                    </p>
                    <p className="font-semibold text-foreground">${((b.price_cents + b.tip_cents) / 100).toFixed(2)}</p>
                  </div>
                </div>
                {b.internal_notes && (
                  <p className="rounded bg-muted/40 px-2 py-1 text-[10px] text-foreground/85 leading-snug">
                    <span className="font-bold uppercase tracking-wider text-muted-foreground">Notes · </span>
                    <span className="whitespace-pre-wrap">{b.internal_notes}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <p className="mb-2 inline-flex items-center justify-between gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Star className="h-3 w-3" /> Loyalty</span>
          <span className="text-sm font-bold text-primary">{loyaltyPoints} pts</span>
        </p>
        {loading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…</div>
        ) : events.length === 0 ? (
          <p className="text-xs text-muted-foreground">No loyalty activity yet.</p>
        ) : (
          <ul className="divide-y divide-border text-xs">
            {events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-2 py-1.5">
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground capitalize">{e.event_type}</p>
                  {e.reason && <p className="truncate text-[10px] text-muted-foreground">{e.reason}</p>}
                </div>
                <p className={cn(
                  "shrink-0 text-sm font-bold",
                  e.points_delta >= 0 ? "text-emerald-700 dark:text-emerald-300" : "text-destructive"
                )}>
                  {e.points_delta >= 0 ? "+" : ""}{e.points_delta}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

/** Inline tag editor: shows current tags as removable chips + an input that
 * adds a tag on Enter. Suggestions surface as quick-pick chips below. */
function ClientTagEditor({
  tags,
  suggestions,
  onChange,
}: {
  tags: string[];
  suggestions: string[];
  onChange: (next: string[]) => Promise<void>;
}) {
  const [pending, setPending] = useState("");
  const [busy, setBusy] = useState(false);

  const addTag = async (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (tags.includes(t)) { setPending(""); return; }
    if (tags.length >= 20) return;
    setBusy(true);
    try { await onChange([...tags, t]); setPending(""); } finally { setBusy(false); }
  };
  const removeTag = async (t: string) => {
    setBusy(true);
    try { await onChange(tags.filter((x) => x !== t)); } finally { setBusy(false); }
  };

  const COMMON = ["VIP", "Regular", "New", "Loyal", "Allergic", "Difficult"];
  const quick = Array.from(new Set([...suggestions, ...COMMON])).filter((s) => !tags.includes(s)).slice(0, 6);

  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Tags</p>
      <div className="mt-1 flex flex-wrap items-center gap-1.5">
        {tags.length === 0 && <span className="text-xs text-muted-foreground">No tags yet.</span>}
        {tags.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
            {t}
            <button
              type="button"
              onClick={() => void removeTag(t)}
              disabled={busy}
              className="text-primary/70 hover:text-destructive"
              aria-label={`Remove tag ${t}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={pending}
          onChange={(e) => setPending(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void addTag(pending);
            }
          }}
          placeholder="Add tag…"
          maxLength={40}
          disabled={busy || tags.length >= 20}
          className="h-6 w-28 rounded-full border border-dashed border-border bg-card px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </div>
      {quick.length > 0 && (
        <div className="mt-1 flex flex-wrap gap-1">
          {quick.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => void addTag(s)}
              disabled={busy || tags.length >= 20}
              className="rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
