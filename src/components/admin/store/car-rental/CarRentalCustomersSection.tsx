/**
 * CarRentalCustomersSection — manage renter book.
 */
import { useMemo, useState } from "react";
import {
  Users, Plus, Pencil, Trash2, Loader2, CheckCircle2, AlertTriangle, Search, ShieldOff, Eye,
} from "lucide-react";
import CarRentalCustomerDetailDialog from "./CarRentalCustomerDetailDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { useCarRentalCustomers, type CarRentalCustomer, type CarRentalCustomerDraft } from "@/hooks/car-rental/useCarRentalCustomers";
import { cn } from "@/lib/utils";

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
  address: "",
  city: "",
  state: "",
  postal_code: "",
  country: "",
  notes: "",
  is_blocked: false,
};

export default function CarRentalCustomersSection({ storeId }: Props) {
  const { customers, loading, saving, error, create, update, remove } = useCarRentalCustomers(storeId);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CarRentalCustomer | null>(null);
  const [draft, setDraft] = useState<CarRentalCustomerDraft>(EMPTY);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<CarRentalCustomer | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return customers;
    return customers.filter((c) =>
      c.display_name.toLowerCase().includes(q)
      || (c.email?.toLowerCase() ?? "").includes(q)
      || (c.phone ?? "").includes(q)
      || (c.driver_license_number ?? "").toLowerCase().includes(q)
    );
  }, [customers, search]);

  const openCreate = () => { setEditing(null); setDraft(EMPTY); setDialogOpen(true); };
  const openEdit = (c: CarRentalCustomer) => {
    setEditing(c);
    setDraft({
      display_name: c.display_name, email: c.email, phone: c.phone,
      date_of_birth: c.date_of_birth, driver_license_number: c.driver_license_number,
      driver_license_state: c.driver_license_state, driver_license_country: c.driver_license_country,
      driver_license_expiry: c.driver_license_expiry,
      address: c.address, city: c.city, state: c.state, postal_code: c.postal_code, country: c.country,
      notes: c.notes, is_blocked: c.is_blocked,
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
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add renter
          </Button>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4" /> {error}
            </div>
          )}
          <div className="mb-3 relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search by name, phone, email, or license…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
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
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{c.display_name}</p>
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
            <Field label="Address" className="sm:col-span-2">
              <Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value })} />
            </Field>
            <Field label="City">
              <Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value })} />
            </Field>
            <Field label="State / Postal" className="sm:col-span-1">
              <Input value={draft.state ?? ""} onChange={(e) => setDraft({ ...draft, state: e.target.value })} />
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
