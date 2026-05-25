/**
 * Dealership customer book.
 */
import { memo, useMemo, useState } from "react";
import { Plus, Search, Pencil, Trash2, Users, Phone, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { useDealershipCustomers, type DealershipCustomer, type DealershipCustomerDraft } from "@/hooks/car-dealership/useDealershipCustomers";

const formatPrice = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);

const emptyDraft = (): DealershipCustomerDraft => ({
  user_id: null,
  display_name: "",
  email: null,
  phone: null,
  date_of_birth: null,
  driver_license_number: null,
  driver_license_state: null,
  driver_license_country: null,
  driver_license_expiry: null,
  address: null,
  city: null,
  state: null,
  postal_code: null,
  country: null,
  employer: null,
  occupation: null,
  income_band: null,
  preferred_contact: null,
  notes: null,
  tags: [],
});

interface Props { storeId: string; }

function CarDealershipCustomersSectionInner({ storeId }: Props) {
  const { customers, loading, saving, create, update, remove } = useDealershipCustomers(storeId);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DealershipCustomer | null>(null);
  const [draft, setDraft] = useState<DealershipCustomerDraft>(emptyDraft());

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    if (!term) return customers;
    return customers.filter((c) =>
      `${c.display_name} ${c.email ?? ""} ${c.phone ?? ""}`.toLowerCase().includes(term),
    );
  }, [customers, search]);

  const openAdd = () => { setEditing(null); setDraft(emptyDraft()); setDialogOpen(true); };
  const openEdit = (c: DealershipCustomer) => {
    setEditing(c);
    const { id, store_id, created_at, updated_at, total_purchases, lifetime_value_cents, last_purchase_at, ...rest } = c;
    setDraft(rest);
    setDialogOpen(true);
  };

  const submit = async () => {
    if (!draft.display_name.trim()) return;
    if (editing) {
      const ok = await update(editing.id, draft);
      if (ok) { toast.success("Customer updated."); setDialogOpen(false); }
      else toast.error("Couldn't save.");
    } else {
      const created = await create(draft);
      if (created) { toast.success("Customer added."); setDialogOpen(false); }
      else toast.error("Couldn't add customer.");
    }
  };

  const handleDelete = async (c: DealershipCustomer) => {
    if (!window.confirm(`Delete customer "${c.display_name}"?`)) return;
    const ok = await remove(c.id);
    if (ok) toast.success("Customer removed.");
    else toast.error("Couldn't delete.");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Customers</h2>
          <p className="text-sm text-muted-foreground">{customers.length} customers in your book</p>
        </div>
        <Button onClick={openAdd}><Plus className="h-4 w-4 mr-1" />Add customer</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input className="pl-9" placeholder="Search name, phone, email..." value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/60" />
          <p className="mt-3 font-medium">{customers.length === 0 ? "No customers yet" : "No matches"}</p>
        </Card>
      ) : (
        <Card>
          <div className="divide-y">
            {filtered.map((c) => (
              <div key={c.id} className="flex items-center gap-3 p-3">
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-primary font-bold">
                  {c.display_name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{c.display_name}</p>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                    {c.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {c.email && <span className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{c.email}</span>}
                  </div>
                </div>
                <div className="text-right text-xs shrink-0">
                  <p className="font-bold">{c.total_purchases} {c.total_purchases === 1 ? "purchase" : "purchases"}</p>
                  <p className="text-muted-foreground">{formatPrice(c.lifetime_value_cents)} LTV</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(c)}><Pencil className="h-3.5 w-3.5" /></Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(c)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit customer" : "Add customer"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Name *</Label>
              <Input value={draft.display_name} onChange={(e) => setDraft({ ...draft, display_name: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={draft.phone ?? ""} onChange={(e) => setDraft({ ...draft, phone: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={draft.email ?? ""} onChange={(e) => setDraft({ ...draft, email: e.target.value || null })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Driver's license #</Label>
                <Input value={draft.driver_license_number ?? ""} onChange={(e) => setDraft({ ...draft, driver_license_number: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>License state</Label>
                <Input value={draft.driver_license_state ?? ""} onChange={(e) => setDraft({ ...draft, driver_license_state: e.target.value || null })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Address</Label>
              <Input value={draft.address ?? ""} onChange={(e) => setDraft({ ...draft, address: e.target.value || null })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={draft.city ?? ""} onChange={(e) => setDraft({ ...draft, city: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>State</Label>
                <Input value={draft.state ?? ""} onChange={(e) => setDraft({ ...draft, state: e.target.value || null })} />
              </div>
              <div className="space-y-1.5">
                <Label>Zip</Label>
                <Input value={draft.postal_code ?? ""} onChange={(e) => setDraft({ ...draft, postal_code: e.target.value || null })} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={draft.notes ?? ""} onChange={(e) => setDraft({ ...draft, notes: e.target.value || null })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={submit} disabled={saving || !draft.display_name.trim()}>
              {saving ? "Saving..." : editing ? "Save" : "Add"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const CarDealershipCustomersSection = memo(CarDealershipCustomersSectionInner);
export default CarDealershipCustomersSection;
