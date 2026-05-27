import { Capacitor } from "@capacitor/core";
import { Share } from "@capacitor/share";

export type SharePayload = {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
};

export type ShareResult = { shared: boolean; cancelled: boolean };

export async function shareContent(payload: SharePayload): Promise<ShareResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      await Share.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
        dialogTitle: payload.dialogTitle,
      });
      return { shared: true, cancelled: false };
    } catch (error: any) {
      const msg = String(error?.message || "").toLowerCase();
      if (msg.includes("cancel") || msg.includes("dismiss")) {
        return { shared: false, cancelled: true };
      }
      throw error;
    }
  }

  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      });
      return { shared: true, cancelled: false };
    } catch (error: any) {
      if (error?.name === "AbortError") {
        return { shared: false, cancelled: true };
      }
      throw error;
    }
  }

  return { shared: false, cancelled: false };
}

export function canShare(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  return typeof navigator !== "undefined" && typeof navigator.share === "function";
}
