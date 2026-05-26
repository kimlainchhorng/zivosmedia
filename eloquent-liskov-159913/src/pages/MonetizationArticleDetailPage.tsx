/**
 * MonetizationArticleDetailPage — Dynamic article viewer
 * Generates rich, unique content based on the article slug
 */
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Share2, Bookmark, ThumbsUp, Clock,
  ChevronRight, Star, Sparkles, Heart, CheckCircle,
  BookOpen, TrendingUp, Users, Zap, Crown, Gift,
  Video, DollarSign, MessageCircle, Target, Shield,
} from "lucide-react";
import { toast } from "sonner";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";

/* ─── Content generation based on slug keywords ─── */
const TOPIC_CONTENT: Record<string, { sections: { heading: string; body: string }[]; tips: string[]; stats: string[] }> = {
  monetiz: {
    sections: [
      { heading: "Understanding ZIVO Monetization", body: "ZIVO offers multiple revenue streams for creators at every level. From the Creator Rewards Program to brand partnerships, you can earn from views, engagement, subscriptions, LIVE gifts, and direct product sales through ZIVO Shop." },
      { heading: "Eligibility Requirements", body: "To start earning on ZIVO, you'll need to meet certain thresholds: 1,000+ followers, 10,000+ video views in the last 30 days, and an account in good standing. Once eligible, visit your Creator Dashboard to enroll in monetization programs." },
      { heading: "Maximizing Your Earnings", body: "Top creators diversify their income. Combine Creator Rewards with Subscriptions, LIVE gifts, and Shop sales. Creators who use 3+ monetization features earn on average 4.2x more than single-stream creators." },
      { heading: "Payment Processing", body: "ZIVO processes payments monthly. Earnings above $50 are automatically transferred to your linked bank account or PayPal. You can track all earnings, pending payouts, and payment history in your Creator Dashboard." },
    ],
    tips: ["Post consistently to maintain your Creator Rewards eligibility", "Go LIVE at least once per week to unlock bonus gift multipliers", "Use shoppable tags in every product-related video", "Respond to subscriber comments within 24 hours to boost retention"],
    stats: ["Creators earn an average of $0.02-0.04 per 1,000 views", "LIVE streamers earn 3x more than video-only creators", "Shop-enabled creators see 40% higher per-follower revenue"],
  },
  reward: {
    sections: [
      { heading: "How Creator Rewards Work", body: "The Creator Rewards Program pays you based on the quality and performance of your content. Unlike simple view-based payouts, ZIVO considers engagement rate, watch time, audience quality, and content originality." },
      { heading: "Qualifying for Rewards", body: "To qualify, your content must be original, follow Community Guidelines, and meet minimum performance thresholds. Videos that receive high completion rates and meaningful engagement are prioritized." },
      { heading: "RPM and Earnings Factors", body: "Your Revenue Per Mille (RPM) depends on several factors: audience geography, content category, seasonality, and engagement quality. Finance, tech, and lifestyle content typically commands higher RPMs." },
      { heading: "Reward Tiers", body: "ZIVO has three reward tiers: Silver (1K-10K followers), Gold (10K-100K), and Platinum (100K+). Higher tiers unlock bonus multipliers, priority support, and exclusive brand partnership opportunities." },
    ],
    tips: ["Focus on watch time — videos with 80%+ completion rate earn 2x more", "Create content in high-RPM categories when authentic to your niche", "Publish during peak hours (6-9 PM local time) for maximum initial engagement"],
    stats: ["Top 10% of creators earn 90% of total rewards", "Average RPM ranges from $1.50 to $8.00 depending on niche", "Platinum creators earn 2.5x bonus on all rewards"],
  },
  live: {
    sections: [
      { heading: "Getting Started with ZIVO LIVE", body: "ZIVO LIVE lets you connect with your audience in real-time. To go LIVE, you need at least 1,000 followers. Once unlocked, you can stream directly from the ZIVO app or use OBS for a professional setup." },
      { heading: "LIVE Monetization Features", body: "During LIVE streams, viewers can send virtual gifts that convert to diamonds and then to real money. You can also host LIVE shopping events, charge for exclusive LIVE access, and earn from LIVE subscriptions." },
      { heading: "Growing Your LIVE Audience", body: "Schedule your LIVEs in advance to build anticipation. Use countdown stickers in your feed posts. Engage actively with chat — respond to comments by name. The more interactive your stream, the more gifts you'll receive." },
      { heading: "LIVE Battles and Events", body: "LIVE Battles pit you against another creator in a friendly competition for gifts. The winner receives a visibility boost. Multi-guest LIVEs allow up to 4 creators to stream together for panel discussions and collaborations." },
    ],
    tips: ["Go LIVE at the same time each week to build a habit with your audience", "Acknowledge gift senders by name to encourage more gifts", "Use LIVE replays to create highlight clips for your feed", "Host weekly Q&A sessions — they consistently get the highest engagement"],
    stats: ["Average LIVE session earns $15-$50 in gifts for mid-tier creators", "Scheduled LIVEs get 3x more initial viewers than spontaneous ones", "LIVE Battles increase gift revenue by an average of 65%"],
  },
  subscri: {
    sections: [
      { heading: "What is ZIVO Subscription?", body: "ZIVO Subscription lets fans pay a monthly fee to access exclusive content, badges, and perks. As a creator, you set the price (from $0.99 to $99.99/month) and decide what exclusive benefits subscribers receive." },
      { heading: "Setting Up Your Subscription", body: "Go to Creator Dashboard > Monetization > Subscription. Choose your price tier, create a welcome message, and define at least 3 subscriber-only perks. ZIVO takes a 30% platform fee; you keep 70% of subscription revenue." },
      { heading: "Subscriber-Only Content Ideas", body: "Behind-the-scenes footage, early access to new videos, exclusive LIVE streams, subscriber-only polls, custom badges, and direct message access are the most popular perks. Mix content types to keep subscribers engaged." },
      { heading: "Retention Strategies", body: "The average subscriber stays for 3.5 months. To improve retention: deliver value consistently, engage with subscribers personally, offer loyalty rewards for long-term subscribers, and create exclusive series content." },
    ],
    tips: ["Start with a low price point ($2.99-$4.99) and increase as you add more perks", "Post subscriber-only content at least 3x per week", "Create a subscriber welcome video that sets expectations", "Run limited-time subscription promotions during content launches"],
    stats: ["Top subscription creators earn $5,000-$50,000/month", "Creators with 10+ exclusive posts per month see 45% less churn", "Subscriber-only LIVE streams convert 3x better than public LIVEs"],
  },
  brand: {
    sections: [
      { heading: "Landing Brand Partnerships", body: "Brands on ZIVO look for creators with authentic engagement, consistent content quality, and audience alignment. Your follower count matters less than your engagement rate and audience demographics." },
      { heading: "Creating Your Media Kit", body: "A professional media kit includes: your bio, content examples, audience demographics, engagement metrics, past brand work, and rate card. Keep it visual, concise, and updated monthly with fresh metrics." },
      { heading: "Negotiating Brand Deals", body: "Know your worth. Typical rates: $100-$500 per 10K followers for a single post. Negotiate usage rights, exclusivity windows, and payment terms separately. Never accept below your minimum — it devalues your work." },
      { heading: "Disclosure and Compliance", body: "FTC requires clear disclosure of sponsored content. Use #ad or #sponsored prominently. ZIVO's branded content toggle automatically adds a 'Paid Partnership' label. Always disclose — it builds trust with your audience." },
    ],
    tips: ["Pitch brands that you already use and love — authenticity shows", "Include performance metrics from past brand deals in your proposals", "Negotiate for product gifting + payment rather than just product alone", "Build relationships with brand managers for repeat partnerships"],
    stats: ["Creators with 3%+ engagement rate get 5x more brand inquiries", "Video ads on ZIVO see 2.3x higher completion rates than other platforms", "Average brand deal is $250-$2,000 for mid-tier creators"],
  },
  shop: {
    sections: [
      { heading: "Setting Up ZIVO Shop", body: "ZIVO Shop lets you sell physical products, digital downloads, and merchandise directly from your profile. Set up takes under 10 minutes. Add products with photos, descriptions, pricing, and shipping details." },
      { heading: "Content-to-Commerce Strategy", body: "The most effective approach is shoppable content — tag products directly in your videos. Viewers can tap to buy without leaving ZIVO. Product demo videos convert 4x better than static product photos." },
      { heading: "Managing Orders and Fulfillment", body: "Track orders from your Shop Dashboard. Process shipping labels, handle returns, and manage inventory. For digital products, delivery is automatic after purchase. Consider using fulfillment partners for physical goods." },
      { heading: "Growing Your Shop Revenue", body: "Run flash sales during LIVE streams, create product bundles, offer subscriber discounts, and use limited-edition drops to create urgency. Consistent product content keeps your shop top-of-mind." },
    ],
    tips: ["Showcase products in use, not just on display", "Use LIVE shopping events for launch days — they convert 6x better", "Offer exclusive subscriber-only discounts to drive subscriptions too", "Respond to product questions within 1 hour for best conversion"],
    stats: ["Shoppable videos convert at 2.5x the rate of link-in-bio", "Average order value is $35-$65 for creator-branded products", "LIVE shopping events see 10x engagement vs. standard product posts"],
  },
  growth: {
    sections: [
      { heading: "The Growth Mindset", body: "Growth on ZIVO isn't just about follower counts — it's about building a sustainable audience that engages with your content. Focus on watch time, saves, and shares as your primary growth metrics." },
      { heading: "Content Optimization", body: "The first 3 seconds determine 70% of your video's success. Use strong hooks, maintain pacing, and end with a clear call-to-action. Test different formats and analyze which content types perform best." },
      { heading: "Algorithm-Friendly Practices", body: "ZIVO's algorithm favors: high completion rates, early engagement velocity, diverse audience reach, and consistent posting. Post 3-5 times per week, respond to comments quickly, and engage with your niche community." },
      { heading: "Scaling Your Presence", body: "Once you hit 10K followers, focus on collaboration, cross-platform promotion, and community building. Create a content calendar, batch-produce content, and consider building a team as you scale." },
    ],
    tips: ["Post your best content on Tuesday-Thursday evenings for maximum reach", "Collaborate with creators who have a similar-sized audience in adjacent niches", "Use trending sounds within the first 24 hours they appear", "Analyze your top 10 videos monthly and replicate their patterns"],
    stats: ["Creators who post 5x/week grow 3x faster than those posting 2x/week", "Videos using trending sounds get 40% more distribution", "The first hour of engagement determines 80% of a video's total reach"],
  },
  safety: {
    sections: [
      { heading: "Protecting Your Account", body: "Enable two-factor authentication, use a unique strong password, and never share your login credentials. Review connected apps regularly and revoke access to anything you don't actively use." },
      { heading: "Recognizing Scams", body: "Common scams targeting creators: fake brand deals requesting upfront payment, phishing emails impersonating ZIVO, fake verification services, and 'growth hacking' services. ZIVO will never ask for your password via email or DM." },
      { heading: "Content Safety", body: "Follow Community Guidelines to keep your account in good standing. Use content warnings for sensitive topics, properly disclose sponsored content, and respect copyright and intellectual property." },
      { heading: "Mental Health and Wellness", body: "Creator burnout is real. Set boundaries for screen time, take regular breaks, don't compare yourself to others, and remember that your worth isn't defined by metrics. ZIVO offers creator wellness resources in the Help Center." },
    ],
    tips: ["Enable login notifications to be alerted of unauthorized access attempts", "Never click links in DMs from unknown accounts claiming to be ZIVO staff", "Report suspicious accounts immediately — it helps protect the community", "Take at least one full day offline per week to recharge"],
    stats: ["2FA reduces account compromise risk by 99.9%", "85% of 'brand deal' DMs from unverified accounts are scams", "Creators who take regular breaks report 40% higher satisfaction"],
  },
};

function getContentForSlug(slug: string) {
  const lower = slug.toLowerCase();
  for (const [key, content] of Object.entries(TOPIC_CONTENT)) {
    if (lower.includes(key)) return content;
  }
  // Default content
  return TOPIC_CONTENT.growth;
}

const RELATED_ARTICLES = [
  "Creator Rewards Program",
  "Getting started with Subscription",
  "Going LIVE on ZIVO",
  "Building a loyal community",
  "ZIVO Shop setup guide",
  "Growing from 0 to 1K followers",
  "Understanding the ZIVO algorithm",
  "Branded content best practices",
  "Protecting your account",
  "Content strategy masterclass",
];

export default function MonetizationArticleDetailPage() {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const title = slug
    ? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
    : "Article";

  const content = getContentForSlug(slug || "");

  // Pick 4 random related articles (different from current)
  const relatedArticles = RELATED_ARTICLES
    .filter((a) => !a.toLowerCase().includes((slug || "").replace(/-/g, " ").slice(0, 15).toLowerCase()))
    .slice(0, 4);

  // Compute real read time from content word count (~225 wpm average reading speed)
  const wordCount = (() => {
    let words = 0;
    for (const section of content.sections) {
      words += section.heading.split(/\s+/).filter(Boolean).length;
      words += section.body.split(/\s+/).filter(Boolean).length;
    }
    for (const tip of content.tips) words += tip.split(/\s+/).filter(Boolean).length;
    return words;
  })();
  const readTime = `${Math.max(1, Math.round(wordCount / 225))} min read`;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title={`${title} – ZIVO Creator Academy`} description={`Learn about ${title} on ZIVO.`} />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold flex-1 text-center truncate">{title}</h1>
          <div className="flex items-center gap-1">
            <button type="button"
              onClick={() => { toast.success("Link copied!"); navigator.clipboard?.writeText(window.location.href); }}
              className="p-2 rounded-full hover:bg-muted/50 touch-manipulation"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <button type="button"
              onClick={() => { setSaved(!saved); toast.success(saved ? "Removed from saved" : "Article saved!"); }}
              className={`p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation ${saved ? "text-primary" : ""}`}
            >
              <Bookmark className={`h-4 w-4 ${saved ? "fill-primary" : ""}`} />
            </button>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 py-5 space-y-6"
      >
        {/* Hero Banner */}
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-accent/10 p-6 flex items-center justify-center min-h-[160px] relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,hsl(var(--primary)/0.15),transparent_70%)]" />
          <div className="h-16 w-16 rounded-2xl bg-primary/20 flex items-center justify-center relative z-10">
            <Sparkles className="h-8 w-8 text-primary" />
          </div>
        </div>

        {/* Title & Meta */}
        <div>
          <h2 className="text-2xl font-bold leading-tight mb-3">{title}</h2>
          <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {readTime}</span>
            <span className="flex items-center gap-1"><Star className="w-3 h-3" /> ZIVO Academy</span>
          </div>
        </div>

        {/* Article Content — Dynamic sections based on topic */}
        <div className="space-y-5">
          {content.sections.map((section, i) => (
            <motion.div
              key={section.heading}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.08 }}
            >
              <h3 className="text-base font-bold text-foreground mb-2">{section.heading}</h3>
              <p className="text-sm leading-relaxed text-foreground/85">{section.body}</p>
            </motion.div>
          ))}
        </div>

        {/* Pro Tips */}
        <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 space-y-3">
          <p className="text-xs font-bold text-primary flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> Pro Tips
          </p>
          {content.tips.map((tip, i) => (
            <div key={i} className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0 mt-0.5" />
              <p className="text-xs text-foreground/80 leading-relaxed">{tip}</p>
            </div>
          ))}
        </div>

        {/* Key Stats */}
        <div className="rounded-xl bg-muted/30 border border-border/40 p-4 space-y-3">
          <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500" /> Key Statistics
          </p>
          {content.stats.map((stat, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-primary mt-0.5 text-xs">📊</span>
              <p className="text-xs text-muted-foreground leading-relaxed">{stat}</p>
            </div>
          ))}
        </div>

        {/* Quick Action Cards */}
        <div className="grid grid-cols-2 gap-3">
          <button type="button"
            onClick={() => navigate("/creator-dashboard")}
            className="rounded-xl border border-border/40 bg-card p-3 text-left touch-manipulation active:scale-[0.97] transition-transform"
          >
            <Crown className="w-5 h-5 text-amber-500 mb-2" />
            <p className="text-xs font-bold">Creator Dashboard</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">View your earnings</p>
          </button>
          <button type="button"
            onClick={() => navigate("/monetization")}
            className="rounded-xl border border-border/40 bg-card p-3 text-left touch-manipulation active:scale-[0.97] transition-transform"
          >
            <DollarSign className="w-5 h-5 text-emerald-500 mb-2" />
            <p className="text-xs font-bold">Monetization Hub</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Explore programs</p>
          </button>
          <button type="button"
            onClick={() => navigate("/shop-dashboard")}
            className="rounded-xl border border-border/40 bg-card p-3 text-left touch-manipulation active:scale-[0.97] transition-transform"
          >
            <Gift className="w-5 h-5 text-foreground mb-2" />
            <p className="text-xs font-bold">ZIVO Shop</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Sell products</p>
          </button>
          <button type="button"
            onClick={() => navigate("/account/settings")}
            className="rounded-xl border border-border/40 bg-card p-3 text-left touch-manipulation active:scale-[0.97] transition-transform"
          >
            <Shield className="w-5 h-5 text-blue-500 mb-2" />
            <p className="text-xs font-bold">Account Settings</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Verify identity</p>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 py-3 border-t border-border/30">
          <button type="button"
            onClick={() => { setLiked(!liked); toast.success(liked ? "Removed" : "Marked as helpful!"); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold touch-manipulation active:scale-95 transition-all ${liked ? "bg-primary/15 text-primary" : "bg-muted/50"}`}
          >
            <ThumbsUp className={`w-3.5 h-3.5 ${liked ? "fill-primary" : ""}`} /> Helpful
          </button>
          <button type="button"
            onClick={() => { toast.success("Link copied!"); navigator.clipboard?.writeText(window.location.href); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-muted/50 text-xs font-semibold touch-manipulation active:scale-95 transition-transform"
          >
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          <button type="button"
            onClick={() => { setSaved(!saved); toast.success(saved ? "Removed" : "Saved!"); }}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-xs font-semibold touch-manipulation active:scale-95 transition-all ${saved ? "bg-primary/15 text-primary" : "bg-muted/50"}`}
          >
            <Bookmark className={`w-3.5 h-3.5 ${saved ? "fill-primary" : ""}`} /> Save
          </button>
        </div>

        {/* Related Articles */}
        <div>
          <h3 className="font-bold text-base mb-3">Related Articles</h3>
          <div className="space-y-2">
            {relatedArticles.map((related) => (
              <button type="button"
                key={related}
                onClick={() => navigate(`/monetization/articles/${related.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card text-left touch-manipulation active:scale-[0.98] transition-transform"
              >
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <BookOpen className="w-4 h-4 text-primary" />
                </div>
                <p className="text-[13px] font-semibold flex-1">{related}</p>
                <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
              </button>
            ))}
          </div>
        </div>

        {/* Browse All */}
        <button type="button"
          onClick={() => navigate("/monetization/articles")}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground text-sm font-bold touch-manipulation active:scale-[0.98] transition-transform"
        >
          Browse All Articles
        </button>
      </motion.div>

      <ZivoMobileNav />
    </div>
  );
}
