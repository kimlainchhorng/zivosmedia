import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Tag, Plus, Trash2, ToggleLeft, ToggleRight, Loader2, Copy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { format } from "date-fns";

interface Promo {
  id: string;
  code: string;
  name: string;
  discountType: string;
  discountValue: number;
  isActive: boolean;
  usageCount: number;
  usageLimit: number | null;
  endsAt: string | null;
}

export default function ShopPromotionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [endsAt, setEndsAt] = useState("");

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: store } = await supabase.from("store_profiles").select("id").eq("owner_id", user.id).maybeSingle();
    const sid = store?.id ?? null;
    setStoreId(sid);
    if (!sid) { setLoading(false); return; }

    const { data } = await supabase
      .from("promotions")
      .select("id, code, name, discount_type, discount_value, is_active, usage_count, usage_limit, ends_at")
      .eq("merchant_id", sid)
      .order("created_at", { ascending: false });

    if (data) {
      setPromos(data.map(p => ({
        id: p.id,
        code: p.code,
        name: p.name,
        discountType: p.discount_type ?? "percent",
        discountValue: p.discount_value,
        isActive: p.is_active ?? true,
        usageCount: p.usage_count ?? 0,
        usageLimit: p.usage_limit,
        endsAt: p.ends_at,
      })));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!code.trim() || !name.trim() || !discountValue) return;
    if (!user) return;
    setSaving(true);

    const sid = storeId;
    if (!sid) { toast.error("No store found"); setSaving(false); return; }

    const { data, error } = await supabase
      .from("promotions")
      .insert({
        merchant_id: sid,
        code: code.trim().toUpperCase(),
        name: name.trim(),
        discount_type: discountType,
        discount_value: parseFloat(discountValue),
        usage_limit: usageLimit ? parseInt(usageLimit) : null,
        ends_at: endsAt || null,
        is_active: true,
        created_by: user.id,
      })
      .select("id, code, name, discount_type, discount_value, is_active, usage_count, usage_limit, ends_at")
      .single();

    if (error) { toast.error("Failed to create promotion"); }
    else if (data) {
      setPromos(prev => [{
        id: data.id, code: data.code, name: data.name,
        discountType: data.discount_type ?? "percent", discountValue: data.discount_value,
        isActive: data.is_active ?? true, usageCount: 0,
        usageLimit: data.usage_limit, endsAt: data.ends_at,
      }, ...prev]);
      toast.success("Promotion created");
      setCode(""); setName(""); setDiscountValue(""); setUsageLimit(""); setEndsAt("");
      setShowCreate(false);
    }
    setSaving(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("promotions").update({ is_active: !current }).eq("id", id);
    setPromos(prev => prev.map(p => p.id === id ? { ...p, isActive: !current } : p));
  };

  const deletePromo = async (id: string) => {
    await supabase.from("promotions").delete().eq("id", id);
    setPromos(prev => prev.filter(p => p.id !== id));
    toast.success("Promotion deleted");
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <Tag className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Promotions</h1>
          </div>
          <Button size="sm" className="gap-1" onClick={() => setShowCreate(v => !v)}>
            <Plus className="h-4 w-4" /> Create
          </Button>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-border">
            <div className="p-4 space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Code (e.g. SAVE20)" value={code} onChange={e => setCode(e.target.value)} />
                <Input placeholder="Display name" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="flex gap-2">
                <Select value={discountType} onValueChange={setDiscountType}>
                  <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percent">Percent %</SelectItem>
                    <SelectItem value="fixed">Fixed $</SelectItem>
                  </SelectContent>
                </Select>
                <Input placeholder="Value (e.g. 20)" type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} className="flex-1" />
              </div>
              <div className="flex gap-2">
                <Input placeholder="Usage limit (optional)" type="number" value={usageLimit} onChange={e => setUsageLimit(e.target.value)} className="flex-1" />
                <Input type="date" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="flex-1" />
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleCreate} disabled={saving}>
                  {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="p-4 space-y-3">
        {loading && <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}

        {!loading && promos.length === 0 && (
          <div className="text-center py-16">
            <Tag className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No promotions yet</p>
            <Button size="sm" className="mt-3" onClick={() => setShowCreate(true)}>Create your first promo</Button>
          </div>
        )}

        {promos.map((promo, i) => (
          <motion.div key={promo.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
            <Card className="p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <button type="button"
                    onClick={() => copyCode(promo.code)}
                    className="font-mono text-sm font-bold text-primary bg-primary/10 px-2 py-0.5 rounded flex items-center gap-1 hover:bg-primary/20 transition-colors"
                  >
                    {promo.code} <Copy className="h-3 w-3" />
                  </button>
                  <Badge variant={promo.isActive ? "default" : "secondary"} className="text-xs">
                    {promo.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button aria-label="Toggle active" variant="ghost" size="icon" className="h-7 w-7" onClick={() => toggleActive(promo.id, promo.isActive)}>
                    {promo.isActive ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button aria-label="Delete" variant="ghost" size="icon" className="h-7 w-7" onClick={() => deletePromo(promo.id)}>
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                </div>
              </div>
              <p className="text-sm font-medium text-foreground">{promo.name}</p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <Badge variant="outline" className="text-xs">
                  {promo.discountType === "percent" ? `${promo.discountValue}% off` : `$${promo.discountValue} off`}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {promo.usageCount} used{promo.usageLimit ? ` / ${promo.usageLimit}` : ""}
                </Badge>
                {promo.endsAt && (
                  <Badge variant="outline" className="text-xs">
                    Ends {format(new Date(promo.endsAt), "MMM d")}
                  </Badge>
                )}
              </div>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
