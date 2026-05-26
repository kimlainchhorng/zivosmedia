/**
 * LibraryPage — Your Library hub.
 *
 * v2 redesign: 40+ destinations grouped into 7 collapsible categories
 * with an IG-gradient search filter. Reduces the wall-of-tiles problem
 * by letting users scan headers first, then expand.
 */
import { useState, useMemo, useDeferredValue } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, ChevronRight, ChevronDown,
  // Group icons
  Bookmark, Camera, UsersRound, Sparkles, DollarSign, Heart as HeartIcon, Settings,
  // Tile icons
  Library, Archive, Star, FolderHeart, Vote, AtSign, Trophy, BookImage, Handshake,
  Smile, Ticket, Gift, Palette, Award, Bell, BarChart2, Shield, Tag, Flag, Gamepad2,
  MessageSquare, Music, TrendingUp, Wand2, MapPin, NotebookPen, ClipboardList,
  ArrowLeftRight, Hash, Coins, Image as ImageIcon, Receipt, Dumbbell, Unlock, Mic, Link2, ListTodo, ShoppingCart, ShieldAlert, MessageSquareHeart, Images, MessageCircleQuestion, Voicemail, AlertTriangle, Bug, ShieldCheck, Flame, ShieldOff, BellRing, Car, Send as SendIcon, Gavel, Plane, Radio, UserPlus, UtensilsCrossed, History, Briefcase, ListChecks, Eye, VolumeX, Banknote, MessageCircle, Scale, Headphones, Home as HomeIcon, Sticker, FileCheck, Building, Building2, Brain,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import SEOHead from "@/components/SEOHead";
import { SwipeBackContainer } from "@/components/shared/SwipeBackContainer";
import { cn } from "@/lib/utils";

interface LibrarySection {
  icon: typeof Bookmark;
  title: string;
  description: string;
  path: string;
}

interface LibraryGroup {
  id: string;
  title: string;
  icon: typeof Bookmark;
  sections: LibrarySection[];
}

const GROUPS: LibraryGroup[] = [
  {
    id: "saved",
    title: "Saved & collections",
    icon: Bookmark,
    sections: [
      { icon: Bookmark, title: "Saved Posts", description: "Posts and reels you bookmarked", path: "/saved-posts" },
      { icon: Bookmark, title: "Bookmarks", description: "Everything you bookmarked in one place", path: "/saved" },
      { icon: Search, title: "Saved Searches", description: "Searches you saved for later", path: "/saved-searches" },
      { icon: HeartIcon, title: "Favorites", description: "Hotels, destinations, and creators", path: "/saved-favorites" },
      { icon: FolderHeart, title: "Collections", description: "Bookmarks organized into folders", path: "/collections" },
      { icon: BookImage, title: "Albums", description: "Your own posts grouped into albums", path: "/albums" },
    ],
  },
  {
    id: "social",
    title: "Social & friends",
    icon: UsersRound,
    sections: [
      { icon: UsersRound, title: "Clubs", description: "Interest-based clubs to find your people", path: "/clubs" },
      { icon: MessageSquare, title: "Forums", description: "Community discussion boards", path: "/forums" },
      { icon: MessageCircle, title: "Live Chats", description: "Live support chat sessions", path: "/live-chat-sessions" },
      { icon: AtSign, title: "Mentions", description: "Posts where you're @-tagged", path: "/mentions" },
      { icon: Handshake, title: "Collabs", description: "Co-author invites and accepted posts", path: "/collabs" },
      { icon: Eye, title: "Profile Views", description: "Who viewed your profile recently", path: "/profile-views" },
      { icon: Eye, title: "Story Viewers", description: "Who viewed each of your stories", path: "/story-viewers" },
      { icon: MessageCircle, title: "Story Comments", description: "Comments by/on your stories", path: "/story-comments" },
      { icon: UtensilsCrossed, title: "Restaurant Reviews", description: "Your detailed restaurant reviews", path: "/restaurant-reviews" },
      { icon: Smile, title: "Emoji Packs", description: "Custom emoji collections", path: "/emoji-packs" },
      { icon: UsersRound, title: "Close Friends", description: "Pick who sees private stories", path: "/close-friends" },
      { icon: Vote, title: "Polls", description: "Create polls and see results live", path: "/polls" },
      { icon: Receipt, title: "Split Bills", description: "Group expenses and who owes who", path: "/split-bills" },
      { icon: ListTodo, title: "Shared Todos", description: "Collaborative to-do lists with chat partners", path: "/shared-todos" },
      { icon: MessageCircleQuestion, title: "AMA", description: "Ask Me Anything sessions — ask + see answers", path: "/ama" },
      { icon: Radio, title: "Audio Rooms", description: "Live Clubhouse-style audio rooms", path: "/audio-rooms" },
      { icon: UserPlus, title: "Friend Requests", description: "Accept or decline pending requests", path: "/friend-requests" },
      { icon: MapPin, title: "Live Locations", description: "Active live-location shares + stop", path: "/live-locations" },
      { icon: Images, title: "Chat Media", description: "Photos, videos, files from your chats", path: "/chat-media" },
      { icon: Voicemail, title: "Voicemails", description: "Missed-call voicemails with transcripts", path: "/voicemails" },
    ],
  },
  {
    id: "stories",
    title: "Stories & creation",
    icon: Camera,
    sections: [
      { icon: Archive, title: "Story Archive", description: "Expired stories saved for repost", path: "/archive" },
      { icon: Star, title: "Highlights", description: "Pin best stories to your profile", path: "/highlights" },
      { icon: BarChart2, title: "Story Insights", description: "Per-story view + interaction analytics", path: "/story-insights" },
      { icon: Wand2, title: "Reel Effects", description: "Effects catalog for your reels", path: "/reel-effects" },
      { icon: Music, title: "Playlists", description: "Music and reel playlists you curate", path: "/playlists" },
      { icon: Music, title: "Music Stickers", description: "Music tracks for story stickers", path: "/music-stickers" },
      { icon: Smile, title: "Mood Stickers", description: "Avatar mood emoji catalog", path: "/avatar-moods" },
      { icon: Sticker, title: "Downloaded Packs", description: "Your sticker pack downloads", path: "/downloaded-packs" },
      { icon: Smile, title: "Sticker Store", description: "Sticker packs for stories & messages", path: "/stickers" },
      { icon: HeartIcon, title: "Reaction Packs", description: "Reaction emoji packs", path: "/reaction-packs" },
      { icon: ImageIcon, title: "GIFs", description: "Trending GIFs and your saved favorites", path: "/gifs" },
      { icon: Mic, title: "Voice Notes", description: "Your voice messages with transcripts", path: "/voice-notes" },
    ],
  },
  {
    id: "discover",
    title: "Discover",
    icon: Sparkles,
    sections: [
      { icon: TrendingUp, title: "Trending", description: "Hot topics by region and period", path: "/trending" },
      { icon: Hash, title: "Hashtags", description: "Browse popular hashtags", path: "/hashtags" },
      { icon: Flag, title: "Challenges", description: "Join social challenges", path: "/challenges" },
      { icon: MapPin, title: "Places", description: "Discover venues and locations", path: "/places" },
      { icon: Tag, title: "Interests", description: "Topics that personalize your feed", path: "/interests" },
    ],
  },
  {
    id: "creator",
    title: "Creator",
    icon: DollarSign,
    sections: [
      { icon: DollarSign, title: "Earnings", description: "Daily revenue across all streams", path: "/creator/earnings" },
      { icon: Banknote, title: "Creator Payouts", description: "Payout history by period + status", path: "/creator-payouts" },
      { icon: Trophy, title: "Milestones", description: "Creator achievements & next steps", path: "/creator/milestones" },
      { icon: Award, title: "Achievements", description: "Full achievement catalog", path: "/achievements" },
      { icon: Flame, title: "Streaks", description: "Daily activity streaks — current + best", path: "/streaks" },
      { icon: Trophy, title: "My Challenges", description: "Challenge entries, votes, wins", path: "/my-challenges" },
      { icon: Vote, title: "Poll History", description: "Polls + quizzes you've created", path: "/poll-history" },
      { icon: Gamepad2, title: "Game Scores", description: "Your mini-game leaderboard", path: "/game-scores" },
      { icon: Award, title: "Fan Badges", description: "Badges earned by supporting creators", path: "/fan-badges" },
    ],
  },
  {
    id: "wallet",
    title: "Wallet & rewards",
    icon: Coins,
    sections: [
      { icon: Coins, title: "Coin Wallet", description: "Coin balance, transactions, purchases", path: "/coins" },
      { icon: Unlock, title: "My Unlocks", description: "Paid content you've unlocked from creators", path: "/my-unlocks" },
      { icon: Gift, title: "Rewards Center", description: "Rewards earned and redeemed", path: "/rewards-center" },
      { icon: Ticket, title: "Coupons", description: "Active discount codes", path: "/coupons" },
      { icon: Ticket, title: "Promo Usage", description: "Codes you've redeemed + total saved", path: "/promo-usage" },
      { icon: Tag, title: "Store Promos", description: "Active store promo codes to copy", path: "/store-promos" },
      { icon: Briefcase, title: "My Applications", description: "Job applications you've sent", path: "/my-applications" },
      { icon: ListChecks, title: "Get Started", description: "Onboarding progress checklist", path: "/onboarding-progress" },
      { icon: Gift, title: "Referrals", description: "Generate shareable invite links", path: "/referrals" },
      { icon: Link2, title: "Affiliate Links", description: "Track your link-in-bio clicks, conversions, earnings", path: "/affiliate-links" },
      { icon: Gift, title: "Gift History", description: "Coin gifts sent + received in chat", path: "/gift-history" },
      { icon: ShoppingCart, title: "Cart", description: "Marketplace items ready to checkout", path: "/marketplace-cart" },
      { icon: Coins, title: "Points History", description: "Loyalty points earned, redeemed, expired", path: "/points-history" },
      { icon: Receipt, title: "Transactions", description: "All payments, refunds, payouts, tips", path: "/transactions" },
      { icon: HeartIcon, title: "Favorites", description: "Saved hotels, flights, cars, activities", path: "/favorites" },
      { icon: Trophy, title: "Leaderboards", description: "Global rankings + your rank", path: "/leaderboards" },
      { icon: History, title: "Recently Viewed", description: "Travel browsing history", path: "/recently-viewed" },
      { icon: ShieldCheck, title: "2-Step Verification", description: "Status + manage your second password", path: "/two-step-auth" },
      { icon: ArrowLeftRight, title: "Coin Transfers", description: "P2P coin sends + receives", path: "/coin-transfers" },
      { icon: DollarSign, title: "P2P Money", description: "Money sends + requests with friends", path: "/p2p-money" },
      { icon: UtensilsCrossed, title: "Group Orders", description: "Collaborative food order sessions", path: "/group-orders" },
      { icon: ArrowLeftRight, title: "Exchange Rates", description: "Live currency conversion", path: "/exchange-rates" },
    ],
  },
  {
    id: "health",
    title: "Health & travel",
    icon: Dumbbell,
    sections: [
      { icon: Dumbbell, title: "Fitness", description: "Activity log with steps, distance, calories", path: "/fitness" },
      { icon: NotebookPen, title: "Travel Journals", description: "Trip-by-trip diary", path: "/journals" },
      { icon: BellRing, title: "Price Alerts", description: "Travel price tracking — get notified on drops", path: "/price-alerts" },
      { icon: Plane, title: "Flight Price Alerts", description: "Watch specific routes + cabin classes", path: "/flight-price-alerts" },
      { icon: HomeIcon, title: "Saved Locations", description: "Home, work, and pinned addresses", path: "/saved-locations" },
      { icon: MapPin, title: "Itineraries", description: "Travel plans with flights, hotels, cars", path: "/itineraries" },
      { icon: Headphones, title: "My Podcasts", description: "Podcasts you've subscribed to", path: "/my-podcasts" },
      { icon: Car, title: "Ride Quotes", description: "Recent ride price quotes you've gotten", path: "/ride-quotes" },
      { icon: ClipboardList, title: "Surveys", description: "Open feedback surveys", path: "/surveys" },
    ],
  },
  {
    id: "account",
    title: "Account & privacy",
    icon: Settings,
    sections: [
      { icon: Bell, title: "Notifications", description: "Toggle notification types you receive", path: "/notifications/preferences" },
      { icon: Palette, title: "Chat Themes", description: "Pick chat color theme", path: "/chat-themes" },
      { icon: Palette, title: "Chat Wallpapers", description: "Backgrounds — default + per-chat", path: "/chat-wallpapers" },
      { icon: Shield, title: "Logins & devices", description: "Where you're signed in", path: "/devices" },
      { icon: Shield, title: "Login Activity", description: "Security audit log + flagged sign-ins", path: "/login-activity" },
      { icon: ShieldCheck, title: "Trust Score", description: "Your community trust score + factors", path: "/trust-score" },
      { icon: AlertTriangle, title: "Warnings", description: "Active account warnings + acknowledge", path: "/warnings" },
      { icon: Bug, title: "Bug Reports", description: "Submit + track your bug reports", path: "/bug-reports" },
      { icon: ShieldOff, title: "Spam Detections", description: "Content flagged on your account", path: "/spam-detections" },
      { icon: MapPin, title: "Places Tapped", description: "Stores you've clicked on the map", path: "/place-clicks" },
      { icon: SendIcon, title: "Auto Messages", description: "Push/email/SMS we've sent you", path: "/auto-messages" },
      { icon: Gavel, title: "Order Disputes", description: "Disputes you've opened on orders", path: "/order-disputes" },
      { icon: Scale, title: "Legal Disputes", description: "Service disputes filed or against you", path: "/legal-disputes" },
      { icon: ShieldAlert, title: "Appeals", description: "Moderation actions on your account + appeals", path: "/moderation-appeals" },
      { icon: ShieldOff, title: "Muted & Blocked", description: "Manage users you've muted or blocked", path: "/muted-blocked" },
      { icon: VolumeX, title: "Muted Chats", description: "Conversations with notifications silenced", path: "/muted-chats" },
      { icon: BellRing, title: "Push Devices", description: "Active push notification subscriptions", path: "/push-devices" },
      { icon: MessageSquareHeart, title: "Feedback", description: "Send product feedback, see team responses", path: "/feedback" },
      { icon: FileCheck, title: "Consent Log", description: "Audit trail of policies you've agreed to", path: "/consent-log" },
      { icon: Building2, title: "Organizations", description: "Tenants + workspaces you belong to", path: "/tenant-memberships" },
      { icon: Brain, title: "Recommendations", description: "What we recommend for you + scores", path: "/recommendation-scores" },
      { icon: Building, title: "Business Account", description: "Corporate renter account info", path: "/business-account" },
    ],
  },
];

// Auto-open the first 2 groups by default so the page doesn't look empty.
const DEFAULT_OPEN = new Set(GROUPS.slice(0, 2).map((g) => g.id));

export default function LibraryPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [openIds, setOpenIds] = useState<Set<string>>(DEFAULT_OPEN);

  const toggleGroup = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenIds(new Set(GROUPS.map((g) => g.id)));
  const collapseAll = () => setOpenIds(new Set());

  // When the user is searching, automatically expand any group with a hit
  // so they don't have to click through.
  const { filteredGroups, totalHits } = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    if (!q) return { filteredGroups: GROUPS, totalHits: GROUPS.reduce((s, g) => s + g.sections.length, 0) };
    let hits = 0;
    const out: LibraryGroup[] = [];
    for (const g of GROUPS) {
      const matching = g.sections.filter((s) =>
        s.title.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        g.title.toLowerCase().includes(q)
      );
      if (matching.length > 0) {
        out.push({ ...g, sections: matching });
        hits += matching.length;
      }
    }
    return { filteredGroups: out, totalHits: hits };
  }, [deferredQuery]);

  const searching = deferredQuery.trim().length > 0;
  const totalDestinations = GROUPS.reduce((s, g) => s + g.sections.length, 0);

  return (
    <SwipeBackContainer className="min-h-screen bg-background">
      <SEOHead title="Your Library · ZIVO" description="All your saved content in one place." noIndex />

      <div className="sticky top-0 safe-area-top z-40 bg-background/90 backdrop-blur-md border-b border-border/50">
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
              <Library className="h-4 w-4 text-white" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-ig-gradient">Your Library</h1>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              type="search"
              placeholder={`Search ${totalDestinations} destinations…`}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-secondary border border-border/60 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-rose-500/30"
            />
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-4">
        {/* Stats banner */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-5 bg-ig-gradient text-white shadow-lg shadow-rose-500/20 relative overflow-hidden"
        >
          <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
          <Sparkles className="absolute top-3 right-3 h-5 w-5 text-white/40" />
          <p className="text-xs font-semibold uppercase tracking-wider text-white/80">
            {searching ? "Showing" : "Library"}
          </p>
          <p className="text-3xl font-bold mt-1">
            {searching ? `${totalHits} ${totalHits === 1 ? "match" : "matches"}` : `${totalDestinations} destinations`}
          </p>
          <p className="text-sm text-white/80 mt-1">
            {searching ? "across all categories" : `organized into ${GROUPS.length} categories`}
          </p>
        </motion.div>

        {/* Expand/collapse toolbar */}
        {!searching && (
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-muted-foreground uppercase tracking-wider">Categories</span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={expandAll}
                className="text-ig-gradient hover:opacity-80 active:opacity-60 transition-opacity"
              >
                Expand all
              </button>
              <span className="text-muted-foreground/60">·</span>
              <button
                type="button"
                onClick={collapseAll}
                className="text-muted-foreground hover:text-foreground"
              >
                Collapse
              </button>
            </div>
          </div>
        )}

        {filteredGroups.length === 0 && (
          <div className="rounded-2xl border border-border bg-card p-8 text-center">
            <div className="h-16 w-16 rounded-3xl bg-ig-gradient flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-500/20">
              <Search className="h-7 w-7 text-white" />
            </div>
            <p className="text-base font-bold text-foreground mb-1">No matches</p>
            <p className="text-xs text-muted-foreground">Try a different keyword.</p>
          </div>
        )}

        {filteredGroups.map((g, gIdx) => {
          const isOpen = searching || openIds.has(g.id);
          const GroupIcon = g.icon;
          return (
            <motion.div
              key={g.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: gIdx * 0.03 }}
              className="rounded-2xl bg-card border border-border overflow-hidden"
            >
              <button
                type="button"
                onClick={() => !searching && toggleGroup(g.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                  isOpen ? "" : "hover:bg-secondary/40",
                )}
                aria-label={`${g.title}, ${isOpen ? "collapse" : "expand"}`}
              >
                <div className="shrink-0 h-9 w-9 rounded-xl bg-ig-gradient flex items-center justify-center shadow-sm">
                  <GroupIcon className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold text-foreground">{g.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {g.sections.length} {g.sections.length === 1 ? "destination" : "destinations"}
                  </p>
                </div>
                {!searching && (
                  <motion.div animate={{ rotate: isOpen ? 90 : 0 }} className="shrink-0">
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </motion.div>
                )}
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key={`${g.id}-body`}
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="px-2 pb-2 space-y-1">
                      {g.sections.map((section, idx) => {
                        const Icon = section.icon;
                        return (
                          <motion.button
                            key={section.path}
                            type="button"
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.02, duration: 0.15 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => navigate(section.path)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/60 active:bg-secondary/80 transition-colors text-left"
                          >
                            <div className="shrink-0 h-8 w-8 rounded-lg bg-secondary flex items-center justify-center">
                              <Icon className="h-4 w-4 text-foreground" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-foreground line-clamp-1">{section.title}</p>
                              <p className="text-[11px] text-muted-foreground line-clamp-1">{section.description}</p>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {!searching && (
          <p className="text-[11px] text-muted-foreground text-center pt-2 pb-6">
            <ChevronDown className="h-3 w-3 inline" /> Tap a category to expand · search above to jump anywhere
          </p>
        )}
      </div>
    </SwipeBackContainer>
  );
}
