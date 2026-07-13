import { Capacitor } from "@capacitor/core";
import { Device, type DeviceInfo } from "@capacitor/device";

let cachedInfo: DeviceInfo | null = null;
let cachedId: string | null = null;

export async function getDeviceInfo(): Promise<DeviceInfo> {
  if (cachedInfo) return cachedInfo;
  cachedInfo = await Device.getInfo();
  return cachedInfo;
}

export async function getDeviceId(): Promise<string> {
  if (cachedId) return cachedId;
  const { identifier } = await Device.getId();
  cachedId = identifier;
  return identifier;
}

export function getPlatform(): "ios" | "android" | "web" {
  return Capacitor.getPlatform() as "ios" | "android" | "web";
}

export const isIOS = () => getPlatform() === "ios";
export const isAndroid = () => getPlatform() === "android";
export const isNative = () => Capacitor.isNativePlatform();
