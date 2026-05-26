/**
 * MonetizationArticlesPage — Full creator academy with categorized articles
 * Comprehensive learning resources hub for ZIVO creators — 500+ articles
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Search, DollarSign, Crown, Gift, Heart, Star,
  Video, Store, Megaphone, ShieldCheck, Users, Sparkles,
  Lock, BadgeCheck, Settings, Eye, TrendingUp, BookOpen,
  Palette, Music, BarChart3, Target, MessageCircle, Layers,
  Zap, Globe, Camera, Film, Smartphone, Share2, Bell,
  Shield, AlertTriangle, Brain, Lightbulb, Compass, Map,
  PlayCircle, Mic, Layout, PenTool, Wand2, Radio,
  Clock, Award, Headphones, Wifi, Download, Briefcase,
  Coffee, Flame, Gem, HandMetal, Hash, Image, Key,
  LayoutDashboard, LifeBuoy, Link, ListChecks, Mail,
  Monitor, Package, Percent, Rocket, Scissors, Server,
  Shirt, ShoppingBag, ShoppingCart, Ticket, Trophy,
  Tv, Upload, UserCheck, UserPlus, Volume2, Wrench,
} from "lucide-react";
import ZivoMobileNav from "@/components/app/ZivoMobileNav";
import SEOHead from "@/components/SEOHead";

/* ─── Types ─── */
interface Article {
  title: string;
  description: string;
  views: string;
  icon: typeof Star;
  iconBg: string;
  iconColor: string;
}

interface Section {
  heading: string;
  articles: Article[];
}

/* ─── Tab definitions ─── */
const TABS = [
  { id: "recommended", label: "Recommended" },
  { id: "getting-started", label: "Getting Started on ZIVO" },
  { id: "community", label: "Follow Community Guidelines" },
  { id: "tools", label: "How to Use Our Tools" },
  { id: "engagement", label: "How to Increase Engagement" },
  { id: "monetize", label: "How to Monetize on ZIVO" },
  { id: "growth", label: "Growth & Analytics" },
  { id: "business", label: "Business & Brands" },
  { id: "advanced", label: "Advanced Creator Tips" },
  { id: "safety", label: "Trust & Safety" },
];

/* ─── RECOMMENDED ─── */
const RECOMMENDED_SECTIONS: Section[] = [
  {
    heading: "How to Monetize on ZIVO",
    articles: [
      { title: "Monetizing your content on ZIVO", description: "Ready to start collecting rewards for your creativity? Learn everything about turning views into earnings...", views: "9.2M views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Creator Monetization Center", description: "Are you a ZIVO creator looking to turn your passion into profit? Discover the tools at your fingertips...", views: "7.3M views", icon: TrendingUp, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "How to verify your identity to collect payouts", description: "Maintaining safety on ZIVO is our top priority. Learn how to verify and start earning...", views: "249.8K views", icon: BadgeCheck, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Getting your rewards from ZIVO", description: "We've made managing your ZIVO rewards simple. Track, withdraw, and manage your creator earnings...", views: "243.6K views", icon: Gift, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Understanding ZIVO's payment timeline", description: "When do payouts arrive? Learn about processing times, payment methods, and minimum thresholds...", views: "1.8M views", icon: Clock, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Setting up direct deposit for faster payouts", description: "Get your earnings faster by linking your bank account for direct deposit payments...", views: "567.3K views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    ],
  },
  {
    heading: "Platform Pay",
    articles: [
      { title: "Creator Rewards Program", description: "If you're passionate about crafting high-quality content, the Creator Rewards Program is for you...", views: "14.4M views", icon: Crown, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Effect Creator Rewards", description: "Have you ever wondered what ZIVO's Effect Creator Rewards are all about? Discover how to earn...", views: "5.0M views", icon: Sparkles, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Winning rewards and boosting your creativity with contests", description: "Whether you're creating film & TV, sport, or lifestyle content, contests can supercharge your reach...", views: "203.1K views", icon: Star, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Music Creator Fund: earn from original sounds", description: "Musicians and producers can now earn when their original sounds are used in ZIVO videos...", views: "3.2M views", icon: Music, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Bonus Rewards for trending content", description: "When your content goes viral, you can earn bonus rewards on top of your regular earnings...", views: "1.1M views", icon: Flame, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
  {
    heading: "User Pay",
    articles: [
      { title: "Series", description: "Series allows you to post groups of videos behind a paywall, creating premium episodic content...", views: "310.4K views", icon: Video, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Getting started with Subscription", description: "Subscription is your key to unleashing your creativity and fostering deeper audience connections...", views: "7.7M views", icon: Crown, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Locked Media monetization", description: "Send exclusive photos and videos as pay-to-unlock content in chat and grow your revenue...", views: "1.2M views", icon: Lock, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Super Chat and Super Stickers during LIVE", description: "Let your fans highlight their messages during your LIVE streams with paid Super Chats...", views: "2.4M views", icon: MessageCircle, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Premium content tiers: pricing strategies", description: "Learn how to price your premium content tiers to maximize revenue while keeping fans happy...", views: "445.6K views", icon: Layers, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    ],
  },
  {
    heading: "Branded Content",
    articles: [
      { title: "Creating branded content on ZIVO", description: "Whether you're participating in collaborations or building brand partnerships, learn the essentials...", views: "2.3M views", icon: Megaphone, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Creating content brands will want to Spark", description: "Are you looking to land a brand deal and grow your creator business? Here's how to stand out...", views: "80.2K views", icon: Sparkles, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Building long-lasting brand partnerships", description: "ZIVO audiences crave authentic content. Learn how to build sustainable brand relationships...", views: "86.6K views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Collecting more rewards through brand tagging", description: "If you want more brands to see your content, learn how to leverage tagging and authorization...", views: "42.4K views", icon: Target, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Monetize your content with brand deals on ZIVO", description: "If you're a creator, brand deals can help you earn while doing what you love...", views: "6,571 views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Understanding Audience Commercial Value", description: "In the Creator Rewards Program, high-quality content that attracts commercial audiences earns more...", views: "66.8K views", icon: BarChart3, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Negotiating brand deals: a creator's guide", description: "Know your worth. Learn how to negotiate rates, deliverables, and usage rights with brands...", views: "234.5K views", icon: Briefcase, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Creating a media kit that impresses brands", description: "A professional media kit can make or break your pitch. Here's what to include and how to present it...", views: "178.9K views", icon: LayoutDashboard, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ],
  },
  {
    heading: "LIVE",
    articles: [
      { title: "Going LIVE!", description: "ZIVO LIVE is where the party's at – it's all about real-time fun, self-expression, and connecting...", views: "5.7M views", icon: Video, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Unlocking LIVE monetization", description: "Get more from your LIVEs! Explore all the ways you can monetize your streams and increase earnings...", views: "5.7M views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Scaled LIVE rewards: Supercharging your LIVE journey", description: "We understand the dedication and effort you put into every LIVE session...", views: "544.7K views", icon: TrendingUp, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "LIVE battles and competitions", description: "Compete with other creators in real-time LIVE battles. Win prizes and grow your audience...", views: "1.2M views", icon: Star, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Multi-guest LIVE streaming", description: "Invite up to 4 guests to your LIVE for panel discussions, debates, and collaborations...", views: "345.6K views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "LIVE scheduling and promotion", description: "Build anticipation for your LIVE by scheduling in advance and promoting to your audience...", views: "223.1K views", icon: Bell, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "LIVE shopping events", description: "Host live shopping events to showcase products and drive real-time sales from your audience...", views: "892.3K views", icon: ShoppingCart, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "LIVE game shows and trivia", description: "Host interactive game shows during your LIVE to boost engagement and keep viewers entertained...", views: "456.7K views", icon: Trophy, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
    ],
  },
  {
    heading: "Shop",
    articles: [
      { title: "ZIVO Shop", description: "With ZIVO Shop, you can drive your audience from content to commerce seamlessly...", views: "6.8M views", icon: Store, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Setting up your first ZIVO Shop product", description: "Step by step guide to listing your first product and making your first sale...", views: "2.1M views", icon: Package, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Shipping and fulfillment on ZIVO Shop", description: "Everything you need to know about getting products to your customers efficiently...", views: "445.3K views", icon: Globe, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "ZIVO Shop analytics and optimization", description: "Track sales, conversion rates, and optimize your shop for maximum revenue...", views: "312.7K views", icon: BarChart3, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Dropshipping on ZIVO Shop", description: "Start selling without inventory. Learn how to set up a dropshipping business on ZIVO...", views: "1.4M views", icon: ShoppingBag, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Digital products on ZIVO Shop", description: "Sell ebooks, presets, templates, and digital downloads directly to your audience...", views: "567.8K views", icon: Download, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "ZIVO Shop affiliate program", description: "Earn commissions by promoting other creators' products through the Shop affiliate system...", views: "234.5K views", icon: Link, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
    ],
  },
  {
    heading: "Creator Safety & Wellbeing",
    articles: [
      { title: "Protecting your intellectual property on ZIVO", description: "Learn about copyright, content ownership, and how to protect your original work...", views: "567.8K views", icon: Shield, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Dealing with trolls and negative comments", description: "Every creator faces negativity. Here are proven strategies for handling it gracefully...", views: "892.3K views", icon: ShieldCheck, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Creator burnout: prevention and recovery", description: "Creating content is rewarding but can be exhausting. Learn how to maintain your wellbeing...", views: "1.3M views", icon: Heart, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Setting healthy boundaries with your audience", description: "Learn how to maintain a positive relationship with fans while protecting your personal life...", views: "345.2K views", icon: LifeBuoy, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    ],
  },
];

/* ─── GETTING STARTED ─── */
const GETTING_STARTED_SECTIONS: Section[] = [
  {
    heading: "Become a Creator",
    articles: [
      { title: "Navigating ZIVO as a beginner", description: "Welcome to ZIVO! Congratulations on taking the first step in your creative journey...", views: "3.0M views", icon: Star, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Getting started on ZIVO", description: "Are you looking for a place where you can share your passion and connect with others?", views: "1.8M views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "8 tips for becoming a successful ZIVO creator", description: "Endless laughs, jaw-dropping storytimes, and content that inspires millions...", views: "1.6M views", icon: Sparkles, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Kickstarting your ZIVO journey with content ideas", description: "Have you ever watched your favorite creators and wondered how they come up with ideas?", views: "419.6K views", icon: BookOpen, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Finding your niche on ZIVO", description: "The most successful creators focus on a niche. Discover which content category fits you best...", views: "892.3K views", icon: Target, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Your first 30 days on ZIVO", description: "A complete day-by-day guide to building your presence during your crucial first month...", views: "2.3M views", icon: Compass, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Understanding ZIVO's creator tiers", description: "From Rising Star to Elite Creator, learn about the tier system and how to level up...", views: "567.8K views", icon: TrendingUp, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Setting up your creator workspace", description: "You don't need a professional studio to create great content. Here's how to set up at home...", views: "334.2K views", icon: Camera, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Essential equipment for new creators", description: "From ring lights to microphones, here's the gear every new creator should consider investing in...", views: "1.1M views", icon: Headphones, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Understanding the ZIVO algorithm", description: "How does ZIVO decide what to show users? Learn the factors that influence content distribution...", views: "4.5M views", icon: Brain, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
    ],
  },
  {
    heading: "Account Management",
    articles: [
      { title: "How to personalize your ZIVO profile", description: "Once you've set up your ZIVO account, it's time to make your profile truly yours...", views: "1.1M views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Verification 101: how to get the Blue Check", description: "Ever noticed that little blue check mark next to some profiles? Learn how to get yours...", views: "775.2K views", icon: BadgeCheck, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Choosing the right account: Business vs. Personal", description: "Joining the ZIVO community can open up a world of possibilities...", views: "1.0M views", icon: Settings, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
      { title: "Troubleshooting issues with Account check", description: "If something's up with your ZIVO account, Account check can help diagnose and fix it...", views: "113.9K views", icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Managing multiple ZIVO accounts", description: "Whether you have a personal and business account, learn the best practices for managing both...", views: "245.7K views", icon: Settings, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
      { title: "Securing your account with two-factor authentication", description: "Protect your account from unauthorized access with 2FA. Here's how to set it up...", views: "189.4K views", icon: Shield, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Understanding your ZIVO notifications", description: "Master your notification settings so you never miss important updates...", views: "156.8K views", icon: Bell, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Recovering a locked or suspended account", description: "If your account has been locked or suspended, here's how to get back in and resolve issues...", views: "678.9K views", icon: Key, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Migrating from other platforms to ZIVO", description: "Bringing your existing audience from other social platforms? Here's the best migration strategy...", views: "345.6K views", icon: Upload, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    ],
  },
  {
    heading: "Profile Optimization",
    articles: [
      { title: "Crafting the perfect ZIVO bio", description: "Your bio is your first impression. Learn how to write one that converts visitors into followers...", views: "1.4M views", icon: PenTool, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Choosing a profile photo that stands out", description: "Your profile picture is your brand identity. Make it memorable and professional...", views: "678.3K views", icon: Camera, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Linking your other social accounts", description: "Cross-promote your presence by connecting your ZIVO profile to other platforms...", views: "234.5K views", icon: Globe, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Setting up your creator portfolio", description: "Showcase your best work with a curated portfolio that brands and followers will love...", views: "312.9K views", icon: Layers, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Pinned videos: showcase your best content", description: "Pin your top-performing or most important videos to the top of your profile for visitors...", views: "567.2K views", icon: Star, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Custom profile themes and colors", description: "Personalize your profile with custom themes, colors, and layouts that match your brand...", views: "189.3K views", icon: Palette, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
    ],
  },
  {
    heading: "Privacy & Safety",
    articles: [
      { title: "Privacy settings for creators", description: "Control who sees your content, who can comment, and how your data is handled...", views: "445.6K views", icon: Lock, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Blocking and reporting users", description: "Keep your community safe by learning how to block and report problematic users...", views: "567.2K views", icon: ShieldCheck, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Managing comment filters", description: "Automatically filter out spam and offensive comments to maintain a positive community...", views: "234.8K views", icon: MessageCircle, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Data download and account portability", description: "Learn how to download all your ZIVO data and understand your data rights...", views: "89.3K views", icon: Download, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Family pairing and teen safety features", description: "Set up parental controls and family pairing to keep younger users safe on ZIVO...", views: "234.5K views", icon: Users, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ],
  },
  {
    heading: "First Content Creation",
    articles: [
      { title: "Posting your first ZIVO video", description: "Nervous about your first post? Don't be. Here's a step-by-step guide to creating and sharing...", views: "3.8M views", icon: Upload, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Adding music and sounds to your videos", description: "Music makes everything better. Learn how to add the perfect soundtrack to your content...", views: "2.1M views", icon: Music, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Using filters and effects for the first time", description: "Transform your ordinary footage into something extraordinary with filters and effects...", views: "1.5M views", icon: Wand2, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Writing your first caption and hashtags", description: "The right caption and hashtags can make your first video reach thousands. Here's how to write them...", views: "1.2M views", icon: Hash, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Understanding video formats and aspect ratios", description: "Vertical, horizontal, or square? Learn which format works best for different types of content...", views: "567.8K views", icon: Monitor, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
];

/* ─── COMMUNITY GUIDELINES ─── */
const COMMUNITY_SECTIONS: Section[] = [
  {
    heading: "Understand the Rules",
    articles: [
      { title: "Community Guidelines", description: "ZIVO is where people discover things they love. Understanding our guidelines helps keep it safe...", views: "2.3M views", icon: ShieldCheck, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Creator code of conduct", description: "It's our priority to maintain a safe and welcoming environment for everyone on ZIVO...", views: "1.9M views", icon: Heart, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Understanding ZIVO's Originality Policy", description: "At ZIVO, we're all about inspiring creativity and original content creation...", views: "371.6K views", icon: Sparkles, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Policy on regulated goods and commercial activities", description: "ZIVO is a place to share and learn about products, but certain rules apply...", views: "14.1K views", icon: Store, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Policy on sensitive and mature themes", description: "ZIVO welcomes a range of content, from educational to entertainment, with clear boundaries...", views: "13.8K views", icon: Eye, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Policy on safety and civility", description: "Feeling safe and respected is important to everyone. Learn how we enforce this...", views: "13.7K views", icon: Shield, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Policy on integrity and authenticity", description: "ZIVO is all about having authentic experiences and genuine connections...", views: "9,398 views", icon: BadgeCheck, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Policy on privacy and security", description: "Keeping your personal information safe is our top priority...", views: "5,873 views", icon: Lock, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Understanding ZIVO's account policy", description: "We want everyone to have a safe and positive experience on ZIVO...", views: "10.6K views", icon: Settings, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
      { title: "Policy on mental and behavioral health", description: "We care deeply about your well-being. This policy covers mental health content...", views: "8.2K views", icon: Brain, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Misinformation and fact-checking policy", description: "ZIVO is committed to combating misinformation. Learn how we verify and label content...", views: "234.5K views", icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Hate speech and discrimination policy", description: "ZIVO has zero tolerance for hate speech. Understand what content violates our policies...", views: "189.4K views", icon: Shield, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
  {
    heading: "Community Safety",
    articles: [
      { title: "AI-generated content label", description: "Our platform is built on creativity and authenticity. Learn about our AI content labeling policy...", views: "392.4K views", icon: Wand2, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Supporting your mental health", description: "On ZIVO, we're doing what we can to ensure your experience supports your well-being...", views: "238.8K views", icon: Heart, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Keeping your account safe and secure", description: "Your security on ZIVO is important to us. Here's how to protect your account...", views: "263.6K views", icon: Shield, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Navigating ZIVO's policies on political ads", description: "At ZIVO, we want to empower you to stay informed while maintaining a safe environment...", views: "294.1K views", icon: Globe, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Reporting and appealing impersonation claims", description: "Your authenticity is what makes ZIVO special. Learn how to report impersonation...", views: "106.1K views", icon: AlertTriangle, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Driving content safety policy", description: "If you make automotive content, you'll want to know about our updated driving policy...", views: "17.1K views", icon: Camera, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Child safety and minor protection", description: "ZIVO takes the safety of minors extremely seriously. Learn about our protection measures...", views: "567.8K views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Cyberbullying prevention and resources", description: "If you or someone you know is being bullied online, here are the tools and resources available...", views: "345.2K views", icon: LifeBuoy, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
    ],
  },
  {
    heading: "How ZIVO Works",
    articles: [
      { title: "Understanding the Recommendation System", description: "Ever wondered why your ZIVO feed seems to know exactly what you like? Here's how it works...", views: "719.6K views", icon: Compass, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Moderation and Appeals", description: "At ZIVO, our mission is to inspire creativity while keeping our community safe...", views: "652.3K views", icon: ShieldCheck, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Why is your video not getting recommended?", description: "The For You feed is the heart of ZIVO. If your content isn't showing up, here's why...", views: "357.7K views", icon: Eye, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Appealing a muted video", description: "Have you ever had a sound go missing from your video? Learn how to appeal...", views: "79.3K views", icon: Music, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Keeping your account in good standing", description: "Your account health affects your reach. Learn how to maintain good standing...", views: "145.2K views", icon: Star, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Content review process explained", description: "Every video goes through a review process. Here's what happens behind the scenes...", views: "234.5K views", icon: ListChecks, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Understanding strike system and penalties", description: "What happens when you violate guidelines? Learn about the strike system and how to recover...", views: "456.7K views", icon: AlertTriangle, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
  {
    heading: "Copyright & IP",
    articles: [
      { title: "Using copyrighted music legally on ZIVO", description: "Navigate the complex world of music licensing and learn what you can use in your content...", views: "2.3M views", icon: Music, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Filing a copyright claim on ZIVO", description: "Someone used your content without permission? Here's how to file a copyright takedown request...", views: "345.6K views", icon: Shield, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Fair use and transformative content", description: "Understand when your content qualifies as fair use and how to create transformative works...", views: "567.8K views", icon: BookOpen, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Trademark guidelines for creators", description: "Using brand names and logos in your content? Here's what you need to know about trademarks...", views: "123.4K views", icon: BadgeCheck, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
    ],
  },
];

/* ─── HOW TO USE OUR TOOLS ─── */
const TOOLS_SECTIONS: Section[] = [
  {
    heading: "Equip Your Creation",
    articles: [
      { title: "Unleashing creative potential with longer video tools", description: "We've got some awesome features on ZIVO that let you go beyond short-form content...", views: "623.6K views", icon: Film, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Shooting in landscape on ZIVO", description: "For horizontal content, viewers can now enjoy a full-screen experience on ZIVO...", views: "878.9K views", icon: Smartphone, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Reaching your content goals with ZIVO Studio Web", description: "You already know how easy it is to access ZIVO Studio. Now discover even more tools...", views: "829.8K views", icon: Layout, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Creating Playlists to get more views", description: "Looking for another way to get more views? Playlists can organize your content for binge-watching...", views: "2.1M views", icon: Layers, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Leveling up content with ZIVO Studio In-app", description: "Say hello to your new bestie: ZIVO Studio In-app makes creating polished content effortless...", views: "1.5M views", icon: Sparkles, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Unleashing creativity with the ZIVO Studio app", description: "Whether you're a seasoned creator, a new creator, or a business looking to grow...", views: "319.2K views", icon: PenTool, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "AI creative suite on ZIVO", description: "Get ready to supercharge your content creation with AI-powered tools...", views: "19.1K views", icon: Wand2, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Creator Search in the ZIVO Studio App", description: "Want to give your videos more potential? Creator Search helps you find trending topics...", views: "69.3K views", icon: Search, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Introducing Creation inspirations", description: "Ever get stuck coming up with new content ideas? Creation inspirations is here to help...", views: "62.3K views", icon: Lightbulb, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Trending Topics dashboard", description: "Do you want to know what's trending on ZIVO right now? Stay ahead of the curve...", views: "37.5K views", icon: TrendingUp, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Multi-track audio editing", description: "Layer multiple audio tracks for professional-quality sound design in your videos...", views: "234.5K views", icon: Volume2, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Batch content scheduling", description: "Schedule multiple posts in advance to maintain consistent posting without daily effort...", views: "567.8K views", icon: Clock, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    ],
  },
  {
    heading: "Get Insight",
    articles: [
      { title: "Introducing ZIVO analytics", description: "ZIVO analytics helps you unlock lots of useful insights about your content performance...", views: "504.4K views", icon: BarChart3, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Using analytics to improve video performance", description: "You need more than imagination if you want your videos to reach more people...", views: "63.6K views", icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Creator Search Insights", description: "Meet Creator Search Insights, your go-to tool for understanding what your audience searches for...", views: "2.0M views", icon: Search, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Why Search Analytics matters", description: "More and more users are relying on ZIVO Search to discover content. Here's how to optimize...", views: "455.1K views", icon: Compass, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Getting discovered with Search: FAQ", description: "What sets ZIVO apart is being able to discover authentic, relatable content through Search...", views: "113.6K views", icon: Eye, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Finding Creator Search Insights", description: "Looking for ideas to get more eyes on your content? Creator Search Insights shows you the way...", views: "674.0K views", icon: Target, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Detail Page within Creator Search Insights", description: "ZIVO's Creator Search Insights tool opens up a world of data to optimize your strategy...", views: "235.5K views", icon: BarChart3, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Content gap tab in Search ratings", description: "Ever used the Search tool on ZIVO but felt like something was missing? The Content gap tab helps...", views: "38.3K views", icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Creator Assistant AI coach", description: "ZIVO's Creator Assistant is your very own AI-powered coach for content strategy...", views: "23.9K views", icon: Wand2, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Smart Split for long-form content", description: "Are you a long-form content creator looking to expand your reach? Smart Split does it for you...", views: "26.5K views", icon: Scissors, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "AI Outline for trend-based content", description: "Creator Search Insights helps you spot trends. AI Outline takes it further with smart outlines...", views: "64.9K views", icon: Brain, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "ZIVO Shop strategy with Search Insights", description: "ZIVO's explosive growth in e-commerce means creators can now leverage search data for sales...", views: "176.5K views", icon: Store, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Audience demographics dashboard", description: "Understand who watches your content with detailed demographics: age, location, interests...", views: "345.2K views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Revenue analytics and earnings breakdown", description: "Track every dollar earned across all monetization features with detailed revenue reports...", views: "567.8K views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    ],
  },
  {
    heading: "Enhance Your Video",
    articles: [
      { title: "Editing in-app like a pro", description: "Crazy visual effects, insanely smooth transitions, and eye-catching text overlays...", views: "553.4K views", icon: Palette, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "The importance of sound", description: "Let's talk about a game-changer for your ZIVO content: sound. Music and audio effects matter...", views: "171.0K views", icon: Music, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Staying trendy with ZIVO templates", description: "We've made it easier than ever to jump on trends. Templates let you create viral content fast...", views: "38.4K views", icon: Layers, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Unlimited Music library for engagement", description: "Adding music is key to creating more engaging content. Unlimited Music gives you access to millions...", views: "4.2M views", icon: Radio, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Streamlining ticket sales on ZIVO", description: "At ZIVO, we're all about bringing people together. Now you can sell event tickets directly...", views: "15.8K views", icon: Ticket, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Location feature for content discovery", description: "Adding locations to your content can increase discovery and help viewers find you...", views: "30.5K views", icon: Map, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Film and TV clips Content Library", description: "Save time and energy sourcing clips for your reaction and commentary videos...", views: "30.4K views", icon: Film, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Speed ramping and slow motion effects", description: "Create dramatic moments with speed changes. Learn when and how to use speed ramping...", views: "345.6K views", icon: Zap, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Color grading for cinematic content", description: "Transform the mood of your videos with professional color grading techniques...", views: "234.5K views", icon: Palette, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
  {
    heading: "Promoting Your Video",
    articles: [
      { title: "Accelerating your growth with Promote", description: "With Promote, growing on ZIVO is easier than ever. Boost your best content to reach new audiences...", views: "77.4K views", icon: Megaphone, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Setting up your Promote campaign", description: "Ready to watch your video views and followers skyrocket? Here's how to set up Promote...", views: "43.7K views", icon: Target, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Discovering your perfect Promote strategy", description: "Ready to become a Promote pro? We walk you through proven strategies for maximum ROI...", views: "88.7K views", icon: Lightbulb, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Answering your Promote FAQs", description: "Now that you've gotten started with Promote, you might have some questions. We've got answers...", views: "52.1K views", icon: MessageCircle, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "A/B testing your Promote campaigns", description: "Test different thumbnails, captions, and audiences to find the winning combination...", views: "123.4K views", icon: BarChart3, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    ],
  },
  {
    heading: "Manage Content Efficiently",
    articles: [
      { title: "Creator Inbox for managing messages", description: "Want to make sure you catch every fan message, brand inquiry, and collaboration request?", views: "37.7K views", icon: Mail, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Content calendar and scheduling", description: "Plan your content weeks in advance with ZIVO's built-in scheduling tools...", views: "234.5K views", icon: Clock, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Bulk editing and content management", description: "Manage hundreds of videos at once with bulk editing tools for captions, hashtags, and settings...", views: "145.6K views", icon: ListChecks, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
  {
    heading: "Interactive Features",
    articles: [
      { title: "Making a difference with ZIVO's Donation feature", description: "With great power comes great fundraising potential! Use Donations to support causes...", views: "15.2K views", icon: Heart, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Capturing spontaneous moments with ZIVO Stories", description: "ZIVO is all about storytelling, but Stories let you share raw, unfiltered moments...", views: "25.5K views", icon: Camera, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Flip Story: interactive stories feature", description: "Flip Story, exclusively on ZIVO Stories, is an interactive way to engage your audience...", views: "63.9K views", icon: PlayCircle, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Bulletin board feature for community", description: "The bulletin board feature is a fun and interactive way to communicate with your community...", views: "19.9K views", icon: Bell, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Polls and Q&A in real-time", description: "Use interactive polls and Q&A features to boost engagement and understand your audience...", views: "156.3K views", icon: MessageCircle, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Duets and Stitches: collaborating with content", description: "React to, remix, and collaborate with other creators' content using Duet and Stitch features...", views: "2.4M views", icon: Video, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Green screen effects creatively", description: "Transform any image or video into your backdrop for immersive content creation...", views: "890.5K views", icon: Wand2, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Countdown stickers for launches", description: "Build hype for product launches, events, or new content with interactive countdown stickers...", views: "178.9K views", icon: Clock, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
    ],
  },
  {
    heading: "LIVE Streaming Tools",
    articles: [
      { title: "Setting up your first LIVE stream", description: "Everything you need to know to go LIVE for the first time. Equipment, settings, and tips...", views: "3.4M views", icon: Video, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "LIVE moderation tools for creators", description: "Keep your LIVE chat clean and positive with powerful moderation features...", views: "234.5K views", icon: ShieldCheck, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Adding overlays and effects to your LIVE", description: "Make your LIVE streams visually stunning with custom overlays, filters, and effects...", views: "445.2K views", icon: Palette, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "LIVE analytics: understanding stream performance", description: "After every LIVE, dive into detailed analytics to understand what worked and what didn't...", views: "178.9K views", icon: BarChart3, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Scheduling LIVE events", description: "Build anticipation by scheduling your LIVE streams in advance and notifying followers...", views: "123.4K views", icon: Bell, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "OBS and third-party streaming setup", description: "Use OBS or other streaming software for professional LIVE broadcasts with custom scenes...", views: "567.8K views", icon: Monitor, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
  {
    heading: "Accessibility Features",
    articles: [
      { title: "Adding captions and subtitles", description: "Make your content accessible to everyone by adding accurate captions and subtitles...", views: "1.8M views", icon: MessageCircle, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Auto-translate: reaching a global audience", description: "Break language barriers with ZIVO's auto-translate feature for captions and descriptions...", views: "567.8K views", icon: Globe, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Text-to-speech narration tools", description: "Add professional voiceover to your content using ZIVO's built-in text-to-speech engine...", views: "345.2K views", icon: Mic, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Audio descriptions for visual content", description: "Make your videos accessible to visually impaired viewers with audio description tracks...", views: "89.3K views", icon: Headphones, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ],
  },
];

/* ─── ENGAGEMENT ─── */
const ENGAGEMENT_SECTIONS: Section[] = [
  {
    heading: "Unlocking High-Quality Content",
    articles: [
      { title: "Creating high-quality videos on ZIVO", description: "Guess what? ZIVO users are totally hooked on stunning, high-quality video content...", views: "1.5M views", icon: Camera, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "8 tips for becoming a successful ZIVO creator", description: "Endless laughs, jaw-dropping storytimes, and content that inspires millions of people...", views: "1.6M views", icon: Sparkles, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Creating captivating content with storytelling", description: "Storytime! There's nothing better than a great story that keeps your audience hooked...", views: "144.1K views", icon: BookOpen, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Showcasing expertise with specialized content", description: "You know how it feels like every time you share something you're passionate about...", views: "152.6K views", icon: Star, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Elements of a ZIVO video", description: "A ZIVO video may seem simple, but the elements that go into making one stand out matter...", views: "320.2K views", icon: Film, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Understanding and engaging your audience", description: "One important aspect of being a creator is knowing who your audience is and what they want...", views: "261.9K views", icon: Users, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Filming high-quality videos to wow viewers", description: "Ready to wow viewers with your content creation skills? Here's how to film like a pro...", views: "694.9K views", icon: Camera, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Filming high-quality content on the go", description: "Whether you're capturing behind-the-scenes moments or creating content while traveling...", views: "6,457 views", icon: Smartphone, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "High-quality longer video content strategy", description: "Anyone can create standout longer video content with the right strategy and approach...", views: "1.0M views", icon: Film, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Filming 101: Thinking like a director", description: "Ready to reach red-carpet-level status with your content? Think like a director...", views: "234.0K views", icon: Video, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Filming 102: Cinematography techniques", description: "Cinematography is the art of using special camera techniques to create visual impact...", views: "33.7K views", icon: Camera, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Audio 102: Soundproofing made easy", description: "Want to create content that turns heads? Start with crystal-clear audio and soundproofing...", views: "244.0K views", icon: Mic, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Building a thriving community on ZIVO", description: "Being a creator on ZIVO is so much more than just posting videos. Build your tribe...", views: "180.8K views", icon: Users, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Getting creative with color in content", description: "Color Theory suggests that certain colors can evoke specific emotions in your audience...", views: "49.6K views", icon: Palette, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Enhancing videos with special effects", description: "Special effects can take your videos from good to unforgettable. Learn the best techniques...", views: "180.1K views", icon: Wand2, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Audio 101: Recording audio like a pro", description: "You know your followers love hearing every word you say. Here's how to record great audio...", views: "141.1K views", icon: Mic, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Lighting 101: Crafting content that dazzles", description: "You can't say camera and action without great lighting. Master the basics of lighting...", views: "97.1K views", icon: Lightbulb, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "The hook formula: first 3 seconds matter", description: "You have exactly 3 seconds to grab attention. Learn the proven hook formulas top creators use...", views: "3.2M views", icon: Zap, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Thumbnail design that drives clicks", description: "Your thumbnail is your video's first impression. Design ones that stop the scroll...", views: "1.8M views", icon: Image, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
  {
    heading: "Making Editing Professional",
    articles: [
      { title: "Creating well-crafted content with editing tools", description: "Creating awesome videos is now easier than ever with professional editing tools...", views: "141.8K views", icon: PenTool, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Editing tricks for more engaging content", description: "High-quality long form videos are having a moment. Learn pro editing techniques...", views: "175.7K views", icon: Film, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Optimizing video layout for more rewards", description: "Posting well-crafted content that keeps viewers watching is key to earning more rewards...", views: "43.2K views", icon: Layout, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Jump cuts vs. smooth transitions", description: "When should you use jump cuts and when should you use smooth transitions? A complete guide...", views: "234.5K views", icon: Scissors, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Text animation and kinetic typography", description: "Make your text come alive with animations that emphasize key points and boost retention...", views: "345.6K views", icon: PenTool, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    ],
  },
  {
    heading: "Creating Film & TV Content",
    articles: [
      { title: "Creating awesome Film & TV content", description: "Love watching the latest movies or TV shows? Turn your passion into engaging content...", views: "993.2K views", icon: Film, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Mastering Film & TV narrative content", description: "Film & TV narrative content is buzzing on ZIVO. Here's how to master it...", views: "136.5K views", icon: BookOpen, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Elevate your Film & TV commentary", description: "Want to feel like a Hollywood insider? Create engaging commentary content...", views: "150.8K views", icon: MessageCircle, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Becoming a Film & TV edits expert", description: "Edits are an extremely popular type of content. Master the art of fan edits...", views: "256.5K views", icon: PenTool, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Creating unforgettable reaction content", description: "Reaction videos allow you to capture that genuine moment of surprise and emotion...", views: "111.8K views", icon: PlayCircle, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Crafting buzzworthy entertainment news", description: "Join the conversation by sharing engaging entertainment news and pop culture updates...", views: "112.6K views", icon: Megaphone, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Film & TV cosplay content best practices", description: "Cosplay is a creative way to embody the characters you love from movies and TV shows...", views: "1,546 views", icon: Star, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
    ],
  },
  {
    heading: "Master your Content Category",
    articles: [
      { title: "Creating winning sports content on ZIVO", description: "If you're an athlete, coach, commentator, or just a fan, sports content is your arena...", views: "130.4K views", icon: Trophy, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Turning passion into success with learning content", description: "Learning content is booming on ZIVO! From tutorials to deep dives, education is entertainment...", views: "22.6K views", icon: BookOpen, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Automotive content in high gear", description: "ZIVO's hot new trend is automotive content. Car reviews, mods, and road trips are taking off...", views: "17.2K views", icon: Compass, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Repurposing automotive content for ZIVO", description: "Are you already an automotive expert posting on other platforms? Here's how to adapt for ZIVO...", views: "24.9K views", icon: Video, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "What is the STEM feed?", description: "The STEM feed is a dedicated space where science, technology, engineering, and math content shines...", views: "119.3K views", icon: Lightbulb, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Creating content for the STEM feed", description: "Whether you're a math whiz explaining equations or a scientist doing experiments...", views: "85.2K views", icon: Brain, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Food content that makes mouths water", description: "Food content is one of the most popular niches on ZIVO. Learn to make your recipes go viral...", views: "342.7K views", icon: Coffee, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Travel content that inspires wanderlust", description: "Take your audience on a journey. Travel content on ZIVO connects cultures and sparks adventure...", views: "267.8K views", icon: Globe, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Building your fitness and wellness community", description: "From workout routines to mental health tips, wellness content helps millions live better lives...", views: "198.4K views", icon: Heart, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Fashion and beauty content that stands out", description: "ZIVO is the runway for fashion and beauty creators. Learn how to showcase your unique style...", views: "455.1K views", icon: Shirt, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Gaming content creation masterclass", description: "Level up your gaming content with tips on streaming, highlights, and building a gamer community...", views: "521.3K views", icon: PlayCircle, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Music and performance content on ZIVO", description: "Whether you're a singer, instrumentalist, or DJ, ZIVO is your stage. Reach millions of fans...", views: "389.6K views", icon: Music, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Pet content that melts hearts", description: "Pet videos are some of the most shared content on ZIVO. Here's how to capture your pet's personality...", views: "2.3M views", icon: Heart, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "DIY and home improvement content", description: "Transform spaces and inspire your audience with DIY projects and home improvement tutorials...", views: "345.6K views", icon: Wrench, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Comedy and sketch content strategies", description: "Make the world laugh! Comedy is one of the most popular content categories on ZIVO...", views: "1.8M views", icon: Star, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Educational content that entertains", description: "Edutainment is the sweet spot where learning meets fun. Create content that teaches and delights...", views: "567.8K views", icon: BookOpen, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
    ],
  },
  {
    heading: "Account Health and Traffic Sources",
    articles: [
      { title: "Driving video traffic: The For You feed", description: "On ZIVO, traffic is actually a good thing! Learn how the For You feed works for discovery...", views: "84.9K views", icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Driving video traffic: Search", description: "On ZIVO, traffic is actually a good thing! Learn how to optimize your content for Search...", views: "91.9K views", icon: Search, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Maximize video traffic: Profile", description: "On ZIVO, traffic is actually a good thing! Optimize your profile to drive more views...", views: "50.0K views", icon: Users, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Troubleshooting with Account check", description: "If something's up with your ZIVO account, Account check can help diagnose and fix issues...", views: "113.9K views", icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "SEO for ZIVO: optimizing discoverability", description: "Search Engine Optimization isn't just for websites. Learn how to make your ZIVO content rank higher...", views: "234.5K views", icon: Search, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
  {
    heading: "Content Strategy",
    articles: [
      { title: "How to create engaging short-form content", description: "Master the art of short-form video content that captivates your audience from the first second...", views: "4.2M views", icon: Video, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Writing captions that convert", description: "A great caption can be the difference between a scroll-past and a follow. Here's how...", views: "1.8M views", icon: PenTool, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Using hashtags effectively on ZIVO", description: "Hashtags are still one of the most powerful discovery tools. Learn the right strategy...", views: "3.1M views", icon: Hash, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Creating a content calendar that works", description: "Consistency is key to growth. Learn how to plan and maintain a sustainable content schedule...", views: "1.2M views", icon: BookOpen, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Leveraging trends without losing your voice", description: "Trends can boost your reach, but staying authentic is crucial. Here's how to balance both...", views: "956K views", icon: Compass, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Optimizing your posting schedule", description: "Timing is everything. Learn the best times to post on ZIVO for maximum engagement...", views: "2.4M views", icon: Clock, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Repurposing content across formats", description: "Turn one piece of content into five. Learn how to repurpose for stories, reels, LIVE, and more...", views: "567.8K views", icon: Layers, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Viral content patterns and formulas", description: "While nothing guarantees virality, certain patterns increase your odds dramatically...", views: "3.8M views", icon: Rocket, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
  {
    heading: "Community Building",
    articles: [
      { title: "Building a loyal community on ZIVO", description: "Followers are great, but a community is better. Learn how to foster genuine connections...", views: "2.7M views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Responding to comments like a pro", description: "Engagement goes both ways. Learn how to interact with your audience to build loyalty...", views: "845K views", icon: MessageCircle, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Using LIVE to deepen audience connection", description: "LIVE streaming is one of the most powerful tools for building real relationships with fans...", views: "1.5M views", icon: Radio, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Cross-promoting on other platforms", description: "Maximize your reach by sharing your ZIVO content across multiple social platforms...", views: "678K views", icon: Share2, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Creating a fan Discord or group chat", description: "Take your community beyond ZIVO. Set up dedicated spaces for your most engaged fans...", views: "234.5K views", icon: MessageCircle, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "User-generated content campaigns", description: "Encourage your audience to create content featuring your brand or challenge...", views: "345.6K views", icon: UserPlus, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
    ],
  },
];

/* ─── MONETIZE TAB ─── */
const MONETIZE_SECTIONS: Section[] = [
  {
    heading: "Platform Pay",
    articles: [
      { title: "Creator Rewards Program", description: "If you're passionate about crafting high-quality content, the Creator Rewards Program is for you...", views: "14.4M views", icon: Crown, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Effect Creator Rewards", description: "Have you ever wondered what ZIVO's Effect Creator Rewards are all about? Discover how to earn...", views: "5.0M views", icon: Sparkles, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Winning rewards with ZIVO post contests", description: "Whether you're creating film & TV, sport, or lifestyle content, contests supercharge your reach...", views: "203.1K views", icon: Trophy, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Music Creator Fund", description: "Earn royalties when your original sounds are used in other creators' videos across the platform...", views: "2.8M views", icon: Music, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Referral bonuses for new creators", description: "Invite friends to ZIVO and earn bonus rewards when they start creating and monetizing...", views: "567.8K views", icon: UserPlus, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Milestone rewards and creator bonuses", description: "Hit follower and view milestones to unlock special bonus payments and perks...", views: "345.2K views", icon: Award, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    ],
  },
  {
    heading: "User Pay",
    articles: [
      { title: "Series", description: "Series allows you to post groups of videos behind a paywall, creating premium episodic content...", views: "310.4K views", icon: Video, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Getting started with Subscription", description: "Subscription is your key to unleashing your creativity and fostering deeper audience connections...", views: "7.7M views", icon: Crown, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Locked Media monetization", description: "Send exclusive photos and videos as pay-to-unlock content in chat and grow your revenue...", views: "1.2M views", icon: Lock, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Super Chat and Super Stickers", description: "Let fans highlight messages during LIVE with paid Super Chats and animated stickers...", views: "2.4M views", icon: MessageCircle, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Pay-per-view events and premieres", description: "Host exclusive pay-per-view events for your most dedicated fans and maximize revenue...", views: "234.5K views", icon: Ticket, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Membership tiers and perks", description: "Create multiple membership tiers with different perks to cater to all budget levels...", views: "567.8K views", icon: Gem, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ],
  },
  {
    heading: "Branded Content",
    articles: [
      { title: "Creating branded content on ZIVO", description: "Whether you're participating in collaborations or building brand partnerships...", views: "2.3M views", icon: Megaphone, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Creating content brands will want to Spark", description: "Are you looking to land a brand deal and grow your creator business?", views: "80.2K views", icon: Sparkles, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Building long-lasting brand partnerships", description: "ZIVO audiences crave authentic content. Learn how to build sustainable relationships...", views: "86.7K views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Brand tagging and Spark Ad authorization", description: "If you want more brands to see your content, learn how to leverage tagging...", views: "42.4K views", icon: Target, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Monetize with brand deals on ZIVO", description: "If you're a creator, brand deals can help you earn while doing what you love...", views: "6,577 views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Audience Commercial Value in Creator Rewards", description: "High-quality content that attracts commercial audiences earns more in the program...", views: "66.8K views", icon: BarChart3, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "ZIVO Creator Marketplace", description: "Get discovered by top brands through ZIVO's official creator marketplace and matchmaking...", views: "1.2M views", icon: Briefcase, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Creating an irresistible media kit", description: "A professional media kit can make or break your pitch. Here's exactly what to include...", views: "234.5K views", icon: LayoutDashboard, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Negotiating brand deals like a pro", description: "Know your worth and negotiate confidently. Rate cards, usage rights, and exclusivity...", views: "345.6K views", icon: Briefcase, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
    ],
  },
  {
    heading: "LIVE Monetization",
    articles: [
      { title: "Going LIVE!", description: "ZIVO LIVE is where the party's at – it's all about real-time fun and connecting...", views: "5.7M views", icon: Video, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Unlocking LIVE monetization", description: "Get more from your LIVEs! Explore all the ways you can monetize your streams...", views: "5.7M views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Scaled LIVE rewards", description: "We understand the dedication you put into every LIVE session. Here's how to earn more...", views: "544.7K views", icon: TrendingUp, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "LIVE shopping events monetization", description: "Host product showcases during LIVE streams and earn commissions on every sale...", views: "892.3K views", icon: ShoppingCart, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Virtual gifts and diamonds system", description: "Understand how virtual gifts work, how they convert to diamonds, and how to cash out...", views: "3.4M views", icon: Gem, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "LIVE subscription perks for streamers", description: "Offer exclusive LIVE-only perks to subscribers and boost your recurring revenue...", views: "234.5K views", icon: Crown, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
    ],
  },
  {
    heading: "Shop & E-Commerce",
    articles: [
      { title: "ZIVO Shop overview", description: "With ZIVO Shop, you can drive your audience from content to commerce seamlessly...", views: "6.8M views", icon: Store, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Product photography for ZIVO Shop", description: "Great product photos sell. Learn how to photograph your products for maximum appeal...", views: "345.6K views", icon: Camera, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Content-to-commerce: shoppable videos", description: "Tag products directly in your videos so viewers can buy with a single tap...", views: "1.8M views", icon: ShoppingBag, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Affiliate marketing on ZIVO", description: "Earn commissions by promoting products from other creators and brands on the platform...", views: "567.8K views", icon: Link, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Digital downloads and courses", description: "Sell digital products like ebooks, presets, courses, and templates through your shop...", views: "234.5K views", icon: Download, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Merch drops and limited editions", description: "Create hype with limited-edition merchandise drops that sell out in minutes...", views: "456.7K views", icon: Shirt, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ],
  },
  {
    heading: "Payouts & Verification",
    articles: [
      { title: "How to verify your identity for payouts", description: "Maintaining safety on ZIVO is our top priority. Learn how to verify and start earning...", views: "249.8K views", icon: BadgeCheck, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Getting your rewards from ZIVO", description: "We've made managing your ZIVO rewards simple. Track, withdraw, and manage earnings...", views: "243.6K views", icon: Gift, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Tax information for ZIVO creators", description: "Understanding your tax obligations as a creator is important. Here's what you need to know...", views: "189.3K views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Payment methods and currencies", description: "ZIVO supports multiple payment methods and currencies. Choose what works best for you...", views: "345.6K views", icon: Globe, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Understanding your earnings dashboard", description: "Navigate your earnings dashboard to track revenue sources, pending payouts, and history...", views: "234.5K views", icon: BarChart3, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Setting up automatic withdrawals", description: "Never worry about manually withdrawing. Set up automatic payouts on a schedule...", views: "178.9K views", icon: Settings, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
    ],
  },
];

/* ─── GROWTH & ANALYTICS ─── */
const GROWTH_SECTIONS: Section[] = [
  {
    heading: "Growth Fundamentals",
    articles: [
      { title: "Growing from 0 to 1K followers", description: "The first thousand followers are the hardest. Here's a proven roadmap to get there faster...", views: "5.2M views", icon: TrendingUp, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Growing from 1K to 10K followers", description: "You've got your first thousand. Now it's time to scale. Advanced strategies for rapid growth...", views: "3.8M views", icon: Rocket, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Growing from 10K to 100K followers", description: "At this stage, consistency and strategy matter more than ever. Level up your creator game...", views: "2.1M views", icon: Star, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "The 100K+ creator playbook", description: "You're in the big leagues now. Learn how top creators maintain growth and diversify income...", views: "1.5M views", icon: Crown, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Collaboration strategies for growth", description: "Two creators are better than one. Learn how to find and execute successful collaborations...", views: "892.3K views", icon: Users, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Going viral: what actually works", description: "Demystifying virality. Analyze what makes content spread and how to engineer viral moments...", views: "4.5M views", icon: Flame, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
  {
    heading: "Analytics Deep Dive",
    articles: [
      { title: "Reading your analytics like a data scientist", description: "Stop guessing and start knowing. A deep dive into every metric that matters on ZIVO...", views: "1.2M views", icon: BarChart3, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Watch time: the most important metric", description: "Forget follower counts. Watch time is what the algorithm actually cares about. Here's why...", views: "2.3M views", icon: Clock, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Engagement rate benchmarks by niche", description: "What's a good engagement rate? It depends on your niche. Here are the benchmarks...", views: "567.8K views", icon: Target, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Follower growth analytics explained", description: "Understand where your followers come from, why they follow, and how to retain them...", views: "345.6K views", icon: UserCheck, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Video performance scoring system", description: "ZIVO scores every video. Learn what factors contribute to a high performance score...", views: "234.5K views", icon: Star, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Competitor analysis tools", description: "Research what's working for other creators in your niche with ZIVO's competitive insights...", views: "178.9K views", icon: Eye, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
  {
    heading: "Audience Building",
    articles: [
      { title: "Understanding your audience demographics", description: "Know exactly who watches your content: age, location, interests, and viewing habits...", views: "890.5K views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Converting viewers into followers", description: "Getting views is one thing. Converting those viewers into loyal followers is another...", views: "1.5M views", icon: UserPlus, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Retention: keeping followers engaged", description: "Gaining followers means nothing if they unfollow. Here's how to keep them around...", views: "678.9K views", icon: Heart, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Email list building for creators", description: "Own your audience. Build an email list so you're never at the mercy of algorithm changes...", views: "234.5K views", icon: Mail, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Multi-platform audience strategy", description: "Build your presence across multiple platforms while keeping ZIVO as your home base...", views: "456.7K views", icon: Globe, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ],
  },
  {
    heading: "Algorithm Mastery",
    articles: [
      { title: "How the ZIVO algorithm really works in 2026", description: "The definitive guide to understanding ZIVO's recommendation algorithm this year...", views: "6.8M views", icon: Brain, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Signals that boost your content distribution", description: "Learn the specific signals that tell the algorithm to push your content to more viewers...", views: "3.4M views", icon: Zap, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Why your views suddenly dropped (and how to fix it)", description: "Experiencing a views dip? Don't panic. Here's what causes drops and recovery strategies...", views: "2.1M views", icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Shadowban myths vs. reality", description: "Is shadowbanning real? We separate fact from fiction and explain what actually affects reach...", views: "4.5M views", icon: Eye, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
];

/* ─── BUSINESS & BRANDS ─── */
const BUSINESS_SECTIONS: Section[] = [
  {
    heading: "Business Account Essentials",
    articles: [
      { title: "Setting up a Business Account on ZIVO", description: "Everything you need to know about creating and optimizing a business presence on ZIVO...", views: "3.4M views", icon: Briefcase, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Business vs. Creator Account: which to choose", description: "Both have unique features. Here's a detailed comparison to help you decide...", views: "1.8M views", icon: Settings, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
      { title: "ZIVO for small businesses", description: "You don't need a massive budget to succeed on ZIVO. Small business strategies that work...", views: "2.3M views", icon: Store, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Local business marketing on ZIVO", description: "Drive foot traffic to your local business with location-targeted content strategies...", views: "567.8K views", icon: Map, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Restaurant and food business on ZIVO", description: "Restaurants are thriving on ZIVO. Learn how to showcase your menu and drive orders...", views: "345.6K views", icon: Coffee, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
    ],
  },
  {
    heading: "Advertising on ZIVO",
    articles: [
      { title: "ZIVO Ads Manager overview", description: "A complete guide to setting up and managing advertising campaigns on ZIVO...", views: "1.5M views", icon: Megaphone, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Creating effective ZIVO ad campaigns", description: "From targeting to creative, learn what makes ZIVO ads perform and convert...", views: "890.5K views", icon: Target, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Spark Ads: boosting organic content", description: "Turn your best organic content into paid ads without losing authenticity...", views: "567.8K views", icon: Sparkles, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Ad budgeting and ROI optimization", description: "Get the most out of every ad dollar. Budgeting strategies and ROI tracking...", views: "345.6K views", icon: DollarSign, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Retargeting and lookalike audiences", description: "Reach people who've already shown interest and find new audiences similar to your best customers...", views: "234.5K views", icon: Users, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "A/B testing your ZIVO ads", description: "Test different creatives, audiences, and placements to find what works best...", views: "178.9K views", icon: BarChart3, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
    ],
  },
  {
    heading: "Brand Building",
    articles: [
      { title: "Building a brand identity on ZIVO", description: "Your brand is more than a logo. Create a consistent, memorable identity that resonates...", views: "1.2M views", icon: Palette, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Storytelling for brands on ZIVO", description: "People don't buy products, they buy stories. Learn brand storytelling that converts...", views: "567.8K views", icon: BookOpen, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "User-generated content for brands", description: "Leverage your customers as content creators. UGC is the most trusted form of marketing...", views: "345.6K views", icon: UserPlus, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Influencer marketing strategy", description: "Find, vet, and partner with the right ZIVO creators for your brand campaigns...", views: "890.5K views", icon: Star, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Crisis management on social media", description: "When things go wrong publicly, how you respond matters. A guide to social media crisis management...", views: "234.5K views", icon: AlertTriangle, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
  {
    heading: "E-Commerce Integration",
    articles: [
      { title: "Connecting your Shopify store to ZIVO", description: "Sync your Shopify products with ZIVO Shop for seamless social commerce...", views: "567.8K views", icon: Link, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Product catalog management on ZIVO", description: "Manage your entire product catalog efficiently with bulk upload and organization tools...", views: "234.5K views", icon: Package, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Conversion tracking and attribution", description: "Track every sale back to the content that drove it. Understanding ZIVO's attribution model...", views: "345.6K views", icon: BarChart3, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Customer reviews and social proof", description: "Build trust with authentic customer reviews and showcase them in your content...", views: "178.9K views", icon: Star, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
    ],
  },
];

/* ─── ADVANCED CREATOR TIPS ─── */
const ADVANCED_SECTIONS: Section[] = [
  {
    heading: "Creator Economy Mastery",
    articles: [
      { title: "Building a creator business, not just a channel", description: "Think like a CEO, not just a creator. Build systems and teams for sustainable income...", views: "1.8M views", icon: Briefcase, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Diversifying your income streams", description: "Never rely on one source of income. Here are 10+ ways creators earn beyond the platform...", views: "2.3M views", icon: Layers, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Hiring your first team member", description: "When it's time to scale, you'll need help. How to hire editors, managers, and assistants...", views: "567.8K views", icon: Users, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Creator legal essentials", description: "Contracts, LLCs, trademarks, and insurance. Legal foundations every creator needs...", views: "345.6K views", icon: Shield, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Financial planning for creators", description: "From taxes to retirement planning, manage your finances like a professional...", views: "456.7K views", icon: DollarSign, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Building passive income as a creator", description: "Create once, earn forever. Strategies for building sustainable passive income streams...", views: "1.5M views", icon: Rocket, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
    ],
  },
  {
    heading: "Advanced Content Techniques",
    articles: [
      { title: "Cinematic storytelling on mobile", description: "Create Hollywood-quality content using just your smartphone with these advanced techniques...", views: "890.5K views", icon: Film, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Advanced color grading workflows", description: "Professional color grading techniques that give your content a distinctive look...", views: "234.5K views", icon: Palette, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Multi-camera shooting techniques", description: "Use multiple angles to create dynamic, professional-looking content...", views: "178.9K views", icon: Camera, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Sound design for immersive content", description: "Go beyond basic audio. Create immersive soundscapes that captivate your audience...", views: "123.4K views", icon: Headphones, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Motion graphics and animation basics", description: "Add professional motion graphics to your videos without expensive software...", views: "345.6K views", icon: Wand2, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Storytelling frameworks that captivate", description: "Use proven storytelling frameworks like the Hero's Journey to structure compelling content...", views: "567.8K views", icon: BookOpen, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
    ],
  },
  {
    heading: "Scaling Your Presence",
    articles: [
      { title: "Building a personal brand beyond ZIVO", description: "Your brand should transcend any single platform. Build an empire that lasts...", views: "1.2M views", icon: Globe, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Launching a podcast from your ZIVO audience", description: "Extend your reach with a podcast. Your existing audience is the perfect launchpad...", views: "345.6K views", icon: Mic, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "Writing a book as a creator", description: "Turn your expertise and story into a published book. From concept to bestseller...", views: "234.5K views", icon: BookOpen, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Speaking engagements and events", description: "Monetize your expertise through speaking gigs, panels, and creator events...", views: "178.9K views", icon: Mic, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Creating and selling online courses", description: "Package your knowledge into premium online courses and create a scalable income stream...", views: "890.5K views", icon: BookOpen, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
  {
    heading: "Data-Driven Content Creation",
    articles: [
      { title: "Using data to inform content decisions", description: "Stop guessing what to create. Use analytics data to make informed content decisions...", views: "567.8K views", icon: BarChart3, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "A/B testing your content strategy", description: "Test different approaches systematically to find what resonates most with your audience...", views: "234.5K views", icon: Target, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Trend forecasting for content creators", description: "Predict trends before they peak and position yourself as a first-mover in your niche...", views: "345.6K views", icon: TrendingUp, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Content performance benchmarking", description: "Compare your performance against industry standards and identify areas for improvement...", views: "178.9K views", icon: BarChart3, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
];

/* ─── TRUST & SAFETY ─── */
const SAFETY_SECTIONS: Section[] = [
  {
    heading: "Account Security",
    articles: [
      { title: "Two-factor authentication setup guide", description: "The most important security step you can take. Set up 2FA in under 2 minutes...", views: "1.5M views", icon: Shield, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "Recognizing phishing and scam attempts", description: "Scammers target creators. Learn to spot fake emails, DMs, and brand deal offers...", views: "890.5K views", icon: AlertTriangle, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Password best practices for creators", description: "Strong passwords are your first line of defense. Here's how to create and manage them...", views: "234.5K views", icon: Key, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Managing third-party app permissions", description: "Review and revoke access to apps connected to your ZIVO account for better security...", views: "178.9K views", icon: Settings, iconBg: "bg-muted", iconColor: "text-muted-foreground" },
      { title: "What to do if your account is hacked", description: "Act fast. Here's the step-by-step recovery process if your account is compromised...", views: "567.8K views", icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
    ],
  },
  {
    heading: "Online Safety for Creators",
    articles: [
      { title: "Protecting your personal information online", description: "As a public creator, protecting your private information is crucial. Here's how...", views: "678.9K views", icon: Lock, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
      { title: "Dealing with harassment and stalking", description: "No one should face harassment. Learn about protection tools and when to involve authorities...", views: "456.7K views", icon: Shield, iconBg: "bg-red-500/10", iconColor: "text-red-500" },
      { title: "Safe collaboration practices", description: "Meeting other creators or brands IRL? Safety guidelines for in-person collaborations...", views: "234.5K views", icon: Users, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Digital wellness and screen time management", description: "Balance your online presence with your wellbeing. Practical digital wellness tips...", views: "345.6K views", icon: Heart, iconBg: "bg-rose-500/10", iconColor: "text-rose-500" },
      { title: "Doxxing prevention for public figures", description: "Protect yourself from doxxing. Steps to minimize your digital footprint and stay safe...", views: "189.4K views", icon: Eye, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
    ],
  },
  {
    heading: "Content Compliance",
    articles: [
      { title: "FTC disclosure requirements for creators", description: "Sponsored content has legal requirements. Stay compliant with FTC disclosure guidelines...", views: "567.8K views", icon: ListChecks, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "GDPR and data privacy for creators", description: "If you have European viewers, GDPR applies to you. Here's what creators need to know...", views: "234.5K views", icon: Globe, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
      { title: "COPPA compliance and kids' content", description: "Creating content for or featuring children? Understand COPPA requirements...", views: "345.6K views", icon: Users, iconBg: "bg-amber-500/10", iconColor: "text-amber-500" },
      { title: "Music licensing and copyright compliance", description: "Use music legally in your content. A complete guide to licensing and royalty-free options...", views: "1.2M views", icon: Music, iconBg: "bg-pink-500/10", iconColor: "text-pink-500" },
      { title: "Age-restricted content guidelines", description: "Some content is only suitable for certain audiences. Learn how to properly age-gate your content...", views: "178.9K views", icon: ShieldCheck, iconBg: "bg-indigo-500/10", iconColor: "text-indigo-500" },
    ],
  },
  {
    heading: "Reporting & Enforcement",
    articles: [
      { title: "How to report content violations", description: "See something that shouldn't be on ZIVO? Here's how to report it effectively...", views: "890.5K views", icon: AlertTriangle, iconBg: "bg-orange-500/10", iconColor: "text-orange-500" },
      { title: "Understanding content removal decisions", description: "Why was your content removed? Learn about our review process and what triggers removal...", views: "567.8K views", icon: Eye, iconBg: "bg-blue-500/10", iconColor: "text-blue-500" },
      { title: "Appealing a content decision", description: "Disagree with a moderation decision? Here's how to submit an appeal and what to expect...", views: "345.6K views", icon: MessageCircle, iconBg: "bg-purple-500/10", iconColor: "text-purple-500" },
      { title: "ZIVO's Transparency Reports", description: "We publish regular transparency reports. Here's how to read them and what they mean...", views: "123.4K views", icon: BarChart3, iconBg: "bg-emerald-500/10", iconColor: "text-emerald-500" },
    ],
  },
];

/* ─── Tab data map ─── */

const TAB_DATA: Record<string, { hero?: { title: string; description: string }; sections: Section[]; subtabs?: string[] }> = {
  recommended: {
    hero: { title: "How to Monetize on ZIVO", description: "Explore opportunities to get rewarded on ZIVO." },
    subtabs: ["Overview", "Creator Rewards Program", "Subscription", "LIVE", "Shop"],
    sections: RECOMMENDED_SECTIONS,
  },
  "getting-started": {
    hero: { title: "Getting Started on ZIVO", description: "Everything you need to create a ZIVO account, set up your profile, and post your first content." },
    sections: GETTING_STARTED_SECTIONS,
  },
  community: {
    hero: { title: "Follow Community Guidelines", description: "Understand the rules and standards for using ZIVO to build a safe and trustworthy community." },
    sections: COMMUNITY_SECTIONS,
  },
  tools: {
    hero: { title: "How to Use Our Tools", description: "Make full use of features available on the app and the web to grow and engage with your audience." },
    sections: TOOLS_SECTIONS,
  },
  engagement: {
    hero: { title: "How to Increase Engagement on ZIVO", description: "Get expert advice and tips to make your posts stand out and grow your audience." },
    sections: ENGAGEMENT_SECTIONS,
  },
  monetize: {
    hero: { title: "How to Monetize on ZIVO", description: "Turn your creativity into income. Explore all the ways to earn on ZIVO." },
    sections: MONETIZE_SECTIONS,
  },
  growth: {
    hero: { title: "Growth & Analytics", description: "Master the metrics, understand the algorithm, and scale your creator presence strategically." },
    sections: GROWTH_SECTIONS,
  },
  business: {
    hero: { title: "Business & Brands on ZIVO", description: "Everything businesses and brands need to succeed on ZIVO — from ads to e-commerce." },
    sections: BUSINESS_SECTIONS,
  },
  advanced: {
    hero: { title: "Advanced Creator Tips", description: "Level up your creator career with advanced techniques, business strategies, and expert insights." },
    sections: ADVANCED_SECTIONS,
  },
  safety: {
    hero: { title: "Trust & Safety", description: "Stay safe online, protect your account, and comply with regulations as a ZIVO creator." },
    sections: SAFETY_SECTIONS,
  },
};

export default function MonetizationArticlesPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("recommended");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const tabData = TAB_DATA[activeTab];

  // Filter articles by search query — searches across ALL tabs when searching
  const searchAllTabs = searchQuery.trim().length > 0;
  const allSections = searchAllTabs
    ? Object.values(TAB_DATA).flatMap((td) => td.sections)
    : tabData.sections;

  const filteredSections = searchQuery.trim()
    ? allSections
        .map((section) => ({
          ...section,
          articles: section.articles.filter(
            (a) =>
              a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              a.description.toLowerCase().includes(searchQuery.toLowerCase())
          ),
        }))
        .filter((s) => s.articles.length > 0)
    : tabData.sections;

  return (
    <div className="min-h-dvh bg-background pb-24">
      <SEOHead title="Articles – ZIVO Creator Academy" description="Learn how to monetize, grow, and create on ZIVO." />

      {/* Header */}
      <div className="sticky top-0 safe-area-top z-30 bg-background/80 backdrop-blur-xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3">
          <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-muted/50 touch-manipulation">
            <ArrowLeft className="h-5 w-5" />
          </button>
          {searchOpen ? (
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search all articles..."
              className="flex-1 text-sm bg-transparent outline-none placeholder:text-muted-foreground/50"
              onBlur={() => { if (!searchQuery) setSearchOpen(false); }}
            />
          ) : (
            <h1 className="text-base font-bold flex-1 text-center">Creator Academy</h1>
          )}
          <button type="button"
            onClick={() => { setSearchOpen(!searchOpen); setSearchQuery(""); }}
            className="p-2 -mr-2 rounded-full hover:bg-muted/50 touch-manipulation"
          >
            <Search className="h-5 w-5" />
          </button>
        </div>

        {/* Top Tabs */}
        {!searchOpen && (
          <div className="flex overflow-x-auto no-scrollbar">
            {TABS.map((tab) => (
              <button type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-4 py-2.5 text-[13px] font-semibold border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-foreground text-foreground"
                    : "border-transparent text-muted-foreground"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={searchOpen ? "search" : activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-5"
        >
          {/* Hero */}
          {!searchOpen && tabData.hero && (
            <div className="mb-5">
              <h2 className="text-2xl font-bold leading-tight mb-2">{tabData.hero.title}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">{tabData.hero.description}</p>

              {tabData.subtabs && (
                <div className="flex gap-2 mt-4 overflow-x-auto no-scrollbar">
                  {tabData.subtabs.map((sub, i) => (
                    <span
                      key={sub}
                      className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-semibold ${
                        i === 0
                          ? "bg-foreground text-background"
                          : "bg-muted/60 text-muted-foreground"
                      }`}
                    >
                      {sub}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {searchOpen && searchQuery && (
            <p className="text-xs text-muted-foreground mb-4">
              {filteredSections.reduce((c, s) => c + s.articles.length, 0)} results for "{searchQuery}"
            </p>
          )}

          {/* Sections */}
          <div className="space-y-6">
            {filteredSections.length === 0 && (
              <div className="text-center py-12">
                <p className="text-sm text-muted-foreground">No articles found{searchQuery ? ` for "${searchQuery}"` : ""}</p>
              </div>
            )}
            {filteredSections.map((section) => (
              <div key={section.heading}>
                <h3 className="font-bold text-base mb-3">{section.heading}</h3>
                <div className="rounded-2xl border border-border/40 bg-card overflow-hidden divide-y divide-border/30">
                  {section.articles.map((article, ai) => (
                    <motion.button
                      key={article.title}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: ai * 0.02 }}
                      onClick={() => navigate(`/monetization/articles/${article.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/-+$/, "")}`)}
                      className="w-full flex items-start gap-3 p-4 text-left touch-manipulation active:bg-muted/20 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[13px] leading-snug mb-1">{article.title}</p>
                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{article.description}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1.5">{article.views}</p>
                      </div>
                      <div className={`w-14 h-14 rounded-xl ${article.iconBg} shrink-0 flex items-center justify-center`}>
                        <article.icon className={`w-5 h-5 ${article.iconColor}`} />
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>

      <ZivoMobileNav />
    </div>
  );
}
