/**
 * BroadcastListsPage — Manage broadcast lists and send a broadcast message.
 */
import { useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate } from "react-router-dom";
import { useBroadcastLists } from "@/hooks/useBroadcastLists";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import Plus from "lucide-react/dist/esm/icons/plus";
import Megaphone from "lucide-react/dist/esm/icons/megaphone";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Send from "lucide-react/dist/esm/icons/send";
import X from "lucide-react/dist/esm/icons/x";

export default function BroadcastListsPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/chat");
  const { lists, isLoading, deleteList, sendBroadcast } = useBroadcastLists();
  const [composeFor, setComposeFor] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const send = async () => {
    if (!composeFor) return;
    setSending(true);
    const ok = await sendBroadcast(composeFor, text);
    setSending(false);
    if (ok) { setText(""); setComposeFor(null); }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/85 backdrop-blur-xl border-b border-border/40 pt-safe px-3 py-3 flex items-center gap-2">
        <button type="button" onClick={goBack} className="p-1.5 rounded-full hover:bg-muted/60">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-base font-semibold flex-1">Broadcast Lists</h1>
        <button type="button" onClick={() => nav("/chat/broadcasts/new")} className="p-1.5 rounded-full hover:bg-muted/60">
          <Plus className="w-5 h-5" />
        </button>
      </header>

      <p className="px-4 py-3 text-xs text-muted-foreground">
        Send the same message to many people. Recipients reply privately and don't see each other.
      </p>

      {isLoading ? (
        <div className="text-center py-10 text-sm text-muted-foreground">Loading…</div>
      ) : lists.length === 0 ? (
        <div className="text-center py-12 px-6">
          <Megaphone className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-sm font-semibold mb-1">No broadcast lists</p>
          <p className="text-xs text-muted-foreground mb-4">Create one to message many contacts at once.</p>
          <button type="button" onClick={() => nav("/chat/broadcasts/new")} className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium">
            New broadcast list
          </button>
        </div>
      ) : (
        <div className="bg-card/60 rounded-xl mx-3 divide-y divide-border/30">
          {lists.map((l) => (
            <div key={l.id} className="flex items-center gap-3 px-4 py-3">
              <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center">
                <Megaphone className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{l.name}</div>
                <div className="text-[11px] text-muted-foreground">{l.member_count ?? 0} members</div>
              </div>
              <button type="button"
                onClick={() => setComposeFor(l.id)}
                className="px-3 py-1.5 text-xs font-medium rounded-full bg-primary text-primary-foreground"
              >
                Send
              </button>
              <button type="button" onClick={() => deleteList(l.id)} className="p-1.5 rounded-full hover:bg-muted/60 text-destructive">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {composeFor && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-4" onClick={() => setComposeFor(null)}>
          <div className="bg-background rounded-2xl p-4 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Broadcast message</h3>
              <button type="button" onClick={() => setComposeFor(null)}><X className="w-4 h-4" /></button>
            </div>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Type your message…"
              autoFocus
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
            <button type="button"
              onClick={send}
              disabled={sending || !text.trim()}
              className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {sending ? "Sending…" : "Send broadcast"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
