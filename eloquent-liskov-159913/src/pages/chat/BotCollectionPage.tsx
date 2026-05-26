import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, Bot, Star, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type DirBot = {
  id: string; bot_user_id: string; username: string; display_name: string;
  description: string | null; avatar_url: string | null; rating_avg: number | null;
  rating_count: number | null; featured: boolean | null;
};

export default function BotCollectionPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat/bots/discover");
  const [title, setTitle] = useState("");
  const [bots, setBots] = useState<DirBot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      if (!slug) return;
      const [{ data: c }, { data: b, error }] = await Promise.all([
        supabase.from("bot_collections").select("title").eq("slug", slug).maybeSingle(),
        supabase.rpc("collection_bots", { p_slug: slug }),
      ]);
      if (error) toast.error(error.message);
      setTitle((c as any)?.title ?? slug);
      setBots((b ?? []) as DirBot[]);
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1 truncate">{title}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4">
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : bots.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-6 text-center">
            <Bot className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm">Empty collection</div>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {bots.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden">
                  {b.avatar_url ? <img src={b.avatar_url} alt="" className="w-full h-full object-cover" /> : <Bot className="w-5 h-5 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-1">
                    {b.display_name}
                    {b.featured && <Star className="w-3 h-3 fill-amber-400 text-amber-400" />}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    @{b.username}
                    {b.rating_count ? <span className="ml-1">· ⭐ {b.rating_avg?.toFixed(1)} ({b.rating_count})</span> : null}
                  </div>
                  {b.description && <div className="text-[11px] text-muted-foreground truncate">{b.description}</div>}
                </div>
                <Button size="sm" onClick={() => navigate(`/chat?with=${b.bot_user_id}`)} className="gap-1">
                  <MessageCircle className="w-4 h-4" /> Chat
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
