/**
 * ImportCartPage - Cart + checkout for cross-border shop.
 * Creates an import_orders row with payment method (card/aba/cod).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trash2, Minus, Plus, CreditCard, Banknote, Wallet, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useImportCart } from "@/hooks/useImportShop";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type PayMethod = "card" | "aba" | "cash_on_delivery" | "wallet";

export default function ImportCartPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, updateQty, removeItem, clear, subtotal_cents, shipping_cents } = useImportCart();
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [method, setMethod] = useState<PayMethod>("card");
  const [submitting, setSubmitting] = useState(false);

  const surcharge_cents = method === "card" ? Math.round((subtotal_cents + shipping_cents) * 0.035) : 0;
  const total_cents = subtotal_cents + shipping_cents + surcharge_cents;

  const placeOrder = async () => {
    if (!user) {
      toast.error("Please sign in first");
      navigate("/auth");
      return;
    }
    if (items.length === 0) return toast.error("Cart is empty");
    if (!contactName || !contactPhone || !address) return toast.error("Fill contact and address");

    setSubmitting(true);
    try {
      const trackingCode = `ZS-${Date.now().toString(36).toUpperCase().slice(-6)}`;
      const { data, error } = await (supabase as any)
        .from("import_orders")
        .insert({
          customer_id: user.id,
          items,
          subtotal_cents,
          shipping_cents,
          surcharge_cents,
          total_cents,
          payment_method: method,
          payment_status: method === "cash_on_delivery" ? "cod_pending" : method === "card" ? "pending" : "pending_manual",
          fulfillment_status: method === "cash_on_delivery" ? "awaiting_supplier" : "awaiting_payment",
          delivery_address: address,
          contact_name: contactName,
          contact_phone: contactPhone,
          notes: notes || null,
          tracking_code: trackingCode,
        })
        .select("id")
        .single();
      if (error) throw error;

      clear();
      toast.success("Order placed! We'll source it from the supplier.");
      navigate(`/shop/orders/${data.id}`);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to place order");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40 flex items-center px-3 py-2.5 gap-2" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <Button variant="ghost" size="icon" aria-label="Go back" className="h-9 w-9" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold flex-1">Cart & Checkout</h1>
      </header>

      {items.length === 0 ? (
        <div className="px-3 py-16 text-center text-sm text-muted-foreground">
          Your cart is empty.
          <div className="mt-4">
            <Button onClick={() => navigate("/shop")} className="rounded-xl">Browse products</Button>
          </div>
        </div>
      ) : (
        <div className="px-3 pt-3 space-y-4">
          {/* Items */}
          <section className="space-y-2">
            {items.map((it) => (
              <div key={`${it.productId}-${it.variant ?? ""}`} className="bg-card rounded-2xl p-2.5 flex gap-2.5 border border-border/30">
                <img src={it.image} alt="" className="h-16 w-16 rounded-xl object-cover bg-muted/40" />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold leading-tight line-clamp-2">{it.title}</p>
                  {it.variant && <p className="text-[11px] text-muted-foreground mt-0.5">{it.variant}</p>}
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[13px] font-bold text-primary">${(it.price_cents / 100).toFixed(2)}</span>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.productId, it.qty - 1, it.variant)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="text-[12px] font-bold w-6 text-center">{it.qty}</span>
                      <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQty(it.productId, it.qty + 1, it.variant)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeItem(it.productId, it.variant)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Delivery */}
          <section className="space-y-2">
            <p className="text-[13px] font-bold">Delivery details</p>
            <Input placeholder="Full name" value={contactName} onChange={(e) => setContactName(e.target.value)} className="h-10 rounded-xl" />
            <Input placeholder="Phone (e.g. +855...)" inputMode="tel" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="h-10 rounded-xl" />
            <Textarea placeholder="Delivery address (street, city)" value={address} onChange={(e) => setAddress(e.target.value)} className="rounded-xl min-h-[68px]" />
            <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} className="rounded-xl min-h-[52px]" />
          </section>

          {/* Payment */}
          <section className="space-y-2">
            <p className="text-[13px] font-bold">Payment method</p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { v: "card", l: "Card", i: CreditCard },
                { v: "aba", l: "ABA Pay", i: MessageCircle },
                { v: "cash_on_delivery", l: "Cash on Delivery", i: Banknote },
                { v: "wallet", l: "ZIVO Wallet", i: Wallet },
              ] as const).map(({ v, l, i: Icon }) => (
                <button type="button"
                  key={v}
                  onClick={() => setMethod(v)}
                  className={`p-2.5 rounded-xl border text-left flex items-center gap-2 ${
                    method === v ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-[12px] font-semibold">{l}</span>
                </button>
              ))}
            </div>
            {method === "aba" && (
              <p className="text-[11px] text-muted-foreground">After placing the order, our team will message you on Telegram with ABA payment details.</p>
            )}
            {method === "cash_on_delivery" && (
              <p className="text-[11px] text-muted-foreground">Pay our driver in cash when the item arrives at your address.</p>
            )}
          </section>

          {/* Summary */}
          <section className="rounded-2xl bg-muted/30 p-3 space-y-1.5 text-[12px]">
            <Row label="Subtotal" value={subtotal_cents} />
            <Row label="International shipping" value={shipping_cents} />
            {surcharge_cents > 0 && <Row label="Card surcharge (3.5%)" value={surcharge_cents} />}
            <div className="h-px bg-border my-1" />
            <Row label="Total" value={total_cents} bold />
          </section>

          <Button onClick={placeOrder} disabled={submitting} className="w-full h-12 rounded-xl font-bold">
            {submitting ? "Placing order..." : `Place order · $${(total_cents / 100).toFixed(2)}`}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={bold ? "font-bold" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "font-bold text-primary text-[14px]" : "font-semibold"}>${(value / 100).toFixed(2)}</span>
    </div>
  );
}
