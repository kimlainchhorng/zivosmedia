// NewServiceOrderPage — customer creates a ride or delivery
// Route: /service/new

import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams , Link} from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Car, Package, Loader2, MapPin, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCreateServiceOrder, type CreateServiceOrderInput } from "@/hooks/useCreateServiceOrder";
import LegalAcknowledgment from "@/components/legal/LegalAcknowledgment";
import PromoCodeField from "@/components/service/PromoCodeField";
import type { ServiceOrderItem } from "@/types/serviceOrder";

const PIPELINE_LEGAL_VERSION = "1.0.0";
const LEGAL_DOCS = [
  { title: "Service Pipeline Agreement",  href: "/legal/zivo-service-pipeline" },
  { title: "Cancellation & Refund Policy", href: "/legal/zivo-cancellation-refund" },
  { title: "Customer Code of Conduct",    href: "/legal/zivo-customer-code" },
];

interface ShopOption { id: string; name: string; address: string | null; lat: number | null; lng: number | null }
interface MenuOption { id: string; name: string; price_cents: number }

const fmt = (cents: number, currency = "USD") =>
  new Intl.NumberFormat(undefined, { style: "currency", currency }).format((cents || 0) / 100);

export default function NewServiceOrderPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [params] = useSearchParams();
  const initialKind = params.get("kind") === "delivery" ? "delivery" : "ride";
  const initialShop = params.get("shopId") ?? "";

  const { mutate, isPending, error } = useCreateServiceOrder();
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [promo, setPromo] = useState<{ code: string; discount_cents: number } | null>(null);

  // Ride form
  const [pickupAddr, setPickupAddr] = useState("");
  const [pickupLat, setPickupLat] = useState("");
  const [pickupLng, setPickupLng] = useState("");
  const [dropoffAddr, setDropoffAddr] = useState("");
  const [dropoffLat, setDropoffLat] = useState("");
  const [dropoffLng, setDropoffLng] = useState("");
  const [farePrice, setFarePrice] = useState("8.00");

  // Delivery form
  const [shops, setShops] = useState<ShopOption[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>(initialShop);
  const [menu, setMenu] = useState<MenuOption[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [deliveryAddr, setDeliveryAddr] = useState("");
  const [deliveryLat, setDeliveryLat] = useState("");
  const [deliveryLng, setDeliveryLng] = useState("");
  const [deliveryFee, setDeliveryFee] = useState("2.50");
  const [notes, setNotes] = useState("");

  // Auto-detect pickup
  useEffect(() => {
    if (!navigator.geolocation || pickupLat) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPickupLat(String(pos.coords.latitude));
        setPickupLng(String(pos.coords.longitude));
        if (!pickupAddr) setPickupAddr("Current location");
      },
      () => { /* ignore */ },
      { enableHighAccuracy: false, timeout: 4000 },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase.from("restaurants")
      .select("id, name, address, lat, lng")
      .eq("status", "active").order("name").limit(50)
      .then(({ data }) => { if (!cancelled && data) setShops(data as ShopOption[]); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selectedShop) { setMenu([]); return; }
    let cancelled = false;
    setCart({});
    supabase.from("menu_items")
      .select("id, name, price")
      .eq("restaurant_id", selectedShop)
      .eq("is_available", true).limit(50)
      .then(({ data }) => {
        if (cancelled) return;
        setMenu((data ?? []).map((m: { id: string; name: string; price: number }) => ({
          id: m.id, name: m.name, price_cents: Math.round(m.price * 100),
        })));
      });
    return () => { cancelled = true; };
  }, [selectedShop]);

  const cartLines = useMemo(() => menu
    .map((m) => ({ ...m, qty: cart[m.id] ?? 0 }))
    .filter((m) => m.qty > 0), [menu, cart]);
  const cartSubtotal = cartLines.reduce((s, l) => s + l.qty * l.price_cents, 0);

  if (!user) {
    return (
      <div className="container mx-auto p-4 max-w-md safe-area-top">
        <Card><CardContent className="pt-6 text-center text-muted-foreground">
          Please sign in to request a ride or delivery.
        </CardContent></Card>
      </div>
    );
  }

  const submitRide = async () => {
    if (!legalAccepted) { toast.error("Please accept the legal terms to continue"); return; }
    const lat = parseFloat(pickupLat);
    const lng = parseFloat(pickupLng);
    const fare = Math.round(parseFloat(farePrice) * 100);
    if (Number.isNaN(lat) || Number.isNaN(lng)) { toast.error("Pickup coordinates required"); return; }
    if (!dropoffAddr) { toast.error("Drop-off address required"); return; }
    if (!Number.isFinite(fare) || fare <= 0) { toast.error("Fare must be positive"); return; }

    const input: CreateServiceOrderInput = {
      kind: "ride",
      pickup_address: pickupAddr || undefined,
      pickup_lat: lat, pickup_lng: lng,
      dropoff_address: dropoffAddr,
      dropoff_lat: parseFloat(dropoffLat) || undefined,
      dropoff_lng: parseFloat(dropoffLng) || undefined,
      subtotal_cents: fare,
      promo_code: promo?.code,
    };
    const order = await mutate(input);
    if (order) navigate(`/service/track/${order.id}`);
  };

  const submitDelivery = async () => {
    if (!legalAccepted) { toast.error("Please accept the legal terms to continue"); return; }
    if (!selectedShop) { toast.error("Pick a shop first"); return; }
    if (cartLines.length === 0) { toast.error("Add at least one item"); return; }
    if (!deliveryAddr) { toast.error("Drop-off address required"); return; }

    const items: ServiceOrderItem[] = cartLines.map((l) => ({
      name: l.name, qty: l.qty, price_cents: l.price_cents,
    }));
    const input: CreateServiceOrderInput = {
      kind: "delivery", shop_id: selectedShop,
      dropoff_address: deliveryAddr,
      dropoff_lat: parseFloat(deliveryLat) || undefined,
      dropoff_lng: parseFloat(deliveryLng) || undefined,
      items, special_notes: notes || undefined,
      subtotal_cents: cartSubtotal,
      delivery_fee_cents: Math.round(parseFloat(deliveryFee || "0") * 100) || 0,
      promo_code: promo?.code,
    };
    const order = await mutate(input);
    if (order) navigate(`/service/track/${order.id}`);
  };

  const rideTotalCents = Math.max(0, Math.round(parseFloat(farePrice || "0") * 100) - (promo?.discount_cents ?? 0));
  const deliveryTotalCents = Math.max(0,
    cartSubtotal + Math.round(parseFloat(deliveryFee || "0") * 100) - (promo?.discount_cents ?? 0)
  );

  return (
    <div className="container mx-auto p-4 max-w-2xl space-y-4 pb-24 safe-area-top">
      <Button variant="ghost" onClick={() => navigate(-1)} className="-ml-2">
        <ArrowLeft className="mr-2 h-4 w-4" /> Back
      </Button>

      <header className="flex items-end justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">Request service</h1>
          <p className="text-sm text-muted-foreground">A ride or delivery — same engine.</p>
        </div>
        <Link to="/legal" className="text-xs text-primary hover:underline whitespace-nowrap">Legal Center →</Link>
      </header>

      {error && <div className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</div>}

      <Tabs defaultValue={initialKind}>
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="ride"><Car className="mr-2 h-4 w-4" /> Ride</TabsTrigger>
          <TabsTrigger value="delivery"><Package className="mr-2 h-4 w-4" /> Delivery</TabsTrigger>
        </TabsList>

        <TabsContent value="ride" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base"><MapPin className="inline mr-1 h-4 w-4 text-emerald-500" />Pickup</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="ride-pickup">Address</Label>
                <Input id="ride-pickup" value={pickupAddr} onChange={(e) => setPickupAddr(e.target.value)} placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="ride-plat">Latitude</Label><Input id="ride-plat" value={pickupLat} onChange={(e) => setPickupLat(e.target.value)} inputMode="decimal" /></div>
                <div><Label htmlFor="ride-plng">Longitude</Label><Input id="ride-plng" value={pickupLng} onChange={(e) => setPickupLng(e.target.value)} inputMode="decimal" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base"><MapPin className="inline mr-1 h-4 w-4 text-foreground" />Drop-off</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="ride-dropoff">Address</Label>
                <Input id="ride-dropoff" value={dropoffAddr} onChange={(e) => setDropoffAddr(e.target.value)} placeholder="456 Park Ave" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="ride-dlat">Latitude (opt)</Label><Input id="ride-dlat" value={dropoffLat} onChange={(e) => setDropoffLat(e.target.value)} inputMode="decimal" /></div>
                <div><Label htmlFor="ride-dlng">Longitude (opt)</Label><Input id="ride-dlng" value={dropoffLng} onChange={(e) => setDropoffLng(e.target.value)} inputMode="decimal" /></div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Label htmlFor="ride-fare">Fare (USD)</Label>
              <Input id="ride-fare" value={farePrice} onChange={(e) => setFarePrice(e.target.value)} inputMode="decimal" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-1"><Tag className="h-4 w-4" /> Promo</CardTitle></CardHeader>
            <CardContent>
              <PromoCodeField
                kind="ride"
                subtotalCents={Math.round(parseFloat(farePrice || "0") * 100)}
                onApplied={setPromo}
              />
            </CardContent>
          </Card>

          {promo && promo.discount_cents > 0 && (
            <Card><CardContent className="pt-6 text-sm flex justify-between font-medium">
              <span>Order total</span><span>{fmt(rideTotalCents)}</span>
            </CardContent></Card>
          )}

          <LegalAcknowledgment version={PIPELINE_LEGAL_VERSION} documents={LEGAL_DOCS} onChange={setLegalAccepted} />

          <Button className="w-full" size="lg" onClick={submitRide} disabled={isPending || !legalAccepted}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Request ride
          </Button>
        </TabsContent>

        <TabsContent value="delivery" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Pick a shop</CardTitle></CardHeader>
            <CardContent>
              <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm">
                <option value="">— Select shop —</option>
                {shops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </CardContent>
          </Card>

          {selectedShop && (
            <Card>
              <CardHeader><CardTitle className="text-base">Menu</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {menu.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No items.</p>
                ) : menu.map((m) => (
                  <div key={m.id} className="flex items-center justify-between gap-2">
                    <div className="flex-1">
                      <p className="text-sm">{m.name}</p>
                      <p className="text-xs text-muted-foreground">${(m.price_cents / 100).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="outline" onClick={() => setCart((c) => ({ ...c, [m.id]: Math.max(0, (c[m.id] ?? 0) - 1) }))}>−</Button>
                      <span className="w-6 text-center">{cart[m.id] ?? 0}</span>
                      <Button size="sm" variant="outline" onClick={() => setCart((c) => ({ ...c, [m.id]: (c[m.id] ?? 0) + 1 }))}>+</Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="text-base">Drop-off</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label htmlFor="del-addr">Address</Label>
                <Input id="del-addr" value={deliveryAddr} onChange={(e) => setDeliveryAddr(e.target.value)} placeholder="Where to deliver?" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label htmlFor="del-lat">Latitude (opt)</Label><Input id="del-lat" value={deliveryLat} onChange={(e) => setDeliveryLat(e.target.value)} inputMode="decimal" /></div>
                <div><Label htmlFor="del-lng">Longitude (opt)</Label><Input id="del-lng" value={deliveryLng} onChange={(e) => setDeliveryLng(e.target.value)} inputMode="decimal" /></div>
              </div>
              <div><Label htmlFor="del-fee">Delivery fee (USD)</Label><Input id="del-fee" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} inputMode="decimal" /></div>
              <div><Label htmlFor="del-notes">Notes (opt)</Label><Textarea id="del-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} /></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-1"><Tag className="h-4 w-4" /> Promo</CardTitle></CardHeader>
            <CardContent>
              <PromoCodeField
                kind="delivery"
                subtotalCents={cartSubtotal}
                deliveryFeeCents={Math.round(parseFloat(deliveryFee || "0") * 100)}
                onApplied={setPromo}
              />
            </CardContent>
          </Card>

          {cartLines.length > 0 && (
            <Card>
              <CardContent className="pt-6 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{fmt(cartSubtotal)}</span></div>
                <div className="flex justify-between text-muted-foreground"><span>Delivery</span><span>{fmt(Math.round(parseFloat(deliveryFee || "0") * 100))}</span></div>
                {promo && promo.discount_cents > 0 && (
                  <div className="flex justify-between text-emerald-600"><span>Promo ({promo.code})</span><span>−{fmt(promo.discount_cents)}</span></div>
                )}
                <div className="flex justify-between font-medium border-t pt-2 mt-2">
                  <span>Total</span><span>{fmt(deliveryTotalCents)}</span>
                </div>
              </CardContent>
            </Card>
          )}

          <LegalAcknowledgment version={PIPELINE_LEGAL_VERSION} documents={LEGAL_DOCS} onChange={setLegalAccepted} />

          <Button className="w-full" size="lg" onClick={submitDelivery} disabled={isPending || !legalAccepted}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Place delivery order
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
