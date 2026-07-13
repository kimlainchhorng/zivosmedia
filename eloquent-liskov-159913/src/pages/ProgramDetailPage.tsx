/**
 * ProgramDetailPage — Individual monetization program overview & enrollment
 * Enhanced with success stories, earnings calculator, related programs, and tips
 */
import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Check, ChevronRight, Crown, DollarSign, Gift,
  Heart, Lock, Megaphone, Mic, Music, Palette, Radio,
  Store, Target, Video, Zap, Camera, Calendar, MessageCircle,
  BookOpen, PenTool, Star, TrendingUp, Users, Shield,
  Sparkles, CheckCircle, ArrowRight, AlertCircle, Award,
  Calculator, Lightbulb, Share2, ExternalLink, Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";

const PROGRAM_DATA: Record<string, {
  icon: any; label: string; description: string; accent: string;
  longDescription: string; requirements: string[]; benefits: string[];
  howItWorks: string[]; faq: { q: string; a: string }[];
  earningsRange: string; platformFee: string; payoutSchedule: string;
  successStories: { name: string; earnings: string; quote: string }[];
  proTips: string[]; relatedPrograms: string[];
}> = {
  "creator-rewards": {
    icon: Gift, label: "Creator Rewards", accent: "hsl(340 75% 55%)",
    description: "Get Gifts for your top-performing videos and content.",
    longDescription: "The Creator Rewards Program pays you based on the quality and engagement of your content. Earn from views, likes, comments, and shares across all your videos. Top performers get bonus multipliers and exclusive perks.",
    requirements: ["1,000+ followers", "10,000+ video views in last 30 days", "Account in good standing", "18+ years old", "Complete identity verification"],
    benefits: ["Earn from every qualifying video", "Bonus multipliers for viral content", "Monthly payouts to your wallet", "Priority support access", "Exclusive creator events"],
    howItWorks: ["Create original, engaging content", "Videos scored on views, engagement, and watch time", "Earnings accumulate in your Creator Wallet", "Cash out monthly when balance exceeds $50"],
    faq: [
      { q: "How much can I earn?", a: "Earnings vary based on engagement. Top creators earn $500-$5,000/month. Average RPM is $1.50-$8.00." },
      { q: "When do I get paid?", a: "Payouts are processed monthly. Minimum withdrawal is $50." },
      { q: "Can I lose my eligibility?", a: "Yes, if you violate Community Guidelines or fall below minimum thresholds for 60 days." },
      { q: "What content qualifies?", a: "Original videos over 60 seconds with meaningful engagement. Reposts and duets don't qualify." },
    ],
    earningsRange: "$500 – $5,000/mo",
    platformFee: "30% platform fee",
    payoutSchedule: "Monthly",
    successStories: [
      { name: "Sarah K.", earnings: "$3,200/mo", quote: "Creator Rewards changed my life. I went from a hobby to a full-time career in 6 months." },
      { name: "Marcus J.", earnings: "$1,800/mo", quote: "Consistent posting and engaging with my audience doubled my rewards in 3 months." },
    ],
    proTips: ["Post at least 4 videos per week for maximum rewards", "Focus on watch time — 80%+ completion rate earns 2x more", "Engage with comments in the first hour after posting"],
    relatedPrograms: ["tips-donations", "subscription", "live-gifts"],
  },
  "service-plus": {
    icon: Zap, label: "Service+", accent: "hsl(221 83% 53%)",
    description: "Build connections with potential clients when you're LIVE.",
    longDescription: "Service+ connects creators with potential clients and customers during LIVE streams. Offer consultations, coaching, tutorials, and professional services directly through ZIVO's platform.",
    requirements: ["5,000+ followers", "Completed at least 10 LIVE streams", "Professional service to offer", "Identity verification completed"],
    benefits: ["Set your own hourly rates", "Built-in scheduling and booking", "Secure payment processing", "Client reviews and ratings", "Featured in Service+ marketplace"],
    howItWorks: ["Set up your service profile with rates", "Clients discover you through LIVE or marketplace", "Conduct sessions via ZIVO LIVE", "Get paid automatically after each session"],
    faq: [
      { q: "What services can I offer?", a: "Coaching, tutoring, consulting, fitness, music lessons, and more." },
      { q: "How much does ZIVO take?", a: "ZIVO takes a 20% platform fee. You keep 80% of all earnings." },
      { q: "Can I set my own schedule?", a: "Yes. You control your availability and can block off time as needed." },
    ],
    earningsRange: "$1,000 – $10,000/mo",
    platformFee: "20% platform fee",
    payoutSchedule: "Weekly",
    successStories: [
      { name: "Dr. Lisa M.", earnings: "$8,500/mo", quote: "I run my entire coaching practice through Service+. The booking system is seamless." },
    ],
    proTips: ["Offer a free 15-min intro call to convert leads", "Respond to booking requests within 2 hours"],
    relatedPrograms: ["paid-events", "course-builder", "subscription"],
  },
  "subscription": {
    icon: Crown, label: "Subscription", accent: "hsl(38 92% 50%)",
    description: "Connect more closely with viewers through subscriber-only content.",
    longDescription: "Subscription lets fans pay a monthly fee to access exclusive content, badges, and perks. Set your own price and create premium experiences for your most dedicated followers.",
    requirements: ["1,000+ followers", "Consistent posting (3+ months)", "At least 3 subscriber perks defined", "Identity verification"],
    benefits: ["Recurring monthly revenue", "Custom subscriber badges", "Exclusive content feeds", "Subscriber-only LIVE streams", "Direct message access"],
    howItWorks: ["Choose price ($0.99-$99.99/mo)", "Define subscriber-only perks and content", "Promote your subscription", "ZIVO handles billing; you keep 70%"],
    faq: [
      { q: "What price should I set?", a: "Start at $2.99-$4.99/mo. Increase as you add more perks." },
      { q: "How many perks do I need?", a: "Minimum 3 perks required. We recommend 5+ for best retention." },
      { q: "Can subscribers cancel anytime?", a: "Yes. Subscribers can cancel at any time. They keep access until the end of their billing period." },
    ],
    earningsRange: "$500 – $50,000/mo",
    platformFee: "30% platform fee",
    payoutSchedule: "Monthly",
    successStories: [
      { name: "Chef Antonio", earnings: "$12,000/mo", quote: "My subscribers get exclusive recipes and cooking classes. It's my primary income now." },
    ],
    proTips: ["Post subscriber-only content 3x per week minimum", "Create a subscriber welcome video", "Run limited-time promos during launches"],
    relatedPrograms: ["creator-rewards", "locked-media", "paid-dms"],
  },
  "tips-donations": {
    icon: Heart, label: "Tips & Donations", accent: "hsl(340 75% 55%)",
    description: "Let your audience show appreciation with direct tips.",
    longDescription: "Enable tips on your profile and content so fans can directly support your work. Tips can be one-time or recurring, and you keep 80% of every tip received.",
    requirements: ["500+ followers", "Account in good standing", "Identity verification", "Linked payout method"],
    benefits: ["Instant gratification from fans", "No minimum tip amount", "Custom thank-you messages", "Tip leaderboards on your profile", "Tax-ready reports"],
    howItWorks: ["Enable tips in Creator Settings", "Fans see tip button on your profile/videos", "Tips processed instantly via Stripe", "Earnings in your wallet within 24 hours"],
    faq: [
      { q: "Is there a minimum tip?", a: "Minimum tip is $0.50. There's no maximum." },
      { q: "How quickly do I get paid?", a: "Tips are available in your wallet within 24 hours." },
    ],
    earningsRange: "$100 – $3,000/mo",
    platformFee: "20% platform fee",
    payoutSchedule: "Instant to wallet",
    successStories: [
      { name: "Jamie R.", earnings: "$2,100/mo", quote: "My audience tips generously because they see the value I provide." },
    ],
    proTips: ["Thank tippers publicly to encourage more tips", "Set up tip goals for specific projects"],
    relatedPrograms: ["creator-rewards", "live-gifts", "subscription"],
  },
  "live-gifts": {
    icon: Video, label: "LIVE Gifts", accent: "hsl(263 70% 58%)",
    description: "Receive virtual gifts from viewers during LIVE streams.",
    longDescription: "During LIVE streams, viewers can send virtual gifts that convert to real money. The more engaging your stream, the more gifts you'll receive.",
    requirements: ["1,000+ followers", "At least 5 previous LIVE streams", "18+ years old", "Identity verification"],
    benefits: ["Real-time earnings during streams", "Gift multipliers during peak hours", "LIVE battle bonuses", "Diamond-to-cash conversion", "Weekly leaderboard prizes"],
    howItWorks: ["Go LIVE on ZIVO", "Viewers purchase and send virtual gifts", "Gifts convert to diamonds", "Exchange diamonds for cash in wallet"],
    faq: [
      { q: "How much are gifts worth?", a: "Gift values range from $0.01 to $500. ZIVO takes 50% of gift value." },
      { q: "What are LIVE Battles?", a: "Compete with another creator for gifts. Winner gets a visibility boost." },
    ],
    earningsRange: "$200 – $8,000/mo",
    platformFee: "50% platform fee",
    payoutSchedule: "Weekly",
    successStories: [
      { name: "DJ Wave", earnings: "$6,500/mo", quote: "LIVE streaming with gifts turned my music into a full-time income." },
    ],
    proTips: ["Go LIVE at the same time each week", "Acknowledge gift senders by name", "Use LIVE replays for highlight clips"],
    relatedPrograms: ["tips-donations", "audio-monetization", "paid-events"],
  },
  "zivo-shop": {
    icon: Store, label: "ZIVO Shop", accent: "hsl(142 71% 45%)",
    description: "Sell products directly to your audience.",
    longDescription: "ZIVO Shop lets you sell physical products, digital downloads, and merchandise directly from your profile. Tag products in videos for seamless content-to-commerce.",
    requirements: ["1,000+ followers", "Valid business or personal identity", "Product photos and descriptions", "Shipping capability"],
    benefits: ["Shoppable video tags", "Built-in checkout", "Order management dashboard", "LIVE shopping events", "Analytics and tracking"],
    howItWorks: ["Add products with photos and pricing", "Tag products in videos and LIVE streams", "Fans purchase without leaving ZIVO", "Fulfill orders from Shop Dashboard"],
    faq: [
      { q: "What can I sell?", a: "Physical goods, digital products, merchandise, and more." },
      { q: "What are the fees?", a: "ZIVO takes 5% transaction fee + payment processing." },
    ],
    earningsRange: "$300 – $20,000/mo",
    platformFee: "5% + processing",
    payoutSchedule: "Weekly",
    successStories: [
      { name: "Artisan Maya", earnings: "$9,200/mo", quote: "LIVE shopping events are 6x more effective than any other platform." },
    ],
    proTips: ["Showcase products in use, not just on display", "Use LIVE shopping for launches", "Offer subscriber discounts"],
    relatedPrograms: ["merch-prints", "digital-products", "brand-partnerships"],
  },
  "brand-partnerships": {
    icon: Megaphone, label: "Brand Partnerships", accent: "hsl(25 95% 53%)",
    description: "Get matched with brands for sponsored content.",
    longDescription: "Brand Partnerships connects you with brands looking for authentic creator collaborations. Get discovered, negotiate deals, and manage partnerships within ZIVO.",
    requirements: ["10,000+ followers", "3%+ engagement rate", "Professional media kit", "Identity verification"],
    benefits: ["Direct brand match-making", "Campaign management tools", "Automated FTC disclosures", "Rate card templates", "Performance analytics"],
    howItWorks: ["Complete your brand profile and media kit", "Brands discover you via marketplace", "Negotiate terms and deliverables", "Create content and track performance"],
    faq: [
      { q: "How do I set my rates?", a: "Typical: $100-$500 per 10K followers. Use ZIVO's rate calculator." },
      { q: "Do I have to accept every deal?", a: "No. You choose which brands to work with." },
    ],
    earningsRange: "$1,000 – $25,000/mo",
    platformFee: "10% platform fee",
    payoutSchedule: "Per campaign",
    successStories: [
      { name: "Tech Review Alex", earnings: "$18,000/mo", quote: "Brand deals through ZIVO are more authentic and better paying than other platforms." },
    ],
    proTips: ["Pitch brands you already use", "Include past campaign metrics in proposals", "Build relationships for repeat deals"],
    relatedPrograms: ["affiliate-marketing", "creator-marketplace", "zivo-shop"],
  },
  "locked-media": {
    icon: Lock, label: "Locked Media", accent: "hsl(263 70% 58%)",
    description: "Monetize exclusive photos and videos with pay-to-unlock.",
    longDescription: "Send exclusive photos and videos as pay-to-unlock content in chat. Set your own price and earn directly from your most exclusive content.",
    requirements: ["ZIVO+ Chat+ or Pro subscription", "Identity verification", "18+ years old", "Content must follow guidelines"],
    benefits: ["Set prices $0.50-$999.99", "Direct fan-to-creator payments", "Content protection and DRM", "Real-time earnings", "Unlock analytics"],
    howItWorks: ["Attach a photo/video in chat", "Set your unlock price", "Recipient sees blurred preview", "They pay to unlock; you earn instantly"],
    faq: [
      { q: "What content can I lock?", a: "Photos and videos following Community Guidelines." },
      { q: "What's the platform fee?", a: "ZIVO takes 20%. You keep 80%." },
    ],
    earningsRange: "$200 – $5,000/mo",
    platformFee: "20% platform fee",
    payoutSchedule: "Instant to wallet",
    successStories: [
      { name: "Fitness Pro Kim", earnings: "$4,200/mo", quote: "Locked workout videos are my top earner. Fans love exclusive content." },
    ],
    proTips: ["Tease locked content in public posts", "Offer bundle deals for multiple unlocks"],
    relatedPrograms: ["subscription", "paid-dms", "digital-products"],
  },
  "digital-products": {
    icon: PenTool, label: "Digital Products", accent: "hsl(300 70% 55%)",
    description: "Sell e-books, courses, templates, and digital bundles.",
    longDescription: "Create and sell digital products — e-books, courses, design templates, presets, and art. Automatic delivery after purchase with no shipping hassles.",
    requirements: ["500+ followers", "Original digital content", "Identity verification", "Product descriptions"],
    benefits: ["Zero shipping costs", "Automatic delivery", "Unlimited inventory", "Recurring revenue", "Bundle options"],
    howItWorks: ["Upload your digital product", "Set pricing and description", "Promote through content", "Buyers get instant access after payment"],
    faq: [
      { q: "What formats are supported?", a: "PDF, EPUB, MP4, MP3, ZIP, and more. Max 2GB." },
      { q: "Can I offer free samples?", a: "Yes. Free previews and sample downloads available." },
    ],
    earningsRange: "$300 – $15,000/mo",
    platformFee: "15% platform fee",
    payoutSchedule: "Weekly",
    successStories: [
      { name: "Designer Nora", earnings: "$7,800/mo", quote: "My template packs sell on autopilot. Best passive income I've ever had." },
    ],
    proTips: ["Create a free lead magnet to build your audience", "Bundle products for higher cart value"],
    relatedPrograms: ["course-builder", "locked-media", "zivo-shop"],
  },
  "affiliate-marketing": {
    icon: Target, label: "Affiliate Marketing", accent: "hsl(172 66% 50%)",
    description: "Earn commissions promoting ZIVO services.",
    longDescription: "Join ZIVO's affiliate program and earn commissions by referring new users and promoting services. Share your unique link and earn from every conversion.",
    requirements: ["Active ZIVO account", "100+ followers", "Content aligns with ZIVO values"],
    benefits: ["Up to 30% commission", "Custom tracking links", "Real-time dashboard", "Monthly payouts", "Exclusive promos"],
    howItWorks: ["Get your unique referral link", "Share in content and bio", "Earn when someone signs up or purchases", "Track in Affiliate Hub"],
    faq: [
      { q: "How much per referral?", a: "Commission 10-30% depending on product." },
      { q: "Is there a cookie duration?", a: "30-day cookie window for attributed conversions." },
    ],
    earningsRange: "$200 – $10,000/mo",
    platformFee: "No fee — commission-based",
    payoutSchedule: "Monthly",
    successStories: [
      { name: "Review Pro Dan", earnings: "$5,400/mo", quote: "Affiliate marketing is the easiest way to earn while you sleep." },
    ],
    proTips: ["Incorporate affiliate links naturally in tutorials", "Compare products honestly for higher conversion"],
    relatedPrograms: ["brand-partnerships", "digital-products", "creator-rewards"],
  },
  "audio-monetization": {
    icon: Radio, label: "Audio Monetization", accent: "hsl(263 70% 58%)",
    description: "Monetize live audio rooms with tickets and tips.",
    longDescription: "Host paid audio rooms, podcasts, and live discussions. Charge for entry, accept tips, and build a loyal listener community.",
    requirements: ["1,000+ followers", "Audio room hosting experience", "Identity verification"],
    benefits: ["Ticketed audio events", "Live tips during sessions", "Recording and replay access", "Co-host revenue sharing", "Analytics"],
    howItWorks: ["Create an audio room", "Set ticket prices or free with tips", "Host engaging discussions", "Earnings go to wallet"],
    faq: [{ q: "Can I co-host?", a: "Yes. Revenue split based on agreed percentages." }],
    earningsRange: "$300 – $5,000/mo",
    platformFee: "25% platform fee",
    payoutSchedule: "Weekly",
    successStories: [{ name: "Podcast Queen Ava", earnings: "$3,100/mo", quote: "Audio rooms let me monetize my voice and expertise." }],
    proTips: ["Schedule recurring weekly rooms", "Invite guest speakers to grow audience"],
    relatedPrograms: ["podcast", "paid-events", "live-gifts"],
  },
  "paid-events": {
    icon: Calendar, label: "Paid Events", accent: "hsl(199 89% 48%)",
    description: "Host and sell tickets to events.",
    longDescription: "Create and sell tickets to virtual or in-person events. From workshops to meetups, monetize your community gatherings.",
    requirements: ["1,000+ followers", "Event planning capability", "Identity verification"],
    benefits: ["Custom ticket pricing", "Event page with details", "Attendee management", "Check-in tools", "Post-event analytics"],
    howItWorks: ["Create event with details and pricing", "Share event page", "Sell tickets through ZIVO", "Host and engage attendees"],
    faq: [{ q: "What types of events?", a: "Virtual meetups, workshops, webinars, in-person gatherings." }],
    earningsRange: "$500 – $15,000/event",
    platformFee: "10% + processing",
    payoutSchedule: "After event",
    successStories: [{ name: "Workshop Pro Lee", earnings: "$8,000/event", quote: "My monthly workshops sell out in minutes now." }],
    proTips: ["Offer early-bird pricing", "Create event highlight reels for promotion"],
    relatedPrograms: ["service-plus", "audio-monetization", "course-builder"],
  },
  "course-builder": {
    icon: BookOpen, label: "Course Builder", accent: "hsl(198 93% 59%)",
    description: "Create and sell structured courses.",
    longDescription: "Build comprehensive online courses with modules, lessons, quizzes, and certificates. The ultimate tool for creators who want to teach and earn.",
    requirements: ["500+ followers", "Subject matter expertise", "Course content prepared", "Identity verification"],
    benefits: ["Drag-and-drop builder", "Video, text, and quiz lessons", "Student progress tracking", "Completion certificates", "Drip content"],
    howItWorks: ["Design course structure", "Upload lessons", "Set pricing and limits", "Students learn at their pace"],
    faq: [{ q: "How many courses can I create?", a: "Unlimited courses. Each can have up to 100 lessons." }],
    earningsRange: "$1,000 – $30,000/mo",
    platformFee: "20% platform fee",
    payoutSchedule: "Monthly",
    successStories: [{ name: "Prof. Chen", earnings: "$22,000/mo", quote: "My coding bootcamp on ZIVO has 3,000 enrolled students." }],
    proTips: ["Offer a free intro lesson to hook learners", "Use completion certificates as social proof"],
    relatedPrograms: ["digital-products", "service-plus", "subscription"],
  },
  "creator-marketplace": {
    icon: Palette, label: "Creator Marketplace", accent: "hsl(340 75% 55%)",
    description: "Offer freelance services on ZIVO.",
    longDescription: "List your freelance services — design, writing, video editing, coaching — and get hired directly by other creators and businesses.",
    requirements: ["Portfolio of work", "Service descriptions", "Identity verification", "Set rates"],
    benefits: ["Direct client bookings", "Built-in messaging", "Secure escrow payments", "Reviews and ratings", "Featured listings"],
    howItWorks: ["Create service listing", "Set prices and turnaround times", "Clients book and pay upfront", "Deliver work and get paid"],
    faq: [{ q: "What services can I offer?", a: "Design, video editing, writing, music, coaching, and more." }],
    earningsRange: "$500 – $12,000/mo",
    platformFee: "15% platform fee",
    payoutSchedule: "Per delivery",
    successStories: [{ name: "Editor Chris", earnings: "$6,800/mo", quote: "I edit videos for top ZIVO creators. The marketplace found me clients I'd never reach alone." }],
    proTips: ["Showcase your best 3 portfolio pieces", "Offer rush delivery as a premium option"],
    relatedPrograms: ["service-plus", "brand-partnerships", "digital-products"],
  },
  "sound-licensing": {
    icon: Music, label: "Sound Licensing", accent: "hsl(38 92% 50%)",
    description: "License your original music to others.",
    longDescription: "Upload original music and sounds. Other creators license them for content use, and you earn royalties every time.",
    requirements: ["Original music or sound effects", "Copyright ownership proof", "Identity verification"],
    benefits: ["Passive royalty income", "Global distribution", "Usage analytics", "Custom licensing terms", "Featured in library"],
    howItWorks: ["Upload original sounds", "Set licensing terms and pricing", "Creators discover and use your sounds", "Earn royalties on every use"],
    faq: [{ q: "Do I retain ownership?", a: "Yes. Creators license usage rights only." }],
    earningsRange: "$100 – $8,000/mo",
    platformFee: "25% platform fee",
    payoutSchedule: "Monthly",
    successStories: [{ name: "Beat Maker Zion", earnings: "$4,500/mo", quote: "My beats are used in thousands of ZIVO videos. Passive income at its best." }],
    proTips: ["Create trending sound variations", "Tag sounds with popular genres and moods"],
    relatedPrograms: ["podcast", "audio-monetization", "creator-rewards"],
  },
  "paid-dms": {
    icon: MessageCircle, label: "Paid DMs", accent: "hsl(142 71% 45%)",
    description: "Charge for priority messages.",
    longDescription: "Let fans pay for priority direct messages. Their messages jump to the top of your inbox, and you earn for every interaction.",
    requirements: ["5,000+ followers", "Active response history", "Identity verification"],
    benefits: ["Set your own DM price", "Priority inbox placement", "Auto-replies for common questions", "Earnings per message", "Read receipt tracking"],
    howItWorks: ["Enable Paid DMs in settings", "Set price per message", "Fans pay to send priority messages", "You earn for reading and responding"],
    faq: [{ q: "Do I have to respond?", a: "You should respond within 48 hours. Unread messages refunded after 72 hours." }],
    earningsRange: "$200 – $4,000/mo",
    platformFee: "20% platform fee",
    payoutSchedule: "Instant to wallet",
    successStories: [{ name: "Influencer Jade", earnings: "$2,800/mo", quote: "Paid DMs filter out noise. I earn while connecting with real fans." }],
    proTips: ["Set reasonable prices — $1-$5 per message works best", "Use auto-replies for FAQs to save time"],
    relatedPrograms: ["locked-media", "subscription", "tips-donations"],
  },
  "merch-prints": {
    icon: Camera, label: "Merch & Prints", accent: "hsl(340 75% 55%)",
    description: "Sell physical products and merchandise.",
    longDescription: "Design and sell custom merchandise — t-shirts, hoodies, posters, phone cases. Print-on-demand means no upfront costs or inventory.",
    requirements: ["Design files or use templates", "Identity verification", "Choose product categories"],
    benefits: ["No upfront inventory costs", "Print-on-demand fulfillment", "Custom designs", "Global shipping", "Profit margin control"],
    howItWorks: ["Upload designs or use templates", "Choose products", "Set your profit margin", "We handle printing and shipping"],
    faq: [{ q: "How much profit?", a: "You set the retail price. Average margin 30-50%." }],
    earningsRange: "$200 – $10,000/mo",
    platformFee: "Base cost + you set margin",
    payoutSchedule: "Weekly",
    successStories: [{ name: "Artist Luna", earnings: "$5,200/mo", quote: "My art prints ship worldwide. Zero inventory, maximum profit." }],
    proTips: ["Launch limited-edition drops to create urgency", "Promote merch in LIVE streams"],
    relatedPrograms: ["zivo-shop", "digital-products", "brand-partnerships"],
  },
  "podcast": {
    icon: Mic, label: "Podcast", accent: "hsl(263 70% 58%)",
    description: "Monetize podcasts with premium episodes.",
    longDescription: "Host your podcast on ZIVO with free and premium episodes. Build a subscriber base with exclusive content and earn from ads, tips, and subscriptions.",
    requirements: ["Audio recording capability", "Consistent publishing schedule", "Identity verification"],
    benefits: ["Free + premium episode tiers", "Built-in distribution", "Subscriber management", "Ad placement tools", "Download analytics"],
    howItWorks: ["Upload podcast episodes", "Mark as free or premium", "Listeners subscribe for premium", "Earn from subscriptions and ads"],
    faq: [{ q: "Can I import my podcast?", a: "Yes. Import via RSS feed from any platform." }],
    earningsRange: "$300 – $12,000/mo",
    platformFee: "25% platform fee",
    payoutSchedule: "Monthly",
    successStories: [{ name: "Storyteller Max", earnings: "$7,200/mo", quote: "My true crime podcast has 50K subscribers. Premium episodes drive most revenue." }],
    proTips: ["Release free episodes weekly, premium bi-weekly", "Cross-promote with other podcasters"],
    relatedPrograms: ["audio-monetization", "subscription", "sound-licensing"],
  },
};

// Get all program labels for related programs section
const ALL_PROGRAMS = Object.entries(PROGRAM_DATA).map(([id, p]) => ({ id, label: p.label, icon: p.icon, accent: p.accent }));

export default function ProgramDetailPage() {
  const navigate = useNavigate();
  const { programId } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "earnings" | "stories">("overview");

  const program = programId ? PROGRAM_DATA[programId] : null;

  // Check enrollment status
  const { data: enrollment, isLoading: enrollLoading } = useQuery({
    queryKey: ["program-enrollment", user?.id, programId],
    queryFn: async () => {
      const { data } = await supabase
        .from("creator_program_enrollments")
        .select("*")
        .eq("user_id", user!.id)
        .eq("program_id", programId!)
        .maybeSingle();
      return data;
    },
    enabled: !!user && !!programId,
  });

  // Count other enrolled members
  const { data: memberCount } = useQuery({
    queryKey: ["program-member-count", programId],
    queryFn: async () => {
      const { count } = await supabase
        .from("creator_program_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("program_id", programId!)
        .eq("status", "active");
      return count || 0;
    },
    enabled: !!programId,
  });

  const joinMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("creator_program_enrollments")
        .insert({ user_id: user!.id, program_id: programId!, status: "active" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["program-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["program-member-count"] });
      toast.success(`You've joined ${program?.label}! 🎉`);
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.info("You're already enrolled in this program.");
      } else {
        toast.error("Failed to join. Please try again.");
      }
    },
  });

  const leaveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("creator_program_enrollments")
        .delete()
        .eq("user_id", user!.id)
        .eq("program_id", programId!);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["program-enrollment"] });
      queryClient.invalidateQueries({ queryKey: ["program-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["program-member-count"] });
      toast.success("You've left the program.");
    },
    onError: () => toast.error("Failed to leave. Please try again."),
  });

  if (!program) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center pb-24">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="font-bold text-lg">Program not found</p>
          <button type="button" onClick={() => navigate("/monetization")} className="mt-4 text-primary font-semibold text-sm">
            ← Back to Monetization
          </button>
        </div>
        <ZivoMobileNav />
      </div>
    );
  }

  const isEnrolled = !!enrollment;
  const IconComp = program.icon;
  const relatedPrograms = program.relatedPrograms
    .map((id) => ALL_PROGRAMS.find((p) => p.id === id))
    .filter(Boolean) as typeof ALL_PROGRAMS;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title={`${program.label} – ZIVO Programs`} description={program.description} />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate("/monetization")} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-sm font-bold flex-1 text-center truncate">{program.label}</h1>
          <button type="button"
            onClick={() => {
              navigator.clipboard.writeText(`${window.location.origin}/monetization/program/${programId}`);
              toast.success("Link copied!");
            }}
            className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"
          >
            <Share2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="px-4 py-5 space-y-5">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="rounded-2xl p-6 text-center relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${program.accent}20, ${program.accent}08)` }}>
            <div className="absolute inset-0 opacity-30" style={{ background: `radial-gradient(circle at 30% 50%, ${program.accent}30, transparent 70%)` }} />
            <div className="relative z-10">
              <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: `${program.accent}20` }}>
                <IconComp className="w-8 h-8" style={{ color: program.accent }} />
              </div>
              <h2 className="text-xl font-extrabold mb-2">{program.label}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto mb-3">{program.description}</p>
              
              {/* Quick Stats */}
              <div className="flex justify-center gap-4 text-center">
                <div>
                  <p className="text-xs font-bold" style={{ color: program.accent }}>{program.earningsRange}</p>
                  <p className="text-[9px] text-muted-foreground">Earnings</p>
                </div>
                <div className="w-px bg-border/40" />
                <div>
                  <p className="text-xs font-bold">{memberCount ?? 0} members</p>
                  <p className="text-[9px] text-muted-foreground">Enrolled</p>
                </div>
                <div className="w-px bg-border/40" />
                <div>
                  <p className="text-xs font-bold">{program.platformFee}</p>
                  <p className="text-[9px] text-muted-foreground">Fee</p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Join / Enrolled Button */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {isEnrolled ? (
            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-primary/10 text-primary font-bold text-sm">
                <CheckCircle className="w-4 h-4" /> You're enrolled
              </div>
              <button type="button"
                onClick={() => leaveMutation.mutate()}
                disabled={leaveMutation.isPending}
                className="w-full py-2.5 rounded-xl border border-destructive/30 text-destructive text-xs font-semibold touch-manipulation active:scale-[0.98] transition-transform"
              >
                {leaveMutation.isPending ? "Leaving..." : "Leave Program"}
              </button>
            </div>
          ) : (
            <button type="button"
              onClick={() => user ? joinMutation.mutate() : toast.error("Please sign in to join")}
              disabled={joinMutation.isPending}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white touch-manipulation active:scale-[0.98] transition-transform"
              style={{ background: `linear-gradient(135deg, ${program.accent}, ${program.accent}cc)` }}
            >
              {joinMutation.isPending ? "Joining..." : "Join Program — It's Free"}
            </button>
          )}
        </motion.div>

        {/* Tab Navigation */}
        <div className="flex gap-1 p-1 rounded-xl bg-muted/40">
          {(["overview", "earnings", "stories"] as const).map((tab) => (
            <button type="button"
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-colors ${
                activeTab === tab ? "bg-background shadow-sm text-foreground" : "text-muted-foreground"
              }`}
            >
              {tab === "earnings" ? "Earnings" : tab === "stories" ? "Stories" : "Overview"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-5">
              {/* Long Description */}
              <div className="rounded-xl border border-border/40 bg-card p-4">
                <p className="text-sm text-foreground/80 leading-relaxed">{program.longDescription}</p>
              </div>

              {/* Requirements */}
              <div className="space-y-3">
                <h3 className="font-bold text-[15px] flex items-center gap-2">
                  <Shield className="w-4 h-4" style={{ color: program.accent }} /> Requirements
                </h3>
                <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2.5">
                  {program.requirements.map((req, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: `${program.accent}15` }}>
                        <Check className="w-3 h-3" style={{ color: program.accent }} />
                      </div>
                      <p className="text-sm text-foreground/80">{req}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Benefits */}
              <div className="space-y-3">
                <h3 className="font-bold text-[15px] flex items-center gap-2">
                  <Star className="w-4 h-4" style={{ color: program.accent }} /> Benefits
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  {program.benefits.map((benefit, i) => (
                    <div key={i} className="rounded-xl border border-border/30 bg-card p-3 flex items-center gap-3">
                      <Sparkles className="w-4 h-4 shrink-0" style={{ color: program.accent }} />
                      <p className="text-sm font-medium">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* How It Works */}
              <div className="space-y-3">
                <h3 className="font-bold text-[15px] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: program.accent }} /> How It Works
                </h3>
                <div className="space-y-3">
                  {program.howItWorks.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs font-bold text-white" style={{ background: program.accent }}>
                        {i + 1}
                      </div>
                      <p className="text-sm text-foreground/80 pt-1">{step}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pro Tips */}
              <div className="space-y-3">
                <h3 className="font-bold text-[15px] flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" style={{ color: program.accent }} /> Pro Tips
                </h3>
                <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
                  {program.proTips.map((tip, i) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <span className="text-sm">💡</span>
                      <p className="text-sm text-foreground/80">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* FAQ */}
              <div className="space-y-3">
                <h3 className="font-bold text-[15px] flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" style={{ color: program.accent }} /> FAQ
                </h3>
                <div className="space-y-2">
                  {program.faq.map((item, i) => (
                    <button type="button"
                      key={i}
                      onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
                      className="w-full rounded-xl border border-border/40 bg-card p-3.5 text-left touch-manipulation"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold pr-2">{item.q}</p>
                        <ChevronRight className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${expandedFaq === i ? "rotate-90" : ""}`} />
                      </div>
                      <AnimatePresence>
                        {expandedFaq === i && (
                          <motion.p
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="text-xs text-muted-foreground mt-2 leading-relaxed overflow-hidden"
                          >
                            {item.a}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "earnings" && (
            <motion.div key="earnings" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
              {/* Earnings Overview */}
              <div className="rounded-2xl p-5 text-center" style={{ background: `linear-gradient(135deg, ${program.accent}15, ${program.accent}05)` }}>
                <Calculator className="w-8 h-8 mx-auto mb-3" style={{ color: program.accent }} />
                <h3 className="text-lg font-extrabold mb-1">Earnings Potential</h3>
                <p className="text-2xl font-black mb-1" style={{ color: program.accent }}>{program.earningsRange}</p>
                <p className="text-xs text-muted-foreground">Estimated monthly earnings for active participants</p>
              </div>

              {/* Key Metrics */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Platform Fee</p>
                  <p className="text-sm font-bold">{program.platformFee}</p>
                </div>
                <div className="rounded-xl border border-border/40 bg-card p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Payout Schedule</p>
                  <p className="text-sm font-bold">{program.payoutSchedule}</p>
                </div>
              </div>

              {/* Earnings Breakdown */}
              <div className="space-y-3">
                <h3 className="font-bold text-[15px]">How Earnings Are Calculated</h3>
                <div className="rounded-xl border border-border/40 bg-card p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Your Revenue</span>
                    <span className="text-sm font-bold">100%</span>
                  </div>
                  <div className="w-full bg-muted/40 rounded-full h-2">
                    <div className="h-2 rounded-full" style={{ width: "75%", background: program.accent }} />
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">You keep</span>
                    <span className="font-bold" style={{ color: program.accent }}>
                      {program.platformFee.includes("50%") ? "50%" : program.platformFee.includes("30%") ? "70%" : program.platformFee.includes("25%") ? "75%" : program.platformFee.includes("20%") ? "80%" : program.platformFee.includes("15%") ? "85%" : program.platformFee.includes("10%") ? "90%" : "95%"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Payout Info */}
              <div className="space-y-3">
                <h3 className="font-bold text-[15px]">Payout Details</h3>
                <div className="rounded-xl border border-border/40 bg-card p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Minimum payout</span>
                    <span className="font-semibold">$50.00</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Methods</span>
                    <span className="font-semibold">Bank, ABA, KHQR</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Processing time</span>
                    <span className="font-semibold">1-3 business days</span>
                  </div>
                </div>
              </div>

              <Link to="/wallet" className="block">
                <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
                  <Wallet className="w-5 h-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-bold">Go to Wallet</p>
                    <p className="text-[10px] text-muted-foreground">View balance and cash out</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                </div>
              </Link>
            </motion.div>
          )}

          {activeTab === "stories" && (
            <motion.div key="stories" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-5">
              <h3 className="font-bold text-[15px] flex items-center gap-2">
                <Award className="w-4 h-4" style={{ color: program.accent }} /> Success Stories
              </h3>
              {program.successStories.map((story, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-xl border border-border/40 bg-card p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ background: program.accent }}>
                        {story.name.charAt(0)}
                      </div>
                      <span className="text-sm font-bold">{story.name}</span>
                    </div>
                    <span className="text-sm font-extrabold" style={{ color: program.accent }}>{story.earnings}</span>
                  </div>
                  <p className="text-sm text-muted-foreground italic">"{story.quote}"</p>
                </motion.div>
              ))}

              {/* Community Stats */}
              <div className="rounded-xl p-5 text-center" style={{ background: `linear-gradient(135deg, ${program.accent}12, ${program.accent}05)` }}>
                <Users className="w-8 h-8 mx-auto mb-3" style={{ color: program.accent }} />
                <p className="text-2xl font-extrabold mb-1">{memberCount ?? 0}</p>
                <p className="text-xs text-muted-foreground">Active members in {program.label}</p>
              </div>

              {/* Pro Tips in Stories */}
              <div className="space-y-3">
                <h3 className="font-bold text-[15px] flex items-center gap-2">
                  <Lightbulb className="w-4 h-4" style={{ color: program.accent }} /> Tips From Top Earners
                </h3>
                <div className="space-y-2">
                  {program.proTips.map((tip, i) => (
                    <div key={i} className="rounded-xl border border-border/30 bg-card p-3 flex items-start gap-2.5">
                      <span className="text-sm">💡</span>
                      <p className="text-sm text-foreground/80">{tip}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="zivo-divider" />

        {/* Related Programs */}
        {relatedPrograms.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-bold text-[15px] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" /> Related Programs
            </h3>
            <div className="space-y-2">
              {relatedPrograms.map((rp) => (
                <Link key={rp.id} to={`/monetization/program/${rp.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${rp.accent}15` }}>
                      <rp.icon className="w-4 h-4" style={{ color: rp.accent }} />
                    </div>
                    <p className="text-sm font-bold flex-1">{rp.label}</p>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Bottom Links */}
        <div className="space-y-2">
          <Link to="/monetization/articles">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
              <BookOpen className="w-5 h-5 text-primary" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold">Creator Academy</p>
                <p className="text-[10px] text-muted-foreground">Learn more about this program</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </div>
          </Link>
          <Link to="/creator-dashboard">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
              <TrendingUp className="w-5 h-5 text-primary" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold">Creator Dashboard</p>
                <p className="text-[10px] text-muted-foreground">View your earnings & stats</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </div>
          </Link>
          <Link to="/monetization">
            <div className="flex items-center gap-3 p-3.5 rounded-xl border border-border/30 bg-card touch-manipulation active:scale-[0.98] transition-transform">
              <ArrowLeft className="w-5 h-5 text-primary" />
              <div className="flex-1 text-left">
                <p className="text-sm font-bold">All Programs</p>
                <p className="text-[10px] text-muted-foreground">Browse all 18 monetization programs</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground/40" />
            </div>
          </Link>
        </div>
      </div>

      <ZivoMobileNav />
    </div>
  );
}
