/**
 * VoiceBubbleActionSheet — iOS-style bottom sheet that appears on long-press
 * of a voice message bubble. Replaces the iOS native text-selection loupe.
 */
import { useEffect } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Reply, Copy, RefreshCw, Trash2, Bug } from "lucide-react";
import { toast } from "sonner";
import { showActionSheet } from "@/lib/native/actionSheet";
import { isNative } from "@/lib/native/device";
import { copyText } from "@/lib/native/clipboard";

interface VoiceBubbleActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  audioUrl?: string;
  canResend?: boolean;
  canReply?: boolean;
  isFailedOrUploading?: boolean;
  debugEnabled: boolean;
  onReply?: () => void;
  onResend?: () => void;
  onDiscard?: () => void;
  onToggleDebug: () => void;
}

interface ActionRow {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  destructive?: boolean;
  onSelect: () => void;
}

export default function VoiceBubbleActionSheet({
  open,
  onOpenChange,
  audioUrl,
  canResend,
  canReply,
  isFailedOrUploading,
  debugEnabled,
  onReply,
  onResend,
  onDiscard,
  onToggleDebug,
}: VoiceBubbleActionSheetProps) {
  const close = () => onOpenChange(false);

  const actions: ActionRow[] = [];

  if (canReply && onReply) {
    actions.push({
      key: "reply",
      label: "Reply",
      icon: Reply,
      onSelect: () => { onReply(); close(); },
    });
  }

  if (audioUrl) {
    actions.push({
      key: "copy",
      label: "Copy link",
      icon: Copy,
      onSelect: async () => {
        try {
          await copyText(audioUrl);
          toast.success("Link copied");
        } catch {
          toast.error("Couldn't copy");
        }
        close();
      },
    });
  }

  if (canResend && onResend) {
    actions.push({
      key: "resend",
      label: "Resend voice",
      icon: RefreshCw,
      onSelect: () => { onResend(); close(); },
    });
  }

  if (onDiscard) {
    actions.push({
      key: "discard",
      label: isFailedOrUploading ? "Discard" : "Delete",
      icon: Trash2,
      destructive: true,
      onSelect: () => { onDiscard(); close(); },
    });
  }

  actions.push({
    key: "debug",
    label: debugEnabled ? "Disable voice debug" : "Enable voice debug",
    icon: Bug,
    onSelect: () => { onToggleDebug(); close(); },
  });

  // On native iOS/Android, show the system action sheet instead of the Drawer.
  useEffect(() => {
    if (!open || !isNative()) return;
    let cancelled = false;
    (async () => {
      const idx = await showActionSheet(
        "Voice message",
        actions.map(a => ({ title: a.label, destructive: a.destructive }))
      );
      if (cancelled) return;
      if (idx !== null && idx >= 0 && idx < actions.length) {
        actions[idx].onSelect();
      } else {
        close();
      }
    })();
    return () => { cancelled = true; };
  }, [open]);

  // Web users still get the styled Drawer.
  if (isNative()) return null;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="pb-[max(var(--zivo-safe-bottom,0px),16px)]">
        <DrawerHeader className="pb-2">
          <DrawerTitle className="text-sm text-muted-foreground font-normal text-center">
            Voice message
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-3 pb-2 flex flex-col gap-1">
          {actions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.key}
                type="button"
                onClick={a.onSelect}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-[15px] font-medium active:scale-[0.98] transition-transform ${
                  a.destructive
                    ? "text-destructive hover:bg-destructive/5 active:bg-destructive/10"
                    : "text-foreground hover:bg-muted active:bg-muted"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
        <div className="px-3 pt-1">
          <button
            type="button"
            onClick={close}
            className="w-full py-3.5 rounded-xl bg-muted text-foreground font-semibold text-[15px] active:scale-[0.98] transition-transform"
          >
            Cancel
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
