import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

const retiredRoutes = [
  "/live",
  "/go-live",
  "/creators",
  "/creator-dashboard",
  "/creator/setup",
  "/creator/welcome",
  "/explore/18-plus",
  "/ppv",
  "/ppv/create",
  "/creator-analytics",
  "/creator/live-earnings",
  "/creator/subscribers",
  "/creator/tips",
  "/affiliate-hub",
  "/digital-products",
  "/monetization",
  "/brand-deals",
  "/creator/milestones",
  "/creator/earnings",
  "/creator-payouts",
  "/creator/goals",
  "/account/tips",
  "/affiliate-links",
  "/coins",
  "/coin-transfers",
  "/gift-history",
  "/fan-badges",
  "/my-unlocks",
  "/p2p-money",
  "/wallet/coins/success",
  "/pair/:token",
] as const;

describe("Stripe frontend compliance posture", () => {
  it("does not register retired creator, adult, live, or money-movement routes", () => {
    const app = source("src/App.tsx");

    for (const route of retiredRoutes) {
      expect(app).not.toContain(`path="${route}"`);
    }

    expect(app).not.toContain("CreatorSubscribeSheet");
    expect(app).not.toContain("AffiliateLinkSheet");
    expect(app).not.toContain("P2PTransferSheet");
    expect(app).not.toContain("tip_paypal_return");
    expect(app).not.toContain("tip_square_return");

    // Existing customers retain a way to inspect and cancel subscriptions.
    expect(app).toContain('path="/account/subscriptions"');
  });

  it("keeps public profiles social-only", () => {
    const profile = source("src/pages/PublicProfilePage.tsx");
    const retiredProfileFeatures = [
      "useZivoOFMode",
      "useAdultGate",
      "is_of_creator",
      "ZIVO OF",
      "18+ Content",
      "TipSheet",
      "Send a tip",
      "CreatorTiersSubscribe",
      "TopSupporters",
      "CreatorPPVStrip",
    ];

    for (const feature of retiredProfileFeatures) {
      expect(profile).not.toContain(feature);
    }

    expect(profile).toContain("Follow");
    expect(profile).toContain("Add Friend");
    expect(profile).toContain("Message");
  });

  it("does not advertise retired creator monetization or live products", () => {
    const llms = source("public/llms.txt");
    const manifest = source("public/manifest.webmanifest");
    const sitemap = source("public/sitemap.xml");
    const robots = source("public/robots.txt");

    expect(llms).not.toContain("creator subscriptions");
    expect(llms).not.toContain("live streaming");
    expect(llms).not.toContain("https://zivosmedia.com/creators");

    expect(manifest).not.toMatch(/creators?|subscriptions?|live streaming/i);
    expect(sitemap).not.toContain("<loc>https://zivosmedia.com/creators</loc>");

    for (const route of ["/creators", "/explore/18-plus", "/ppv", "/monetization", "/live", "/coins", "/p2p-money"]) {
      expect(robots).toContain(`Disallow: ${route}`);
    }
  });
});
