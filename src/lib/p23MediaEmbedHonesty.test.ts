/**
 * P23 Media suite — Ride embed / SSO honesty pins.
 *
 * Production allowlists must not widen without evidence. Local Vite parents are
 * only 8081; Ride local is only 5177. A forbid path must never mount an iframe
 * or invent a silent SSO session.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { KHR_PER_USD } from "@/lib/currency";
import {
  canEmbedRideApp,
  resolveLocalRideAppBaseUrl,
  resolveRideAppBaseUrl,
  ZIVO_RIDE_PRODUCTION_ORIGIN,
} from "@/lib/zivoRideProductionBoundary";

const root = process.cwd();
const read = (relative: string) =>
  readFileSync(path.join(root, relative), "utf8").replace(/\r\n/g, "\n");

describe("P23 Media Ride embed honesty", () => {
  it("keeps Cambodia KHR parity with Ride fareMath (4100)", () => {
    expect(KHR_PER_USD).toBe(4100);
  });

  it("admits only production Ride origin without the local-development flag", () => {
    expect(resolveRideAppBaseUrl("https://ride.zivosmedia.com")).toEqual(
      new URL(ZIVO_RIDE_PRODUCTION_ORIGIN),
    );
    expect(resolveRideAppBaseUrl("http://localhost:5177")).toBeNull();
    expect(resolveRideAppBaseUrl("https://evil.example")).toBeNull();
    expect(
      canEmbedRideApp("https://zivosmedia.com", ZIVO_RIDE_PRODUCTION_ORIGIN),
    ).toBe(true);
    expect(
      canEmbedRideApp("http://localhost:8081", "http://localhost:5177"),
    ).toBe(false);
  });

  it("limits local development to Media :8081 → Ride :5177", () => {
    const dev = { allowLocalDevelopment: true };
    expect(resolveLocalRideAppBaseUrl("http://localhost:8081", dev)?.origin).toBe(
      "http://localhost:5177",
    );
    expect(canEmbedRideApp("http://localhost:8081", "http://localhost:5177", dev)).toBe(
      true,
    );
    for (const bad of [
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:3000",
    ]) {
      expect(resolveLocalRideAppBaseUrl(bad, dev)).toBeNull();
      expect(canEmbedRideApp(bad, "http://localhost:5177", dev)).toBe(false);
    }
  });

  it("CanonicalRidePage fails closed when embed is forbidden — no silent SSO iframe", () => {
    const page = read("src/pages/app/CanonicalRidePage.tsx");
    expect(page).toMatch(/if \(!canEmbedRide && rideLaunch\)/);
    expect(page).toMatch(/Continue to ZIVO Ride/);
    expect(page).toMatch(/not on an allowed Ride embed origin/);
    expect(page).toMatch(/no SSO session is adopted/);
    expect(page).toMatch(/rideLaunch\.standaloneRideUrl/);
    expect(page).toMatch(/allowLocalDevelopment: import\.meta\.env\.DEV/);
    expect(page).not.toMatch(/capture-ride-tip/);
  });

  it("embed session tokens stay opaque and rotate per authenticated parent user", () => {
    const session = read("src/lib/rideEmbedSession.ts");
    expect(session).toMatch(/STORAGE_KEY = "zivo_ride_embed_parent_session"/);
    expect(session).toMatch(/TOKEN_RE = \/\^\[A-Za-z0-9_-\]\{32,128\}\$/);
    expect(session).toMatch(/existing\?\.userId === userId/);
    expect(session).not.toMatch(/access_token|refresh_token|forged/i);
  });
});
