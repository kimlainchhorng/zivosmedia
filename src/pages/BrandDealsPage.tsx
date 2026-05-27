/**
 * BrandDealsPage — Creator brand partnerships marketplace.
 * Browseable list of brand campaigns, eligibility checks, and a status banner
 * showing the creator's earning potential. Mock data for v1 — structure is
 * real (a `brand_campaigns` table can populate this without UI changes).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Handshake, Sparkles, Users, CheckCircle2, DollarSign, Filter, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type Category = "All" | "Travel" | "Hospitality" | "Lifestyle" | "Tech" | "Food";

interface Campaign {
  id: string;
  brand: string;
  logo: string;
  title: string;
  payout: number; // USD
  payoutType: "per_post" | "per_1k_views" | "flat";
  category: Category;
  minFollowers: number;
  deadline: string;
  description: string;
  tags: string[];
}

const MOCK_CAMPAIGNS: Campaign[] = [
  {
    id: "c1",
    brand: "Marriott Bonvoy",
    logo: "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=200",
    title: "Weekend Stay Highlight Reel",
    payout: 500,
    payoutType: "per_post",
    category: "Hospitality",
    minFollowers: 500,
    deadline: "30 days",
    description: "Create one 30s reel showcasing a Marriott property of your choice during a 1-2 night stay.",
    tags: ["reel", "hotel", "stay"],
  },
  {
    id: "c2",
    brand: "Airalo eSIM",
    logo: "https://images.unsplash.com/photo-1551434678-e076c223a692?w=200",
    title: "Connectivity-in-30 Stories",
    payout: 75,
    payoutType: "per_post",
    category: "Travel",
    minFollowers: 100,
    deadline: "14 days",
    description: "Post 2 stories during a trip showing how Airalo kept you connected. Affiliate link auto-attached.",
    tags: ["story", "tech", "travel"],
  },
  {
    id: "c3",
    brand: "Away Luggage",
    logo: "https://images.unsplash.com/photo-1565026057447-bc90a3dceb87?w=200",
    title: "365-Day Carry-On Review",
    payout: 1200,
    payoutType: "flat",
    category: "Lifestyle",
    minFollowers: 2000,
    deadline: "Open",
    description: "Receive a complimentary carry-on. Post one long-form reel after 30 days of use.",
    tags: ["reel", "review", "long-form"],
  },
  {
    id: "c4",
    brand: "Booking.com",
    logo: "https://images.unsplash.com/photo-1571867424488-4565932edb41?w=200",
    title: "Hidden Gem Discovery",
    payout: 5,
    payoutType: "per_1k_views",
    category: "Travel",
    minFollowers: 1000,
    deadline: "60 days",
    description: "Feature a lesser-known property booked through Booking.com. Earnings scale with views.",
    tags: ["reel", "discovery", "scaling"],
  },
  {
    id: "c5",
    brand: "GoPro",
    logo: "https://images.unsplash.com/photo-1606107557195-0e29a4b5b4aa?w=200",
    title: "Adventure POV Series",
    payout: 800,
    payoutType: "per_post",
    category: "Lifestyle",
    minFollowers: 5000,
    deadline: "Rolling",
    description: "Submit 1-3 POV adventure clips. Higher engagement = higher tier eligibility.",
    tags: ["reel", "adventure", "POV"],
  },
];

const CATEGORIES: Category[] = ["All", "Travel", "Hospitality", "Lifestyle", "Tech", "Food"];

function formatPayout(c: Campaign): string {
  if (c.payoutType === "per_post") return `$${c.payout} per post`;
  if (c.payoutType === "per_1k_views") return `$${c.payout} per 1K views`;
  return `$${c.payout} flat`;
}

export default function BrandDealsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeCategory, setActiveCategory] = useState<Category>("All");

  // Live follower count drives eligibility — same query pattern as elsewhere.
  const { data: followerCount = 0 } = useQuery({
    queryKey: ["brand-deals-followers", user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const sb = supabase as unknown as {
        from: (t: string) => {
          select: (s: string, opts?: { count: "exact"; head: boolean }) => {
            eq: (k: string, v: string) => Promise<{ count: number | null }>;
          };
        };
      };
      const { count } = await sb
        .from("followers")
        .select("id", { count: "exact", head: true })
        .eq("following_id", user.id);
      return count ?? 0;
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const filtered = activeCategory === "All"
    ? MOCK_CAMPAIGNS
    : MOCK_CAMPAIGNS.filter((c) => c.category === activeCategory);

  const eligibleCount = MOCK_CAMPAIGNS.filter((c) => followerCount >= c.minFollowers).length;
  const maxEarning = MOCK_CAMPAIGNS
    .filter((c) => followerCount >= c.minFollowers && c.payoutType === "per_post")
    .reduce((sum, c) => sum + c.payout, 0);

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Brand Deals · ZIVO" description="Connect with brands for sponsorships and partnerships." noIndex />

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
              <Handshake className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Brand Deals</h1>
          </div>
          <Button
            aria-label="Filter deals"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
          >
            <Filter className="h-5 w-5 text-foreground" />
          </Button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto pb-12">
        {/* Earnings potential banner */}
        <div className="px-4 pt-5">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
          >
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
            <div className="relative z-10">
              <p className="text-xs font-semibold uppercase tracking-wider text-white/80">Your potential</p>
              <p className="text-3xl font-bold leading-tight mt-1">
                ${maxEarning.toLocaleString()} <span className="text-base font-medium text-white/80">/ post combined</span>
              </p>
              <div className="flex items-center gap-4 mt-3 text-sm">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  {eligibleCount} of {MOCK_CAMPAIGNS.length} eligible
                </span>
                <span className="flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {followerCount.toLocaleString()} followers
                </span>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Category chips */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-4">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all",
                activeCategory === cat
                  ? "bg-ig-gradient text-white shadow-sm"
                  : "bg-secondary text-foreground hover:bg-muted",
              )}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Campaign cards */}
        <div className="px-4 space-y-3">
          {filtered.map((c, idx) => {
            const eligible = followerCount >= c.minFollowers;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="rounded-2xl bg-card border border-border overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-start gap-3">
                    <img
                      src={c.logo}
	                      alt={c.brand}
	                      className="w-12 h-12 rounded-xl object-cover shrink-0"
	                      loading="lazy"
	                      decoding="async"
	                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{c.brand}</p>
                        {eligible && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 rounded-full">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Eligible
                          </span>
                        )}
                      </div>
                      <p className="text-[15px] font-bold text-foreground leading-tight mt-0.5">{c.title}</p>
                      <p className="text-sm text-muted-foreground leading-snug mt-1.5 line-clamp-2">{c.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mt-3 pt-3 border-t border-border/60">
                    <div className="flex items-center gap-1 text-sm font-bold text-foreground">
                      <DollarSign className="h-3.5 w-3.5 text-ig-gradient" />
                      {formatPayout(c)}
                    </div>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs text-muted-foreground">{c.deadline}</span>
                    {!eligible && (
                      <>
                        <span className="text-xs text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">
                          Needs {(c.minFollowers - followerCount).toLocaleString()} more followers
                        </span>
                      </>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={!eligible}
                  className={cn(
                    "w-full h-11 flex items-center justify-center gap-1.5 text-sm font-bold transition-opacity",
                    eligible
                      ? "bg-ig-gradient text-white hover:opacity-90 active:opacity-80"
                      : "bg-muted text-muted-foreground cursor-not-allowed",
                  )}
                >
                  {eligible ? (
                    <>
                      Apply now <ExternalLink className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    "Locked"
                  )}
                </button>
              </motion.div>
            );
          })}
        </div>

        <p className="text-[11px] text-muted-foreground text-center px-6 pt-8">
          Showcasing partnership opportunities. Brand applications open in beta.
        </p>
      </div>
    </SwipeBackContainer>
  );
}
