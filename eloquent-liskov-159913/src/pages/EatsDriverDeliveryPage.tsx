/**
 * EatsDriverDeliveryPage - Driver view for accepting and managing food delivery jobs
 */
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, MapPin, Navigation, Package, Phone, Clock,
  CheckCircle, Truck, RefreshCw, Loader2, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface DeliveryJob {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  price_total: number;
  notes: string | null;
  requested_at: string;
  customer_id: string;
  assigned_driver_id: string | null;
}

interface JobOffer {
  id: string;
  job_id: string;
  status: string;
  expires_at: string;
  job?: DeliveryJob;
}

export default function EatsDriverDeliveryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [driverId, setDriverId] = useState<string | null>(null);
  const [tab, setTab] = useState<"available" | "active" | "completed">("available");
  const [offers, setOffers] = useState<JobOffer[]>([]);
  const [activeJobs, setActiveJobs] = useState<DeliveryJob[]>([]);
  const [completedJobs, setCompletedJobs] = useState<DeliveryJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [updatingJob, setUpdatingJob] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    loadDriverId();
  }, [user]);

  useEffect(() => {
    if (!driverId) return;
    loadAllData();
    const interval = setInterval(loadAllData, 15000);

    // Realtime for new offers
    const channel = supabase
      .channel(`driver-offers-${driverId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "job_offers",
        filter: `driver_id=eq.${driverId}`,
      }, () => loadAllData())
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [driverId]);

  async function loadDriverId() {
    const { data } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) {
      setDriverId(data.id);
    } else {
      setLoading(false);
    }
  }

  async function loadAllData() {
    if (!driverId) return;
    setLoading(true);

    const [offersRes, activeRes, completedRes] = await Promise.all([
      supabase
        .from("job_offers")
        .select("*")
        .eq("driver_id", driverId)
        .eq("status", "pending" as any)
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select("*")
        .eq("assigned_driver_id", driverId)
        .in("status", ["assigned", "en_route_pickup", "arrived_pickup", "en_route_dropoff"] as any[])
        .order("created_at", { ascending: false }),
      supabase
        .from("jobs")
        .select("*")
        .eq("assigned_driver_id", driverId)
        .in("status", ["completed", "cancelled"] as any[])
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    // Load job details for offers
    const offerData = (offersRes.data || []) as any[];
    if (offerData.length > 0) {
      const jobIds = offerData.map(o => o.job_id);
      const { data: jobsData } = await supabase
        .from("jobs")
        .select("*")
        .in("id", jobIds);
      const jobMap = Object.fromEntries((jobsData || []).map((j: any) => [j.id, j]));
      setOffers(offerData.map(o => ({ ...o, job: jobMap[o.job_id] })));
    } else {
      setOffers([]);
    }

    setActiveJobs((activeRes.data || []) as any[]);
    setCompletedJobs((completedRes.data || []) as any[]);
    setLoading(false);
  }

  async function acceptOffer(offerId: string, jobId: string) {
    setAccepting(offerId);
    try {
      const { error } = await supabase
        .from("job_offers")
        .update({ status: "accepted" } as any)
        .eq("id", offerId);
      if (error) throw error;

      await supabase
        .from("jobs")
        .update({ status: "assigned", assigned_driver_id: driverId } as any)
        .eq("id", jobId);

      // Sync driver assignment back to food_orders
      const offer = offers.find(o => o.id === offerId);
      const jobNotes = offer?.job?.notes || "";
      const foodOrderIdMatch = jobNotes.match(/Food order:\s*(.+)/);
      if (foodOrderIdMatch?.[1]) {
        await supabase
          .from("food_orders")
          .update({ driver_id: driverId, status: "confirmed" } as any)
          .eq("id", foodOrderIdMatch[1].trim());
      }

      toast.success("Delivery accepted!");
      await loadAllData();
      setTab("active");
    } catch {
      toast.error("Failed to accept");
    }
    setAccepting(null);
  }

  async function declineOffer(offerId: string) {
    await supabase.from("job_offers").update({ status: "declined" } as any).eq("id", offerId);
    setOffers(prev => prev.filter(o => o.id !== offerId));
    toast("Offer declined");
  }

  async function updateJobStatus(jobId: string, newStatus: string) {
    setUpdatingJob(jobId);
    const updatePayload: any = { status: newStatus };
    if (newStatus === "completed") updatePayload.completed_at = new Date().toISOString();

    const { error } = await supabase.from("jobs").update(updatePayload).eq("id", jobId);
    if (error) {
      toast.error("Failed to update status");
    } else {
      // Sync food_order status from job status
      const job = activeJobs.find(j => j.id === jobId);
      const foodOrderIdMatch = job?.notes?.match(/Food order:\s*(.+)/);
      if (foodOrderIdMatch?.[1]) {
        const foodOrderId = foodOrderIdMatch[1].trim();
        const statusMap: Record<string, string> = {
          en_route_pickup: "preparing",
          arrived_pickup: "ready",
          en_route_dropoff: "out_for_delivery",
          completed: "delivered",
        };
        const foodStatus = statusMap[newStatus];
        if (foodStatus) {
          const updateData: any = { status: foodStatus };
          if (foodStatus === "delivered") updateData.delivered_at = new Date().toISOString();
          await supabase.from("food_orders").update(updateData).eq("id", foodOrderId);
        }
      }
      toast.success(`Status updated to ${newStatus.replace(/_/g, " ")}`);
      await loadAllData();
    }
    setUpdatingJob(null);
  }

  if (!driverId && !loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-4 p-6">
        <Truck className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-bold text-foreground">Driver Account Required</h2>
        <p className="text-muted-foreground text-center text-sm">Sign up as a ZIVO driver to start delivering food.</p>
        <Button onClick={() => navigate("/drive")} variant="outline">Become a Driver</Button>
      </div>
    );
  }

  const statusFlow: Record<string, { label: string; next?: { label: string; status: string } }> = {
    assigned: { label: "Assigned", next: { label: "Head to Pickup", status: "en_route_pickup" } },
    en_route_pickup: { label: "En Route to Pickup", next: { label: "Arrived at Restaurant", status: "arrived_pickup" } },
    arrived_pickup: { label: "At Restaurant", next: { label: "Picked Up — Delivering", status: "en_route_dropoff" } },
    en_route_dropoff: { label: "Delivering", next: { label: "Delivered ✓", status: "completed" } },
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/95 backdrop-blur-md border-b border-border/40">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button aria-label="Back" variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-ig-gradient">Food Deliveries</h1>
            <p className="text-xs text-muted-foreground">Driver Dashboard</p>
          </div>
          <Button aria-label="Refresh" variant="ghost" size="icon" onClick={loadAllData} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
          </Button>
        </div>

        <Tabs value={tab} onValueChange={v => setTab(v as any)}>
          <TabsList className="w-full rounded-none bg-transparent border-b border-border/30 px-4">
            <TabsTrigger value="available" className="flex-1 text-xs relative">
              Available
              {offers.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                  {offers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="active" className="flex-1 text-xs">Active ({activeJobs.length})</TabsTrigger>
            <TabsTrigger value="completed" className="flex-1 text-xs">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="px-4 py-4">
        {loading && offers.length === 0 && activeJobs.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            {tab === "available" && (
              <motion.div key="available" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {offers.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No delivery requests right now</p>
                    <p className="text-xs mt-1">New orders will appear here automatically</p>
                  </div>
                ) : (
                  offers.map(offer => (
                    <motion.div key={offer.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl border border-primary/30 bg-card space-y-3">
                      <div className="flex items-start justify-between">
                        <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20 rounded-full">
                          New Request
                        </Badge>
                        <p className="text-sm font-bold text-foreground">${(offer.job?.price_total || 0).toFixed(2)}</p>
                      </div>
                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1 shrink-0" />
                          <p className="text-foreground">{offer.job?.pickup_address || "Restaurant"}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-2 h-2 rounded-full bg-primary mt-1 shrink-0" />
                          <p className="text-foreground">{offer.job?.dropoff_address || "Customer"}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1 rounded-xl text-xs font-bold"
                          disabled={accepting === offer.id}
                          onClick={() => acceptOffer(offer.id, offer.job_id)}>
                          {accepting === offer.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Accept"}
                        </Button>
                        <Button size="sm" variant="outline" className="rounded-xl text-xs"
                          onClick={() => declineOffer(offer.id)}>
                          Decline
                        </Button>
                      </div>
                    </motion.div>
                  ))
                )}
              </motion.div>
            )}

            {tab === "active" && (
              <motion.div key="active" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {activeJobs.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <Truck className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No active deliveries</p>
                  </div>
                ) : (
                  activeJobs.map(job => {
                    const flow = statusFlow[job.status];
                    return (
                      <div key={job.id} className="p-4 rounded-2xl border border-border/50 bg-card space-y-3">
                        <div className="flex items-start justify-between">
                          <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20 rounded-full">
                            {flow?.label || job.status}
                          </Badge>
                          <p className="text-sm font-bold text-foreground">${(job.price_total || 0).toFixed(2)}</p>
                        </div>

                        <div className="space-y-2 text-xs">
                          <div className="flex items-start gap-2">
                            <MapPin className="w-3.5 h-3.5 text-emerald-500 mt-0.5 shrink-0" />
                            <p className="text-foreground">{job.pickup_address}</p>
                          </div>
                          <div className="flex items-start gap-2">
                            <Navigation className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                            <p className="text-foreground">{job.dropoff_address}</p>
                          </div>
                        </div>

                        {job.notes && (
                          <p className="text-xs text-muted-foreground bg-muted/30 px-2 py-1 rounded-lg">{job.notes}</p>
                        )}

                        {flow?.next && (
                          <Button size="sm" className="w-full rounded-xl text-xs font-bold"
                            disabled={updatingJob === job.id}
                            onClick={() => updateJobStatus(job.id, flow.next!.status)}>
                            {updatingJob === job.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : flow.next.label}
                          </Button>
                        )}
                      </div>
                    );
                  })
                )}
              </motion.div>
            )}

            {tab === "completed" && (
              <motion.div key="completed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {completedJobs.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <CheckCircle className="w-12 h-12 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No completed deliveries yet</p>
                  </div>
                ) : (
                  completedJobs.map(job => (
                    <div key={job.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/40">
                      <div className={cn("w-10 h-10 rounded-full flex items-center justify-center",
                        job.status === "completed" ? "bg-emerald-500/10" : "bg-destructive/10")}>
                        {job.status === "completed" ? <CheckCircle className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-destructive" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{job.dropoff_address}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(job.requested_at), { addSuffix: true })} · ${(job.price_total || 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
