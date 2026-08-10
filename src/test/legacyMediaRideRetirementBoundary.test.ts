import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const retirementFlag = 'Deno.env.get("ENABLE_LEGACY_MEDIA_RIDE_PAYMENTS") !== "true"';
const retirementCode = 'code: "legacy_media_ride_payments_retired"';

const retiredRoutes = [
  "create-payment-intent",
  "create-ride-payment",
  "capture-ride-tip",
  "cancel-ride-request",
  "driver-payout",
  "notify-aba-payment",
] as const;

function source(relativePath: string) {
  return readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");
}

function appSourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "test" ? [] : appSourceFiles(entryPath);
    return /\.(?:ts|tsx)$/.test(entry.name) ? [entryPath] : [];
  });
}

describe("legacy Media Ride retirement boundary", () => {
  it("fails closed before authentication, Stripe, or notification side effects", () => {
    for (const route of retiredRoutes) {
      const edge = source(`supabase/functions/${route}/index.ts`);
      const gate = edge.indexOf(retirementFlag);
      const firstRuntimeSideEffect = Math.min(
        ...[
          edge.indexOf("const authHeader"),
          edge.indexOf("new Stripe"),
          edge.indexOf("stripe.paymentIntents"),
          edge.indexOf("stripe.transfers"),
          edge.indexOf("await fetch("),
        ].filter((index) => index >= 0),
      );

      expect(edge, `${route} must require the server-only retirement flag`).toContain(retirementFlag);
      expect(edge, `${route} must return the shared retirement code`).toContain(retirementCode);
      expect(edge, `${route} must return HTTP 410 while retired`).toMatch(/legacy_media_ride_payments_retired[\s\S]{0,180}410/);
      expect(gate, `${route} must stop before side effects`).toBeLessThan(firstRuntimeSideEffect);
      expect(edge, `${route} must not trust a browser feature flag`).not.toContain("VITE_ENABLE_LEGACY_MEDIA_RIDE_PAYMENTS");
    }
  });

  it("has no current browser invocation of a retired Media Ride payment route", () => {
    const appSource = appSourceFiles(path.join(root, "src"))
      .map((file) => readFileSync(file, "utf8"))
      .join("\n");

    for (const route of retiredRoutes) {
      expect(appSource).not.toContain(`functions.invoke("${route}"`);
      expect(appSource).not.toContain(`functions/v1/${route}`);
    }
  });
});
