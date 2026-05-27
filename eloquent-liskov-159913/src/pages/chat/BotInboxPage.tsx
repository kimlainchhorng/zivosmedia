import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSmartBack } from "@/lib/smartBack";
import { ArrowLeft, Bot as BotIcon, MessageCircle, Compass } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

type Convo = {
  bot_id: string;
  bot_user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  last_message: string | null;
  last_at: string | null;
  unread_count: number;
};

export default function BotInboxPage() {
  const navigate = useNavigate();
  const goBack = useSmartBack("/chat/bots");
  const [convos, setConvos] = useState<Convo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("my_bot_conversations");
      if (error) toast.error(error.message);
      setConvos((data ?? []) as Convo[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background pb-[var(--zivo-safe-bottom,0px)]">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border safe-area-top">
        <div className="flex items-center gap-2 h-14 px-2">
          <button type="button" onClick={goBack} aria-label="Back" className="p-2 -ml-2 rounded-full hover:bg-muted">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-base font-semibold flex-1">Bot inbox</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-sm text-muted-foreground py-8 text-center">Loading…</div>
        ) : convos.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-6 text-center">
            <BotIcon className="w-10 h-10 mx-auto mb-2 text-muted-foreground" />
            <div className="text-sm font-medium">No bot chats yet</div>
            <div className="text-xs text-muted-foreground mb-3">Find a bot to start chatting.</div>
            <Button onClick={() => navigate("/chat/bots/discover")} className="gap-1">
              <Compass className="w-4 h-4" /> Discover bots
            </Button>
          </div>
        ) : (
          <div className="rounded-2xl bg-card border border-border divide-y divide-border">
            {convos.map((c) => (
              <button
                key={c.bot_id}
                type="button"
                onClick={() => navigate(`/chat?with=${c.bot_user_id}`)}
                className="w-full flex items-center gap-3 p-3 text-left hover:bg-muted/40"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center overflow-hidden flex-shrink-0">
                  {c.avatar_url
                    ? <img src={c.avatar_url} alt="" className="w-full h-full object-cover" />
                    : <BotIcon className="w-6 h-6 text-primary" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <div className="text-sm font-medium truncate">{c.display_name}</div>
                    <span className="text-[9px] uppercase bg-primary/10 text-primary rounded px-1 py-0.5">bot</span>
                    {c.last_at && (
                      <span className="ml-auto text-[10px] text-muted-foreground flex-shrink-0">
                        {new Date(c.last_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="text-xs text-muted-foreground truncate flex-1">
                      {c.last_message || `@${c.username}`}
                    </div>
                    {c.unread_count > 0 && (
                      <span className="text-[10px] bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 flex-shrink-0">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
