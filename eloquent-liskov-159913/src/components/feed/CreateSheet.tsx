/**
 * CreateSheet - ZIVO creator command center.
 *
 * Opens from the bottom-nav create button and routes to the right studio flow.
 * Items requiring auth preserve the selected destination through login.
 */
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ComponentType } from "react";
import {
  ArrowUpRight,
  Bell,
  BookOpen,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  ChevronRight,
  Clock,
  Film,
  HeartHandshake,
  Megaphone,
  MessageSquare,
  Mic2,
  Plus,
  Radio,
  Rocket,
  Search,
  Settings,
  ShoppingBag,
  Sparkles,
  Store,
  TrendingUp,
  Users,
  Wand2,
  Zap,
} from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

type StudioMode = "create" | "grow" | "manage";

type CreateItem = {
  id: string;
  label: string;
  sublabel: string;
  icon: ComponentType<{ className?: string }>;
  iconClass: string;
  bgClass: string;
  accentClass: string;
  path: string;
  studio: StudioMode;
  requiresAuth?: boolean;
  featured?: boolean;
};

type ShortcutItem = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  path: string;
  requiresAuth?: boolean;
};

const CREATE_ITEMS: CreateItem[] = [
  { id: "post", label: "Post", sublabel: "Photo, video, or text", icon: Plus, iconClass: "text-sky-600", bgClass: "bg-sky-500/10", accentClass: "from-sky-500 to-blue-600", path: "/feed?compose=post", studio: "create", requiresAuth: true, featured: true },
  { id: "reel", label: "Reel", sublabel: "Short video", icon: Film, iconClass: "text-fuchsia-600", bgClass: "bg-fuchsia-500/10", accentClass: "from-fuchsia-500 to-rose-500", path: "/feed?compose=reel", studio: "create", requiresAuth: true, featured: true },
  { id: "story", label: "Story", sublabel: "Share for 24h", icon: Camera, iconClass: "text-orange-600", bgClass: "bg-orange-500/10", accentClass: "from-orange-400 to-pink-500", path: "/feed?compose=story", studio: "create", requiresAuth: true, featured: true },
  { id: "live", label: "Live", sublabel: "Go live now", icon: Radio, iconClass: "text-red-600", bgClass: "bg-red-500/10", accentClass: "from-red-500 to-pink-600", path: "/feed?compose=live", studio: "create", requiresAuth: true, featured: true },
  { id: "spaces", label: "Spaces", sublabel: "Audio room", icon: Mic2, iconClass: "text-purple-600", bgClass: "bg-purple-500/10", accentClass: "from-purple-500 to-violet-500", path: "/voice-rooms/create", studio: "create", requiresAuth: true },
  { id: "marketplace", label: "Marketplace", sublabel: "Sell items", icon: ShoppingBag, iconClass: "text-emerald-600", bgClass: "bg-emerald-500/10", accentClass: "from-emerald-500 to-teal-500", path: "/feed?compose=shop", studio: "grow", requiresAuth: true },
  { id: "job", label: "Job", sublabel: "Post a hiring", icon: Briefcase, iconClass: "text-indigo-600", bgClass: "bg-indigo-500/10", accentClass: "from-indigo-500 to-sky-500", path: "/jobs-hub/create", studio: "grow", requiresAuth: true },
  { id: "boost", label: "Boost", sublabel: "Promote a post", icon: Rocket, iconClass: "text-rose-600", bgClass: "bg-rose-500/10", accentClass: "from-rose-500 to-orange-500", path: "/shop-dashboard/boost", studio: "grow", requiresAuth: true },
  { id: "group", label: "Group", sublabel: "Build a community", icon: Users, iconClass: "text-blue-600", bgClass: "bg-blue-500/10", accentClass: "from-blue-500 to-indigo-500", path: "/communities?new=1", studio: "grow", requiresAuth: true },
  { id: "event", label: "Event", sublabel: "Bring people together", icon: Calendar, iconClass: "text-amber-600", bgClass: "bg-amber-500/10", accentClass: "from-amber-400 to-orange-500", path: "/events-hub/create", studio: "grow", requiresAuth: true },
  { id: "business", label: "Business", sublabel: "Page for your shop", icon: Building2, iconClass: "text-teal-600", bgClass: "bg-teal-500/10", accentClass: "from-teal-500 to-cyan-500", path: "/shop-dashboard", studio: "manage", requiresAuth: true },
  { id: "products", label: "Products", sublabel: "Manage shop catalog", icon: Store, iconClass: "text-emerald-600", bgClass: "bg-emerald-500/10", accentClass: "from-emerald-500 to-lime-500", path: "/shop-dashboard/products", studio: "manage", requiresAuth: true },
  { id: "orders", label: "Orders", sublabel: "Review recent sales", icon: Clock, iconClass: "text-slate-700", bgClass: "bg-slate-500/10", accentClass: "from-slate-500 to-zinc-700", path: "/shop-dashboard/orders", studio: "manage", requiresAuth: true },
  { id: "analytics", label: "Analytics", sublabel: "See creator growth", icon: TrendingUp, iconClass: "text-violet-600", bgClass: "bg-violet-500/10", accentClass: "from-violet-500 to-fuchsia-500", path: "/shop-dashboard/analytics", studio: "manage", requiresAuth: true },
];

const FEATURED_CREATE_ITEMS = CREATE_ITEMS.filter((item) => item.featured);

const STUDIO_MODES: Array<{ id: StudioMode; label: string; description: string }> = [
  { id: "create", label: "Create", description: "Posts, reels, stories, live" },
  { id: "grow", label: "Grow", description: "Commerce, hiring, events" },
  { id: "manage", label: "Manage", description: "Business tools and inbox" },
];

const GOAL_CARDS = [
  { id: "launch", label: "Launch fast", description: "Start with a reel, then add story follow-up.", icon: Rocket, path: "/feed?compose=reel", requiresAuth: true },
  { id: "sell", label: "Sell something", description: "Open marketplace mode and tag the offer.", icon: Store, path: "/feed?compose=shop", requiresAuth: true },
  { id: "community", label: "Build community", description: "Create an event or group around the topic.", icon: HeartHandshake, path: "/events-hub/create", requiresAuth: true },
  { id: "announce", label: "Make an announcement", description: "Publish a post and share it to story.", icon: Megaphone, path: "/feed?compose=post", requiresAuth: true },
];

const PUBLISH_TEMPLATES = [
  { id: "drop", label: "Product drop", copy: "New drop is live. Tap in before it sells out.", path: "/feed?compose=shop" },
  { id: "behind", label: "Behind the scenes", copy: "A quick look at what I am building today.", path: "/feed?compose=story" },
  { id: "question", label: "Ask the audience", copy: "What should I make next?", path: "/feed?compose=poll" },
  { id: "live", label: "Live promo", copy: "Going live now. Come hang out.", path: "/feed?compose=live" },
];

const SHORTCUT_ITEMS: ShortcutItem[] = [
  { id: "saved", label: "Saved", icon: BookOpen, path: "/saved", requiresAuth: true },
  { id: "notifications", label: "Notifications", icon: Bell, path: "/notifications", requiresAuth: true },
  { id: "messages", label: "Messages", icon: MessageSquare, path: "/chat", requiresAuth: true },
  { id: "trending", label: "Trending", icon: TrendingUp, path: "/trending" },
  { id: "history", label: "History", icon: Clock, path: "/history", requiresAuth: true },
  { id: "settings", label: "Settings", icon: Settings, path: "/settings", requiresAuth: true },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Fallback return path for the sign-in CTA. Individual actions preserve their own destination. */
  authRedirectPath?: string;
}

export default function CreateSheet({ open, onOpenChange, authRedirectPath }: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [studioMode, setStudioMode] = useState<StudioMode>("create");
  const [query, setQuery] = useState("");

  const studioItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return CREATE_ITEMS.filter((item) =>
        `${item.label} ${item.sublabel}`.toLowerCase().includes(q),
      );
    }
    return CREATE_ITEMS.filter((item) => !item.featured && item.studio === studioMode);
  }, [query, studioMode]);

  const filteredShortcuts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SHORTCUT_ITEMS;
    return SHORTCUT_ITEMS.filter((item) => item.label.toLowerCase().includes(q));
  }, [query]);

  const go = (path: string, requiresAuth?: boolean) => {
    onOpenChange(false);
    if (requiresAuth && !user) {
      navigate(`/login?redirect=${encodeURIComponent(path)}`);
      return;
    }
    navigate(path);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[91%] max-w-[440px] p-0 flex flex-col gap-0 overflow-hidden bg-background"
      >
        <div className="border-b border-border/40 bg-background/95 px-4 pb-3 backdrop-blur-xl" style={{ paddingTop: "max(var(--zivo-safe-top,0px), 16px)" }}>
          <div className="flex items-center justify-between">
            <div>
              <div className="mb-1 flex w-fit items-center gap-1.5 rounded-full bg-muted/60 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                <Sparkles className="h-3 w-3 text-primary" />
                ZIVO Studio
              </div>
              <SheetTitle className="text-2xl font-extrabold tracking-tight">Create</SheetTitle>
              <SheetDescription className="sr-only">
                Choose what to create in ZIVO, including posts, reels, stories, live streams, events, listings, jobs, and voice rooms.
              </SheetDescription>
              <p className="mt-0.5 text-[12px] font-medium text-muted-foreground">
                Launch content, commerce, and community from one place.
              </p>
            </div>
            <div className="flex items-center gap-1.5 pr-10">
              <button
                type="button"
                onClick={() => go("/explore")}
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-muted/60 px-3 text-[12px] font-bold text-muted-foreground transition-colors hover:text-foreground active:opacity-70"
              >
                See all
                <ArrowUpRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-[max(var(--zivo-safe-bottom,0px),16px)]">
          <div className="sticky top-0 z-10 border-b border-border/30 bg-background/92 px-3 py-3 backdrop-blur-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search create tools"
                className="h-11 w-full rounded-2xl border border-border/50 bg-muted/35 pl-9 pr-3 text-[14px] font-medium outline-none transition-colors placeholder:text-muted-foreground focus:border-primary/40 focus:bg-background"
              />
            </div>
            <div className="mt-2 grid grid-cols-3 gap-1 rounded-2xl bg-muted/45 p-1">
              {STUDIO_MODES.map((mode) => (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setStudioMode(mode.id)}
                  className={cn(
                    "min-h-10 rounded-xl px-2 text-center transition-all active:scale-[0.98]",
                    studioMode === mode.id
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  aria-pressed={studioMode === mode.id}
                >
                  <span className="block text-[12px] font-extrabold leading-tight">{mode.label}</span>
                  <span className="mt-0.5 hidden truncate text-[9px] font-semibold leading-tight opacity-70 min-[390px]:block">
                    {mode.description}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="mx-3 mb-4 mt-3 overflow-hidden rounded-3xl border border-border/50 bg-card shadow-sm">
            <div className="bg-gradient-to-r from-foreground to-foreground/80 p-4 text-background">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wide text-background/70">
                    Quick launch
                  </p>
                  <p className="mt-1 text-lg font-extrabold tracking-tight">
                    Pick a format, keep the momentum.
                  </p>
                </div>
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-background/15">
                  <Zap className="h-5 w-5" />
                </span>
              </div>
            </div>
            <div className="border-b border-border/40 bg-muted/20 px-3 py-2">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
                {GOAL_CARDS.map((goal) => {
                  const Icon = goal.icon;
                  return (
                    <button
                      key={goal.id}
                      type="button"
                      onClick={() => go(goal.path, goal.requiresAuth)}
                      className="flex min-w-[184px] items-center gap-2 rounded-2xl border border-border/50 bg-background px-3 py-2 text-left shadow-sm transition-transform active:scale-[0.98]"
                    >
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-[18px] w-[18px]" />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12px] font-extrabold">{goal.label}</span>
                        <span className="block truncate text-[10px] text-muted-foreground">{goal.description}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 p-2">
              {FEATURED_CREATE_ITEMS.map((item) => (
                <CreateToolButton key={item.id} item={item} onClick={() => go(item.path, item.requiresAuth)} featured />
              ))}
            </div>
          </div>

          <div className="mx-3 mb-4">
            <div className="mb-2 flex items-center justify-between px-1">
              <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80">
                {query ? "Search results" : `${STUDIO_MODES.find((mode) => mode.id === studioMode)?.label} studio`}
              </p>
              <span className="rounded-full bg-muted/60 px-2 py-1 text-[10px] font-bold text-muted-foreground">
                {studioItems.length} tools
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {studioItems.map((item) => (
                <CreateToolButton key={item.id} item={item} onClick={() => go(item.path, item.requiresAuth)} />
              ))}
              {studioItems.length === 0 && (
                <div className="col-span-2 rounded-3xl border border-dashed border-border/60 bg-muted/20 p-5 text-center">
                  <Wand2 className="mx-auto h-6 w-6 text-muted-foreground" />
                  <p className="mt-2 text-[13px] font-bold">No matching tools</p>
                  <p className="mt-1 text-[12px] text-muted-foreground">Try post, story, live, market, job, or event.</p>
                </div>
              )}
            </div>
          </div>

          <div className="mx-3 mb-4 rounded-3xl border border-border/50 bg-card/70 p-3">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground/80">
                  Smart templates
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">Start with copy that already fits the format.</p>
              </div>
              <Wand2 className="h-5 w-5 text-primary" />
            </div>
            <div className="grid gap-2">
              {PUBLISH_TEMPLATES.map((template) => (
                <button
                  key={template.id}
                  type="button"
                  onClick={() => go(template.path, true)}
                  className="flex items-center gap-3 rounded-2xl bg-muted/30 px-3 py-3 text-left transition-colors hover:bg-muted/50 active:scale-[0.99]"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-background text-primary shadow-sm">
                    <Sparkles className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-extrabold">{template.label}</span>
                    <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{template.copy}</span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div className="mx-3 mb-4 rounded-3xl border border-border/50 bg-card/70">
            <p className="px-4 pb-2 pt-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
              Shortcuts
            </p>
            <div className="divide-y divide-border/40">
              {filteredShortcuts.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => go(item.path, item.requiresAuth)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30 active:bg-muted/40"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted/50">
                      <Icon className="h-[18px] w-[18px] text-foreground/80" />
                    </span>
                    <span className="flex-1 text-[15px] font-medium">{item.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </div>

          {!user && (
            <div className="mx-3 mb-4 rounded-3xl border border-primary/25 bg-primary/5 p-4 text-center">
              <p className="text-[13px] font-bold">Sign in to publish</p>
              <p className="mx-auto mt-1 max-w-[260px] text-[12px] text-muted-foreground">
                You need an account to post, go live, and use shortcuts.
              </p>
              <button
                type="button"
                onClick={() => go(`/login?redirect=${encodeURIComponent(authRedirectPath || "/feed")}`, false)}
                className="mt-3 inline-flex h-10 items-center justify-center rounded-full bg-primary px-5 text-[13px] font-bold text-primary-foreground active:opacity-80"
              >
                Sign in
              </button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function CreateToolButton({
  item,
  onClick,
  featured = false,
}: {
  item: CreateItem;
  onClick: () => void;
  featured?: boolean;
}) {
  const Icon = item.icon;

  return (
    <button
      type="button"
      aria-label={`Create ${item.label}`}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-border/50 bg-background p-3 text-left transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
        featured ? "min-h-[112px]" : "flex min-h-[76px] items-center gap-3 bg-card/70",
      )}
    >
      {featured && <span className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", item.accentClass)} />}
      <span className={cn("inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl", item.bgClass)}>
        <Icon className={cn("h-5 w-5", item.iconClass)} />
      </span>
      <span className={cn("min-w-0", featured && "mt-3 block")}>
        <span className={cn("block font-extrabold leading-tight", featured ? "text-[15px]" : "truncate text-[14px]")}>
          {item.label}
        </span>
        <span className={cn("mt-1 block text-muted-foreground", featured ? "text-[12px] leading-snug" : "truncate text-[11px]")}>
          {item.sublabel}
        </span>
      </span>
    </button>
  );
}
