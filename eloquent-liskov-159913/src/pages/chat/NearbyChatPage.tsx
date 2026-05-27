/**
 * NearbyChatPage — opt-in People Nearby (geohash-matched).
 */
import { useState } from "react";
import { useSmartBack } from "@/lib/smartBack";
import { useNavigate } from "react-router-dom";
import ArrowLeft from "lucide-react/dist/esm/icons/arrow-left";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import MessageCircle from "lucide-react/dist/esm/icons/message-circle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { useNearbyPresence } from "@/hooks/useNearbyPresence";

function fmtDistance(m: number) {
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(1)} km`;
}

export default function NearbyChatPage() {
  const nav = useNavigate();
  const goBack = useSmartBack("/chat");
  const [active, setActive] = useState(false);
  const { users, error } = useNearbyPresence(active);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="flex items-center gap-3 px-4 h-14 border-b border-border/30 sticky top-0 bg-background/95 backdrop-blur z-10 pt-safe">
        <button type="button" onClick={goBack} className="h-9 w-9 rounded-full hover:bg-muted/60 flex items-center justify-center">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="font-semibold text-lg flex-1">People Nearby</h1>
      </header>

      <div className="px-4 py-4 border-b border-border/20">
        <div className="flex items-center justify-between p-4 rounded-2xl bg-muted/50">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center">
              <MapPin className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-medium">Make me visible</p>
              <p className="text-[11px] text-muted-foreground">Hidden after 30 min of inactivity</p>
            </div>
          </div>
          <Switch checked={active} onCheckedChange={setActive} />
        </div>
        {error && <p className="text-xs text-foreground mt-2">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {!active && (
          <p className="text-center text-sm text-muted-foreground py-16">
            Turn on visibility to see people near you.
          </p>
        )}
        {active && users.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-16">
            No one nearby right now. Check back soon.
          </p>
        )}
        {users.map((u) => (
          <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border/30">
            <Avatar className="h-12 w-12">
              <AvatarImage src={u.profile?.avatar_url ?? undefined} />
              <AvatarFallback>{(u.profile?.full_name ?? "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{u.profile?.full_name ?? u.profile?.username ?? "User"}</p>
              <p className="text-[11px] text-muted-foreground">{fmtDistance(u.distance_m)} away</p>
            </div>
            <button type="button"
              onClick={() => nav("/chat", { state: { openChat: { recipientId: u.user_id, recipientName: u.profile?.full_name ?? u.profile?.username ?? "User", recipientAvatar: u.profile?.avatar_url ?? null } } })}
              className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center"
              aria-label="Message"
            >
              <MessageCircle className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
