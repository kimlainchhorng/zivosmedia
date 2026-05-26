import { Capacitor } from "@capacitor/core";
import { Toast } from "@capacitor/toast";
import { toast as sonnerToast } from "sonner";

type Variant = "default" | "success" | "error";

export async function showToast(message: string, variant: Variant = "default"): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    await Toast.show({ text: message, duration: "short", position: "bottom" });
    return;
  }
  if (variant === "success") sonnerToast.success(message);
  else if (variant === "error") sonnerToast.error(message);
  else sonnerToast(message);
}
