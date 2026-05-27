import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, MessageCircle, Mic, MicOff, PhoneOff, Video, VideoOff } from "lucide-react";
import NotFound from "@/pages/NotFound";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import CallPiP from "@/components/chat/CallPiP";
import VideoTile from "@/components/chat/call/VideoTile";
import type { LKParticipant } from "@/hooks/useLiveKitCall";

const PREVIEW_AVATAR = "/images/notif-bg-3d.jpg";
const SECOND_AVATAR = "/images/auth-bg-3d.jpg";

function initials(name: string) {
  return name.split(" ").map((part) => part[0]).join("").toUpperCase().slice(0, 2);
}

function DirectVideoPreview() {
  const name = "Maya Chen";

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-black shadow-2xl">
      <div className="relative h-[640px] max-h-[72vh] min-h-[560px] overflow-hidden bg-zinc-950 text-white">
        <div className="absolute inset-0 grid place-items-center bg-zinc-950">
          <img
            src={PREVIEW_AVATAR}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full scale-110 object-cover opacity-35 blur-2xl"
          />
          <Avatar className="relative z-[1] h-36 w-36 border-4 border-white/15 shadow-2xl">
            <AvatarImage src={PREVIEW_AVATAR} />
            <AvatarFallback className="bg-white/10 text-5xl font-bold text-white">{initials(name)}</AvatarFallback>
          </Avatar>
        </div>

        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60 pointer-events-none" />

        <div className="absolute left-0 right-0 top-16 z-10 flex flex-col items-center">
          <h2 className="text-xl font-bold tracking-tight drop-shadow-lg">{name}</h2>
          <p className="mt-0.5 text-sm font-medium text-white/70">Video calling...</p>
          <div className="mt-2 flex gap-1.5">
            {[0, 1, 2].map((dot) => (
              <span key={dot} className="h-2 w-2 rounded-full bg-emerald-400 opacity-80" />
            ))}
          </div>
        </div>

        <div className="absolute bottom-36 right-4 z-20">
          <div className="relative h-[150px] w-[110px] overflow-hidden rounded-2xl border-2 border-white/20 bg-zinc-900 shadow-2xl">
            <div className="grid h-full w-full place-items-center text-xs font-semibold text-white/55">
              You
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 px-4 pb-6">
          <div className="rounded-3xl border border-white/10 bg-white/10 px-4 py-4 shadow-2xl backdrop-blur-xl">
            <div className="flex items-center justify-around">
              <PreviewControl icon={<Mic className="h-5 w-5" />} label="Mute" />
              <PreviewControl icon={<VideoOff className="h-5 w-5" />} label="Stop" />
              <PreviewControl icon={<MessageCircle className="h-5 w-5" />} label="Chat" />
              <PreviewControl icon={<PhoneOff className="h-6 w-6" />} label="End" destructive />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DirectVoicePreview() {
  const name = "Maya Chen";

  return (
    <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
      <div className="relative flex min-h-[430px] flex-col items-center justify-between overflow-hidden rounded-[24px] bg-gradient-to-br from-background via-muted/30 to-primary/10 px-6 py-8">
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-32 w-32 border-4 border-primary/10 shadow-2xl">
            <AvatarImage src={PREVIEW_AVATAR} />
            <AvatarFallback className="bg-primary/5 text-5xl font-bold text-primary">{initials(name)}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <h2 className="text-[28px] font-bold tracking-tight text-foreground">{name}</h2>
            <p className="mt-1 text-[15px] font-semibold text-muted-foreground">Calling...</p>
          </div>
        </div>
        <div className="grid w-full grid-cols-4 gap-3 rounded-[28px] border border-border/10 bg-foreground/[0.04] p-4 backdrop-blur-2xl">
          <PreviewLightControl icon={<MicOff className="h-5 w-5" />} label="Mute" />
          <PreviewLightControl icon={<Video className="h-5 w-5" />} label="Video" />
          <PreviewLightControl icon={<MessageCircle className="h-5 w-5" />} label="Chat" />
          <PreviewLightControl icon={<PhoneOff className="h-5 w-5" />} label="End" destructive />
        </div>
      </div>
    </section>
  );
}

function GroupTilesPreview() {
  const participants = useMemo<LKParticipant[]>(() => [
    {
      identity: "preview-local",
      name: "You",
      avatarUrl: PREVIEW_AVATAR,
      isLocal: true,
      isHost: true,
      micEnabled: true,
      camEnabled: false,
      isScreenSharing: false,
      handRaised: false,
      cameraTrack: null,
      micTrack: null,
      screenTrack: null,
    },
    {
      identity: "preview-remote",
      name: "Sam Rivera",
      avatarUrl: SECOND_AVATAR,
      isLocal: false,
      isHost: false,
      micEnabled: false,
      camEnabled: false,
      isScreenSharing: false,
      handRaised: true,
      cameraTrack: null,
      micTrack: null,
      screenTrack: null,
    },
  ], []);

  return (
    <section className="rounded-[28px] border border-border bg-card p-5 shadow-sm">
      <div className="grid h-[360px] grid-cols-1 gap-2 overflow-hidden rounded-2xl bg-zinc-950 p-2 sm:grid-cols-2">
        {participants.map((participant) => (
          <VideoTile key={participant.identity} participant={participant} isRecording={participant.isHost} />
        ))}
      </div>
    </section>
  );
}

function PreviewControl({ icon, label, destructive = false }: { icon: React.ReactNode; label: string; destructive?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        className={`flex h-12 w-12 items-center justify-center rounded-full transition-all ${
          destructive ? "bg-destructive text-destructive-foreground" : "bg-white/10 text-white/80"
        }`}
      >
        {icon}
      </button>
      <span className="text-[10px] font-medium text-white/50">{label}</span>
    </div>
  );
}

function PreviewLightControl({ icon, label, destructive = false }: { icon: React.ReactNode; label: string; destructive?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        className={`flex h-[52px] w-[52px] items-center justify-center rounded-full transition-all ${
          destructive ? "bg-destructive text-destructive-foreground" : "bg-foreground/[0.06] text-foreground/60"
        }`}
      >
        {icon}
      </button>
      <span className="text-[10px] font-medium text-muted-foreground/70">{label}</span>
    </div>
  );
}

export default function ChatCallPreviewPage() {
  const [showPip, setShowPip] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  if (!import.meta.env.DEV) return <NotFound />;

  const handleBack = () => {
    if (location.key && location.key !== "default") {
      navigate(-1);
      return;
    }
    navigate("/app/home", { replace: true });
  };

  return (
    <main className="min-h-screen bg-background px-4 pb-24 pt-[calc(var(--zivo-safe-top,0px)+1rem)] text-foreground sm:px-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleBack}
            aria-label="Back"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-muted text-foreground"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <Button type="button" variant="outline" onClick={() => setShowPip((value) => !value)}>
            {showPip ? "Hide PiP" : "Show PiP"}
          </Button>
        </header>

        <div>
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-muted-foreground">Dev preview</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Chat call images</h1>
        </div>

        <DirectVideoPreview />

        <div className="grid gap-6 lg:grid-cols-2">
          <DirectVoicePreview />
          <GroupTilesPreview />
        </div>
      </div>

      {showPip && (
        <CallPiP
          remoteStream={null}
          recipientName="Maya Chen"
          recipientAvatar={PREVIEW_AVATAR}
          isMuted={false}
          duration={42}
          callType="video"
          isCameraOff
          onExpand={() => setShowPip(false)}
          onEndCall={() => setShowPip(false)}
          onToggleMute={() => {}}
          onToggleCamera={() => {}}
        />
      )}
    </main>
  );
}
