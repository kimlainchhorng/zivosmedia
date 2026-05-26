import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Package, MapPin, CheckCircle2, Truck, Clock, Phone, Copy, X, MessageCircle, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import AppLayout from "@/components/app/AppLayout";
import { toast } from "sonner";
import { nativeConfirm } from "@/lib/native/dialog";

type DeliveryStatus =
  | "requested"
  | "pending"
  | "accepted"
  | "at_pickup"
  | "picked_up"
  | "in_transit"
  | "at_dropoff"
  | "delivered"
  | "cancelled";

interface DeliveryRow {
  id: string;
  status: DeliveryStatus | string;
  pickup_location: { address?: string; name?: string; phone?: string } | null;
  dropoff_location: { address?: string; name?: string; phone?: string } | null;
  delivery_fee: number | null;
  driver_user_id: string | null;
  customer_user_id: string;
  accepted_at: string | null;
  picked_up_at: string | null;
  delivered_at: string | null;
  pickup_proof_url: string | null;
  delivery_proof_url: string | null;
  created_at: string;
}

interface DriverProfile {
  display_name: string | null;
  avatar_url: string | null;
}

const STAGES: { key: DeliveryStatus; label: string; icon: typeof Package }[] = [
  { key: "requested", label: "Requested", icon: Package },
  { key: "accepted", label: "Driver assigned", icon: Truck },
  { key: "picked_up", label: "Picked up", icon: CheckCircle2 },
  { key: "delivered", label: "Delivered", icon: CheckCircle2 },
];

function stageIndex(status: string): number {
  if (status === "delivered") return 3;
  if (status === "picked_up" || status === "in_transit" || status === "at_dropoff") return 2;
  if (status === "accepted" || status === "at_pickup") return 1;
  return 0;
}

export default function DeliveryTrackingPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [delivery, setDelivery] = useState<DeliveryRow | null>(null);
  const [driver, setDriver] = useState<DriverProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("deliveries")
        .select(
          "id, status, pickup_location, dropoff_location, delivery_fee, driver_user_id, customer_user_id, accepted_at, picked_up_at, delivered_at, pickup_proof_url, delivery_proof_url, created_at"
        )
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      setDelivery(data);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Realtime: any UPDATE to this delivery row pushes the new state in.
  useEffect(() => {
    if (!id) return;
    const channel = supabase
      .channel(`delivery-track-${id}`)
      .on(
        "postgres_changes" as never,
        { event: "UPDATE", schema: "public", table: "deliveries", filter: `id=eq.${id}` },
        (payload: any) => {
          setDelivery((prev) => ({ ...(prev as DeliveryRow), ...(payload.new as DeliveryRow) }));
        }
      );
    channel.subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // When a driver gets assigned, fetch their public profile so the customer
  // sees who is bringing the package.
  useEffect(() => {
    const driverId = delivery?.driver_user_id;
    if (!driverId) {
      setDriver(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", driverId)
        .maybeSingle();
      if (!cancelled) setDriver(data ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [delivery?.driver_user_id]);

  const activeIdx = useMemo(() => stageIndex(delivery?.status ?? "requested"), [delivery?.status]);

  const [signedProofs, setSignedProofs] = useState<{ pickup?: string; delivery?: string }>({});

  // Resolve private storage paths to short-lived signed URLs so the <img> can load.
  useEffect(() => {
    if (!delivery) return;
    let cancelled = false;
    (async () => {
      const next: { pickup?: string; delivery?: string } = {};
      const sign = async (path: string | null | undefined) => {
        if (!path) return undefined;
        const { data } = await (supabase as any).storage
          .from("delivery-proofs")
          .createSignedUrl(path, 60 * 60); // 1h
        return data?.signedUrl as string | undefined;
      };
      next.pickup = await sign(delivery.pickup_proof_url);
      next.delivery = await sign(delivery.delivery_proof_url);
      if (!cancelled) setSignedProofs(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [delivery?.pickup_proof_url, delivery?.delivery_proof_url, delivery?.id]);

  const copyId = () => {
    if (!delivery) return;
    navigator.clipboard.writeText(delivery.id);
    toast.success("Tracking ID copied");
  };

  const cancelDelivery = async () => {
    if (!delivery) return;
    const confirmed = await nativeConfirm("Cancel this delivery?");
    if (!confirmed) return;
    const { error } = await (supabase as any)
      .from("deliveries")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("id", delivery.id);
    if (error) {
      toast.error("Could not cancel — driver may have already started.");
      return;
    }
    toast.success("Delivery cancelled");
  };

  const messageDriver = () => {
    if (!delivery?.id) return;
    navigate(`/delivery/track/${delivery.id}/chat`);
  };

  const canCancel =
    !!delivery &&
    delivery.customer_user_id === user?.id &&
    ["requested", "pending", "accepted"].includes(delivery.status);
  const isCompleted = delivery?.status === "delivered" || delivery?.status === "cancelled";

  if (!id) return null;

  return (
    <AppLayout title="Track Delivery" hideHeader>
      <div className="flex flex-col px-4 pt-3 pb-24">
        <div className="flex items-center gap-2.5 mb-4">
          <button type="button"
            onClick={() => navigate("/delivery")}
            className="w-8 h-8 rounded-full bg-muted/60 flex items-center justify-center active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-[17px] flex-1">Track Delivery</h1>
        </div>

        {loading ? (
          <div className="rounded-2xl bg-muted/40 animate-pulse h-40" />
        ) : !delivery ? (
          <div className="rounded-2xl border border-border/40 bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">Delivery not found.</p>
          </div>
        ) : (
          <>
            {/* Status pill + tracking id */}
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-border/40 bg-card p-4 mb-3"
            >
              <div className="flex items-center justify-between mb-3">
                <span
                  className={cn(
                    "text-[11px] font-bold uppercase px-2.5 py-1 rounded-full",
                    delivery.status === "delivered"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : delivery.status === "cancelled"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-violet-500/10 text-violet-600"
                  )}
                >
                  {delivery.status.replace(/_/g, " ")}
                </span>
                <button type="button"
                  onClick={copyId}
                  className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Copy className="w-3 h-3" /> {delivery.id.slice(0, 8)}
                </button>
              </div>

              {/* Stages */}
              <div className="flex items-center gap-2">
                {STAGES.map((stage, i) => {
                  const Done = i <= activeIdx;
                  const Current = i === activeIdx && delivery.status !== "delivered";
                  return (
                    <div key={stage.key} className="flex-1 flex flex-col items-center gap-1.5">
                      <div className="w-full flex items-center">
                        <div
                          className={cn(
                            "w-7 h-7 rounded-full flex items-center justify-center shrink-0",
                            Done ? "bg-violet-500 text-white" : "bg-muted text-muted-foreground"
                          )}
                        >
                          {Done && i < activeIdx ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <stage.icon className="w-3.5 h-3.5" />
                          )}
                        </div>
                        {i < STAGES.length - 1 && (
                          <div
                            className={cn(
                              "flex-1 h-0.5 mx-1",
                              i < activeIdx ? "bg-violet-500" : "bg-muted"
                            )}
                          />
                        )}
                      </div>
                      <span
                        className={cn(
                          "text-[10px] font-semibold leading-tight text-center",
                          Done ? "text-foreground" : "text-muted-foreground",
                          Current && "text-violet-600"
                        )}
                      >
                        {stage.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* Action row — chat with driver and/or cancel */}
            {!isCompleted && (canCancel || delivery.driver_user_id) && (
              <div className="flex gap-2 mb-3">
                {delivery.driver_user_id && (
                  <button type="button"
                    onClick={messageDriver}
                    className="flex-1 h-11 rounded-xl bg-violet-500 text-white font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  >
                    <MessageCircle className="w-4 h-4" /> Message driver
                  </button>
                )}
                {canCancel && (
                  <button type="button"
                    onClick={cancelDelivery}
                    className="h-11 px-4 rounded-xl border border-destructive/30 text-destructive font-semibold text-[13px] flex items-center justify-center gap-1.5 active:scale-[0.98] transition-transform"
                  >
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
              </div>
            )}

            {/* Proof photos */}
            {(signedProofs.pickup || signedProofs.delivery) && (
              <div className="rounded-2xl border border-border/40 bg-card p-4 mb-3">
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-2 flex items-center gap-1.5">
                  <Camera className="w-3 h-3" /> Proof photos
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {signedProofs.pickup && (
                    <a
                      href={signedProofs.pickup}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={signedProofs.pickup}
	                        alt="Pickup proof"
	                        className="w-full h-32 object-cover rounded-xl"
	                        loading="lazy"
	                        decoding="async"
	                      />
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">Pickup</p>
                    </a>
                  )}
                  {signedProofs.delivery && (
                    <a
                      href={signedProofs.delivery}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={signedProofs.delivery}
	                        alt="Delivery proof"
	                        className="w-full h-32 object-cover rounded-xl"
	                        loading="lazy"
	                        decoding="async"
	                      />
                      <p className="text-[10px] text-muted-foreground mt-1 text-center">Delivery</p>
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Driver card */}
            {delivery.driver_user_id && (
              <div className="rounded-2xl border border-border/40 bg-card p-4 mb-3 flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500/30 to-violet-500/5 flex items-center justify-center overflow-hidden shrink-0">
                  {driver?.avatar_url ? (
	                    <img src={driver.avatar_url} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
                  ) : (
                    <Truck className="w-5 h-5 text-violet-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] text-muted-foreground leading-none mb-0.5">Your driver</p>
                  <p className="font-semibold text-[14px] truncate">
                    {driver?.display_name ?? "Driver assigned"}
                  </p>
                </div>
                {delivery.pickup_location?.phone && (
                  <a
                    href={`tel:${delivery.pickup_location.phone}`}
                    className="w-9 h-9 rounded-full bg-violet-500 text-white flex items-center justify-center"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}
              </div>
            )}

            {/* Pickup + dropoff */}
            <div className="rounded-2xl border border-border/40 bg-card p-4 mb-3">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-0.5">
                    Pickup
                  </p>
                  <p className="text-[13px] font-medium truncate">
                    {delivery.pickup_location?.address ?? "—"}
                  </p>
                  {delivery.pickup_location?.name && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {delivery.pickup_location.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-0.5">
                    Dropoff
                  </p>
                  <p className="text-[13px] font-medium truncate">
                    {delivery.dropoff_location?.address ?? "—"}
                  </p>
                  {delivery.dropoff_location?.name && (
                    <p className="text-[11px] text-muted-foreground truncate">
                      {delivery.dropoff_location.name}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="rounded-2xl border border-border/40 bg-card p-4 mb-3">
              <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wide mb-2">
                Timeline
              </p>
              <div className="space-y-1.5 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Requested
                  </span>
                  <span className="font-medium">
                    {new Date(delivery.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                {delivery.accepted_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Accepted
                    </span>
                    <span className="font-medium">
                      {new Date(delivery.accepted_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {delivery.picked_up_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <Clock className="w-3 h-3" /> Picked up
                    </span>
                    <span className="font-medium">
                      {new Date(delivery.picked_up_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
                {delivery.delivered_at && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Delivered
                    </span>
                    <span className="font-medium">
                      {new Date(delivery.delivered_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}
