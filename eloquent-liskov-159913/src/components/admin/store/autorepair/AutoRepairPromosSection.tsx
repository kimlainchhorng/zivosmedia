import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import Tag from "lucide-react/dist/esm/icons/tag";
import Plus from "lucide-react/dist/esm/icons/plus";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import ToggleLeft from "lucide-react/dist/esm/icons/toggle-left";
import ToggleRight from "lucide-react/dist/esm/icons/toggle-right";
import { toast } from "sonner";

interface Props { storeId: string }

const blankForm = {
  title: "",
  promo_code: "",
  discount_value: "",
  start_date: "",
  end_date: "",
};

export default function AutoRepairPromosSection({ storeId }: Props) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(blankForm);

  const { data: promos = [], isLoading } = useQuery({
    queryKey: ["ar-promos", storeId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("store_promotions")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Title is required");
      const { error } = await (supabase as any)
        .from("store_promotions")
        .insert({
          store_id: storeId,
          title: form.title.trim(),
          promo_code: form.promo_code.trim() || null,
          discount_type: "percent",
          discount_value: form.discount_value ? parseFloat(form.discount_value) : null,
          start_date: form.start_date || null,
          end_date: form.end_date || null,
          is_active: true,
        });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promotion created");
      qc.invalidateQueries({ queryKey: ["ar-promos", storeId] });
      setOpen(false);
      setForm(blankForm);
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to create promotion"),
  });

  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await (supabase as any)
        .from("store_promotions")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["ar-promos", storeId] }),
    onError: (e: any) => toast.error(e.message ?? "Failed to update"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("store_promotions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Promotion deleted");
      qc.invalidateQueries({ queryKey: ["ar-promos", storeId] });
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to delete"),
  });

  const isExpired = (promo: any) => {
    if (!promo.end_date) return false;
    return new Date(promo.end_date) < new Date();
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Tag className="w-4 h-4" /> Promotions & Deals
          </CardTitle>
        </CardHeader>
      </Card>

      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> New Promotion
        </Button>
      </div>

      {isLoading ? (
        <Card><CardContent className="py-10 text-center text-sm text-muted-foreground">Loading promotions…</CardContent></Card>
      ) : promos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <Tag className="w-8 h-8 mx-auto text-muted-foreground/40" />
            <p className="text-sm font-medium">No promotions yet</p>
            <p className="text-xs text-muted-foreground">Create your first promotion to attract more customers.</p>
            <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Create your first promotion
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          <AnimatePresence initial={false}>
            {promos.map((p: any) => {
              const expired = isExpired(p);
              const active = p.is_active && !expired;
              return (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                >
                  <Card className={!active ? "opacity-60" : ""}>
                    <CardContent className="p-4 flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="font-semibold">{p.title}</p>
                          <Badge
                            variant={active ? "default" : "outline"}
                            className="text-[10px]"
                          >
                            {expired ? "Expired" : p.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mb-1">{p.description}</p>
                        )}
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          {p.promo_code && (
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                              {p.promo_code}
                            </span>
                          )}
                          {p.discount_value != null && (
                            <span>
                              {p.discount_type === "percent"
                                ? `${p.discount_value}% off`
                                : `$${p.discount_value} off`}
                            </span>
                          )}
                          {p.min_spend != null && <span>Min spend: ${p.min_spend}</span>}
                          {p.start_date && (
                            <span>{new Date(p.start_date).toLocaleDateString()} –</span>
                          )}
                          {p.end_date && (
                            <span>{new Date(p.end_date).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          title={p.is_active ? "Deactivate" : "Activate"}
                          onClick={() => toggle.mutate({ id: p.id, is_active: !p.is_active })}
                        >
                          {p.is_active ? (
                            <ToggleRight className="w-4 h-4 text-primary" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-muted-foreground" />
                          )}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive"
                          onClick={() => {
                            if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>New Promotion</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input
                placeholder="e.g. Summer Oil Change Special"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Promo code</Label>
                <Input
                  placeholder="e.g. SUMMER25"
                  className="uppercase"
                  value={form.promo_code}
                  onChange={(e) => setForm({ ...form, promo_code: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Discount %</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  placeholder="e.g. 20"
                  value={form.discount_value}
                  onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Start date</Label>
                <Input
                  type="date"
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">End date</Label>
                <Input
                  type="date"
                  value={form.end_date}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              disabled={!form.title.trim() || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
