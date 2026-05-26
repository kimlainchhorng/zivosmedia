/**
 * VoiceRoomCard — Clubhouse-style live voice room tile.
 * Shows host, topic, listener count + Join CTA.
 */
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Mic from "lucide-react/dist/esm/icons/mic";
import Users from "lucide-react/dist/esm/icons/users";

export interface VoiceRoomData {
  id: string;
  topic: string;
  description?: string | null;
  host_name?: string | null;
  host_avatar?: string | null;
  listener_count?: number;
  is_live?: boolean;
}

interface Props {
  room: VoiceRoomData;
  onJoin?: (id: string) => void;
}

export default function VoiceRoomCard({ room, onJoin }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-border bg-secondary p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        {room.is_live && (
          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />Live
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">
          <Mic className="w-3 h-3" /> Voice room
        </span>
      </div>
      <p className="text-base font-bold leading-tight mb-1">{room.topic}</p>
      {room.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{room.description}</p>}
      <div className="flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6">
            <AvatarImage src={room.host_avatar || undefined} />
            <AvatarFallback className="text-[10px] bg-muted">{(room.host_name || "?").slice(0,1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <span className="text-xs font-semibold">{room.host_name || "Host"}</span>
          {room.listener_count != null && (
            <span className="ml-1 inline-flex items-center gap-0.5 text-[11px] text-muted-foreground">
              <Users className="w-3 h-3" />{room.listener_count}
            </span>
          )}
        </div>
        <button type="button"
          onClick={() => onJoin?.(room.id)}
          className="px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-xs font-bold active:scale-95 transition"
        >
          Join
        </button>
      </div>
    </motion.div>
  );
}
