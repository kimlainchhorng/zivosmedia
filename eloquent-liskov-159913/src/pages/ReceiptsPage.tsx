/**
 * ReceiptsPage — Past payments and order receipts.
 * Pulls real rows from the `receipts` table for the signed-in user.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Receipt, Download, Search, Plane, Hotel, Car, UtensilsCrossed, ShoppingBag, FileText, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface ReceiptRow {
  id: string;
  type: string;
  reference_id: string;
  currency: string;
  total_cents: number;
  pdf_path: string;
  email_sent_at: string | null;
  created_at: string;
}

const TYPE_ICONS: Record<string, typeof Receipt> = {
  flight: Plane,
  hotel: Hotel,
  car: Car,
  ride: Car,
  eats: UtensilsCrossed,
  food: UtensilsCrossed,
  order: ShoppingBag,
  shop: ShoppingBag,
  subscription: FileText,
};

function getTypeIcon(type: string): typeof Receipt {
  return TYPE_ICONS[type.toLowerCase()] ?? Receipt;
}

function formatCents(cents: number, currency: string): string {
  const v = (cents ?? 0) / 100;
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: (currency || "USD").toUpperCase() }).format(v);
  } catch {
    return `$${v.toFixed(2)}`;
  }
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

export default function ReceiptsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [activeType, setActiveType] = useState<string>("All");

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: ["receipts", user?.id],
    queryFn: async () => {
      if (!user?.id) return [] as ReceiptRow[];
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string) => {
            eq: (k: string, v: string) => {
              order: (k: string, opts: { ascending: boolean }) => Promise<{ data: ReceiptRow[] | null }>;
            };
          };
        };
      };
      const { data } = await sb
        .from("receipts")
        .select("id, type, reference_id, currency, total_cents, pdf_path, email_sent_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const types = Array.from(new Set(["All", ...receipts.map((r) => r.type)]));
  const filtered = receipts.filter((r) => {
    if (activeType !== "All" && r.type !== activeType) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      r.reference_id?.toLowerCase().includes(q) ||
      r.type?.toLowerCase().includes(q)
    );
  });

  const totalSpent = receipts.reduce((sum, r) => sum + (r.total_cents ?? 0), 0);
  const displayCurrency = receipts[0]?.currency ?? "USD";

  const openPdf = async (pdfPath: string) => {
    if (!pdfPath) return;
    if (/^https?:\/\//.test(pdfPath)) {
      window.open(pdfPath, "_blank", "noopener,noreferrer");
      return;
    }
    // Storage path — sign a 60s URL
    try {
      const sb = supabase as unknown as {
        storage: {
          from: (b: string) => {
            createSignedUrl: (p: string, ttl: number) => Promise<{ data: { signedUrl: string } | null }>;
          };
        };
      };
      const { data } = await sb.storage.from("receipts").createSignedUrl(pdfPath, 60);
      if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch {
      /* swallow — link button does its best, the dev console will show storage errors */
    }
  };

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Receipts · ZIVO" description="Past payments and order receipts." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/80 backdrop-blur-md border-b border-border/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            aria-label="Back"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 flex-1">
            <div className="h-7 w-7 rounded-lg bg-ig-gradient flex items-center justify-center">
              <Receipt className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Receipts</h1>
          </div>
          <Button aria-label="Filter" variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            <Filter className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* Summary card */}
        {!isLoading && receipts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Total spent</p>
            <p className="text-3xl font-bold mt-1">{formatCents(totalSpent, displayCurrency)}</p>
            <p className="text-sm text-white/80 mt-1">{receipts.length} receipts</p>
          </motion.div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <input
            type="search"
            placeholder="Search by reference or type"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
          />
        </div>

        {/* Type chips */}
        {types.length > 1 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveType(t)}
                className={cn(
                  "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all capitalize",
                  activeType === t
                    ? "bg-ig-gradient text-white shadow-sm"
                    : "bg-secondary text-foreground hover:bg-muted",
                )}
              >
                {t}
              </button>
            ))}
          </div>
        )}

        {/* List */}
        {isLoading && (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-muted animate-pulse rounded-2xl" />
            ))}
          </div>
        )}

        {!isLoading && receipts.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Receipt className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No receipts yet</p>
            <p className="text-xs text-muted-foreground">
              Receipts for bookings, orders, and subscriptions will show up here.
            </p>
          </div>
        )}

        {!isLoading && receipts.length > 0 && filtered.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-8">No receipts match your filter.</p>
        )}

        {!isLoading && filtered.length > 0 && (
          <div className="space-y-2">
            {filtered.map((r, idx) => {
              const Icon = getTypeIcon(r.type);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border"
                >
                  <div className="shrink-0 h-11 w-11 rounded-xl bg-ig-gradient flex items-center justify-center shadow-sm">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground capitalize">{r.type}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {r.reference_id} · {formatDate(r.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold text-foreground">{formatCents(r.total_cents, r.currency)}</p>
                    <button
                      type="button"
                      onClick={() => openPdf(r.pdf_path)}
                      className="mt-1 text-[11px] font-bold text-ig-gradient inline-flex items-center gap-0.5 hover:opacity-80 active:opacity-60"
                      aria-label={`Download receipt ${r.reference_id}`}
                    >
                      <Download className="h-3 w-3" /> PDF
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </SwipeBackContainer>
  );
}
