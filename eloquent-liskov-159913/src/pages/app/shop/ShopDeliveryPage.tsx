import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Truck, Loader2, Save } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export default function ShopDeliveryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [storeId, setStoreId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [deliveryMin, setDeliveryMin] = useState("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [deliveryNote, setDeliveryNote] = useState("");

  const load = useCallback(async () => {
    if (!user) { setLoading(false); return; }
    const { data: store } = await supabase
      .from("store_profiles")
      .select("id, delivery_min, description")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (store) {
      setStoreId(store.id);
      setDeliveryMin(store.delivery_min ? String(store.delivery_min) : "");
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!storeId) { toast.error("No store found"); return; }
    setSaving(true);

    const { error } = await supabase
      .from("store_profiles")
      .update({
        delivery_min: deliveryMin ? parseFloat(deliveryMin) : null,
      })
      .eq("id", storeId);

    if (error) { toast.error("Failed to save"); }
    else { toast.success("Delivery settings saved"); }
    setSaving(false);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 safe-area-top z-10 bg-background/95 backdrop-blur-sm border-b border-border p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <Truck className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold">Delivery Settings</h1>
          </div>
          <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1">
            {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : (
        <div className="p-4 space-y-4">
          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Fulfillment Options</h3>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">Delivery</p>
                <p className="text-xs text-muted-foreground">Accept delivery orders</p>
              </div>
              <Switch checked={deliveryEnabled} onCheckedChange={setDeliveryEnabled} />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">In-store Pickup</p>
                <p className="text-xs text-muted-foreground">Allow customers to pick up</p>
              </div>
              <Switch checked={pickupEnabled} onCheckedChange={setPickupEnabled} />
            </div>
          </Card>

          <Card className="p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Delivery Rules</h3>

            <div className="space-y-1.5">
              <Label htmlFor="delivery-min" className="text-sm">Minimum order for delivery ($)</Label>
              <Input
                id="delivery-min"
                type="number"
                placeholder="e.g. 5.00"
                value={deliveryMin}
                onChange={e => setDeliveryMin(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Leave blank to have no minimum</p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="delivery-note" className="text-sm">Delivery note (optional)</Label>
              <Input
                id="delivery-note"
                placeholder="e.g. Free delivery over $20"
                value={deliveryNote}
                onChange={e => setDeliveryNote(e.target.value)}
              />
            </div>
          </Card>

          {!storeId && (
            <p className="text-xs text-muted-foreground text-center">Complete your store setup first to configure delivery.</p>
          )}
        </div>
      )}
    </div>
  );
}
