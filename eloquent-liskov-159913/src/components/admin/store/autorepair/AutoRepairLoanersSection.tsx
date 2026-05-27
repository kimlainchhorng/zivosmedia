import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import Car from "lucide-react/dist/esm/icons/car";
import Plus from "lucide-react/dist/esm/icons/plus";
import LogIn from "lucide-react/dist/esm/icons/log-in";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import { toast } from "sonner";

interface Props { storeId: string }

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  available:   { label: "Available",   className: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  out:         { label: "Out",         className: "bg-amber-100 text-amber-800 border-amber-200" },
  maintenance: { label: "Maintenance", className: "bg-red-100 text-red-800 border-red-200" },
};

const blankVehicle = { make: "", model: "", year: "", plate: "", color: "" };
const blankCheckout = { customer_name: "", due_back_date: "", mileage_out: "" };

export default function AutoRepairLoanersSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutTarget, setCheckoutTarget] = useState<any>(null);
  const [vehicleForm, setVehicleForm] = useState(blankVehicle);
  const [checkoutForm, setCheckoutForm] = useState(blankCheckout);

  const { data: vehicles = [], isLoading } = useQuery({
    queryKey: ["ar-loaners", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("ar_loaner_vehicles")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const total = vehicles.length;
  const available = vehicles.filter((v: any) => v.status === "available").length;
  const out = vehicles.filter((v: any) => v.status === "out").length;

  const addVehicle = useMutation({
    mutationFn: async () => {
      if (!vehicleForm.make.trim() || !vehicleForm.model.trim()) throw new Error("Make and model are required");
      const { error } = await (supabase as any)
        .from("ar_loaner_vehicles")
        .insert({
          store_id: storeId,
          make: vehicleForm.make.trim(),
          model: vehicleForm.model.trim(),
          year: vehicleForm.year ? parseInt(vehicleForm.year, 10) : null,
          plate: vehicleForm.plate.trim() || null,
          color: vehicleForm.color.trim() || null,
          status: "available",
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Loaner vehicle added");
      qc.invalidateQueries({ queryKey: ["ar-loaners", storeId] });
      setAddOpen(false);
      setVehicleForm(blankVehicle);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to add vehicle"),
  });

  const checkout = useMutation({
    mutationFn: async () => {
      if (!checkoutTarget) return;
      const { error } = await (supabase as any)
        .from("ar_loaner_vehicles")
        .update({
          status: "out",
          current_customer_name: checkoutForm.customer_name.trim() || null,
          due_back_date: checkoutForm.due_back_date || null,
          mileage_out: checkoutForm.mileage_out ? parseInt(checkoutForm.mileage_out, 10) : null,
        })
        .eq("id", checkoutTarget.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle checked out");
      qc.invalidateQueries({ queryKey: ["ar-loaners", storeId] });
      setCheckoutOpen(false);
      setCheckoutTarget(null);
      setCheckoutForm(blankCheckout);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to check out"),
  });

  const checkin = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("ar_loaner_vehicles")
        .update({ status: "available", current_customer_name: null, due_back_date: null, mileage_out: null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle checked in");
      qc.invalidateQueries({ queryKey: ["ar-loaners", storeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to check in"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("ar_loaner_vehicles")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Vehicle removed");
      qc.invalidateQueries({ queryKey: ["ar-loaners", storeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to remove vehicle"),
  });

  const openCheckout = (v: any) => {
    setCheckoutTarget(v);
    setCheckoutForm(blankCheckout);
    setCheckoutOpen(true);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Car className="w-4 h-4" /> Loaner Fleet
          </CardTitle>
        </CardHeader>
        {total > 0 && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total", value: total, color: "text-foreground" },
                { label: "Available", value: available, color: "text-emerald-600" },
                { label: "Out", value: out, color: "text-amber-600" },
              ].map(({ label, value, color }) => (
                <div key={label} className="text-center p-3 rounded-lg bg-muted/50">
                  <p className={`text-2xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-muted-foreground">{label}</p>
                </div>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Loaner Vehicle
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading fleet…</CardContent></Card>
      ) : vehicles.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Car className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">No loaner vehicles</p>
            <p className="text-xs text-muted-foreground">Add vehicles to your loaner fleet to track availability.</p>
            <Button size="sm" className="gap-1.5" onClick={() => setAddOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Loaner Vehicle
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {vehicles.map((v: any) => {
            const statusMeta = STATUS_STYLE[v.status ?? "available"] ?? STATUS_STYLE.available;
            return (
              <motion.div
                key={v.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <p className="font-semibold">
                          {v.year ? `${v.year} ` : ""}{v.make} {v.model}
                        </p>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </Badge>
                      </div>
                      <div className="flex gap-3 text-xs text-muted-foreground flex-wrap">
                        {v.color && <span>{v.color}</span>}
                        {v.plate && (
                          <span className="font-mono bg-muted px-1 rounded">{v.plate}</span>
                        )}
                        {v.current_customer_name && (
                          <span>With: {v.current_customer_name}</span>
                        )}
                        {v.due_back_date && (
                          <span>Due: {new Date(v.due_back_date).toLocaleDateString()}</span>
                        )}
                        {v.mileage_out != null && (
                          <span>Out at: {v.mileage_out.toLocaleString()} mi</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {v.status === "available" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => openCheckout(v)}
                        >
                          <LogOut className="w-3 h-3" /> Check Out
                        </Button>
                      ) : v.status === "out" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => checkin.mutate(v.id)}
                          disabled={checkin.isPending}
                        >
                          <LogIn className="w-3 h-3" /> Check In
                        </Button>
                      ) : null}
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-destructive"
                        onClick={() => { if (confirm(`Remove ${v.year ?? ""} ${v.make} ${v.model}?`)) remove.mutate(v.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add Loaner Vehicle</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Make *</Label>
                <Input
                  placeholder="e.g. Toyota"
                  value={vehicleForm.make}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, make: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Model *</Label>
                <Input
                  placeholder="e.g. Camry"
                  value={vehicleForm.model}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, model: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Year</Label>
                <Input
                  type="number"
                  placeholder="2020"
                  min="1980"
                  max="2030"
                  value={vehicleForm.year}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, year: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Plate</Label>
                <Input
                  placeholder="ABC-1234"
                  className="uppercase"
                  value={vehicleForm.plate}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, plate: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Color</Label>
                <Input
                  placeholder="Silver"
                  value={vehicleForm.color}
                  onChange={(e) => setVehicleForm({ ...vehicleForm, color: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button
              disabled={!vehicleForm.make.trim() || !vehicleForm.model.trim() || addVehicle.isPending}
              onClick={() => addVehicle.mutate()}
            >
              {addVehicle.isPending ? "Adding…" : "Add Vehicle"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={checkoutOpen} onOpenChange={setCheckoutOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              Check Out — {checkoutTarget?.year ?? ""} {checkoutTarget?.make} {checkoutTarget?.model}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Customer name</Label>
              <Input
                placeholder="Full name"
                value={checkoutForm.customer_name}
                onChange={(e) => setCheckoutForm({ ...checkoutForm, customer_name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Due back date</Label>
                <Input
                  type="date"
                  value={checkoutForm.due_back_date}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, due_back_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Mileage out</Label>
                <Input
                  type="number"
                  placeholder="e.g. 42000"
                  value={checkoutForm.mileage_out}
                  onChange={(e) => setCheckoutForm({ ...checkoutForm, mileage_out: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCheckoutOpen(false)}>Cancel</Button>
            <Button
              disabled={checkout.isPending}
              onClick={() => checkout.mutate()}
            >
              {checkout.isPending ? "Checking out…" : "Check Out"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
