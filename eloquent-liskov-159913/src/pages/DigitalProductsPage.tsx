/**
 * DigitalProductsPage — Real Supabase data, ZIVO Signature Design
 */
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, PenTool, BookOpen, Video, FileText, Image, Music,
  Download, DollarSign, Plus, ChevronRight, Star, Users, Eye,
  TrendingUp, Package, Zap, Lock, Globe, BarChart3, Palette, Sparkles, X, Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const productTypes = [
  { icon: BookOpen, title: "Online Course", desc: "Create video courses with chapters, quizzes, and certificates.", accent: "hsl(263 70% 58%)" },
  { icon: FileText, title: "E-Book / Guide", desc: "Sell PDF guides, checklists, and written content.", accent: "hsl(221 83% 53%)" },
  { icon: Palette, title: "Templates & Presets", desc: "Design templates, photo presets, and creative assets.", accent: "hsl(340 75% 55%)" },
  { icon: Video, title: "Video Tutorials", desc: "Premium video content with pay-per-view access.", accent: "hsl(0 84% 60%)" },
  { icon: Music, title: "Audio & Music", desc: "Sell beats, sound effects, podcasts, and audio courses.", accent: "hsl(38 92% 50%)" },
  { icon: Package, title: "Digital Bundle", desc: "Package multiple products together at a discounted rate.", accent: "hsl(142 71% 45%)" },
];

const features = [
  { icon: Lock, title: "Secure Delivery", desc: "Files encrypted and only accessible to paying customers.", accent: "hsl(0 84% 60%)" },
  { icon: Globe, title: "Global Reach", desc: "Sell worldwide with multi-currency support.", accent: "hsl(221 83% 53%)" },
  { icon: BarChart3, title: "Sales Analytics", desc: "Track revenue, conversions, and customer behavior.", accent: "hsl(263 70% 58%)" },
  { icon: Zap, title: "Instant Delivery", desc: "Automatic file delivery upon purchase.", accent: "hsl(38 92% 50%)" },
  { icon: Star, title: "Reviews & Ratings", desc: "Build trust with customer reviews.", accent: "hsl(340 75% 55%)" },
  { icon: TrendingUp, title: "Affiliate System", desc: "Let others promote your products.", accent: "hsl(142 71% 45%)" },
];

export default function DigitalProductsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedType, setSelectedType] = useState<typeof productTypes[number] | null>(null);
  const [productTitle, setProductTitle] = useState("");
  const [productDesc, setProductDesc] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleCreateProduct = async () => {
    if (!productTitle.trim() || !selectedType) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from("feedback_submissions").insert({
        category: "digital_product",
        subject: `New ${selectedType.title}: ${productTitle}`,
        message: `Type: ${selectedType.title}\nTitle: ${productTitle}\nDescription: ${productDesc}\nPrice: $${productPrice || "0"}`,
        user_id: user?.id ?? null,
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Product submitted for review!");
      setTimeout(() => {
        setSelectedType(null);
        setProductTitle("");
        setProductDesc("");
        setProductPrice("");
        setSubmitted(false);
        setActiveTab(0);
      }, 1800);
    } catch {
      toast.error("Failed to submit product. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };
  const tabs = ["My Products", "Create New", "Analytics"];

  // Real creator data
  const { data: creator } = useQuery({
    queryKey: ["digital-creator-profile", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("creator_profiles").select("total_earnings_cents").eq("user_id", user!.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: subscribers = [] } = useQuery({
    queryKey: ["digital-subs", user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).from("creator_subscriptions").select("id").eq("creator_id", user!.id).eq("status", "active").limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const stats = [
    { label: "Total Revenue", value: `$${((creator?.total_earnings_cents || 0) / 100).toFixed(2)}`, icon: DollarSign, accent: "hsl(142 71% 45%)" },
    { label: "Products", value: "0", icon: Package, accent: "hsl(221 83% 53%)" },
    { label: "Customers", value: String(subscribers.length), icon: Users, accent: "hsl(263 70% 58%)" },
    { label: "Downloads", value: "0", icon: Download, accent: "hsl(38 92% 50%)" },
  ];

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="Digital Products – ZIVO" description="Create and sell digital products on ZIVO." noIndex />

      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30 zivo-ribbon">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("/more")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-extrabold flex-1 tracking-tight">Digital Products</h1>
          <PenTool className="h-5 w-5 text-primary" />
        </div>
      </div>

      <div className="px-4 py-5 space-y-6 zivo-aurora">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-2.5">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              className="zivo-card-organic p-3.5 text-center"
            >
              <div className="zivo-icon-pill mx-auto mb-1.5 w-9 h-9 rounded-xl" style={{ color: s.accent, background: `${s.accent}15` }}>
                <s.icon className="w-4 h-4" style={{ color: s.accent }} />
              </div>
              <p className="text-lg font-extrabold">{s.value}</p>
              <p className="text-[10px] text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((tab, i) => (
            <button type="button"
              key={tab}
              onClick={() => setActiveTab(i)}
              className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors touch-manipulation ${
                i === activeTab ? "bg-foreground text-background" : "bg-muted/60 text-muted-foreground"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="zivo-card-organic p-8 text-center border-dashed"
          >
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Package className="w-7 h-7 text-white" />
            </div>
            <p className="font-bold text-sm mb-1 text-foreground">No products yet</p>
            <p className="text-xs text-muted-foreground mb-4">Start selling by creating your first digital product.</p>
            <button type="button"
              onClick={() => setActiveTab(1)}
              className="zivo-btn-signature px-5 py-2.5 text-xs inline-flex items-center gap-1.5 touch-manipulation"
            >
              <Plus className="w-3 h-3" /> Create Product
            </button>
          </motion.div>
        )}

        {activeTab === 1 && (
          <div>
            <AnimatePresence mode="wait">
              {!selectedType ? (
                <motion.div key="type-list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Choose Product Type
                  </h2>
                  <div className="space-y-1.5">
                    {productTypes.map((type, i) => (
                      <motion.button
                        key={type.title}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.04 }}
                        onClick={() => setSelectedType(type)}
                        className="w-full zivo-card-organic flex items-start gap-3 p-3.5 text-left touch-manipulation"
                      >
                        <div className="zivo-icon-pill w-10 h-10 rounded-xl shrink-0" style={{ color: type.accent, background: `${type.accent}15` }}>
                          <type.icon className="w-5 h-5" style={{ color: type.accent }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[13px]">{type.title}</p>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">{type.desc}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-2" />
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                <motion.div key="create-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setSelectedType(null)} className="p-2 rounded-full hover:bg-muted/50 touch-manipulation">
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 flex-1">
                      <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center" style={{ color: selectedType.accent, background: `${selectedType.accent}15` }}>
                        <selectedType.icon className="w-4 h-4" />
                      </div>
                      <h2 className="font-bold text-[15px]">Create {selectedType.title}</h2>
                    </div>
                  </div>

                  {submitted ? (
                    <div className="zivo-card-organic p-8 text-center">
                      <div className="w-14 h-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
                        <Check className="w-7 h-7 text-emerald-500" />
                      </div>
                      <p className="font-bold text-sm">Submitted for review!</p>
                      <p className="text-xs text-muted-foreground mt-1">Your product will be live after review.</p>
                    </div>
                  ) : (
                    <div className="zivo-card-organic p-4 space-y-3">
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Product Title *</label>
                        <Input value={productTitle} onChange={e => setProductTitle(e.target.value)} placeholder={`e.g. "Complete ${selectedType.title} Bundle"`} className="text-sm" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Description</label>
                        <Textarea value={productDesc} onChange={e => setProductDesc(e.target.value)} placeholder="What's included? Who is it for?" className="text-sm min-h-[80px]" />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Price (USD)</label>
                        <Input type="number" min="0" step="0.01" value={productPrice} onChange={e => setProductPrice(e.target.value)} placeholder="9.99" className="text-sm" />
                      </div>
                      <Button className="w-full" onClick={handleCreateProduct} disabled={submitting || !productTitle.trim()}>
                        {submitting ? "Submitting…" : "Submit Product"}
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {activeTab === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="zivo-card-organic p-6 text-center border-dashed"
          >
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <BarChart3 className="w-7 h-7 text-white" />
            </div>
            <p className="font-bold text-sm mb-1 text-foreground">No data yet</p>
            <p className="text-xs text-muted-foreground">Create and sell products to see analytics here.</p>
          </motion.div>
        )}

        {/* Platform Features */}
        <div>
          <h2 className="font-bold text-[15px] mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" /> Platform Features
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.04 }}
                className="zivo-card-organic p-3.5"
              >
                <div className="zivo-icon-pill w-8 h-8 rounded-lg mb-2" style={{ color: f.accent, background: `${f.accent}15` }}>
                  <f.icon className="w-4 h-4" style={{ color: f.accent }} />
                </div>
                <p className="font-bold text-[12px] mb-0.5">{f.title}</p>
                <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2.5">
          {[
            { label: "Monetization", icon: DollarSign, href: "/monetization", accent: "hsl(142 71% 45%)" },
            { label: "Affiliate Hub", icon: TrendingUp, href: "/affiliate-hub", accent: "hsl(172 66% 50%)" },
            { label: "Dashboard", icon: BarChart3, href: "/creator-dashboard", accent: "hsl(198 93% 59%)" },
            { label: "ZIVO Shop", icon: Package, href: "/shop-dashboard", accent: "hsl(142 71% 45%)" },
          ].map((a) => (
            <Link key={a.label} to={a.href}>
              <div className="zivo-card-organic p-3.5 flex items-center gap-3 touch-manipulation">
                <div className="zivo-icon-pill w-9 h-9 rounded-xl" style={{ color: a.accent, background: `${a.accent}15` }}>
                  <a.icon className="w-4 h-4" style={{ color: a.accent }} />
                </div>
                <span className="text-xs font-bold">{a.label}</span>
              </div>
            </Link>
          ))}
        </div>

        <div className="flex justify-center pt-4">
          <span className="text-[10px] text-muted-foreground/30 font-semibold tracking-widest uppercase">ZIVO Digital • 2026</span>
        </div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
