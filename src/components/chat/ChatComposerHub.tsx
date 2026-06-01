import type { ComponentType } from "react";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Contact from "lucide-react/dist/esm/icons/contact";
import FileUp from "lucide-react/dist/esm/icons/file-up";
import Gift from "lucide-react/dist/esm/icons/gift";
import ImagePlay from "lucide-react/dist/esm/icons/image-play";
import ImagePlus from "lucide-react/dist/esm/icons/image-plus";
import ListChecks from "lucide-react/dist/esm/icons/list-checks";
import LocateFixed from "lucide-react/dist/esm/icons/locate-fixed";
import Lock from "lucide-react/dist/esm/icons/lock";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Music from "lucide-react/dist/esm/icons/music";
import PanelsTopLeft from "lucide-react/dist/esm/icons/panels-top-left";
import ScanLine from "lucide-react/dist/esm/icons/scan-line";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import ShieldAlert from "lucide-react/dist/esm/icons/shield-alert";
import Timer from "lucide-react/dist/esm/icons/timer";
import Video from "lucide-react/dist/esm/icons/video";
import Vote from "lucide-react/dist/esm/icons/vote";
import WalletCards from "lucide-react/dist/esm/icons/wallet-cards";
import { useZivoPlus } from "@/contexts/ZivoPlusContext";
import { useZivoOFMode } from "@/hooks/useZivoOFMode";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import {
  buildComposerActions,
  COMPOSER_ACTION_SECTIONS,
  COMPOSER_SECTION_LABELS,
  type ChatComposerSource,
  type ComposerAction,
  type ComposerActionId,
  type ComposerIconKey,
} from "./chatComposerHubModel";

export interface ChatComposerHubProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  source: ChatComposerSource;
  draftText: string;
  onDraftTextChange: (next: string) => void;
  onClearDraft: () => void | Promise<void>;
  onImageSelect?: () => void;
  onVideoSelect?: () => void;
  onGifSelect?: () => void;
  onMusicSelect?: () => void;
  onFileSelect?: () => void;
  onScanDocument?: () => void;
  onLocationShare?: () => void;
  onShareContact?: () => void;
  onCreatePoll?: () => void;
  onOpenMiniApps?: () => void;
  onShareSocial?: () => void;
  onSendGift?: () => void;
  onOpenWallet?: () => void;
  onShareZivoCard?: () => void;
  onToggleSensitiveMedia?: () => void;
  onToggleProtectedMedia?: () => void;
  onToggleViewOnce?: () => void;
  onLockedImageSelect?: () => void;
  onLockedTextSelect?: () => void;
  onToggleDisappearing?: () => void;
  onSchedule?: () => void;
  onOpenScheduled?: () => void;
  disappearingEnabled?: boolean;
  disappearingLabel?: string;
  sensitiveMediaMarked?: boolean;
  protectedMediaMarked?: boolean;
  viewOnceMarked?: boolean;
  highlightedActionId?: ComposerActionId | null;
}

const LOCK_UNLOCK_PLANS = new Set(["chat", "pro"]);
const OF_MODE_ACTIONS = new Set<ComposerActionId>([
  "photo",
  "video",
  "gif",
  "sensitive",
  "protected",
  "locked",
  "locked-text",
  "wallet",
  "gift",
]);

const ICONS: Record<ComposerIconKey, ComponentType<{ className?: string }>> = {
  image: ImagePlus,
  video: Video,
  gif: ImagePlay,
  music: Music,
  file: FileUp,
  scan: ScanLine,
  location: MapPin,
  contact: Contact,
  poll: Vote,
  miniapp: PanelsTopLeft,
  social: Share2,
  zivo: LocateFixed,
  gift: Gift,
  wallet: WalletCards,
  sensitive: ShieldAlert,
  lock: Lock,
  timer: Timer,
  calendar: CalendarClock,
  list: ListChecks,
};

const ACTION_COLORS: Record<ComposerActionId, string> = {
  photo: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  video: "text-violet-500 bg-violet-500/10 border-violet-500/20",
  gif: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  music: "text-teal-500 bg-teal-500/10 border-teal-500/20",
  file: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  scan: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  location: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  contact: "text-indigo-500 bg-indigo-500/10 border-indigo-500/20",
  poll: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20",
  miniapp: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  social: "text-[#1877F2] bg-blue-500/10 border-blue-500/20",
  zivo: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  gift: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  wallet: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  sensitive: "text-fuchsia-500 bg-fuchsia-500/10 border-fuchsia-500/20",
  protected: "text-sky-500 bg-sky-500/10 border-sky-500/20",
  locked: "text-rose-500 bg-rose-500/10 border-rose-500/20",
  "locked-text": "text-rose-500 bg-rose-500/10 border-rose-500/20",
  disappearing: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  schedule: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  scheduled: "text-slate-500 bg-slate-500/10 border-slate-500/20",
};

export default function ChatComposerHub({
  open,
  onOpenChange,
  source,
  draftText,
  onImageSelect,
  onVideoSelect,
  onGifSelect,
  onMusicSelect,
  onFileSelect,
  onScanDocument,
  onLocationShare,
  onShareContact,
  onCreatePoll,
  onOpenMiniApps,
  onShareSocial,
  onSendGift,
  onOpenWallet,
  onShareZivoCard,
  onToggleSensitiveMedia,
  onToggleProtectedMedia,
  onToggleViewOnce,
  onLockedImageSelect,
  onLockedTextSelect,
  onToggleDisappearing,
  onSchedule,
  onOpenScheduled,
  disappearingEnabled = false,
  disappearingLabel,
  sensitiveMediaMarked = false,
  protectedMediaMarked = false,
  viewOnceMarked = false,
  highlightedActionId = null,
}: ChatComposerHubProps) {
  const { isPlus, plan } = useZivoPlus();
  const { isOFMode } = useZivoOFMode();
  const canUseLocked = Boolean(isPlus && plan && LOCK_UNLOCK_PLANS.has(plan));
  const hasDraftText = draftText.trim().length > 0;

  const callbacks: Partial<Record<ComposerActionId, (() => void) | undefined>> = {
    photo: onImageSelect,
    video: onVideoSelect,
    gif: onGifSelect,
    music: onMusicSelect,
    file: onFileSelect,
    scan: onScanDocument,
    location: onLocationShare,
    contact: onShareContact,
    poll: onCreatePoll,
    miniapp: onOpenMiniApps,
    social: onShareSocial,
    zivo: onShareZivoCard,
    gift: onSendGift,
    wallet: onOpenWallet,
    sensitive: onToggleSensitiveMedia,
    protected: onToggleProtectedMedia,
    locked: onLockedImageSelect,
    "locked-text": onLockedTextSelect,
    disappearing: onToggleDisappearing,
    schedule: onSchedule,
    scheduled: onOpenScheduled,
  };

  const actions = buildComposerActions({
    source,
    hasDraftText,
    canUseLocked,
    disappearingEnabled,
    disappearingLabel,
    sensitiveMediaMarked,
    protectedMediaMarked,
    enabledActionIds: Object.fromEntries(
      (Object.keys(callbacks) as ComposerActionId[]).map((id) => [id, Boolean(callbacks[id])]),
    ) as Partial<Record<ComposerActionId, boolean>>,
  }).filter((action) => !isOFMode || OF_MODE_ACTIONS.has(action.id));

  const runAction = (action: ComposerAction) => {
    if (!action.enabled) {
      toast(action.disabledReason ?? "Not available here");
      return;
    }
    callbacks[action.id]?.();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88dvh] overflow-y-auto border-border/30 bg-background p-0">
        <div className="mx-auto w-full max-w-3xl px-4 pb-5 pt-4 sm:px-6">
          <SheetHeader className="pr-10 text-left">
            <SheetTitle>Composer Hub</SheetTitle>
            <SheetDescription>
              {source.type === "group" ? "Group" : "Direct chat"} tools for {source.title}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-5 space-y-5">
            {COMPOSER_ACTION_SECTIONS.map((section) => {
              const sectionActions = actions.filter((action) => action.section === section);
              if (!sectionActions.length) return null;

              return (
                <section key={section} className="space-y-2">
                  <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                    {COMPOSER_SECTION_LABELS[section]}
                  </h3>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
                    {sectionActions.map((action) => {
                      const Icon = ICONS[action.icon];
                      const selected = highlightedActionId === action.id;
                      const active =
                        (action.id === "sensitive" && sensitiveMediaMarked) ||
                        (action.id === "protected" && protectedMediaMarked) ||
                        (action.id === "disappearing" && disappearingEnabled);

                      return (
                        <button
                          key={action.id}
                          type="button"
                          onClick={() => runAction(action)}
                          disabled={!action.enabled}
                          aria-label={
                            action.disabledReason ? `${action.label} (${action.disabledReason})` : action.label
                          }
                          title={action.disabledReason ? `${action.label} - ${action.disabledReason}` : action.hint}
                          className={cn(
                            "group flex min-h-[104px] flex-col items-start justify-between rounded-xl border bg-background/70 p-3 text-left transition active:scale-[0.98]",
                            "hover:border-primary/25 hover:bg-muted/35 disabled:cursor-not-allowed disabled:opacity-45",
                            selected && "border-primary/60 ring-2 ring-primary/20",
                            active && "border-primary/45 bg-primary/5",
                          )}
                        >
                          <span
                            className={cn(
                              "inline-flex h-10 w-10 items-center justify-center rounded-xl border",
                              ACTION_COLORS[action.id],
                            )}
                          >
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="min-w-0">
                            <span className="block text-sm font-semibold leading-tight text-foreground">
                              {action.label}
                            </span>
                            <span className="mt-1 block text-xs leading-snug text-muted-foreground">
                              {action.disabledReason ?? action.hint}
                            </span>
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
