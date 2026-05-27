/**
 * SalonServiceHistorySection — chronological list of completed services
 * across all clients, filterable by client and date range.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, ScrollText, AlertCircle, User, NotebookPen, Save, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useSalonClients } from "@/hooks/salon/useSalonClients";
import type { SalonBooking } from "@/hooks/salon/useSalonBookings";

interface SalonServiceHistorySectionProps {
  storeId: string;
}

const formatPrice = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

const daysAgoIso = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function SalonServiceHistorySection({ storeId }: SalonServiceHistorySectionProps) {
  const { clients } = useSalonClients(storeId);
  const [clientFilter, setClientFilter] = useState<string>("");
  const [from, setFrom] = useState<string>(daysAgoIso(30));
  const [to, setTo] = useState<string>(todayIso());
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<SalonBooking[]>([]);
  const [retailByBooking, setRetailByBooking] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const startEdit = (r: SalonBooking) => {
    setEditingId(r.id);
    setDraft(r.internal_notes ?? "");
  };
  const cancelEdit = () => { setEditingId(null); setDraft(""); };
  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const value = draft.trim() || null;
    const { error: err } = await supabase
      .from("salon_bookings")
      .update({ internal_notes: value })
      .eq("id", editingId);
    setSaving(false);
    if (err) { toast.error(err.message); return; }
    setRows((prev) => prev.map((r) => r.id === editingId ? { ...r, internal_notes: value } : r));
    setEditingId(null);
    setDraft("");
    toast.success("Notes saved.");
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const fromIso = new Date(`${from}T00:00:00`).toISOString();
      const toIso = new Date(`${to}T23:59:59.999`).toISOString();
      let query = supabase
        .from("salon_bookings")
        .select("*")
        .eq("store_id", storeId)
        .eq("status", "completed")
        .gte("start_at", fromIso)
        .lte("start_at", toIso)
        .order("start_at", { ascending: false })
        .limit(200);
      if (clientFilter) query = query.eq("client_id", clientFilter);
      const { data, error: err } = await query;
      if (cancelled) return;
      if (err) {
        console.error("[SalonServiceHistory] load failed", err);
        setError("Couldn't load history.");
        setLoading(false);
        return;
      }
      const bookingRows = (data ?? []) as unknown as SalonBooking[];
      setRows(bookingRows);

      // Retail per visit — owners filtering to a single client gauge that
      // client's value here; omitting retail would undercount anyone who
      // buys product after a service.
      if (bookingRows.length > 0) {
        const { data: retail } = await supabase
          .from("salon_booking_retail_items")
          .select("booking_id, unit_price_cents, quantity")
          .in("booking_id", bookingRows.map((b) => b.id));
        if (cancelled) return;
        const map = new Map<string, number>();
        for (const r of (retail ?? []) as Array<{ booking_id: string; unit_price_cents: number; quantity: number }>) {
          map.set(r.booking_id, (map.get(r.booking_id) ?? 0) + r.unit_price_cents * r.quantity);
        }
        setRetailByBooking(map);
      } else {
        setRetailByBooking(new Map());
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [storeId, from, to, clientFilter]);

  const filtered = useMemo(() => {
    if (!search) return rows;
    const q = search.toLowerCase();
    return rows.filter((r) =>
      r.client_name.toLowerCase().includes(q) ||
      r.service_name.toLowerCase().includes(q) ||
      (r.stylist_name || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  const totals = useMemo(() => {
    let revenue = 0, tips = 0, visits = filtered.length;
    for (const r of filtered) {
      // Owner revenue = services + add-ons + retail. Tax is pass-through;
      // tips are shown separately below.
      revenue += r.price_cents + (r.addons_total_cents ?? 0) + (retailByBooking.get(r.id) ?? 0);
      tips += r.tip_cents;
    }
    return { revenue, tips, visits };
  }, [filtered, retailByBooking]);

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/8 p-3 text-sm text-destructive">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="rounded-2xl border-border/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollText className="h-5 w-5 text-primary" />
            Service History
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="historyClient">Client</Label>
              <select
                id="historyClient"
                value={clientFilter}
                onChange={(e) => setClientFilter(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.display_name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="historyFrom">From</Label>
              {/* Bind the range so the owner can't construct an inverted
                  window — would otherwise silently zero out the history list
                  and the totals card. */}
              <Input id="historyFrom" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="historyTo">To</Label>
              <Input id="historyTo" type="date" value={to} min={from} max={todayIso()} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="historySearch">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input id="historySearch" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, service…" className="pl-9" />
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <SummaryCell label="Visits" value={String(totals.visits)} />
            <SummaryCell label="Revenue" value={formatPrice(totals.revenue)} />
            <SummaryCell label="Tips" value={formatPrice(totals.tips)} />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No completed services in this window.
            </p>
          ) : (
            <div className="divide-y divide-border rounded-xl border border-border">
              {filtered.map((r) => {
                const isEditing = editingId === r.id;
                return (
                  <div key={r.id} className="p-3">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <p className="truncate text-sm font-semibold text-foreground">{r.client_name}</p>
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {r.service_name}{r.stylist_name ? ` · ${r.stylist_name}` : ""}
                        </p>
                        <p className="text-[11px] text-muted-foreground">{formatDateTime(r.start_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-foreground">{formatPrice(r.price_cents + (r.addons_total_cents ?? 0) + (retailByBooking.get(r.id) ?? 0))}</p>
                        {r.tip_cents > 0 && (
                          <p className="text-[11px] text-muted-foreground">+ {formatPrice(r.tip_cents)} tip</p>
                        )}
                      </div>
                    </div>
                    {isEditing ? (
                      <div className="mt-2 space-y-1.5">
                        <Textarea
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="Formula, products, observations…"
                          rows={3}
                          maxLength={1000}
                          autoFocus
                        />
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" disabled={saving} onClick={cancelEdit} className="gap-1.5">
                            <X className="h-3.5 w-3.5" /> Cancel
                          </Button>
                          <Button size="sm" disabled={saving} onClick={() => void saveEdit()} className="gap-1.5">
                            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
                          </Button>
                        </div>
                      </div>
                    ) : r.internal_notes ? (
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="mt-2 block w-full rounded-md bg-muted/40 px-2.5 py-1.5 text-left text-xs text-foreground/85 hover:bg-muted/60"
                        title="Click to edit"
                      >
                        <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          <NotebookPen className="h-3 w-3" /> Notes
                        </span>
                        <span className="whitespace-pre-wrap">{r.internal_notes}</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit(r)}
                        className="mt-2 inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        <NotebookPen className="h-3 w-3" /> Add notes
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-xl font-bold text-foreground">{value}</p>
    </div>
  );
}
