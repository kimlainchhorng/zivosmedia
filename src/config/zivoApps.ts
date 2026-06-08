/**
 * Canonical registry of the ZIVO network apps and their production origins.
 *
 * One source of truth for any cross-app surface (the global app switcher first
 * of all), reusing each domain config's origin + host matcher so a surface can
 * highlight the app you're currently on and link out to the others. Add a new
 * ZIVO app here and it appears everywhere the registry is consumed.
 */
import {
  ZIVO_MEDIA_ORIGIN,
  ZIVO_SOFTWARE_ORIGIN,
  isZivoMediaHost,
  isZivoSoftwareHost,
} from "@/config/autoRepairDomain";
import { ZIVO_CHAT_ORIGIN, isZivoChatHost } from "@/config/zivoChatDomain";
import { ZIVO_DRIVER_ORIGIN, isZivoDriverHost } from "@/config/zivoDriverDomain";
import { ZIVO_TRAVEL_ORIGIN, isZivoTravelHost } from "@/config/zivoTravelDomain";
import { ZIVO_BUSINESS_ORIGIN, isZivoBusinessHost } from "@/config/zivoBusinessDomain";
import { ZIVO_EMPLOYEE_ORIGIN, isZivoEmployeeHost } from "@/config/zivoEmployeeDomain";

export type ZivoAppKey =
  | "media"
  | "travel"
  | "driver"
  | "business"
  | "employee"
  | "software"
  | "chat";

export interface ZivoApp {
  key: ZivoAppKey;
  name: string;
  tagline: string;
  origin: string;
  /** True when the given hostname is served by this app. */
  matchesHost: (hostname?: string | null) => boolean;
}

export const ZIVO_APPS: ZivoApp[] = [
  { key: "media", name: "Zivosmedia", tagline: "Social, feed & super-app", origin: ZIVO_MEDIA_ORIGIN, matchesHost: isZivoMediaHost },
  { key: "travel", name: "Zivo Travel", tagline: "Flights, hotels, cars & bus", origin: ZIVO_TRAVEL_ORIGIN, matchesHost: isZivoTravelHost },
  { key: "driver", name: "Zivo Driver", tagline: "Drive & earn", origin: ZIVO_DRIVER_ORIGIN, matchesHost: isZivoDriverHost },
  { key: "business", name: "Zivo Business", tagline: "Business profile & billing", origin: ZIVO_BUSINESS_ORIGIN, matchesHost: isZivoBusinessHost },
  { key: "employee", name: "Zivo Employee", tagline: "Schedule, shifts & pay", origin: ZIVO_EMPLOYEE_ORIGIN, matchesHost: isZivoEmployeeHost },
  { key: "software", name: "Zivo Software", tagline: "Business software catalog", origin: ZIVO_SOFTWARE_ORIGIN, matchesHost: isZivoSoftwareHost },
  { key: "chat", name: "ZivoChat", tagline: "Chat & support", origin: ZIVO_CHAT_ORIGIN, matchesHost: isZivoChatHost },
];

/**
 * The ZIVO app whose host matches `hostname` (defaults to the current window
 * host), or null when off-network (e.g. localhost or a preview host).
 */
export function getCurrentZivoApp(hostname?: string | null): ZivoApp | null {
  const host =
    (hostname ?? (typeof window !== "undefined" ? window.location.hostname : "")) || "";
  return ZIVO_APPS.find((app) => app.matchesHost(host)) ?? null;
}
