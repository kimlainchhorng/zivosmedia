import { toast } from "sonner";

type PermissionToastOptions = {
  title?: string;
  successMessage?: string;
};

export function getMicrophoneRecoveryHint() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return "Allow microphone access in your browser settings, then reload the chat.";
  }

  const capacitor = (window as any).Capacitor;
  const isNative = capacitor?.isNativePlatform?.() === true;
  const platform = capacitor?.getPlatform?.();
  if (isNative && platform === "ios") {
    return "Open iPhone Settings > ZIVO > Microphone, turn it on, then reopen this chat.";
  }
  if (isNative && platform === "android") {
    return "Open Android Settings > Apps > ZIVO > Permissions > Microphone, allow it, then reopen this chat.";
  }
  if (isNative) {
    return "Open device Settings > Privacy > Microphone, allow ZIVO, then reopen this chat.";
  }

  const ua = navigator.userAgent;
  const isSafari = /^((?!chrome|android).)*safari/i.test(ua);
  if (isSafari) {
    return "In Safari, open settings for this website, set Microphone to Allow, then reload. Also check macOS System Settings > Privacy & Security > Microphone.";
  }

  return "Tap Allow mic. If it stays blocked, open site controls beside the URL, set Microphone to Allow, then reload. Also check macOS System Settings > Privacy & Security > Microphone.";
}

export async function tryRequestMicrophoneAccess() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}

export function showMicrophoneBlockedToast({
  title = "Microphone access is blocked",
  successMessage = "Microphone is allowed. Try voice again.",
}: PermissionToastOptions = {}) {
  toast.error(title, {
    description: getMicrophoneRecoveryHint(),
    duration: 12000,
    action: {
      label: "Allow mic",
      onClick: async () => {
        const allowed = await tryRequestMicrophoneAccess();
        if (allowed) {
          toast.success(successMessage);
          return;
        }
        toast.error("Still blocked", {
          description: getMicrophoneRecoveryHint(),
          duration: 12000,
          action: {
            label: "Reload",
            onClick: () => window.location.reload(),
          },
        });
      },
    },
  });
}

