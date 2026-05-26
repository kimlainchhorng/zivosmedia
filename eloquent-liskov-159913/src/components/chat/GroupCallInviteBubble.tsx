/**
 * GroupCallInviteBubble — Chat message bubble for group call invitations
 */
import Phone from "lucide-react/dist/esm/icons/phone";
import Video from "lucide-react/dist/esm/icons/video";
import Users from "lucide-react/dist/esm/icons/users";
import { motion } from "framer-motion";

interface GroupCallInviteBubbleProps {
  callType: "voice" | "video";
  hostName: string;
  participantCount: number;
  status: "active" | "ended";
  onJoin: () => void;
  isSelf: boolean;
}

export default function GroupCallInviteBubble({
  callType,
  hostName,
  participantCount,
  status,
  onJoin,
  isSelf,
}: GroupCallInviteBubbleProps) {
  const isActive = status === "active";
  const CallIcon = callType === "video" ? Video : Phone;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`rounded-2xl border overflow-hidden max-w-[280px] ${
        isActive
          ? "border-primary/20 bg-primary/5"
          : "border-border/30 bg-muted/20"
      }`}
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3">
        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
          isActive ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
        }`}>
          <CallIcon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">
            {isSelf ? "You started" : hostName} · Group {callType === "video" ? "Video" : "Call"}
          </p>
          <div className="flex items-center gap-1 mt-0.5">
            <Users className="h-3 w-3 text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground">
              {participantCount} {participantCount === 1 ? "person" : "people"}
            </span>
            {isActive && (
              <>
                <span className="text-[11px] text-muted-foreground">·</span>
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[11px] text-primary font-medium">Live</span>
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Join button */}
      {isActive && (
        <div className="px-4 pb-3">
          <button type="button"
            onClick={onJoin}
            className="w-full py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <CallIcon className="h-4 w-4" />
            Join {callType === "video" ? "Video" : "Call"}
          </button>
        </div>
      )}

      {!isActive && (
        <div className="px-4 pb-3">
          <p className="text-[11px] text-muted-foreground text-center">Call ended</p>
        </div>
      )}
    </motion.div>
  );
}
