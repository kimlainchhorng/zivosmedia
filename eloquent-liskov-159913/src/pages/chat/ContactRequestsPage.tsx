/**
 * ContactRequestsPage — incoming + outgoing contact requests with resend support.
 */
import { useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate, useSearchParams } from "react-router-dom";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import UserPlus from "lucide-react/dist/esm/icons/user-plus";
import RotateCw from "lucide-react/dist/esm/icons/rotate-cw";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useContactRequests } from "@/hooks/useContactRequests";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export default function ContactRequestsPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/chat");
  const { incoming, outgoing, loading, accept, decline, cancel, resend } = useContactRequests();
  const [params] = useSearchParams();
  const initialTab: "in" | "out" = params.get("tab") === "out" ? "out" : "in";
  const [tab, setTab] = useState<"in" | "out">(initialTab);
  const list = tab === "in" ? incoming : outgoing;
  const sentPending = outgoing.filter((r) => r.status === "pending").length;

  async function handleResend(id: string) {
    const r: any = await resend(id);
    if (!r.ok) toast.error(r.error || "Couldn't resend");
    else toast.success(r.duplicate ? "Already pending" : "Request resent");
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10 pt-safe">
        <button type="button" onClick={goBack} aria-label="Back" className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-lg">Contact Requests</h1>
      </header>

      <div className="px-4 pt-3">
        <div role="tablist" aria-label="Request direction" className="grid grid-cols-2 gap-1 p-1 rounded-full bg-muted/60">
          <button type="button"
            role="tab"
            aria-selected={tab === "in"}
            onClick={() => setTab("in")}
            className={`h-9 rounded-full text-sm font-medium ${tab === "in" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Incoming{incoming.length ? ` · ${incoming.length}` : ""}
          </button>
          <button type="button"
            role="tab"
            aria-selected={tab === "out"}
            onClick={() => setTab("out")}
            className={`h-9 rounded-full text-sm font-medium ${tab === "out" ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            Sent{sentPending ? ` · ${sentPending}` : ""}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading && <p className="text-center text-sm text-muted-foreground py-12">Loading…</p>}
        {!loading && list.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <UserPlus className="h-10 w-10 mx-auto opacity-30 mb-2" />
            <p className="text-sm mb-4">No {tab === "in" ? "incoming" : "sent"} requests.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => nav("/chat/find-contacts")}
              className="gap-1"
            >
              <UserPlus className="h-4 w-4" /> Find friends
            </Button>
          </div>
        )}
        {list.map((r) => (
          <div key={r.id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/30">
            <Avatar className="h-12 w-12">
              <AvatarImage src={r.profile?.avatar_url ?? undefined} />
              <AvatarFallback>{(r.profile?.full_name ?? r.profile?.username ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{r.profile?.full_name ?? r.profile?.username ?? "User"}</p>
              {r.message && <p className="text-xs text-muted-foreground truncate">{r.message}</p>}
              <p className="text-[10px] text-muted-foreground/60">{formatDistanceToNow(new Date(r.created_at))} ago · {r.status}</p>
            </div>
            {tab === "in" && r.status === "pending" && (
              <div className="flex gap-1.5">
                <button type="button" onClick={() => accept(r.id)} aria-label="Accept request" className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  <Check className="h-4 w-4" />
                </button>
                <button type="button" onClick={() => decline(r.id)} aria-label="Decline request" className="h-9 w-9 rounded-full bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {tab === "out" && r.status === "pending" && (
              <button type="button" onClick={() => cancel(r.id)} className="px-3 h-9 rounded-full bg-muted text-xs font-medium">Cancel</button>
            )}
            {tab === "out" && r.status === "declined" && (
              <button type="button"
                onClick={() => handleResend(r.id)}
                aria-label="Resend declined request"
                className="px-3 h-9 rounded-full bg-emerald-500 text-white text-xs font-medium flex items-center gap-1"
              >
                <RotateCw className="h-3.5 w-3.5" /> Resend
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
