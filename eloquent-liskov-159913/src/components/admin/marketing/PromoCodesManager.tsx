/**
 * PromoCodesManager — List + create + bulk generate. Click row → redemptions drawer.
 */
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tag, Plus, Trash2, Copy, Wand2 } from "lucide-react";
import { useMarketingPromoCodes, useDeletePromoCode, type PromoCode } from "@/hooks/useMarketingPromoCodes";
import PromoCodeBuilder from "./PromoCodeBuilder";
import PromoRedemptionsDrawer from "./PromoRedemptionsDrawer";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

export default function PromoCodesManager({ storeId }: { storeId: string }) {
  const { data: codes = [], isLoading } = useMarketingPromoCodes(storeId);
  const del = useDeletePromoCode(storeId);
  const [creating, setCreating] = useState(false);
  const [bulk, setBulk] = useState(false);
  const [search, setSearch] = useState("");
  const [drawerPromo, setDrawerPromo] = useState<PromoCode | null>(null);

  const filtered = codes.filter((c) => c.code.toLowerCase().includes(search.toLowerCase()));

  const fmtValue = (c: PromoCode) => {
    if (c.type === "percent") return `${c.value}% off`;
    if (c.type === "flat") return `$${c.value} off`;
    return "Free shipping";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Promo codes</h3>
          <p className="text-[11px] text-muted-foreground">{codes.length} codes · {codes.reduce((s, c) => s + c.redemption_count, 0)} redemptions</p>
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" variant="outline" onClick={() => setBulk(true)}>
            <Wand2 className="w-4 h-4 mr-1" /> Bulk
          </Button>
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1" /> New
          </Button>
        </div>
      </div>

      <Input placeholder="Search codes..." value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" />

      {isLoading ? (
        <div className="text-xs text-muted-foreground py-8 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><CardContent className="text-center py-10">
          <Tag className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
          <p className="text-sm font-medium">No promo codes</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <Card key={c.id} className="p-3 cursor-pointer hover:border-primary/30 transition" onClick={() => setDrawerPromo(c)}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center shrink-0">
                  <Tag className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-bold font-mono">{c.code}</code>
                    <Badge variant={c.status === "active" ? "default" : "secondary"} className="text-[9px] h-4 px-1.5">{c.status}</Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{fmtValue(c)}</span>
                    <span>· {c.redemption_count}{c.max_redemptions ? `/${c.max_redemptions}` : ""} used</span>
                    {c.expires_at && <span>· expires {format(parseISO(c.expires_at), "MMM d")}</span>}
                  </div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(c.code); toast.success("Copied"); }}>
                  <Copy className="w-3.5 h-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); del.mutate(c.id); }}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <PromoCodeBuilder open={creating} bulk={false} onClose={() => setCreating(false)} storeId={storeId} />
      <PromoCodeBuilder open={bulk} bulk={true} onClose={() => setBulk(false)} storeId={storeId} />
      <PromoRedemptionsDrawer open={!!drawerPromo} onClose={() => setDrawerPromo(null)} promo={drawerPromo} />
    </div>
  );
}
