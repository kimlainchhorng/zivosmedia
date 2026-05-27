/**
 * Auto Repair — Customer Vehicles (garage / CRM)
 * Wired to ar_customer_vehicles. VIN auto-fill via vin-decode edge function.
 */
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import Car from "lucide-react/dist/esm/icons/car";
import Plus from "lucide-react/dist/esm/icons/plus";
import Search from "lucide-react/dist/esm/icons/search";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Phone from "lucide-react/dist/esm/icons/phone";
import Mail from "lucide-react/dist/esm/icons/mail";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import FileSignature from "lucide-react/dist/esm/icons/file-signature";
import Scan from "lucide-react/dist/esm/icons/scan";
import ClipboardList from "lucide-react/dist/esm/icons/clipboard-list";
import { toast } from "sonner";

interface Props { storeId: string; onNewEstimate?: (vehicle: Vehicle) => void; onViewWorkOrders?: (vehicle: Vehicle) => void }

type Vehicle = {
  id: string;
  store_id: string;
  owner_name: string;
  owner_phone?: string | null;
  owner_email?: string | null;
  year?: number | null;
  make: string;
  model: string;
  vin?: string | null;
  plate?: string | null;
  color?: string | null;
  mileage?: number | null;
  notes?: string | null;
  created_at: string;
};

const blankForm = {
  owner_name: "", owner_phone: "", owner_email: "",
  year: "", make: "", model: "", vin: "", plate: "", color: "",
  mileage: "", notes: "",
};

const COLOR_DOT: Record<string, string> = {
  white: "bg-gray-100 border-gray-300", black: "bg-gray-900", silver: "bg-gray-400",
  gray: "bg-gray-500", red: "bg-red-500", blue: "bg-blue-500", green: "bg-green-600",
  yellow: "bg-yellow-400", orange: "bg-orange-500", brown: "bg-amber-800",
};

export default function AutoRepairVehiclesSection({ storeId, onNewEstimate, onViewWorkOrders }: Props) {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(blankForm);
  const [vinDecoding, setVinDecoding] = useState(false);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["ar-customer-vehicles", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ar_customer_vehicles")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Vehicle[];
    },
  });

  const filtered = useMemo(() => {
    if (!q) return vehicles;
    const s = q.toLowerCase();
    return vehicles.filter(v =>
      `${v.year ?? ""} ${v.make} ${v.model} ${v.plate ?? ""} ${v.vin ?? ""} ${v.owner_name}`.toLowerCase().includes(s)
    );
  }, [vehicles, q]);

  const decodeVin = async () => {
    const v = form.vin.trim().toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, "");
    if (v.length !== 17) { toast.error("VIN must be exactly 17 characters"); return; }
    setVinDecoding(true);
    try {
      const { data, error } = await supabase.functions.invoke("vin-decode", { body: { vin: v } });
      if (error || !data?.ok) throw new Error(data?.error || "VIN decode failed");
      setForm(f => ({
        ...f,
        vin: v,
        make: data.make || f.make,
        model: data.model || f.model,
        year: data.year ? String(data.year) : f.year,
      }));
      toast.success("VIN decoded — make, model, year filled in");
    } catch (e: any) {
      toast.error(`VIN decode failed: ${e.message}`);
    } finally {
      setVinDecoding(false);
    }
  };

  const upsert = useMutation({
    mutationFn: async () => {
      if (!form.owner_name.trim() || !form.make.trim() || !form.model.trim()) {
        throw new Error("Owner name, make, and model are required");
      }
      const payload = {
        store_id: storeId,
        owner_name: form.owner_name.trim(),
        owner_phone: form.owner_phone.trim() || null,
        owner_email: form.owner_email.trim() || null,
        year: form.year ? parseInt(form.year, 10) : null,
        make: form.make.trim(),
        model: form.model.trim(),
        vin: form.vin.trim() || null,
        plate: form.plate.trim() || null,
        color: form.color.trim().toLowerCase() || null,
        mileage: form.mileage ? parseInt(form.mileage, 10) : 0,
        notes: form.notes.trim() || null,
      };
      if (editId) {
        const { error } = await supabase.from("ar_customer_vehicles").update(payload).eq("id", editId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("ar_customer_vehicles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editId ? "Vehicle updated" : "Vehicle added");
      qc.invalidateQueries({ queryKey: ["ar-customer-vehicles", storeId] });
      setOpen(false); setEditId(null); setForm(blankForm);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to save"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ar_customer_vehicles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle removed");
      qc.invalidateQueries({ queryKey: ["ar-customer-vehicles", storeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed"),
  });

  const startEdit = (v: Vehicle) => {
    setEditId(v.id);
    setForm({
      owner_name: v.owner_name,
      owner_phone: v.owner_phone ?? "",
      owner_email: v.owner_email ?? "",
      year: v.year ? String(v.year) : "",
      make: v.make,
      model: v.model,
      vin: v.vin ?? "",
      plate: v.plate ?? "",
      color: v.color ?? "",
      mileage: v.mileage ? String(v.mileage) : "",
      notes: v.notes ?? "",
    });
    setOpen(true);
  };

  const startNew = () => { setEditId(null); setForm(blankForm); setOpen(true); };

  const colorDotClass = (color?: string | null) => {
    if (!color) return null;
    return COLOR_DOT[color.toLowerCase()] ?? "bg-muted";
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4" /> Customer Vehicles
            <Badge variant="secondary" className="ml-1">{vehicles.length}</Badge>
          </CardTitle>
          <Button size="sm" className="gap-1.5" onClick={startNew}>
            <Plus className="w-3.5 h-3.5" /> Add Vehicle
          </Button>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input placeholder="Search by owner, plate, VIN, make, or model" className="pl-9" value={q} onChange={e => setQ(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0,1,2,3].map(i => <div key={i} className="h-32 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center space-y-3">
          <Car className="w-10 h-10 mx-auto text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">{vehicles.length === 0 ? "No customer vehicles yet." : "No vehicles match your search."}</p>
          {vehicles.length === 0 && <Button size="sm" onClick={startNew} className="gap-1.5"><Plus className="w-3.5 h-3.5" /> Add the first vehicle</Button>}
        </CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(v => {
            const dotClass = colorDotClass(v.color);
            return (
              <Card key={v.id}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {dotClass && (
                          <span className={`inline-block w-3 h-3 rounded-full border shrink-0 ${dotClass}`} title={v.color ?? ""} />
                        )}
                        <p className="font-semibold truncate">{[v.year, v.make, v.model].filter(Boolean).join(" ")}</p>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">{v.owner_name}{v.plate ? ` · ${v.plate}` : ""}</p>
                    </div>
                    {!!v.mileage && <Badge variant="secondary" className="text-[10px] font-mono shrink-0">{v.mileage.toLocaleString()} mi</Badge>}
                  </div>
                  {v.vin && <p className="text-[11px] text-muted-foreground font-mono truncate">VIN: {v.vin}</p>}
                  {v.owner_phone && (
                    <a href={`tel:${v.owner_phone}`} className="flex items-center gap-1.5 text-xs text-emerald-600 hover:underline">
                      <Phone className="w-3 h-3" /> {v.owner_phone}
                    </a>
                  )}
                  {v.owner_email && (
                    <a href={`mailto:${v.owner_email}`} className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                      <Mail className="w-3 h-3" /> {v.owner_email}
                    </a>
                  )}
                  {v.notes && <p className="text-[11px] text-muted-foreground line-clamp-2">{v.notes}</p>}
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-8 gap-1.5" onClick={() => startEdit(v)}>
                      <Pencil className="w-3 h-3" /> Edit
                    </Button>
                    {onNewEstimate && (
                      <Button size="sm" variant="secondary" className="flex-1 h-8 gap-1.5" onClick={() => onNewEstimate(v)}>
                        <FileSignature className="w-3 h-3" /> Estimate
                      </Button>
                    )}
                    {onViewWorkOrders && (
                      <Button size="sm" variant="outline" className="flex-1 h-8 gap-1.5" onClick={() => onViewWorkOrders(v)}>
                        <ClipboardList className="w-3 h-3" /> Work Orders
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" className="h-8 text-destructive" onClick={() => {
                      if (confirm(`Delete ${v.year ?? ""} ${v.make} ${v.model}?`)) remove.mutate(v.id);
                    }}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editId ? "Edit Vehicle" : "Add Customer Vehicle"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            {/* VIN with decode button */}
            <div className="space-y-1">
              <Label className="text-xs">VIN (17 chars)</Label>
              <div className="flex gap-2">
                <Input className="font-mono flex-1" placeholder="e.g. 1HGBH41JXMN109186" maxLength={17}
                  value={form.vin} onChange={e => setForm({ ...form, vin: e.target.value.toUpperCase() })} />
                <Button type="button" variant="outline" size="sm" className="gap-1.5 shrink-0"
                  onClick={decodeVin} disabled={vinDecoding || form.vin.replace(/[^A-HJ-NPR-Z0-9]/gi, "").length !== 17}>
                  {vinDecoding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Scan className="w-3.5 h-3.5" />}
                  Decode
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Owner name *</Label>
                <Input placeholder="Full name" value={form.owner_name} onChange={e => setForm({ ...form, owner_name: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone</Label>
                <Input placeholder="Phone" value={form.owner_phone} onChange={e => setForm({ ...form, owner_phone: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Email</Label>
                <Input type="email" placeholder="Email" value={form.owner_email} onChange={e => setForm({ ...form, owner_email: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Year</Label>
                <Input placeholder="2020" inputMode="numeric" value={form.year}
                  onChange={e => setForm({ ...form, year: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <Input placeholder="e.g. white, black, blue" value={form.color}
                  onChange={e => setForm({ ...form, color: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Make *</Label>
                <Input placeholder="Toyota" value={form.make} onChange={e => setForm({ ...form, make: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model *</Label>
                <Input placeholder="Camry" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">License plate</Label>
                <Input placeholder="ABC-1234" value={form.plate} onChange={e => setForm({ ...form, plate: e.target.value.toUpperCase() })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mileage</Label>
                <Input placeholder="52000" inputMode="numeric" value={form.mileage}
                  onChange={e => setForm({ ...form, mileage: e.target.value.replace(/\D/g, "") })} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label className="text-xs">Notes (optional)</Label>
                <Textarea placeholder="e.g. Needs regular oil checks, brake issue on rear left" rows={2}
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => upsert.mutate()} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving..." : editId ? "Save changes" : "Add vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
