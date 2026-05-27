/**
 * Account Promos Page
 * Shows available coupons, expiration dates, and usage rules
 */
import { useState, useCallback, useMemo } from "react";
import { ArrowLeft, Tag, Clock, Gift, Copy, Check, ChevronRight, Sparkles, Info, Search, X, ArrowUpDown, History, Loader2, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPromoWallet } from "@/hooks/useMarketing";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/shared/PullToRefresh";
import { supabase } from "@/integrations/supabase/client";
import { format, isBefore, addDays, isAfter } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import SEOHead from "@/components/SEOHead";

interface PromoCode {
  id: string;
  code: string;
  discount_type: "percent" | "fixed";
  discount_value: number;
  expires_at: string | null;
  min_fare: number | null;
  max_uses: number | null;
  uses: number;
  is_active: boolean;
}

type SortKey = "expiring" | "discount" | "newest";
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "expiring", label: "Expiring soon" },
  { value: "discount", label: "Best discount" },
  { value: "newest", label: "Newest" },
];

export default function PromosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("expiring");
  const [showHistory, setShowHistory] = useState(false);
  const [applyCodeInput, setApplyCodeInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const queryClient = useQueryClient();

  const { data: walletPromos, isLoading: walletLoading } = useUserPromoWallet(user?.id);

  const handlePullRefresh = useCallback(async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["public-promo-codes"] }),
      queryClient.invalidateQueries({ queryKey: ["user-promo-wallet"] }),
    ]);
  }, [queryClient]);

  const { data: publicPromos, isLoading: publicLoading } = useQuery({
    queryKey: ["public-promo-codes"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return (data || []) as PromoCode[];
    },
    staleTime: 1000 * 60 * 5,
  });

  const isLoading = walletLoading || publicLoading;

  const activeWalletPromos = walletPromos?.filter(item => {
    if (!item.is_active) return false;
    if (item.used_at) return false;
    if (item.expires_at && isBefore(new Date(item.expires_at), new Date())) return false;
    return true;
  }) || [];

  // Used or expired promos (history view)
  const historyWalletPromos = walletPromos?.filter(item => {
    if (item.used_at) return true;
    if (item.expires_at && isBefore(new Date(item.expires_at), new Date())) return true;
    return false;
  }) || [];

  const totalPromos = activeWalletPromos.length + (publicPromos?.length || 0);

  // Search + sort helper
  const matchesSearch = (code: string, discountText: string) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return code.toLowerCase().includes(q) || discountText.toLowerCase().includes(q);
  };

  const sortPromos = <T extends { expires_at: string | null; discount_value?: number; created_at?: string }>(arr: T[]): T[] => {
    const list = [...arr];
    if (sortKey === "expiring") {
      list.sort((a, b) => {
        const ax = a.expires_at ? new Date(a.expires_at).getTime() : Infinity;
        const bx = b.expires_at ? new Date(b.expires_at).getTime() : Infinity;
        return ax - bx;
      });
    } else if (sortKey === "discount") {
      list.sort((a, b) => (b.discount_value || 0) - (a.discount_value || 0));
    } else {
      list.sort((a, b) => {
        const ax = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bx = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bx - ax;
      });
    }
    return list;
  };

  const filteredPublicPromos = useMemo(() => {
    if (!publicPromos) return [];
    return sortPromos(
      publicPromos.filter((p) => matchesSearch(p.code, getDiscountText(p.discount_type, p.discount_value)))
    );
  }, [publicPromos, search, sortKey]);

  const filteredWalletPromos = useMemo(() => {
    return sortPromos(
      activeWalletPromos.filter((item) => {
        const code = item.promo_code?.code || "";
        const discountText = item.promo_code?.discount_type === "percent"
          ? `${item.promo_code.discount_value}% off`
          : `$${((item.promo_code?.discount_value || 0) / 100).toFixed(2)} off`;
        return matchesSearch(code, discountText);
      }).map((item) => ({
        ...item,
        discount_value: item.promo_code?.discount_value || 0,
      }))
    );
  }, [activeWalletPromos, search, sortKey]);

  const totalSavedEstimate = (walletPromos || [])
    .filter((p) => p.used_at)
    .reduce((sum, p) => {
      const v = p.promo_code?.discount_value || 0;
      const isPercent = p.promo_code?.discount_type === "percent";
      // Approximate $ saved — for percent we can't know without order data, skip
      return sum + (isPercent ? 0 : v / 100);
    }, 0);

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortKey)?.label ?? "Sort";

  const getDiscountText = (discountType: string, discountValue: number) => {
    if (discountType === "percent") {
      return `${discountValue}% off`;
    }
    return `$${(discountValue / 100).toFixed(2)} off`;
  };

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      toast.success("Code copied to clipboard");
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };

  const handleUseNow = (code: string) => {
    navigate("/eats", { state: { promoCode: code } });
  };

  const handleApplyCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const code = applyCodeInput.trim().toUpperCase();
    if (!code) {
      toast.error("Enter a promo code");
      return;
    }
    setApplyingCode(true);
    try {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("promo_codes")
        .select("code, is_active, expires_at")
        .eq("code", code)
        .eq("is_active", true)
        .or(`expires_at.is.null,expires_at.gt.${now}`)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        toast.error("Code not found or expired");
        return;
      }
      toast.success(`${code} applied!`, { description: "Continue to checkout to use it." });
      setApplyCodeInput("");
      navigate("/eats", { state: { promoCode: code } });
    } catch (err: any) {
      toast.error(err?.message || "Could not apply code");
    } finally {
      setApplyingCode(false);
    }
  };

  const getExpirationStatus = (expiresAt: string | null) => {
    if (!expiresAt) {
      return { text: "No expiration", color: "text-emerald-500", urgent: false };
    }
    const expDate = new Date(expiresAt);
    const now = new Date();
    
    if (isBefore(expDate, now)) {
      return { text: "Expired", color: "text-destructive", urgent: true };
    }
    if (isBefore(expDate, addDays(now, 3))) {
      return { text: `Expires ${format(expDate, "MMM d")}`, color: "text-amber-500", urgent: true };
    }
    return { text: `Expires ${format(expDate, "MMM d")}`, color: "text-muted-foreground", urgent: false };
  };

  return (
    <PullToRefresh onRefresh={handlePullRefresh} className="min-h-screen bg-background text-foreground pb-24">
      <SEOHead title="My Promos — ZIVO" description="Your available promo codes and coupons" />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="flex items-center justify-between px-6 py-4">
          <button type="button"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-muted border border-border/50 flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg">My Promos</h1>
          <div className="w-10" />
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
        {/* Summary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-amber-500/20 to-card border border-amber-500/30 rounded-3xl p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center">
              <Tag className="w-6 h-6 text-amber-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Available Promos</p>
              <p className="text-2xl font-bold">{isLoading ? "—" : totalPromos}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Use promo codes at checkout to save on your orders!
          </p>
        </motion.div>

        {/* Apply a code manually (from email, friends, social) */}
        <motion.form
          onSubmit={handleApplyCode}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-2xl border border-border/40 bg-card p-3 space-y-2"
        >
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-1">
            Have a code?
          </p>
          <div className="flex gap-2">
            <Input
              value={applyCodeInput}
              onChange={(e) => setApplyCodeInput(e.target.value.toUpperCase())}
              placeholder="Enter promo code"
              maxLength={32}
              className="flex-1 h-11 rounded-xl bg-muted/30 border-border/40 font-mono text-sm tracking-wider uppercase"
              aria-label="Promo code"
            />
            <Button
              type="submit"
              disabled={applyingCode || !applyCodeInput.trim()}
              className="h-11 rounded-xl px-4 font-semibold shrink-0"
            >
              {applyingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4 mr-1.5" />Apply</>}
            </Button>
          </div>
        </motion.form>

        {/* Search + Sort + History toggle */}
        {!isLoading && (totalPromos > 0 || historyWalletPromos.length > 0) && (
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search promos…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search promos"
                className="pl-9 pr-8 h-9 rounded-full bg-muted/40 border-border/40 text-xs"
              />
              {search && (
                <button type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-muted-foreground hover:bg-muted/60"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 rounded-full px-3 text-xs gap-1 shrink-0">
                  <ArrowUpDown className="h-3 w-3" />
                  <span className="hidden sm:inline">{sortLabel}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                {SORT_OPTIONS.map((o) => (
                  <DropdownMenuItem key={o.value} onClick={() => setSortKey(o.value)} className="text-xs">
                    {o.value === sortKey && <Check className="h-3 w-3 mr-2 text-primary" />}
                    {o.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            {historyWalletPromos.length > 0 && (
              <Button
                variant={showHistory ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHistory((s) => !s)}
                className="h-9 rounded-full px-3 text-xs gap-1 shrink-0"
              >
                <History className="h-3 w-3" />
                <span className="hidden sm:inline">{historyWalletPromos.length}</span>
              </Button>
            )}
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        )}

        {/* History view */}
        {!isLoading && showHistory && historyWalletPromos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-muted-foreground" />
                <h2 className="font-bold">Used & Expired</h2>
              </div>
              <span className="text-[11px] text-muted-foreground">{historyWalletPromos.length} item{historyWalletPromos.length === 1 ? "" : "s"}</span>
            </div>
            <div className="space-y-2">
              {historyWalletPromos.map((item) => {
                const code = item.promo_code?.code || "CODE";
                const isUsed = !!item.used_at;
                const dateStr = item.used_at
                  ? `Used ${format(new Date(item.used_at), "MMM d, yyyy")}`
                  : item.expires_at
                    ? `Expired ${format(new Date(item.expires_at), "MMM d, yyyy")}`
                    : "Inactive";
                return (
                  <div key={item.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30 opacity-70">
                    <div className="h-9 w-9 rounded-lg bg-muted/50 flex items-center justify-center shrink-0">
                      <Tag className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold line-through">{code}</p>
                      <p className="text-[11px] text-muted-foreground">{dateStr}</p>
                    </div>
                    <Badge variant="outline" className={`text-[10px] ${isUsed ? "border-emerald-500/40 text-emerald-500" : "border-rose-500/40 text-rose-500"}`}>
                      {isUsed ? "Used" : "Expired"}
                    </Badge>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Wallet Promos */}
        {!isLoading && !showHistory && filteredWalletPromos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h2 className="font-bold">Exclusive Offers</h2>
              {search && <span className="text-[11px] text-muted-foreground">({filteredWalletPromos.length})</span>}
            </div>
            <div className="space-y-3">
              {filteredWalletPromos.map(item => {
                const code = item.promo_code?.code || "CODE";
                const discountText = item.promo_code?.discount_type === "percent"
                  ? `${item.promo_code.discount_value}% off`
                  : `$${((item.promo_code?.discount_value || 0) / 100).toFixed(2)} off`;
                const expStatus = getExpirationStatus(item.expires_at);

                return (
                  <PromoCard
                    key={item.id}
                    id={item.id}
                    code={code}
                    discountText={discountText}
                    expirationText={expStatus.text}
                    expirationColor={expStatus.color}
                    isUrgent={expStatus.urgent}
                    minOrder={null}
                    isExclusive
                    isCopied={copiedId === item.id}
                    onCopy={() => handleCopy(code, item.id)}
                    onUse={() => handleUseNow(code)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Public Promos */}
        {!isLoading && !showHistory && filteredPublicPromos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <Gift className="w-4 h-4 text-primary" />
              <h2 className="font-bold">Available Codes</h2>
              {search && <span className="text-[11px] text-muted-foreground">({filteredPublicPromos.length})</span>}
            </div>
            <div className="space-y-3">
              {filteredPublicPromos.map(promo => {
                const discountText = getDiscountText(promo.discount_type, promo.discount_value);
                const expStatus = getExpirationStatus(promo.expires_at);
                const minOrder = promo.min_fare ? `Min order: $${(promo.min_fare / 100).toFixed(2)}` : null;

                return (
                  <PromoCard
                    key={promo.id}
                    id={promo.id}
                    code={promo.code}
                    discountText={discountText}
                    expirationText={expStatus.text}
                    expirationColor={expStatus.color}
                    isUrgent={expStatus.urgent}
                    minOrder={minOrder}
                    isExclusive={false}
                    isCopied={copiedId === promo.id}
                    onCopy={() => handleCopy(promo.code, promo.id)}
                    onUse={() => handleUseNow(promo.code)}
                  />
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Empty State — no promos at all */}
        {!isLoading && totalPromos === 0 && !showHistory && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border/50 rounded-2xl p-8 text-center"
          >
            <Gift className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="font-medium text-muted-foreground">No promo codes available</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Check back later for exclusive offers!
            </p>
          </motion.div>
        )}

        {/* No matches for search */}
        {!isLoading && !showHistory && totalPromos > 0 && search && filteredWalletPromos.length === 0 && filteredPublicPromos.length === 0 && (
          <div className="bg-card border border-border/50 rounded-2xl p-8 text-center">
            <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No promos match "{search}"</p>
            <Button variant="link" size="sm" className="mt-1 text-xs" onClick={() => setSearch("")}>
              Clear search
            </Button>
          </div>
        )}

        {/* How to Use */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border/50 rounded-2xl p-5"
        >
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4 text-muted-foreground" />
            <h2 className="font-bold">How to Use</h2>
          </div>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Enter the code at checkout
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              Discount applies automatically
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              One promo code per order
            </li>
          </ul>
        </motion.div>
      </div>
    </PullToRefresh>
  );
}

interface PromoCardProps {
  id: string;
  code: string;
  discountText: string;
  expirationText: string;
  expirationColor: string;
  isUrgent: boolean;
  minOrder: string | null;
  isExclusive: boolean;
  isCopied: boolean;
  onCopy: () => void;
  onUse: () => void;
}

function PromoCard({
  id,
  code,
  discountText,
  expirationText,
  expirationColor,
  isUrgent,
  minOrder,
  isExclusive,
  isCopied,
  onCopy,
  onUse,
}: PromoCardProps) {
  return (
    <div className="bg-card border border-border/50 rounded-2xl p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isExclusive ? "bg-amber-500/20" : "bg-primary/20"
          }`}>
            <Tag className={`w-5 h-5 ${isExclusive ? "text-amber-500" : "text-primary"}`} />
          </div>
          <div>
            <p className="font-mono font-bold text-lg">{code}</p>
            <Badge 
              variant="outline" 
              className={`text-xs ${isExclusive ? "border-amber-500/50 text-amber-500" : ""}`}
            >
              {discountText}
            </Badge>
          </div>
        </div>
        {isExclusive && (
          <Badge className="bg-amber-500/20 text-amber-500 border-0 text-xs">
            <Sparkles className="w-3 h-3 mr-1" />
            Exclusive
          </Badge>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs mb-4">
        <span className={`flex items-center gap-1 ${expirationColor}`}>
          <Clock className="w-3 h-3" />
          {expirationText}
        </span>
        {minOrder && (
          <span className="text-muted-foreground">
            {minOrder}
          </span>
        )}
      </div>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          className="flex-1 h-10"
          onClick={onCopy}
        >
          {isCopied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-emerald-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Copy
            </>
          )}
        </Button>
        <Button
          size="sm"
          className="flex-1 h-10"
          onClick={onUse}
        >
          Use Now
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}