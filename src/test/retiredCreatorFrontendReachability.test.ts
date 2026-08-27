import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("retired creator-product frontend reachability", () => {
  it("does not ship the retired coin wallet through route prefetching", () => {
    const prefetcher = source("src/components/shared/RoutePrefetcher.tsx");

    expect(prefetcher).not.toContain('"/coins"');
    expect(prefetcher).not.toContain("CoinWalletPage");
  });

  it("keeps the customer wallet free of live-gift and creator-earnings UI", () => {
    const wallet = source("src/pages/account/WalletPage.tsx");

    for (const retiredFeature of [
      "useLiveEarnings",
      'key: "gifts"',
      "Live Gift Earnings",
      "Z Coin",
      "/creator/live-earnings",
      "/go-live",
    ]) {
      expect(wallet).not.toContain(retiredFeature);
    }

    // Ordinary wallet capabilities remain available.
    expect(wallet).toContain('key: "cards"');
    expect(wallet).toContain('key: "cashout"');
    expect(wallet).toContain('key: "history"');
    expect(wallet).toContain('key: "credits"');
    expect(wallet).toContain("create-user-wallet-topup");
  });

  it("does not expose the monetized live studio from store administration", () => {
    const storeEditor = source("src/pages/admin/AdminStoreEditPage.tsx");
    const storeNavigation = source("src/components/admin/StoreOwnerLayout.tsx");

    expect(storeEditor).not.toContain("StoreLiveStreamSection");
    expect(storeEditor).not.toContain('value="livestream"');
    expect(storeNavigation).not.toContain('id: "livestream"');
    expect(storeNavigation).not.toContain('label: "Live Stream"');
  });

  it("keeps global payment returns limited to ordinary customer payments", () => {
    const handler = source("src/components/lodging/PaymentReturnHandler.tsx");

    for (const ordinaryCapture of [
      "capture-lodging-paypal-order",
      "capture-eats-paypal-order",
      "capture-grocery-paypal-order",
    ]) {
      expect(handler).toContain(ordinaryCapture);
    }
    expect(handler).not.toContain("capture-tip-paypal-order");
    expect(handler).not.toContain("tip_paypal_return");
    expect(handler).not.toContain("tip_square_return");
  });

  it("uses ordinary rewards language without loading a coin balance", () => {
    const more = source("src/pages/MorePage.tsx");

    expect(more).not.toContain("useCoinBalance");
    expect(more).not.toContain("ZIVO Coins");
    expect(more).not.toContain("earn coins");
    expect(more).toContain('label: "Rewards", href: "/rewards"');
  });

  it("does not expose creator monetization or creator-live notification controls", () => {
    const settings = source("src/pages/account/NotificationSettings.tsx");
    const appSettings = source("src/pages/AppSettingsPage.tsx");
    const center = source("src/pages/NotificationCenterPage.tsx");
    const bell = source("src/components/notifications/NotificationBell.tsx");

    for (const retiredLabel of [
      "Creator & Monetization",
      "creator_updates",
      "earnings_payouts",
      "live_streams",
    ]) {
      expect(settings).not.toContain(retiredLabel);
    }
    expect(settings).toContain("Work & Career");
    expect(settings).toContain("job_alerts");

    for (const retiredLabel of ["Live & Streams", "Creator Updates", "creator payments"]) {
      expect(appSettings).not.toContain(retiredLabel);
    }
    expect(center).not.toContain('{ key: "live", label: "Live"');
    expect(center).not.toContain('{ key: "creator", label: "Creator"');
    expect(bell).not.toContain("creator_tip_received");
    expect(bell).not.toContain("creator_new_subscriber");
  });

  it("removes the profile go-live entry point", () => {
    const profileTabs = source("src/components/profile/ProfileContentTabs.tsx");

    expect(profileTabs).not.toContain("openLiveBroadcast");
    expect(profileTabs).not.toContain("setShowLive");
    expect(profileTabs).not.toContain('aria-label="Go live from camera"');
  });

  it("renders historical locked group media as unavailable without an unlock price", () => {
    const groupInfo = source("src/components/chat/GroupInfoSheet.tsx");

    expect(groupInfo).not.toContain("formatStarsPrice");
    expect(groupInfo).not.toContain("Unlock for");
    expect(groupInfo).toContain("Legacy attachment unavailable");
  });

  it("removes retired live-stream metrics from admin analytics", () => {
    const analytics = source("src/pages/admin/AdminAnalyticsDashboard.tsx");

    expect(analytics).not.toContain('.from("live_streams")');
    expect(analytics).not.toContain('title="Live Streams"');
    expect(analytics).not.toContain('title="Stream Engagement"');
  });

  it("preserves free ordinary social live-room routes", () => {
    const app = source("src/App.tsx");

    expect(app).toContain('path="/spaces"');
    expect(app).toContain('path="/watch-party"');
    expect(app).toContain('path="/voice-rooms"');
    expect(app).toContain('path="/voice-rooms/create"');
  });
});
