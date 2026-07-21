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
import { motion } from "framer-motion";

export default function MyChannelsStrip() {
  const nav = useNavigate();
  const { channels, loading } = useMyChannels();

  return (
    <div className="zivo-chat-card mx-3 mb-2 rounded-3xl">
      <div className="flex items-center justify-between px-4 pt-2 pb-1">
        <div className="flex items-center gap-1.5">
          <Megaphone className="w-3 h-3 text-primary" />
          <span className="text-ig-gradient text-[10.5px] font-black uppercase tracking-[0.14em]">Channels</span>
        </div>
        <motion.button type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => nav("/channels")}
          className="bg-ig-gradient rounded-full px-2.5 py-0.5 text-[10px] font-black text-white shadow-[0_2px_8px_rgba(236,72,153,0.25)] transition-opacity active:opacity-80 outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          Discover
        </motion.button>
      </div>
      <div className="flex gap-2.5 overflow-x-auto no-scrollbar px-4 pb-3 pt-1">
        {loading && (
          <>
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex flex-col items-center gap-1 w-[58px] shrink-0">
                <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
                <div className="h-2.5 w-8 bg-muted/60 rounded-full animate-pulse" />
              </div>
            ))}
          </>
        )}
        {!loading && channels.length === 0 && (
          <button type="button"
            onClick={() => nav("/channels")}
            className="zivo-chat-row flex items-center gap-2 rounded-2xl px-4 py-2.5 text-[12px] font-bold text-muted-foreground whitespace-nowrap active:scale-95 transition-transform outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Compass className="w-4 h-4" />
            Find channels to follow
          </button>
        )}
        {channels.slice(0, 12).map((c) => (
          <motion.button type="button"
            key={c.id}
            whileTap={{ scale: 0.92 }}
            onClick={() => nav(`/c/${c.handle}`)}
            className="flex flex-col items-center gap-1 w-[58px] shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
          >
            <Avatar className="zivo-chat-avatar-ring w-10 h-10">
              <AvatarImage src={c.avatar_url ?? undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                {c.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-[10px] font-medium text-foreground truncate w-full text-center leading-tight">
              {c.name}
            </span>
            {c.last_post_at && (
              <span className="text-[9px] text-muted-foreground leading-none">
                {formatDistanceToNow(new Date(c.last_post_at), { addSuffix: false })}
              </span>
            )}
          </motion.button>
        ))}
        <motion.button type="button"
          whileTap={{ scale: 0.92 }}
          onClick={() => nav("/channels")}
          className="flex flex-col items-center gap-1 w-[58px] shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
        >
          <div className="zivo-chat-icon-button flex h-10 w-10 items-center justify-center rounded-full">
            <Compass className="w-4 h-4 text-muted-foreground" />
          </div>
          <span className="text-[10px] font-medium text-muted-foreground leading-tight">More</span>
        </motion.button>
      </div>
    </div>
  );
}
