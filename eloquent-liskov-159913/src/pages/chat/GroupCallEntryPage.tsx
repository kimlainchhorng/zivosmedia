/**
 * GroupCallEntryPage — Standalone entry that mounts the full group-call
 * launcher (lobby → LiveKit screen). Reachable at:
 *   /chat/call/group/:roomName        (video by default)
 *   /chat/call/group/:roomName?audio=1 (audio-only)
 */
import { useParams, useSearchParams } from "react-router-dom";
import GroupCallLauncher from "@/components/chat/call/GroupCallLauncher";
import ChevronLeft from "lucide-react/dist/esm/icons/chevron-left";
import { useSmartBack } from "@/lib/smartBack";

export default function GroupCallEntryPage() {
  const { roomName = "" } = useParams<{ roomName: string }>();
  const [params] = useSearchParams();
  const goBack = useSmartBack("/app/home");
  const callType = params.get("audio") === "1" ? "audio" : "video";

  if (!roomName) {
    return (
      <div className="min-h-screen flex flex-col bg-zinc-950 text-white">
        <header className="pt-safe px-3 py-3 flex items-center gap-2">
          <button type="button"
            onClick={goBack}
            aria-label="Back"
            className="p-1.5 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        </header>
        <div className="flex-1 grid place-items-center">Missing room name.</div>
      </div>
    );
  }

  return (
    <GroupCallLauncher
      roomName={roomName}
      callType={callType}
      onEnded={goBack}
    />
  );
}
