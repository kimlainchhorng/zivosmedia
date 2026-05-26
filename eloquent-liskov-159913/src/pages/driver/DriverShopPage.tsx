/**
 * DriverShopPage - In-store shopping mode for drivers
 * /driver/shop/:orderId
 * Allows marking items as found/replaced/unavailable, uploading receipt, starting delivery
 */
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, CheckCircle, Package, MapPin, Phone, Loader2,
  ShoppingCart, Camera, Navigation, X, AlertTriangle,
  RefreshCw, CircleDot, DollarSign, User, Store,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/* ── Types ── */
interface ShopItem {
  productId: string;
  name: string;
  image: string;
  price: number;
  brand: string;
  quantity: number;
  status: "pending" | "found" | "replaced" | "unavailable";
  replacementName?: string;
  replacementPrice?: number;
}

type Phase = "shopping" | "receipt" | "delivery";

const STATUS_CONFIG = {
  pending: { label: "Pending", color: "bg-muted text-muted-foreground", icon: CircleDot },
  found: { label: "Found", color: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", icon: CheckCircle },
  replaced: { label: "Replaced", color: "bg-amber-500/10 text-amber-600 border-amber-500/30", icon: RefreshCw },
  unavailable: { label: "Unavailable", color: "bg-destructive/10 text-destructive border-destructive/30", icon: AlertTriangle },
};

export default function DriverShopPage() {
  const navigate = useNavigate();
  const { orderId } = useParams();
  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [phase, setPhase] = useState<Phase>("shopping");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Receipt state
  const [receiptUploaded, setReceiptUploaded] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [finalTotal, setFinalTotal] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [driverNotes, setDriverNotes] = useState("");

  // Replace dialog
  const [replaceTarget, setReplaceTarget] = useState<string | null>(null);
  const [replaceName, setReplaceName] = useState("");
  const [replacePrice, setReplacePrice] = useState("");

  /* ── Load order ── */
  useEffect(() => {
    if (!orderId) return;
    (async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("shopping_orders")
        .select("*")
        .eq("id", orderId)
        .maybeSingle();

      if (data) {
        setOrder(data);
        const raw = Array.isArray(data.items) ? data.items : [];
        setItems(raw.map((it: any) => ({
          productId: it.productId || crypto.randomUUID(),
          name: it.name || "Item",
          image: it.image || "",
          price: it.price || 0,
          brand: it.brand || "",
          quantity: it.quantity || 1,
          status: it.status || "pending",
          replacementName: it.replacementName,
          replacementPrice: it.replacementPrice,
        })));
        if (data.receipt_photo_url) {
          setReceiptUploaded(true);
          setReceiptUrl(data.receipt_photo_url);
        }
        if (data.final_total) setFinalTotal(String(data.final_total));
        if (data.driver_notes) setDriverNotes(data.driver_notes);

        // Determine phase
        if (data.status === "delivering" || data.status === "picked_up") {
          setPhase("delivery");
        } else if (data.status === "shopping_complete") {
          setPhase("receipt");
        }
      }
      setIsLoading(false);
    })();
  }, [orderId]);

  /* ── Persist items to DB ── */
  const saveItems = useCallback(async (updated: ShopItem[]) => {
    if (!orderId) return;
    setIsSaving(true);
    await supabase
      .from("shopping_orders")
      .update({
        items: updated as any,
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    setIsSaving(false);
  }, [orderId]);

  /* ── Item actions ── */
  const markFound = (productId: string) => {
    const updated = items.map(i =>
      i.productId === productId ? { ...i, status: "found" as const } : i
    );
    setItems(updated);
    saveItems(updated);
  };

  const markUnavailable = (productId: string) => {
    const updated = items.map(i =>
      i.productId === productId ? { ...i, status: "unavailable" as const } : i
    );
    setItems(updated);
    saveItems(updated);
  };

  const openReplace = (productId: string) => {
    setReplaceTarget(productId);
    setReplaceName("");
    setReplacePrice("");
  };

  const confirmReplace = () => {
    if (!replaceTarget || !replaceName.trim()) {
      toast.error("Enter replacement product name");
      return;
    }
    const updated = items.map(i =>
      i.productId === replaceTarget
        ? {
            ...i,
            status: "replaced" as const,
            replacementName: replaceName.trim(),
            replacementPrice: parseFloat(replacePrice) || i.price,
          }
        : i
    );
    setItems(updated);
    saveItems(updated);
    setReplaceTarget(null);
    toast.success("Replacement saved");
  };

  const resetItem = (productId: string) => {
    const updated = items.map(i =>
      i.productId === productId
        ? { ...i, status: "pending" as const, replacementName: undefined, replacementPrice: undefined }
        : i
    );
    setItems(updated);
    saveItems(updated);
  };

  /* ── Progress ── */
  const completedCount = items.filter(i => i.status !== "pending").length;
  const allComplete = items.length > 0 && completedCount === items.length;
  const progressPct = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  /* ── Finish shopping ── */
  const handleFinishShopping = async () => {
    if (!orderId) return;
    setIsSaving(true);
    await supabase
      .from("shopping_orders")
      .update({
        status: "shopping_complete",
        shopping_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    setPhase("receipt");
    setIsSaving(false);
    toast.success("Shopping complete! Upload your receipt.");
  };

  /* ── Receipt upload ── */
  const handleReceiptUpload = () => {
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

        setReceiptUrl(urlData.publicUrl);
        setReceiptUploaded(true);

        await supabase
          .from("shopping_orders")
          .update({
            receipt_photo_url: urlData.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId);

        toast.success("Receipt uploaded!");
      } catch (err: any) {
        toast.error(err.message || "Upload failed");
      } finally {
        setIsUploading(false);
      }
    };
    input.click();
  };

  /* ── Start delivery ── */
  const handleStartDelivery = async () => {
    if (!receiptUploaded) {
      toast.error("Please upload receipt first");
      return;
    }
    if (!finalTotal || parseFloat(finalTotal) <= 0) {
      toast.error("Enter receipt total amount");
      return;
    }

    setIsSaving(true);
    await supabase
      .from("shopping_orders")
      .update({
        status: "delivering",
        final_total: parseFloat(finalTotal),
        driver_notes: driverNotes || null,
        picked_up_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);

    setPhase("delivery");
    setIsSaving(false);
    toast.success("Delivery started!");

    // Open maps navigation
    if (order?.delivery_address) {
      const encoded = encodeURIComponent(order.delivery_address);
      const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const url = isIos
        ? `maps://maps.apple.com/?daddr=${encoded}`
        : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
      import("@/lib/openExternalUrl").then(({ openExternalUrl: oe }) => oe(url));
    }
  };

  /* ── Confirm delivery ── */
  const handleConfirmDelivery = async () => {
    setIsSaving(true);
    await supabase
      .from("shopping_orders")
      .update({
        status: "delivered",
        delivered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", orderId);
    setIsSaving(false);
    toast.success("Delivery confirmed! 🎉");
    setTimeout(() => navigate("/driver/orders"), 1200);
  };

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-6">
        <Package className="h-14 w-14 text-muted-foreground/30" />
        <p className="text-muted-foreground">Order not found</p>
        <Button variant="outline" onClick={() => navigate("/driver/orders")} className="rounded-xl">
          Back to Orders
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ── Header ── */}
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border/50 safe-area-top">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("/driver/orders")} className="p-2 rounded-xl hover:bg-muted touch-manipulation active:scale-95">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold truncate">Shopping Mode</h1>
            <p className="text-xs text-muted-foreground truncate">
              {order.store} • #{order.id.slice(0, 8)}
            </p>
          </div>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>

        {/* Progress */}
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="font-semibold">{completedCount} / {items.length} items</span>
            <span className="text-muted-foreground">{Math.round(progressPct)}%</span>
          </div>
          <Progress value={progressPct} className="h-2" />
        </div>
      </div>

      {/* ── Order Info Card ── */}
      <div className="mx-4 mt-4 rounded-2xl bg-card border border-border/50 p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">{order.store}</span>
        </div>
        {order.customer_name && (
          <div className="flex items-center gap-2 text-sm">
            <User className="h-4 w-4 text-muted-foreground" />
            <span>{order.customer_name}</span>
          </div>
        )}
        {order.delivery_address && (
          <div className="flex items-start gap-2 text-sm">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <span className="text-muted-foreground">{order.delivery_address}</span>
          </div>
        )}
        {order.customer_phone && (
          <a href={`tel:${order.customer_phone}`} className="flex items-center gap-2 text-sm text-primary">
            <Phone className="h-4 w-4" />
            <span>{order.customer_phone}</span>
          </a>
        )}
      </div>

      {/* ── Phase: Shopping ── */}
      {phase === "shopping" && (
        <div className="px-4 mt-4">
          <h3 className="text-sm font-bold mb-3 flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Shopping List ({items.length})
          </h3>

          <div className="space-y-3">
            {items.map((item, i) => {
              const config = STATUS_CONFIG[item.status];
              const StatusIcon = config.icon;
              const isActioned = item.status !== "pending";

              return (
                <motion.div
                  key={item.productId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "rounded-2xl border bg-card overflow-hidden transition-all",
                    isActioned ? "border-border/30 opacity-80" : "border-border/50"
                  )}
                >
                  {/* Product info */}
                  <div className="flex gap-3 p-3">
                    <div className="h-16 w-16 rounded-xl bg-white border border-border/30 flex items-center justify-center shrink-0 overflow-hidden">
                      {item.image ? (
                        <img src={item.image} alt="" className="h-full w-full object-contain p-1" />
                      ) : (
                        <Package className="h-6 w-6 text-muted-foreground/30" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold line-clamp-2 leading-tight">{item.name}</p>
                          {item.brand && <p className="text-[11px] text-muted-foreground mt-0.5">{item.brand}</p>}
                        </div>
                        <Badge variant="outline" className={cn("text-[10px] shrink-0 border", config.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-sm font-bold text-primary">${item.price.toFixed(2)}</span>
                        <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                      </div>
                      {item.status === "replaced" && item.replacementName && (
                        <p className="text-[11px] text-amber-600 mt-1">
                          → {item.replacementName} ${item.replacementPrice?.toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Action buttons */}
                  {!isActioned ? (
                    <div className="grid grid-cols-3 border-t border-border/30">
                      <button type="button"
                        onClick={() => markFound(item.productId)}
                        className="flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 touch-manipulation active:scale-95 transition-all"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Found
                      </button>
                      <button type="button"
                        onClick={() => openReplace(item.productId)}
                        className="flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold text-amber-600 bg-amber-500/5 hover:bg-amber-500/10 border-x border-border/30 touch-manipulation active:scale-95 transition-all"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Replace
                      </button>
                      <button type="button"
                        onClick={() => markUnavailable(item.productId)}
                        className="flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold text-destructive bg-destructive/5 hover:bg-destructive/10 touch-manipulation active:scale-95 transition-all"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        N/A
                      </button>
                    </div>
                  ) : (
                    <div className="border-t border-border/30 px-3 py-2 flex justify-end">
                      <button type="button"
                        onClick={() => resetItem(item.productId)}
                        className="text-[11px] text-muted-foreground hover:text-foreground touch-manipulation"
                      >
                        Undo
                      </button>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>

          {/* Finish Shopping */}
          {allComplete && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-6"
            >
              <Button
                onClick={handleFinishShopping}
                disabled={isSaving}
                className="w-full h-14 rounded-2xl text-base font-bold"
              >
                {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
                Finish Shopping
              </Button>
            </motion.div>
          )}
        </div>
      )}

      {/* ── Phase: Receipt ── */}
      {phase === "receipt" && (
        <div className="px-4 mt-6 space-y-4">
          <h3 className="text-lg font-bold">Upload Receipt</h3>
          <p className="text-sm text-muted-foreground">
            Take a photo of your receipt and enter the total.
          </p>

          {/* Receipt preview or upload button */}
          {receiptUrl ? (
            <div className="relative">
              <img
                src={receiptUrl}
                alt="Receipt"
                className="w-full max-h-64 object-contain rounded-2xl border border-border/50"
              />
              <button type="button"
                onClick={handleReceiptUpload}
                className="absolute bottom-3 right-3 px-3 py-1.5 rounded-xl bg-background/90 backdrop-blur text-xs font-medium border border-border/50 touch-manipulation active:scale-95"
              >
                Retake
              </button>
            </div>
          ) : (
            <button type="button"
              onClick={handleReceiptUpload}
              disabled={isUploading}
              className="w-full h-40 rounded-2xl border-2 border-dashed border-border/50 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/30 hover:text-primary transition-colors touch-manipulation active:scale-[0.98]"
            >
              {isUploading ? (
                <Loader2 className="h-8 w-8 animate-spin" />
              ) : (
                <Camera className="h-8 w-8" />
              )}
              <span className="text-sm font-medium">
                {isUploading ? "Uploading..." : "Tap to take photo"}
              </span>
            </button>
          )}

          {/* Total amount */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Receipt Total *</label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                value={finalTotal}
                onChange={(e) => setFinalTotal(e.target.value)}
                placeholder="0.00"
                className="pl-10 rounded-xl text-lg font-semibold h-12"
              />
            </div>
          </div>

          {/* Driver notes */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
            <Input
              value={driverNotes}
              onChange={(e) => setDriverNotes(e.target.value)}
              placeholder="Any notes about the order..."
              className="rounded-xl"
            />
          </div>

          {/* Start Delivery */}
          <Button
            onClick={handleStartDelivery}
            disabled={!receiptUploaded || !finalTotal || isSaving}
            className="w-full h-14 rounded-2xl text-base font-bold"
          >
            {isSaving ? (
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
            ) : (
              <Navigation className="h-5 w-5 mr-2" />
            )}
            Start Delivery
          </Button>
        </div>
      )}

      {/* ── Phase: Delivery ── */}
      {phase === "delivery" && (
        <div className="px-4 mt-6 space-y-4">
          <div className="rounded-2xl bg-primary/5 border border-primary/20 p-5 text-center space-y-3">
            <Navigation className="h-10 w-10 text-primary mx-auto" />
            <h3 className="text-lg font-bold">En Route to Customer</h3>
            <p className="text-sm text-muted-foreground">{order.delivery_address}</p>

            {order.delivery_address && (
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => {
                  const encoded = encodeURIComponent(order.delivery_address);
                  const isIos = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                  const url = isIos
                    ? `maps://maps.apple.com/?daddr=${encoded}`
                    : `https://www.google.com/maps/dir/?api=1&destination=${encoded}`;
                  import("@/lib/openExternalUrl").then(({ openExternalUrl: oe }) => oe(url));
                }}
              >
                <Navigation className="h-4 w-4 mr-2" />
                Open Navigation
              </Button>
            )}
          </div>

          {order.customer_phone && (
            <a
              href={`tel:${order.customer_phone}`}
              className="flex items-center justify-center gap-2 w-full h-12 rounded-xl border border-border/50 text-sm font-medium touch-manipulation active:scale-[0.98]"
            >
              <Phone className="h-4 w-4" />
              Call Customer
            </a>
          )}

          <Button
            onClick={handleConfirmDelivery}
            disabled={isSaving}
            className="w-full h-14 rounded-2xl text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle className="h-5 w-5 mr-2" />}
            Confirm Delivery
          </Button>
        </div>
      )}

      {/* ── Replace Dialog ── */}
      <AnimatePresence>
        {replaceTarget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-end"
            onClick={() => setReplaceTarget(null)}
          >
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="w-full bg-background rounded-t-3xl border-t border-border/50 p-5 safe-area-bottom"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center mb-3">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/20" />
              </div>

              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold">Replace Item</h3>
                <button type="button" onClick={() => setReplaceTarget(null)} className="p-1.5 rounded-xl hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 mb-5">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Replacement Product *</label>
                  <Input
                    value={replaceName}
                    onChange={(e) => setReplaceName(e.target.value)}
                    placeholder="e.g. Great Value 2% Milk"
                    className="rounded-xl"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">New Price</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      step="0.01"
                      value={replacePrice}
                      onChange={(e) => setReplacePrice(e.target.value)}
                      placeholder="0.00"
                      className="pl-10 rounded-xl"
                    />
                  </div>
                </div>
              </div>

              <Button onClick={confirmReplace} className="w-full h-12 rounded-2xl font-bold">
                <RefreshCw className="h-4 w-4 mr-2" />
                Confirm Replacement
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
