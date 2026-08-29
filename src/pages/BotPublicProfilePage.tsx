import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Bot as BotIcon, MessageCircle, Star, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { validateExternalUrl } from "@/lib/urlSafety";
import { useGoBack } from "@/hooks/useGoBack";

type PublicBot = {
  id: string;
  bot_user_id: string;
  username: string;
  display_name: string;
  description: string | null;
  avatar_url: string | null;
  category: string | null;
  rating_avg: number | null;
  rating_count: number | null;
  commands: { command: string; description: string }[];
};

type App = { slug: string; title: string; description: string | null; icon_emoji: string | null; app_url: string };
export default function BotPublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const [bot, setBot] = useState<PublicBot | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    (async () => {
      if (!username) return;
      const [{ data, error }, { data: a }] = await Promise.all([
        supabase.rpc("bot_public_profile", { p_username: username }),
        supabase.rpc("bot_public_apps", { p_username: username }),
      ]);
      if (error) toast.error(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) setNotFound(true);
      else setBot(row as PublicBot);
      setApps(((a ?? []) as App[]).flatMap((app) => {
        const safeUrl = validateExternalUrl(app.app_url);
        return safeUrl ? [{ ...app, app_url: safeUrl }] : [];
      }));
      setLoading(false);
    })();
  }, [username]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  if (notFound || !bot) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 text-center">
        <div>
          <BotIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
          <div className="text-sm font-medium">Bot not found</div>
          <div className="text-xs text-muted-foreground mb-3">@{username} doesn't exist or is inactive.</div>
          <Button size="sm" onClick={() => navigate("/")}>Home</Button>
        </div>
      </div>
    );
  }

  const avatarUrl = validateExternalUrl(bot.avatar_url);

  const startChat = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      sessionStorage.setItem("post_auth_redirect", `/chat?with=${bot.bot_user_id}`);
      navigate("/auth");
      return;
    }
    navigate(`/chat?with=${bot.bot_user_id}`);
  };

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-2 h-14 px-2 max-w-2xl mx-auto">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted transition-transform active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1 truncate">@{bot.username}</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <section className="rounded-2xl bg-card border border-border p-6 text-center">
          <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center overflow-hidden mb-3">

            {avatarUrl
	              ? <img src={avatarUrl} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
              : <BotIcon className="w-10 h-10 text-primary" />}
          </div>
          <div className="text-lg font-semibold flex items-center justify-center gap-1">
            {bot.display_name}
            <span className="text-[10px] uppercase bg-primary/10 text-primary rounded px-1 py-0.5 align-middle">bot</span>
          </div>
          <div className="text-sm text-muted-foreground">@{bot.username}</div>
          {(bot.rating_count ?? 0) > 0 && (
            <div className="mt-2 flex items-center justify-center gap-1 text-sm">
              <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
              <span className="font-medium">{bot.rating_avg?.toFixed(1)}</span>
              <span className="text-muted-foreground">({bot.rating_count})</span>
            </div>
          )}
          {bot.description && <p className="mt-3 text-sm text-muted-foreground">{bot.description}</p>}
          <Button onClick={startChat} className="mt-4 gap-1">
            <MessageCircle className="w-4 h-4" /> Start chat
          </Button>
          {bot.category && (
            <div className="mt-2 text-[11px] uppercase tracking-wide text-muted-foreground">{bot.category}</div>
          )}
        </section>

        {apps.length > 0 && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <div className="text-sm font-medium mb-2">Mini-apps</div>
            <div className="grid grid-cols-2 gap-2">
              {apps.map((a) => (
                <a
                  key={a.slug}
                  href={a.app_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl bg-muted/40 border border-border p-3 hover:bg-muted/60 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="text-xl">{a.icon_emoji ?? "📱"}</div>
                  <div className="text-sm font-medium truncate">{a.title}</div>
                  {a.description && <div className="text-[11px] text-muted-foreground line-clamp-2">{a.description}</div>}
                </a>
              ))}
            </div>
          </section>
        )}

        {bot.commands?.length > 0 && (
          <section className="rounded-2xl bg-card border border-border p-4">
            <div className="text-sm font-medium mb-2">Commands</div>
            <div className="space-y-1">
              {bot.commands.map((c) => (
                <div key={c.command} className="text-sm">
                  <span className="font-mono">/{c.command}</span>
                  {c.description && <span className="text-muted-foreground"> — {c.description}</span>}
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="text-center text-xs text-muted-foreground">
          Built with Zivo bots ·{" "}
          <button onClick={() => navigate("/chat/bots")} className="underline rounded-sm transition-all active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">create your own</button>
        </div>
      </div>
    </div>
  );
}
