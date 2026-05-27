/**
 * CarRentalCustomersSection — manage renter book.
 */
import { useMemo, useState } from "react";
import {
  Users, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle, Search, ShieldOff, Eye, Download, ArrowUpDown,
} from "lucide-react";
import CarRentalCustomerDetailDialog from "./CarRentalCustomerDetailDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useCarRentalCustomers, type CarRentalCustomer, type CarRentalCustomerDraft } from "@/hooks/car-rental/useCarRentalCustomers";
import { cn } from "@/lib/utils";
import { getLoyaltyTier } from "@/lib/car-rental/loyalty";
import { toast } from "sonner";

type SortKey = "recent_rental" | "most_rentals" | "alphabetical" | "recently_added";

// RFC 4180 cell escaping for CSV export.
function csvEsc(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

interface Props { storeId: string }

const EMPTY: CarRentalCustomerDraft = {
  display_name: "",
  email: "",
  phone: "",
  date_of_birth: "",
  driver_license_number: "",
  driver_license_state: "",
  driver_license_country: "",
  driver_license_expiry: "",
  driver_license_photo_url: "",
  driver_license_photo_back_url: "",
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  notes: "",
  tags: [],
  is_blocked: false,
};

const TAG_PRESETS = ["VIP", "Frequent", "Corporate", "Verified", "Caution", "First-time"];

export default function CarRentalCustomersSection({ storeId }: Props) {
  const { customers, loading, saving, error, create, update, remove } = useCarRentalCustomers(storeId);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("recent_rental");
  const [tagFilter, setTagFilter] = useState<Set<string>>(new Set());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalCustomer | null>(null);
  const [draft, setDraft] = useState<CarRentalCustomerDraft>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CarRentalCustomer | null>(null);

  // Deduped set of all tags currently in use (for the filter chip row).
  const tagSet = useMemo(() => {
    const s = new Set<string>();
    for (const c of customers) for (const t of (c.tags ?? [])) s.add(t);
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [customers]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let list = customers;
    if (q) {
      list = list.filter((c) =>
        c.display_name.toLowerCase().includes(q)
        || (c.email?.toLowerCase() ?? "").includes(q)
        || (c.phone ?? "").includes(q)
        || (c.driver_license_number ?? "").toLowerCase().includes(q)
      );
    }
    if (tagFilter.size > 0) {
      list = list.filter((c) => (c.tags ?? []).some((t) => tagFilter.has(t)));
    }
    // Sort — produces a stable list independent of fetch order.
    const sorted = [...list];
    switch (sortKey) {
      case "most_rentals":
        sorted.sort((a, b) => b.total_rentals - a.total_rentals || a.display_name.localeCompare(b.display_name));
        break;
      case "alphabetical":
        sorted.sort((a, b) => a.display_name.localeCompare(b.display_name));
        break;
      case "recently_added":
        sorted.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));
        break;
      case "recent_rental":
      default:
        sorted.sort((a, b) => {
          const av = a.last_rental_at ?? "";
          const bv = b.last_rental_at ?? "";
          if (av === bv) return a.display_name.localeCompare(b.display_name);
          return bv.localeCompare(av);
        });
        break;
    }
    return sorted;
  }, [customers, search, tagFilter, sortKey]);

  const exportCsv = () => {
    const headers = [
      "Name", "Email", "Phone", "Driver License", "License Expiry", "Address",
      "City", "State", "Postal", "Country", "Tags", "Total Rentals", "Last Rental",
      "Blocked", "Notes",
    ];
    const lines = [headers.map(csvEsc).join(",")];
    for (const c of filtered) {
      lines.push([
        csvEsc(c.display_name),
        csvEsc(c.email),
        csvEsc(c.phone),
        csvEsc(c.driver_license_number),
        csvEsc(c.driver_license_expiry),
        csvEsc(c.address),
        csvEsc(c.city),
        csvEsc(c.state),
        csvEsc(c.postal_code),
        csvEsc(c.country),
        csvEsc((c.tags ?? []).join("; ")),
        csvEsc(c.total_rentals),
        csvEsc(c.last_rental_at),
        csvEsc(c.is_blocked ? "yes" : "no"),
        csvEsc(c.notes),
      ].join(","));
    }
    // Prepend UTF-8 BOM so Excel auto-detects encoding for non-ASCII names.
    const content = "﻿" + lines.join("\r\n");
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `renters-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${filtered.length} renter${filtered.length === 1 ? "" : "s"}`);
  };

  const openCreate = () => { setEditing(null); setDraft(EMPTY); setDialogOpen(true); };
  const openEdit = (c: CarRentalCustomer) => {
    setEditing(c);
    setDraft({
      display_name: c.display_name, email: c.email, phone: c.phone,
      date_of_birth: c.date_of_birth, driver_license_number: c.driver_license_number,
      driver_license_state: c.driver_license_state, driver_license_country: c.driver_license_country,
      driver_license_expiry: c.driver_license_expiry,
      driver_license_photo_url: c.driver_license_photo_url,
      driver_license_photo_back_url: c.driver_license_photo_back_url,
      address: c.address, city: c.city, state: c.state, postal_code: c.postal_code, country: c.country,
      notes: c.notes, tags: c.tags ?? [], is_blocked: c.is_blocked,
    });
    setDialogOpen(true);
  };
  const save = async () => {
    if (!draft.display_name.trim()) return;
    if (editing) await update(editing.id, draft);
    else await create(draft);
    setDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-border/60">
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-5 w-5 text-primary" />
            Renters
            <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {customers.length}
            </span>
          </CardTitle>
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={filtered.length === 0} title="Export current view as CSV">
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Add renter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search by name, phone, email, or license…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
              <SelectTrigger className="h-9 w-44">
                <ArrowUpDown className="mr-1 h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent_rental">Most recent rental</SelectItem>
                <SelectItem value="most_rentals">Most rentals</SelectItem>
                <SelectItem value="alphabetical">Alphabetical</SelectItem>
                <SelectItem value="recently_added">Recently added</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {tagSet.length > 0 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mr-1">Tags:</span>
              {tagSet.map((t) => {
                const active = tagFilter.has(t);
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTagFilter((prev) => {
                      const next = new Set(prev);
                      if (next.has(t)) next.delete(t);
                      else next.add(t);
                      return next;
                    })}
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-[11px] font-semibold border transition-colors",
                      active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {t}
                  </button>
                );
              })}
              {tagFilter.size > 0 && (
                <button type="button" onClick={() => setTagFilter(new Set())} className="text-[11px] underline text-muted-foreground hover:text-foreground">
                  Clear
                </button>
              )}
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              <Users className="mx-auto mb-2 h-8 w-8 opacity-50" />
              {customers.length === 0 ? "No renters yet." : "No renters match that search."}
            </div>
          ) : (
            <ul className="divide-y divide-border rounded-xl border border-border">
              {filtered.map((c) => (
                <li key={c.id} className="group flex items-center gap-3 p-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                    {c.display_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="truncate text-sm font-semibold text-foreground">{c.display_name}</p>
                      {(() => {
                        const t = getLoyaltyTier(c.total_rentals);
                        if (t.tier === "none") return null;
                        return (
                          <span className={cn("inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider", t.className)}>
                            <span aria-hidden>{t.emoji}</span> {t.label}
                          </span>
                        );
                      })()}
                      {c.is_blocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-destructive">
                          <ShieldOff className="h-3 w-3" /> Blocked
                        </span>
                      )}
                    </div>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {[c.phone, c.email].filter(Boolean).join(" · ") || "No contact info"}
                    </p>
                  </div>
                  <div className="hidden sm:block text-right">
                    <p className="text-sm font-semibold text-foreground">{c.total_rentals}</p>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground">rental{c.total_rentals === 1 ? "" : "s"}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Details" onClick={() => setDetailCustomer(c)}>
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Edit" onClick={() => openEdit(c)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="Delete" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[85dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit renter" : "Add renter"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2 sm:grid-cols-2">
            <Field label="Display name *" className="sm:col-span-2">
              <Input value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} placeholder="Full name" />
            </Field>
            <Field label="Phone">
              <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={draft.date_of_birth ?? ""} onChange={(e) => setDraft({ ...draft, date_of_birth: e.target.value })} />
            </Field>
            <Field label="Driver license #">
              <Input value={draft.driver_license_number ?? ""} onChange={(e) => setDraft({ ...draft, driver_license_number: e.target.value })} />
            </Field>
            <Field label="License state">
              <Input value={draft.driver_license_state ?? ""} onChange={(e) => setDraft({ ...draft, driver_license_state: e.target.value })} />
            </Field>
            <Field label="License country">
              <Input value={draft.driver_license_country ?? ""} onChange={(e) => setDraft({ ...draft, driver_license_country: e.target.value })} />
            </Field>
            <Field label="License expiry">
              <Input type="date" value={draft.driver_license_expiry ?? ""} onChange={(e) => setDraft({ ...draft, driver_license_expiry: e.target.value })} />
            </Field>
            <Field label="License photo (front)" className="sm:col-span-2">
              <Input value={draft.driver_license_photo_url ?? ""} onChange={(e) => setDraft({ ...draft, driver_license_photo_url: e.target.value || null })} placeholder="https://example.com/front.jpg" />
              {draft.driver_license_photo_url && (
                <img src={draft.driver_license_photo_url} alt="" className="mt-1 h-28 w-full rounded border border-border object-contain bg-muted/20" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
              )}
            </Field>
            <Field label="License photo (back)" className="sm:col-span-2">
              <Input value={draft.driver_license_photo_back_url ?? ""} onChange={(e) => setDraft({ ...draft, driver_license_photo_back_url: e.target.value || null })} placeholder="https://example.com/back.jpg" />
              {draft.driver_license_photo_back_url && (
                <img src={draft.driver_license_photo_back_url} alt="" className="mt-1 h-28 w-full rounded border border-border object-contain bg-muted/20" onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }} />
              )}
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </Field>
            <Field label="City">
              <Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </Field>
            <Field label="State / Postal" className="sm:col-span-1">
              <Input value={draft.state ?? ""} onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
            </Field>
            <Field label="Tags" className="sm:col-span-2">
              <div className="flex flex-wrap gap-1.5">
                {TAG_PRESETS.map((t) => {
                  const active = (draft.tags ?? []).includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const cur = draft.tags ?? [];
                        setDraft({ ...draft, tags: active ? cur.filter((x) => x !== t) : [...cur, t] });
                      }}
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[11px] font-semibold border transition-colors",
                        active ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground">Tags appear as badges on reservation rows.</p>
            </Field>
            <Field label="Notes" className="sm:col-span-2">
              <Textarea value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows={2} placeholder="Anything to remember for next time…" />
            </Field>
            <div className="flex items-center justify-between rounded-md border border-border p-2.5 sm:col-span-2">
              <Label className="text-sm">Blocked (cannot make new reservations)</Label>
              <Switch checked={draft.is_blocked ?? false} onCheckedChange={(c) => setDraft({ ...draft, is_blocked: c })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !draft.display_name.trim()}>
              {saving ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-1 h-4 w-4" />}
              {editing ? "Save" : "Add renter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CarRentalCustomerDetailDialog
        customer={detailCustomer}
        onClose={() => setDetailCustomer(null)}
      />

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete renter?</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Their past reservations keep the customer name snapshot.</p>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={async () => {
              if (deleteId) { await remove(deleteId); setDeleteId(null); }
            }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-semibold text-foreground/80">{label}</Label>
      {children}
    </div>
  );
}
