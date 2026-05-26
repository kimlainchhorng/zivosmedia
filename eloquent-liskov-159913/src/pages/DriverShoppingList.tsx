/**
 * DriverShoppingList - Driver view for a specific shopping delivery order
 * Shows items to purchase, allows marking found & uploading receipt, status progression
 */
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, CheckCircle, Circle, Camera, Package,
  MapPin, Phone, Loader2, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ShoppingItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  brand: string;
  found: boolean;
}

const STATUS_FLOW = ["accepted", "shopping", "shopping_complete", "picked_up", "delivered"] as const;

const STATUS_LABELS: Record<string, string> = {
  accepted: "Start Shopping",
  shopping: "Done Shopping",
  shopping_complete: "Picked Up",
  picked_up: "Confirm Delivery",
};

export default function DriverShoppingList() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!orderId) return;
    const fetch = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("shopping_orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (data) {
        setOrder(data);
        const rawItems = Array.isArray(data.items) ? data.items : [];
        setItems(rawItems.map((it: any) => ({
          productId: it.productId || it.id || crypto.randomUUID(),
          name: it.name || "Item",
          quantity: it.quantity || 1,
          price: it.price || 0,
          brand: it.brand || "",
          found: it.found || false,
        })));
        if (data.receipt_photo_url) setReceiptUploaded(true);
      }
      setIsLoading(false);
    };
    fetch();
  }, [orderId]);

  const toggleFound = (productId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.productId === productId ? { ...i, found: !i.found } : i
      )
    );
  };

  const allFound = items.length > 0 && items.every((i) => i.found);
  const foundCount = items.filter((i) => i.found).length;

  const handleReceiptUpload = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.capture = "environment";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setIsUploading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${user?.id || "anon"}/${orderId}.${ext}`;

        const { error: uploadErr } = await supabase.storage
          .from("receipt-photos")
          .upload(path, file, { upsert: true, contentType: file.type });

        if (uploadErr) throw uploadErr;

        const { data: urlData } = supabase.storage
          .from("receipt-photos")
          .getPublicUrl(path);

        await supabase
          .from("shopping_orders")
          .update({ receipt_photo_url: urlData.publicUrl, updated_at: new Date().toISOString() })
          .eq("id", orderId);

        setReceiptUploaded(true);
        toast.success("Receipt uploaded");
      } catch (err: any) {
        console.error("Upload error:", err);
        toast.error(err.message || "Upload failed");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  const currentStatusIndex = STATUS_FLOW.indexOf(order?.status as any);
  const nextStatus = currentStatusIndex >= 0 && currentStatusIndex < STATUS_FLOW.length - 1
    ? STATUS_FLOW[currentStatusIndex + 1]
    : null;

  const handleAdvanceStatus = async () => {
    if (!nextStatus || !orderId) return;
    setIsUpdating(true);

    const timestampField: Record<string, string> = {
      shopping: "shopping_started_at",
      shopping_complete: "shopping_completed_at",
      picked_up: "picked_up_at",
      delivered: "delivered_at",
    };

    const updates: any = {
      status: nextStatus,
      updated_at: new Date().toISOString(),
    };
    const tsField = timestampField[nextStatus];
    if (tsField) updates[tsField] = new Date().toISOString();

    const { error } = await supabase
      .from("shopping_orders")
      .update(updates)
      .eq("id", orderId);

    setIsUpdating(false);

    if (!error) {
      setOrder((prev: any) => ({ ...prev, status: nextStatus }));
      if (nextStatus === "delivered") {
        toast.success("Delivery confirmed! 🎉");
        setTimeout(() => navigate("/driver/orders"), 1500);
      } else {
        toast.success(`Status updated to ${nextStatus.replace("_", " ")}`);
      }
    } else {
      toast.error("Failed to update status");
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-3 px-6">
        <Package className="h-12 w-12 text-muted-foreground/30" />
        <p className="text-sm text-muted-foreground">Order not found</p>
        <Button variant="outline" onClick={() => navigate("/driver/orders")}>
          Back to Orders
        </Button>
      </div>
    );
  }

  const canAdvance = nextStatus === "shopping"
    || (nextStatus === "shopping_complete" && allFound)
    || (nextStatus === "picked_up" && receiptUploaded)
    || nextStatus === "delivered";

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("/driver/orders")} className="p-1.5 rounded-xl hover:bg-muted">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">Shopping List</h1>
            <p className="text-xs text-muted-foreground">
              {order.id.slice(0, 8)} • {order.store}
            </p>
          </div>
          <div className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {foundCount}/{items.length}
          </div>
        </div>
      </div>

      {/* Status Progress */}
      <div className="mx-4 mt-4 flex gap-1">
        {STATUS_FLOW.map((s, i) => (
          <div
            key={s}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= currentStatusIndex ? "bg-primary" : "bg-muted"
            )}
          />
        ))}
      </div>

      {/* Delivery Info */}
      <div className="mx-4 mt-3 p-3 rounded-xl bg-muted/50 border border-border/50 space-y-2">
        {order.delivery_address && (
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium truncate">{order.delivery_address}</span>
          </div>
        )}
        {order.customer_name && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Customer:</span>
            <span className="font-medium">{order.customer_name}</span>
          </div>
        )}
        {order.customer_phone && (
          <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-sm text-primary">
            <Phone className="h-4 w-4" />
            <span>{order.customer_phone}</span>
          </a>
        )}
      </div>

      {/* Items */}
      {items.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          tone="muted"
          compact
          title="No items in this order"
          description="The customer hasn't added anything yet — check back once they confirm the cart."
        />
      ) : (
        <div className="px-4 mt-4 space-y-2">
          <h3 className="text-sm font-semibold mb-2">
            Shopping List ({items.length} items)
          </h3>
          {items.map((item, i) => (
            <motion.div
              key={item.productId}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              onClick={() => toggleFound(item.productId)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all",
                item.found
                  ? "bg-primary/5 border-primary/20"
                  : "bg-card border-border/50 hover:border-primary/30"
              )}
            >
              {item.found ? (
                <CheckCircle className="h-5 w-5 text-primary shrink-0" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground/40 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={cn("text-sm font-medium", item.found && "line-through text-muted-foreground")}>
                  {item.quantity}x {item.name}
                </p>
                {item.brand && (
                  <p className="text-xs text-muted-foreground">{item.brand}</p>
                )}
              </div>
              <span className="text-sm font-semibold whitespace-nowrap">
                ${(item.price * item.quantity).toFixed(2)}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="px-4 mt-6 space-y-3">
        {order.status === "shopping" && (
          <Button
            variant="outline"
            className="w-full rounded-xl"
            onClick={handleReceiptUpload}
            disabled={isUploading || receiptUploaded}
          >
            {isUploading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : receiptUploaded ? (
              <CheckCircle className="h-4 w-4 mr-2 text-primary" />
            ) : (
              <Camera className="h-4 w-4 mr-2" />
            )}
            {receiptUploaded ? "Receipt Uploaded" : "Upload Receipt Photo"}
          </Button>
        )}

        {nextStatus && (
          <Button
            className="w-full rounded-xl"
            disabled={!canAdvance || isUpdating}
            onClick={handleAdvanceStatus}
          >
            {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {STATUS_LABELS[order.status] || "Next Step"}
          </Button>
        )}
      </div>
    </div>
  );
}
