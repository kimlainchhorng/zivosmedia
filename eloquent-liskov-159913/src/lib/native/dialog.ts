import { Capacitor } from "@capacitor/core";
import { Dialog } from "@capacitor/dialog";

const isNative = () => Capacitor.isNativePlatform();

export async function nativeAlert(message: string, title = "ZIVOS"): Promise<void> {
  if (isNative()) {
    await Dialog.alert({ title, message });
    return;
  }
  window.alert(message);
}

export async function nativeConfirm(message: string, title = "ZIVOS"): Promise<boolean> {
  if (isNative()) {
    const { value } = await Dialog.confirm({ title, message });
    return value;
  }
  return window.confirm(message);
}

export async function nativePrompt(message: string, title = "ZIVOS", defaultValue = ""): Promise<string | null> {
  if (isNative()) {
    const { value, cancelled } = await Dialog.prompt({ title, message, inputText: defaultValue });
    return cancelled ? null : value;
  }
  return window.prompt(message, defaultValue);
}
