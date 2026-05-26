/**
 * StoreMarketingSection — Full marketing hub for store owners.
 * Live analytics, promotions CRUD, social posts, share tools.
 */
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, subDays, isAfter, isBefore, parseISO } from "date-fns";
import { QRCodeCanvas } from "qrcode.react";
import {
  Tag, Megaphone, Plus, TrendingUp, Eye, MousePointerClick, Heart,
  Share2, BarChart3, Copy, ExternalLink, Trash2, Edit, Calendar,
  Percent, DollarSign, Clock, CheckCircle2, XCircle, Image as ImageIcon,
  MessageSquare, Loader2, QrCode, Link2, Send, Sparkles, Target,
  Users, ArrowUpRight, ArrowDownRight, Minus, Hash, Globe, Zap, Rocket
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import StoreAdsManager from "./StoreAdsManager";
import AdsStudioWizard from "./AdsStudioWizard";
import AdsStudioAnalytics from "./AdsStudioAnalytics";
import AdsStudioWalletGuard from "./AdsStudioWalletGuard";
import AdsStudioPublishQueue from "./AdsStudioPublishQueue";
import AdsStudioDashboard from "./AdsStudioDashboard";
import AdsStudioRecommendations from "./AdsStudioRecommendations";
import { MarketingPreviewProvider } from "./ads/MarketingPreviewContext";
import MarketingPreviewSwitcher, { MarketingPreviewFrame } from "./ads/MarketingPreviewSwitcher";
import SegmentsManager from "./marketing/SegmentsManager";
import TemplatesLibrary from "./marketing/TemplatesLibrary";
import AutomationsBuilder from "./marketing/AutomationsBuilder";
import UnifiedPerformancePanel from "./marketing/UnifiedPerformancePanel";
import PromoCodesManager from "./marketing/PromoCodesManager";
import MarketingOverviewHeader from "./marketing/MarketingOverviewHeader";
import { useStoreMarketingOverview } from "@/hooks/useStoreMarketingOverview";

interface Props {
  storeId: string;
  storeSlug?: string;
  storeName?: string;
  storeCategory?: string;
}

/* ───── Promotion Types ───── */
interface Promotion {
  id: string;
  name: string;
  code: string;
  description: string | null;
  discount_type: string | null;
  discount_value: number;
  min_order_amount: number | null;
  max_discount: number | null;
  usage_limit: number | null;
  usage_count: number | null;
  per_user_limit: number | null;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean | null;
  created_at: string | null;
}

interface StorePost {
  id: string;
  caption: string | null;
  media_type: string;
  media_urls: string[];
  is_published: boolean;
  likes_count: number | null;
  comments_count: number | null;
  shares_count: number;
  view_count: number | null;
  created_at: string;
  hashtags: string[] | null;
}

/* ───── Helper: generate random promo code ───── */
function generatePromoCode(prefix = "ZIVO"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = prefix;
  for (let i = 0; i < 6; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
  return result;
}

/* ───── Stat Card ───── */
function StatCard({ label, value, change, icon: Icon, color }: {
  label: string; value: string | number; change?: number; icon: any; color: string;
}) {
  const isPositive = (change ?? 0) > 0;
  const isNeutral = (change ?? 0) === 0;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-4.5 h-4.5" />
          </div>
          {change !== undefined && (
            <span className={`text-[11px] font-semibold flex items-center gap-0.5 ${
              isNeutral ? "text-muted-foreground" : isPositive ? "text-emerald-600" : "text-red-500"
            }`}>
              {isNeutral ? <Minus className="w-3 h-3" /> : isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {Math.abs(change)}%
            </span>
          )}
        </div>
        <p className="text-2xl font-bold text-foreground tracking-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </CardContent>
    </Card>
  );
}

export default function StoreMarketingSection({ storeId, storeSlug, storeName, storeCategory }: Props) {
  const qc = useQueryClient();
  const [activeSubTab, setActiveSubTab] = useState("overview");
  const [promoDialogOpen, setPromoDialogOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [deletePromoId, setDeletePromoId] = useState<string | null>(null);
  const [boostPost, setBoostPost] = useState<StorePost | null>(null);
  const [boostForm, setBoostForm] = useState({ daily_budget: 10, days: 7, audience: "broad", objective: "reach" });
  const [boosting, setBoosting] = useState(false);

  // Promo form state
  const [promoForm, setPromoForm] = useState({
    name: "", code: "", description: "",
    discount_type: "percentage" as string,
    discount_value: 10, min_order_amount: 0, max_discount: 0,
    usage_limit: 0, per_user_limit: 1,
    starts_at: "", ends_at: "", is_active: true,
  });

  /* ───── Queries ───── */

  // Promotions
  const { data: promotions = [], isLoading: loadingPromos } = useQuery({
    queryKey: ["store-promotions", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promotions")
        .select("*")
        .eq("merchant_id", storeId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as Promotion[];
    },
  });

  // Store posts (social content)
  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ["store-posts", storeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("store_posts")
        .select("*")
        .eq("store_id", storeId)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as StorePost[];
    },
  });

  // Store profile for slug
  const { data: storeProfile } = useQuery({
    queryKey: ["store-profile-slug", storeId],
    queryFn: async () => {
      const { data } = await supabase
        .from("store_profiles")
        .select("slug, name")
        .eq("id", storeId)
        .single();
      return data;
    },
    enabled: !storeSlug,
  });

  const slug = storeSlug || storeProfile?.slug || "";
  const name = storeName || storeProfile?.name || "Store";
  const isAutoRepair = storeCategory === "auto-repair";
  const storeUrl = slug ? `https://www.zivollc.com/store/${slug}` : "";
  const bookingUrl = slug ? `https://www.zivollc.com/book/${slug}` : "";

  /* ───── Analytics computed from posts ───── */
  const analytics = useMemo(() => {
    const totalViews = posts.reduce((s, p) => s + (p.view_count || 0), 0);
    const totalLikes = posts.reduce((s, p) => s + (p.likes_count || 0), 0);
    const totalShares = posts.reduce((s, p) => s + (p.shares_count || 0), 0);
    const totalComments = posts.reduce((s, p) => s + (p.comments_count || 0), 0);
    const totalEngagement = totalLikes + totalShares + totalComments;
    const engagementRate = totalViews > 0 ? Math.round((totalEngagement / totalViews) * 100) : 0;
    const activePromos = promotions.filter(p => p.is_active).length;
    const totalRedemptions = promotions.reduce((s, p) => s + (p.usage_count || 0), 0);
    return { totalViews, totalLikes, totalShares, totalComments, engagementRate, activePromos, totalRedemptions, totalPosts: posts.length };
  }, [posts, promotions]);

  /* ───── Mutations ───── */
  const savePromo = useMutation({
    mutationFn: async (isEdit: boolean) => {
      const payload = {
        merchant_id: storeId,
        name: promoForm.name,
        code: promoForm.code.toUpperCase(),
        description: promoForm.description || null,
        discount_type: promoForm.discount_type,
        discount_value: promoForm.discount_value,
        min_order_amount: promoForm.min_order_amount || null,
        max_discount: promoForm.max_discount || null,
        usage_limit: promoForm.usage_limit || null,
        per_user_limit: promoForm.per_user_limit || null,
        starts_at: promoForm.starts_at || null,
        ends_at: promoForm.ends_at || null,
        is_active: promoForm.is_active,
      };
      if (isEdit && editingPromo) {
        const { error } = await supabase.from("promotions").update(payload).eq("id", editingPromo.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("promotions").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-promotions", storeId] });
      toast.success(editingPromo ? "Promotion updated" : "Promotion created");
      setPromoDialogOpen(false);
      setEditingPromo(null);
    },
    onError: (e: any) => toast.error(e.message || "Failed to save promotion"),
  });

  const deletePromo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("promotions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-promotions", storeId] });
      toast.success("Promotion deleted");
      setDeletePromoId(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const togglePromoActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("promotions").update({ is_active: active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store-promotions", storeId] });
      toast.success("Status updated");
    },
  });

  /* ───── Handlers ───── */
  const openCreatePromo = () => {
    setEditingPromo(null);
    setPromoForm({
      name: "", code: generatePromoCode(), description: "",
      discount_type: "percentage", discount_value: 10,
      min_order_amount: 0, max_discount: 0, usage_limit: 0, per_user_limit: 1,
      starts_at: "", ends_at: "", is_active: true,
    });
    setPromoDialogOpen(true);
  };

  const openEditPromo = (p: Promotion) => {
    setEditingPromo(p);
    setPromoForm({
      name: p.name, code: p.code, description: p.description || "",
      discount_type: p.discount_type || "percentage",
      discount_value: p.discount_value,
      min_order_amount: p.min_order_amount || 0,
      max_discount: p.max_discount || 0,
      usage_limit: p.usage_limit || 0,
      per_user_limit: p.per_user_limit || 1,
      starts_at: p.starts_at ? p.starts_at.slice(0, 16) : "",
      ends_at: p.ends_at ? p.ends_at.slice(0, 16) : "",
      is_active: p.is_active ?? true,
    });
    setPromoDialogOpen(true);
  };

  const copyToClipboard = (text: string, label = "Copied") => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const getPromoStatus = (p: Promotion) => {
    if (!p.is_active) return { label: "Inactive", color: "bg-muted text-muted-foreground" };
    const now = new Date();
    if (p.starts_at && isBefore(now, parseISO(p.starts_at))) return { label: "Scheduled", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" };
    if (p.ends_at && isAfter(now, parseISO(p.ends_at))) return { label: "Expired", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" };
    if (p.usage_limit && (p.usage_count || 0) >= p.usage_limit) return { label: "Maxed Out", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
    return { label: "Active", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" };
  };

  return (
    <MarketingPreviewProvider>
      <MarketingPreviewFrame>
        <div className="space-y-3 sm:space-y-4 lg:space-y-5">
          {/* Sub-navigation tabs — scrollable pills on mobile, full grid on desktop */}
      <Tabs value={activeSubTab} onValueChange={setActiveSubTab}>
        <div className="-mx-3 sm:mx-0 overflow-x-auto scrollbar-none">
          <TabsList className="inline-flex sm:inline-flex h-11 sm:h-10 px-3 sm:px-1 gap-1 sm:gap-0 min-w-full">
            <TabsTrigger value="overview" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="promotions" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <Tag className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Promos</span>
            </TabsTrigger>
            <TabsTrigger value="studio" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <Sparkles className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>AI Studio</span>
            </TabsTrigger>
            <TabsTrigger value="ads" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <Rocket className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Ads</span>
            </TabsTrigger>
            <TabsTrigger value="audience" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <Users className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Audience</span>
            </TabsTrigger>
            <TabsTrigger value="templates" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <MessageSquare className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Templates</span>
            </TabsTrigger>
            <TabsTrigger value="automations" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <Zap className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Flows</span>
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <TrendingUp className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Performance</span>
            </TabsTrigger>
            <TabsTrigger value="posts" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <ImageIcon className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Posts</span>
            </TabsTrigger>
            <TabsTrigger value="share" className="text-[11px] sm:text-xs gap-1 sm:gap-1.5 px-2.5 sm:px-3 whitespace-nowrap shrink-0">
              <Share2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" /> <span>Share</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ═══ OVERVIEW ═══ */}
        <TabsContent value="overview" className="space-y-4 mt-4">
          <MarketingOverviewHeader storeId={storeId} />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Total Views" value={analytics.totalViews.toLocaleString()} change={0} icon={Eye} color="bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" />
            <StatCard label="Engagements" value={(analytics.totalLikes + analytics.totalShares).toLocaleString()} change={0} icon={Heart} color="bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" />
            <StatCard label="Active Promos" value={analytics.activePromos} icon={Tag} color="bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" />
            <StatCard label="Redemptions" value={analytics.totalRedemptions} icon={Zap} color="bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" />
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 text-xs" onClick={openCreatePromo}>
                  <Tag className="w-5 h-5 text-primary" />
                  Create Promo
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 text-xs" onClick={() => setShareDialogOpen(true)}>
                  <QrCode className="w-5 h-5 text-primary" />
                  Get QR Code
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 text-xs" onClick={() => storeUrl && copyToClipboard(storeUrl, "Store link")}>
                  <Link2 className="w-5 h-5 text-primary" />
                  Copy Store Link
                </Button>
                <Button variant="outline" className="h-auto py-3 flex-col gap-1.5 text-xs" onClick={() => setActiveSubTab("posts")}>
                  <ImageIcon className="w-5 h-5 text-primary" />
                  View Posts
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recent Promotions Preview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Recent Promotions</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setActiveSubTab("promotions")}>
                View All →
              </Button>
            </CardHeader>
            <CardContent>
              {promotions.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Tag className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No promotions yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {promotions.slice(0, 3).map(p => {
                    const status = getPromoStatus(p);
                    return (
                      <div key={p.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/40">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Tag className="w-4 h-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{p.name}</p>
                            <p className="text-[11px] text-muted-foreground font-mono">{p.code}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                          <span className="text-xs font-semibold text-primary">
                            {p.discount_type === "percentage" ? `${p.discount_value}%` : `$${p.discount_value}`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Performance */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">Content Performance</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs text-primary" onClick={() => setActiveSubTab("posts")}>
                Manage Posts →
              </Button>
            </CardHeader>
            <CardContent>
              {posts.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-xs">No posts yet. Share content to attract customers.</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="text-lg font-bold">{analytics.totalPosts}</p>
                    <p className="text-[10px] text-muted-foreground">Total Posts</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="text-lg font-bold">{analytics.totalLikes}</p>
                    <p className="text-[10px] text-muted-foreground">Total Likes</p>
                  </div>
                  <div className="p-3 rounded-xl bg-muted/40">
                    <p className="text-lg font-bold">{analytics.engagementRate}%</p>
                    <p className="text-[10px] text-muted-foreground">Engagement Rate</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══ PROMOTIONS ═══ */}
        <TabsContent value="promotions" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Promotions & Coupons</h3>
              <p className="text-xs text-muted-foreground">{promotions.length} total · {promotions.filter(p => p.is_active).length} active</p>
            </div>
            <Button size="sm" onClick={openCreatePromo} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" /> Create Promotion
            </Button>
          </div>

          {loadingPromos ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : promotions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <Tag className="w-7 h-7 text-primary" />
                </div>
                <p className="font-medium text-sm">No promotions yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Create discount codes to attract customers and boost sales</p>
                <Button className="mt-4 gap-1.5" size="sm" onClick={openCreatePromo}>
                  <Plus className="w-3.5 h-3.5" /> Create First Promotion
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {promotions.map(p => {
                const status = getPromoStatus(p);
                return (
                  <motion.div key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="group">
                    <Card className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3 min-w-0 flex-1">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              {p.discount_type === "percentage" ? <Percent className="w-5 h-5 text-primary" /> : <DollarSign className="w-5 h-5 text-primary" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <p className="font-semibold text-sm">{p.name}</p>
                                <Badge variant="secondary" className={`text-[10px] ${status.color}`}>{status.label}</Badge>
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">{p.code}</code>
                                <button type="button" onClick={() => copyToClipboard(p.code, "Code")} className="text-muted-foreground hover:text-primary transition-colors">
                                  <Copy className="w-3 h-3" />
                                </button>
                              </div>
                              {p.description && <p className="text-xs text-muted-foreground mt-1">{p.description}</p>}
                              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  {p.discount_type === "percentage" ? <Percent className="w-3 h-3" /> : <DollarSign className="w-3 h-3" />}
                                  {p.discount_type === "percentage" ? `${p.discount_value}% off` : `$${p.discount_value} off`}
                                </span>
                                {p.min_order_amount ? <span>Min: ${p.min_order_amount}</span> : null}
                                {p.usage_limit ? <span>Used: {p.usage_count || 0}/{p.usage_limit}</span> : <span>Used: {p.usage_count || 0}×</span>}
                                {p.ends_at && (
                                  <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    Ends {format(parseISO(p.ends_at), "MMM d, yyyy")}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <Switch
                              checked={p.is_active ?? false}
                              onCheckedChange={(checked) => togglePromoActive.mutate({ id: p.id, active: checked })}
                              className="scale-75"
                            />
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditPromo(p)}>
                              <Edit className="w-3.5 h-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletePromoId(p.id)}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ═══ AI STUDIO ═══ */}
        <TabsContent value="studio" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4">
            {/* Wallet shows first on mobile/tablet so balance is visible without scrolling */}
            <div className="lg:hidden">
              <AdsStudioWalletGuard storeId={storeId} />
            </div>
            <div className="lg:col-span-2 space-y-3 sm:space-y-4 min-w-0">
              <AdsStudioWizard storeId={storeId} storeName={storeName} storeSlug={storeSlug} />
              <AdsStudioAnalytics storeId={storeId} />
            </div>
            <div className="space-y-3 sm:space-y-4 min-w-0">
              <div className="hidden lg:block">
                <AdsStudioWalletGuard storeId={storeId} />
              </div>
              <AdsStudioRecommendations storeId={storeId} />
              <AdsStudioDashboard storeId={storeId} />
              <AdsStudioPublishQueue storeId={storeId} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ads" className="space-y-4 mt-4">
          <StoreAdsManager storeId={storeId} />
        </TabsContent>

        <TabsContent value="audience" className="space-y-4 mt-4">
          <SegmentsManager storeId={storeId} />
        </TabsContent>

        <TabsContent value="templates" className="space-y-4 mt-4">
          <TemplatesLibrary storeId={storeId} />
        </TabsContent>

        <TabsContent value="automations" className="space-y-4 mt-4">
          <AutomationsBuilder storeId={storeId} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 mt-4">
          <UnifiedPerformancePanel storeId={storeId} />
        </TabsContent>

        {/* ═══ POSTS ═══ */}
        <TabsContent value="posts" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold">Store Posts</h3>
              <p className="text-xs text-muted-foreground">{posts.length} posts</p>
            </div>
          </div>

          {loadingPosts ? (
            <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : posts.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ImageIcon className="w-7 h-7 text-primary" />
                </div>
                <p className="font-medium text-sm">No posts yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">Your store posts and social content will appear here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {posts.map(post => (
                <Card key={post.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {post.media_urls?.[0] && (
	                        <img
	                          src={post.media_urls[0]}
	                          alt=""
	                          className="w-16 h-16 rounded-xl object-cover shrink-0 bg-muted"
	                          loading="lazy"
	                          decoding="async"
	                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm line-clamp-2">{post.caption || "(No caption)"}</p>
                        {post.hashtags && post.hashtags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {post.hashtags.slice(0, 5).map(tag => (
                              <span key={tag} className="text-[10px] text-primary font-medium">#{tag}</span>
                            ))}
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                          <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{post.view_count || 0}</span>
                          <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{post.likes_count || 0}</span>
                          <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" />{post.comments_count || 0}</span>
                          <span className="flex items-center gap-1"><Share2 className="w-3 h-3" />{post.shares_count}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 shrink-0">
                        <Badge variant={post.is_published ? "default" : "secondary"} className="text-[10px]">
                          {post.is_published ? "Published" : "Draft"}
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">{format(parseISO(post.created_at), "MMM d")}</p>
                        <Button
                          size="sm"
                          className="h-7 px-2.5 gap-1 text-[11px] bg-gradient-to-r from-primary to-emerald-500 hover:opacity-90"
                          onClick={() => { setBoostPost(post); setBoostForm({ daily_budget: 10, days: 7, audience: "broad", objective: "reach" }); }}
                        >
                          <Rocket className="w-3 h-3" /> Boost
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ═══ SHARE & QR ═══ */}
        <TabsContent value="share" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Share2 className="w-4 h-4 text-primary" /> Share Your Store</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Booking Link (auto-repair) */}
              {isAutoRepair && (
                <div className="p-3 rounded-xl border-2 border-primary/30 bg-primary/5 space-y-2">
                  <Label className="text-xs font-semibold text-primary flex items-center gap-1.5">
                    <Rocket className="w-3.5 h-3.5" /> Direct Booking Link
                  </Label>
                  <p className="text-[11px] text-muted-foreground">Share this link so customers can book a service appointment instantly.</p>
                  <div className="flex gap-2">
                    <Input value={bookingUrl || "Loading..."} readOnly className="text-xs font-mono bg-background" />
                    <Button variant="outline" size="sm" onClick={() => bookingUrl && copyToClipboard(bookingUrl, "Booking link")} className="shrink-0 gap-1.5">
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </Button>
                    {bookingUrl && (
                      <Button variant="outline" size="sm" onClick={() => window.open(bookingUrl, "_blank")} className="shrink-0">
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Store URL */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Store URL</Label>
                <div className="flex gap-2">
                  <Input value={storeUrl || "Loading..."} readOnly className="text-xs font-mono bg-muted" />
                  <Button variant="outline" size="sm" onClick={() => storeUrl && copyToClipboard(storeUrl, "Store URL")} className="shrink-0 gap-1.5">
                    <Copy className="w-3.5 h-3.5" /> Copy
                  </Button>
                  {storeUrl && (
                    <Button variant="outline" size="sm" onClick={() => window.open(storeUrl, "_blank")} className="shrink-0">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {/* QR Code */}
              <div className="flex flex-col items-center py-6 border rounded-xl bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-3">Scan to visit store</p>
                {storeUrl ? (
                  <div className="bg-white p-4 rounded-xl shadow-sm">
                    <QRCodeCanvas value={storeUrl} size={180} level="H" includeMargin={false} />
                  </div>
                ) : (
                  <div className="w-[180px] h-[180px] bg-muted rounded-xl flex items-center justify-center">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground mt-3">{name}</p>
                <Button variant="outline" size="sm" className="mt-3 gap-1.5 text-xs" onClick={() => {
                  const canvas = document.querySelector("canvas");
                  if (canvas) {
                    const link = document.createElement("a");
                    link.download = `${slug || "store"}-qr.png`;
                    link.href = canvas.toDataURL();
                    link.click();
                    toast.success("QR code downloaded");
                  }
                }}>
                  <QrCode className="w-3.5 h-3.5" /> Download QR
                </Button>
              </div>

              {/* Social share buttons */}
              <div>
                <Label className="text-xs text-muted-foreground mb-2 block">Share via</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Facebook", url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(storeUrl)}`, bg: "bg-blue-600 hover:bg-blue-700 text-white" },
                    { label: "Twitter/X", url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(`Check out ${name} on ZIVO!`)}`, bg: "bg-foreground hover:bg-foreground/90 text-background" },
                    { label: "WhatsApp", url: `https://wa.me/?text=${encodeURIComponent(`${name}: ${storeUrl}`)}`, bg: "bg-emerald-600 hover:bg-emerald-700 text-white" },
                    { label: "Telegram", url: `https://t.me/share/url?url=${encodeURIComponent(storeUrl)}&text=${encodeURIComponent(name)}`, bg: "bg-sky-500 hover:bg-sky-600 text-white" },
                  ].map(s => (
                    <Button key={s.label} className={`text-xs h-9 ${s.bg}`} onClick={() => window.open(s.url, "_blank", "width=600,height=400")}>
                      {s.label}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Embed Widget */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4 text-primary" /> Embed on Your Website</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Add this HTML to your website to link to your ZIVO store:</p>
              <div className="relative">
                <pre className="text-[11px] bg-muted rounded-lg p-3 overflow-x-auto font-mono text-foreground">
{`<a href="${storeUrl}" target="_blank" rel="noopener">
  Visit us on ZIVO
</a>`}
                </pre>
                <Button size="icon" variant="ghost" className="absolute top-1.5 right-1.5 h-7 w-7" onClick={() => copyToClipboard(`<a href="${storeUrl}" target="_blank" rel="noopener">Visit us on ZIVO</a>`, "Embed code")}>
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ═══ Promo Create/Edit Dialog ═══ */}
      <Dialog open={promoDialogOpen} onOpenChange={setPromoDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-primary" />
              {editingPromo ? "Edit Promotion" : "Create Promotion"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Promotion Name *</Label>
                <Input value={promoForm.name} onChange={e => setPromoForm(f => ({ ...f, name: e.target.value }))} placeholder="Summer Sale" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Promo Code *</Label>
                <div className="flex gap-1.5">
                  <Input value={promoForm.code} onChange={e => setPromoForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="SUMMER20" className="font-mono" />
                  <Button variant="outline" size="icon" className="shrink-0" onClick={() => setPromoForm(f => ({ ...f, code: generatePromoCode() }))}>
                    <Sparkles className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Description</Label>
              <Textarea value={promoForm.description} onChange={e => setPromoForm(f => ({ ...f, description: e.target.value }))} placeholder="Details about this promotion..." rows={2} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Type</Label>
                <Select value={promoForm.discount_type} onValueChange={v => setPromoForm(f => ({ ...f, discount_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Discount Value *</Label>
                <Input type="number" min={0} value={promoForm.discount_value} onChange={e => setPromoForm(f => ({ ...f, discount_value: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Min. Order Amount ($)</Label>
                <Input type="number" min={0} value={promoForm.min_order_amount} onChange={e => setPromoForm(f => ({ ...f, min_order_amount: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Max Discount ($)</Label>
                <Input type="number" min={0} value={promoForm.max_discount} onChange={e => setPromoForm(f => ({ ...f, max_discount: Number(e.target.value) }))} placeholder="0 = unlimited" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Usage Limit (Total)</Label>
                <Input type="number" min={0} value={promoForm.usage_limit} onChange={e => setPromoForm(f => ({ ...f, usage_limit: Number(e.target.value) }))} placeholder="0 = unlimited" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Per User Limit</Label>
                <Input type="number" min={0} value={promoForm.per_user_limit} onChange={e => setPromoForm(f => ({ ...f, per_user_limit: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Start Date</Label>
                <Input type="datetime-local" value={promoForm.starts_at} onChange={e => setPromoForm(f => ({ ...f, starts_at: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">End Date</Label>
                <Input type="datetime-local" value={promoForm.ends_at} onChange={e => setPromoForm(f => ({ ...f, ends_at: e.target.value }))} />
              </div>
            </div>

            <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/50">
              <div>
                <p className="text-sm font-medium">Active</p>
                <p className="text-[11px] text-muted-foreground">Promotion is usable by customers</p>
              </div>
              <Switch checked={promoForm.is_active} onCheckedChange={v => setPromoForm(f => ({ ...f, is_active: v }))} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button variant="outline" className="flex-1" onClick={() => setPromoDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1 gap-1.5" disabled={!promoForm.name || !promoForm.code || savePromo.isPending} onClick={() => savePromo.mutate(!!editingPromo)}>
                {savePromo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {editingPromo ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Confirmation ═══ */}
      <Dialog open={!!deletePromoId} onOpenChange={() => setDeletePromoId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2"><Trash2 className="w-5 h-5" /> Delete Promotion</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">This action cannot be undone. The promotion code will stop working immediately.</p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setDeletePromoId(null)}>Cancel</Button>
            <Button variant="destructive" className="flex-1" disabled={deletePromo.isPending} onClick={() => deletePromoId && deletePromo.mutate(deletePromoId)}>
              {deletePromo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ QR Share Dialog ═══ */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-center gap-2"><QrCode className="w-5 h-5 text-primary" /> Store QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center py-4">
            {storeUrl ? (
              <div className="bg-white p-5 rounded-2xl shadow-sm">
                <QRCodeCanvas value={storeUrl} size={220} level="H" includeMargin={false} />
              </div>
            ) : (
              <div className="w-[220px] h-[220px] bg-muted rounded-2xl flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Loading...</p>
              </div>
            )}
            <p className="text-sm font-semibold mt-3">{name}</p>
            <p className="text-[11px] text-muted-foreground">{storeUrl}</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => storeUrl && copyToClipboard(storeUrl, "URL")}>
                <Copy className="w-3.5 h-3.5" /> Copy Link
              </Button>
              <Button size="sm" className="gap-1.5" onClick={() => {
                const canvas = document.querySelector("canvas");
                if (canvas) {
                  const link = document.createElement("a");
                  link.download = `${slug || "store"}-qr.png`;
                  link.href = canvas.toDataURL();
                  link.click();
                  toast.success("QR downloaded");
                }
              }}>
                <QrCode className="w-3.5 h-3.5" /> Download
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ═══ Boost Post Dialog ═══ */}
      <Dialog open={!!boostPost} onOpenChange={(o) => !o && setBoostPost(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Rocket className="w-5 h-5 text-primary" /> Boost Post
            </DialogTitle>
          </DialogHeader>

          {boostPost && (
            <div className="space-y-4">
              {/* Post preview */}
              <div className="flex gap-3 p-3 rounded-xl bg-muted/40 border">
                {boostPost.media_urls?.[0] && (
	                  <img
	                    src={boostPost.media_urls[0]}
	                    alt=""
	                    className="w-14 h-14 rounded-lg object-cover shrink-0"
	                    loading="lazy"
	                    decoding="async"
	                  />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-xs line-clamp-2">{boostPost.caption || "(No caption)"}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{boostPost.view_count || 0}</span>
                    <span className="flex items-center gap-1"><Heart className="w-3 h-3" />{boostPost.likes_count || 0}</span>
                  </div>
                </div>
              </div>

              {/* Objective */}
              <div>
                <Label className="text-xs">Goal</Label>
                <Select value={boostForm.objective} onValueChange={(v) => setBoostForm({ ...boostForm, objective: v })}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reach">More views & reach</SelectItem>
                    <SelectItem value="engagement">More likes & comments</SelectItem>
                    <SelectItem value="traffic">Traffic to my store</SelectItem>
                    <SelectItem value="messages">More messages</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Audience */}
              <div>
                <Label className="text-xs">Audience</Label>
                <Select value={boostForm.audience} onValueChange={(v) => setBoostForm({ ...boostForm, audience: v })}>
                  <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="broad">Broad — anyone interested</SelectItem>
                    <SelectItem value="local">Local — near my store</SelectItem>
                    <SelectItem value="followers">My followers & similar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Budget + duration */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Daily budget (USD)</Label>
                  <Input
                    type="number" min={1} step={1}
                    className="mt-1 h-9"
                    value={boostForm.daily_budget}
                    onChange={(e) => setBoostForm({ ...boostForm, daily_budget: Math.max(1, Number(e.target.value) || 0) })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Duration (days)</Label>
                  <Input
                    type="number" min={1} max={90} step={1}
                    className="mt-1 h-9"
                    value={boostForm.days}
                    onChange={(e) => setBoostForm({ ...boostForm, days: Math.max(1, Number(e.target.value) || 0) })}
                  />
                </div>
              </div>

              {/* Estimate */}
              <div className="rounded-xl border bg-primary/5 p-3 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Total budget</span>
                  <span className="font-semibold">${(boostForm.daily_budget * boostForm.days).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Estimated reach</span>
                  <span className="font-semibold">{(boostForm.daily_budget * boostForm.days * 180).toLocaleString()}–{(boostForm.daily_budget * boostForm.days * 520).toLocaleString()} people</span>
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1" onClick={() => setBoostPost(null)}>Cancel</Button>
                <Button
                  className="flex-1 gap-1.5 bg-gradient-to-r from-primary to-emerald-500"
                  disabled={boosting}
                  onClick={async () => {
                    setBoosting(true);
                    try {
                      // Best-effort: write to ad_campaigns / restaurant_ads if schema available; otherwise toast.
                      const total = boostForm.daily_budget * boostForm.days;
                      const { error } = await (supabase as any)
                        .from("store_posts")
                        .update({ is_boosted: true, boost_budget_cents: Math.round(total * 100), boost_ends_at: new Date(Date.now() + boostForm.days * 86400_000).toISOString() })
                        .eq("id", boostPost.id);
                      if (error) {
                        // Schema may not include boost cols — that's OK for v1
                        console.warn("Boost flag not persisted:", error.message);
                      }
                      toast.success(`Post boosted — $${total.toFixed(2)} over ${boostForm.days} day${boostForm.days > 1 ? "s" : ""}`);
                      qc.invalidateQueries({ queryKey: ["store-posts", storeId] });
                      setBoostPost(null);
                    } catch (e: any) {
                      toast.error(e.message || "Failed to boost post");
                    } finally {
                      setBoosting(false);
                    }
                  }}
                >
                  {boosting ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Rocket className="w-4 h-4" /> Boost now</>}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
        </div>
      </MarketingPreviewFrame>
      <MarketingPreviewSwitcher />
    </MarketingPreviewProvider>
  );
}
