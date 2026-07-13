import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Star, CheckCircle, XCircle, Flag, Eye, Shield, AlertCircle,
  TrendingUp, MessageSquare, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface ReviewFlag {
  id: string;
  review_id: string;
  reason: string;
  status: string;
  created_at: string;
  review?: {
    id: string;
    service_type: string;
    rating: number;
    title: string;
    body: string;
    reviewer_id: string;
  };
}

const serviceTypeLabel: Record<string, string> = {
  flight: "Flight",
  hotel: "Hotel",
  car_rental: "Car Rental",
  restaurant: "Restaurant",
  activity: "Activity",
};

export default function ReviewModerationDashboard() {
  const [flags, setFlags] = useState<ReviewFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("open");
  const [stats, setStats] = useState({ total: 0, open: 0, resolved: 0, rejected: 0 });

  useEffect(() => {
    fetchFlags();
  }, []);

  const fetchFlags = async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("review_flags")
        .select(`
          id, review_id, reason, status, created_at,
          review:reviews(id, service_type, rating, title, body, reviewer_id)
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setFlags(data as ReviewFlag[]);

        const stats = {
          total: data.length,
          open: data.filter((f: ReviewFlag) => f.status === "open").length,
          resolved: data.filter((f: ReviewFlag) => f.status === "resolved").length,
          rejected: data.filter((f: ReviewFlag) => f.status === "rejected").length,
        };
        setStats(stats);
      }
    } catch {
      // best-effort
    } finally {
      setLoading(false);
    }
  };

  const handleResolveFlag = async (flagId: string, action: "approved" | "rejected") => {
    try {
      const { error } = await (supabase as any)
        .from("review_flags")
        .update({ status: action === "approved" ? "resolved" : "rejected" })
        .eq("id", flagId);

      if (!error) {
        setFlags(flags.map(f => f.id === flagId ? { ...f, status: action === "approved" ? "resolved" : "rejected" } : f));
        toast.success(action === "approved" ? "Flag resolved" : "Flag rejected");
      }
    } catch {
      toast.error("Failed to update flag");
    }
  };

  const filteredFlags = filterStatus === "all"
    ? flags
    : flags.filter(f => f.status === filterStatus);

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ig-gradient">Review Moderation</h1>
            <p className="text-sm text-muted-foreground">Manage flagged reviews and moderation</p>
          </div>
          <Shield className="w-8 h-8 text-primary" />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-card border border-border/40 p-4"
          >
            <Flag className="w-4 h-4 text-primary mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.total}</p>
            <p className="text-xs text-muted-foreground mt-1">Total Flags</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-card border border-border/40 p-4"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.open}</p>
            <p className="text-xs text-muted-foreground mt-1">Open</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-card border border-border/40 p-4"
          >
            <CheckCircle className="w-4 h-4 text-emerald-600 mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.resolved}</p>
            <p className="text-xs text-muted-foreground mt-1">Resolved</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-card border border-border/40 p-4"
          >
            <XCircle className="w-4 h-4 text-red-600 mb-2" />
            <p className="text-2xl font-bold text-foreground">{stats.rejected}</p>
            <p className="text-xs text-muted-foreground mt-1">Rejected</p>
          </motion.div>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          {["all", "open", "resolved", "rejected"].map(status => (
            <button type="button"
              key={status}
              onClick={() => setFilterStatus(status)}
              className={cn(
                "px-3 py-1.5 rounded-full border text-[12px] font-semibold transition-all",
                filterStatus === status
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-muted/20 text-foreground border-border/20 hover:bg-muted/40"
              )}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>

        {/* Flags List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-40 rounded-2xl" />
            ))}
          </div>
        ) : filteredFlags.length > 0 ? (
          <div className="space-y-3">
            {filteredFlags.map((flag, index) => (
              <motion.div
                key={flag.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-border/40 bg-card p-4"
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-primary/10 text-primary">
                        {serviceTypeLabel[flag.review?.service_type || ""] || flag.review?.service_type}
                      </span>
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-1 rounded-full",
                        flag.status === "open" ? "bg-amber-500/10 text-amber-700" :
                        flag.status === "resolved" ? "bg-emerald-500/10 text-emerald-700" :
                        "bg-red-500/10 text-red-700"
                      )}>
                        {flag.status.charAt(0).toUpperCase() + flag.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-foreground mb-1">
                      {flag.review?.title}
                    </p>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={cn(
                              "w-3 h-3",
                              i < (flag.review?.rating || 0)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            )}
                          />
                        ))}
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {flag.reason}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Review Content */}
                <p className="text-sm text-foreground mb-3 p-3 rounded-lg bg-muted/20 border border-border/20">
                  {flag.review?.body}
                </p>

                {/* Actions */}
                {flag.status === "open" && (
                  <div className="flex gap-2 pt-3 border-t border-border/20">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolveFlag(flag.id, "approved")}
                      className="flex-1 h-8 text-xs"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleResolveFlag(flag.id, "rejected")}
                      className="flex-1 h-8 text-xs"
                    >
                      <XCircle className="w-3 h-3 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card p-8 text-center"
          >
            <CheckCircle className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <p className="text-sm font-semibold text-foreground mb-1">
              All caught up!
            </p>
            <p className="text-[12px] text-muted-foreground">
              {filterStatus === "open" ? "No open flags to review." : "No flags in this category."}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}
