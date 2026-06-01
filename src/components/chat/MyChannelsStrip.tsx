/**
 * MyChannelsStrip — horizontal scrollable strip of channels the user is
 * subscribed to, with a final "Discover" tile. Shown inside the Chat Hub.
 */
import { useNavigate } from "react-router-dom";
import Megaphone from "lucide-react/dist/esm/icons/megaphone";
import Compass from "lucide-react/dist/esm/icons/compass";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useMyChannels } from "@/hooks/useMyChannels";
import { formatDistanceToNow } from "date-fns";

export default function MyChannelsStrip() {
  const nav = useNavigate();
  const { channels, loading } = useMyChannels();

  return (
    <div className="zivo-chat-card mx-3 mb-2 rounded-3xl">
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          <Megaphone className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Channels</span>
        </div>
        <button type="button"
          onClick={() => nav("/channels")}
          className="text-[12px] font-semibold text-primary active:opacity-70 transition-opacity"
        >
          Discover
        </button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-3 pt-1">
        {loading && (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 w-[68px] shrink-0">
                <div className="w-12 h-12 rounded-full bg-muted animate-pulse" />
                <div className="h-2.5 w-10 bg-muted/60 rounded-full animate-pulse" />
              </div>
            ))}
          </>
        )}
        {!loading && channels.length === 0 && (
          <button type="button"
            onClick={() => nav("/channels")}
            className="zivo-chat-row flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[12px] font-bold text-muted-foreground whitespace-nowrap active:scale-95 transition-transform"
          >
            <Compass className="w-4 h-4" />
            Find channels to follow
          </button>
        )}
        {channels.slice(0, 12).map((c) => (
          <button type="button"
            key={c.id}
            onClick={() => nav(`/c/${c.handle}`)}
            className="flex flex-col items-center gap-1 w-[68px] shrink-0 group active:scale-95 transition-transform"
          >
            <Avatar className="zivo-chat-avatar-ring w-12 h-12">
              <AvatarImage src={c.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {c.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10.5px] font-medium text-foreground truncate w-full text-center leading-tight">
              {c.name}
            </span>
            {c.last_post_at && (
              <span className="text-[9px] text-muted-foreground leading-none">
                {formatDistanceToNow(new Date(c.last_post_at), { addSuffix: false })}
              </span>
            )}
          </button>
        ))}
        <button type="button"
          onClick={() => nav("/channels")}
          className="flex flex-col items-center gap-1 w-[68px] shrink-0 group active:scale-95 transition-transform"
        >
          <div className="zivo-chat-icon-button flex h-12 w-12 items-center justify-center rounded-full">
            <Compass className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-[10.5px] font-medium text-muted-foreground leading-tight">More</span>
        </button>
      </div>
    </div>
  );
}
