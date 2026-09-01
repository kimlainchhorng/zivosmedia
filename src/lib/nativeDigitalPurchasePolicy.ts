import { Capacitor } from "@capacitor/core";

export const NATIVE_DIGITAL_PURCHASE_MESSAGE =
  "Digital purchases are not available in the installed app.";

export function isNativeDigitalPurchaseRestricted(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function requireWebDigitalPurchase(): void {
  if (isNativeDigitalPurchaseRestricted()) {
    throw new Error(NATIVE_DIGITAL_PURCHASE_MESSAGE);
  }
}
