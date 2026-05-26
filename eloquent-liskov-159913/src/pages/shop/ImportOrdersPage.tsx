/**
 * ImportOrdersPage - List + detail of customer's import orders.
 */
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, Truck, CheckCircle2, Clock, Warehouse, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useImportOrder, useImportOrders } from "@/hooks/useImportShop";

const STAGES = [
  { key: "awaiting_payment", label: "Awaiting payment", icon: Clock },
  { key: "awaiting_supplier", label: "Sourcing from supplier", icon: Package },
  { key: "supplier_ordered", label: "Ordered from supplier", icon: Package },
  { key: "at_origin_warehouse", label: "At origin warehouse", icon: Warehouse },
  { key: "in_transit", label: "International transit", icon: Plane },
  { key: "at_local_warehouse", label: "At Phnom Penh warehouse", icon: Warehouse },
  { key: "out_for_delivery", label: "Out for delivery", icon: Truck },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

export default function ImportOrdersPage() {
  const { id } = useParams<{ id?: string }>();
  if (id) return <OrderDetail id={id} />;
  return <OrderList />;
}

function OrderList() {
  const navigate = useNavigate();
  const { data: orders = [], isLoading } = useImportOrders();

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40 flex items-center px-3 py-2.5 gap-2" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <Button variant="ghost" size="icon" aria-label="Go back" className="h-9 w-9" onClick={() => navigate("/shop")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold flex-1">My Orders</h1>
      </header>

      <div className="px-3 pt-3 space-y-2">
        {isLoading ? (
          [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : orders.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">No orders yet.</div>
        ) : (
          orders.map((o: any) => (
            <button type="button"
              key={o.id}
              onClick={() => navigate(`/shop/orders/${o.id}`)}
              className="w-full text-left bg-card rounded-2xl border border-border/30 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground">{o.tracking_code ?? o.id.slice(0, 8)}</span>
                <span className="text-[11px] font-semibold capitalize">{o.fulfillment_status.split("_").join(" ")}</span>
              </div>
              <p className="text-[13px] font-bold mt-1">${(o.total_cents / 100).toFixed(2)} · {(o.items as any[])?.length ?? 0} items</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{new Date(o.created_at).toLocaleDateString()}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}

function OrderDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const { data, isLoading } = useImportOrder(id);
  const order = data?.order;
  const events = data?.events ?? [];

  if (isLoading) return <Skeleton className="h-screen" />;
  if (!order) return <div className="p-6 text-center text-sm">Order not found</div>;

  const currentIdx = STAGES.findIndex((s) => s.key === order.fulfillment_status);

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/40 flex items-center px-3 py-2.5 gap-2" style={{ paddingTop: "var(--zivo-safe-top-sticky)" }}>
        <Button variant="ghost" size="icon" aria-label="Go back" className="h-9 w-9" onClick={() => navigate("/shop/orders")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-base font-bold flex-1">Order {order.tracking_code}</h1>
      </header>

      <div className="px-3 pt-3 space-y-4">
        <div className="rounded-2xl bg-card border border-border/30 p-3">
          <p className="text-[11px] text-muted-foreground">Total</p>
          <p className="text-2xl font-bold text-primary">${(order.total_cents / 100).toFixed(2)}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {(order.items as any[])?.length ?? 0} items · {order.payment_method.split("_").join(" ")}
          </p>
        </div>

        <div className="rounded-2xl bg-card border border-border/30 p-3 space-y-3">
          <p className="text-[13px] font-bold">Tracking</p>
          {STAGES.map((stage, i) => {
            const Icon = stage.icon;
            const done = i <= currentIdx;
            const active = i === currentIdx;
            return (
              <div key={stage.key} className="flex items-start gap-3">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center shrink-0 ${
                  done ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <div className="flex-1 pb-1">
                  <p className={`text-[12px] ${active ? "font-bold" : done ? "font-semibold" : "text-muted-foreground"}`}>
                    {stage.label}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {events.length > 0 && (
          <div className="rounded-2xl bg-card border border-border/30 p-3 space-y-2">
            <p className="text-[13px] font-bold">Updates</p>
            {events.map((e: any) => (
              <div key={e.id} className="text-[11px]">
                <p className="font-semibold capitalize">{e.status.split("_").join(" ")}</p>
                <p className="text-muted-foreground">{new Date(e.created_at).toLocaleString()}</p>
                {e.note && <p className="mt-0.5">{e.note}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="rounded-2xl bg-card border border-border/30 p-3 space-y-1 text-[12px]">
          <p className="font-bold mb-1">Delivery to</p>
          <p>{order.contact_name} · {order.contact_phone}</p>
          <p className="text-muted-foreground">{order.delivery_address}</p>
        </div>
      </div>
    </div>
  );
}
