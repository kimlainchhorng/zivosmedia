import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, Bot, Search, MessageCircle, Flag, Star, Sparkles, Briefcase, Smile, Newspaper, DollarSign, Users as UsersIcon, Wrench, MoreHorizontal, Ban, BellOff, Flame } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type DirBot = {
  id: string;
  bot_user_id: string;
  username: string;
  display_name: string;
  description: string | null;
  avatar_url: string | null;
  category: string | null;
  featured: boolean | null;
  rating_avg: number | null;
  rating_count: number | null;
};

const CATEGORIES = [
  { id: "", label: "All", icon: Bot },
  { id: "ai", label: "AI", icon: Sparkles },
  { id: "productivity", label: "Productivity", icon: Briefcase },
  { id: "fun", label: "Fun", icon: Smile },
  { id: "news", label: "News", icon: Newspaper },
  { id: "finance", label: "Finance", icon: DollarSign },
  { id: "social", label: "Social", icon: UsersIcon },
  { id: "tools", label: "Tools", icon: Wrench },
  { id: "other", label: "Other", icon: MoreHorizontal },
] as const;

export default function BotDiscoverPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat/bots");
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [bots, setBots] = useState<DirBot[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const term = q.trim();
    const { data, error } = term
      ? await supabase.rpc("search_bots", { p_q: term })
      : await supabase.rpc("bots_by_category", { p_category: category || null });
    if (error) toast.error(error.message);
    setBots((data ?? []) as DirBot[]);
    setLoading(false);
  };

  useEffect(() => {
    const t = setTimeout(() => load(), 200);
    return () => clearTimeout(t);
  }, [q, category]);

  const featured = bots.filter((b) => b.featured);

  const [trending, setTrending] = useState<DirBot[]>([]);
  const [collections, setCollections] = useState<{ id: string; slug: string; title: string; description: string | null; cover_emoji: string | null }[]>([]);
  useEffect(() => {
    (async () => {
      const [{ data: t }, { data: c }] = await Promise.all([
        supabase.rpc("trending_bots", { p_days: 7, p_limit: 8 }),
        supabase.from("bot_collections").select("id, slug, title, description, cover_emoji").eq("is_active", true).order("sort_order"),
      ]);
      setTrending((t ?? []) as DirBot[]);
      setCollections((c ?? []) as any[]);
    })();
  }, []);

  const openChat = (b: DirBot) => {
    navigate(`/chat?with=${b.bot_user_id}`);
  };

  const rateBot = async (b: DirBot) => {
    const raw = prompt(`Rate @${b.username} (1-5 stars):`);
    if (!raw) return;
    const stars = parseInt(raw, 10);
    if (isNaN(stars) || stars < 1 || stars > 5) return toast.error("Stars must be 1-5");
    const review = prompt("Optional review (or leave blank):") ?? null;
    const { error } = await supabase.rpc("rate_bot", { p_bot_id: b.id, p_stars: stars, p_review: review });
    if (error) return toast.error(error.message);
    toast.success("Rating saved");
    load();
  };

  const blockBot = async (b: DirBot) => {
    if (!confirm(`Block @${b.username}? Their messages will be silently dropped.`)) return;
    const { error } = await supabase.rpc("block_bot", { p_bot_id: b.id });
    if (error) return toast.error(error.message);
    toast.success("Blocked");
  };

  const unsubBot = async (b: DirBot) => {
    const { error } = await supabase.rpc("unsubscribe_bot", { p_bot_id: b.id });
    if (error) return toast.error(error.message);
    toast.success("Unsubscribed from broadcasts");
  };

  const reportBot = async (b: DirBot) => {
    const reason = prompt(`Report @${b.username}? Choose a reason: spam, abusive, inappropriate, impersonation, other`);
    if (!reason) return;
    const valid = ["spam", "abusive", "inappropriate", "impersonation", "other"];
    if (!valid.includes(reason)) return toast.error("Invalid reason");
    const details = prompt("Optional: add details (or leave blank)") ?? null;
    const { error } = await supabase.rpc("report_bot", { p_bot_id: b.id, p_reason: reason, p_details: details });
    if (error) return toast.error(error.message);
    toast.success("Report submitted");
  };

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold">Discover bots</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name or @username"
            className="pl-9"
          />
        </div>

        {trending.length > 0 && (
          <div>
            <div className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground mb-2">
              <Flame className="w-3.5 h-3.5 text-orange-500" /> Trending this week
            </div>
            <div className="flex gap-2 overflow-x-auto -mx-4 px-4 pb-1">
              {trending.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => openChat(b)}
                  className="flex-shrink-0 w-32 rounded-2xl bg-card border border-border p-3 text-center hover:bg-muted/40"
                >
                  <div className="w-12 h-12 mx-auto rounded-full bg-primary/10 flex items-center justify-center overflow-hidden mb-1">
                    {b.avatar_url ? <img src={b.avatar_url} alt="" className="w-full h-full object-cover" /> : <Bot className="w-6 h-6 text-primary" />}
                  </div>
                  <div className="text-xs font-medium truncate">{b.display_name}</div>
                  <div className="text-[10px] text-muted-foreground truncate">@{b.username}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {collections.length > 0 && (
          <div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Collections</div>
            <div className="grid grid-cols-2 gap-2">
              {collections.map((col) => (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => navigate(`/chat/bots/collections/${col.slug}`)}
                  className="rounded-2xl bg-card border border-border p-3 text-left hover:bg-muted/40"
                >
                  <div className="text-xl mb-1">{col.cover_emoji ?? "📦"}</div>
                  <div className="text-sm font-medium truncate">{col.title}</div>
                  {col.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{col.description}</div>}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            const active = category === c.id;
            return (
              <button
                key={c.id || "all"}
                type="button"
                onClick={() => setCategory(c.id)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border ${
                  active ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border hover:bg-muted/40"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {c.label}
              </button>
            );
          })}
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : bots.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-6 text-center">
            <Bot className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">No bots found</div>
            <div className="text-xs text-muted-foreground">Try another search.</div>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {bots.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {b.avatar_url ? (
                    <img src={b.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Bot className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1">
                    {b.display_name}
                    <span className="text-[10px] uppercase bg-primary/10 text-primary rounded px-1 py-0.5">bot</span>
                    {b.featured && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate flex items-center gap-1">
                    @{b.username}
                    {b.rating_count ? (
                      <span className="flex items-center gap-0.5 ml-1 text-amber-600">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        {b.rating_avg?.toFixed(1)} <span className="text-muted-foreground">({b.rating_count})</span>
                      </span>
                    ) : null}
                  </div>
                  {b.description && (
                    <div className="text-[11px] text-muted-foreground truncate">{b.description}</div>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button size="sm" onClick={() => openChat(b)} className="gap-1">
                    <MessageCircle className="w-4 h-4" /> Chat
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => rateBot(b)} aria-label="Rate" title="Rate">
                    <Star className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => unsubBot(b)} aria-label="Unsubscribe" title="Unsubscribe from broadcasts">
                    <BellOff className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => blockBot(b)} aria-label="Block" title="Block">
                    <Ban className="w-4 h-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => reportBot(b)} aria-label="Report" title="Report">
                    <Flag className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
