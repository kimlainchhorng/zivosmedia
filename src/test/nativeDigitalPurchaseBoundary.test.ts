import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

function expectGuardBefore(
  relativePath: string,
  guard: string,
  purchaseCall: string,
) {
  const text = source(relativePath);
  const guardIndex = text.indexOf(guard);
  const purchaseIndex = text.indexOf(purchaseCall);
  expect(
    guardIndex,
    `${relativePath} is missing its native guard`,
  ).toBeGreaterThan(-1);
  expect(
    purchaseIndex,
    `${relativePath} is missing the expected purchase boundary`,
  ).toBeGreaterThan(guardIndex);
}

describe("installed-app digital purchase boundary", () => {
  it("blocks ZIVO+ and software subscription checkout before provider calls", () => {
    expectGuardBefore(
      "src/pages/ZivoPlusPage.tsx",
      "requireWebDigitalPurchase();",
      '"create-zivo-plus-checkout"',
    );
    expectGuardBefore(
      "src/hooks/useMembership.ts",
      "requireWebDigitalPurchase();",
      '"create-zivo-plus-checkout"',
    );
    expectGuardBefore(
      "src/lib/software/softwareCheckout.ts",
      "requireWebDigitalPurchase();",
      '"software-create-subscription"',
    );
  });

  it("blocks same-app promotion and ad-wallet purchases in native UI", () => {
    for (const [relativePath, purchaseCall] of [
      ["src/components/shop/MerchantBoostModal.tsx", '"create-reel-boost"'],
      ["src/pages/app/shop/SalesAttributionPage.tsx", '"create-reel-boost"'],
      [
        "src/components/admin/AdsStudioWalletGuard.tsx",
        '"create-ads-wallet-topup"',
      ],
      ["src/components/admin/StoreAdsManager.tsx", '"create-ads-wallet-topup"'],
    ] as const) {
      expectGuardBefore(
        relativePath,
        "if (nativeDigitalPurchasesDisabled)",
        purchaseCall,
      );
      expect(source(relativePath)).toContain("NativeDigitalPurchaseNotice");
    }
  });

  it("blocks creator subs, tips, coins, and wallet top-ups in native UI", () => {
    for (const [relativePath, purchaseCall] of [
      [
        "src/components/creator/SubscribeInAppSheet.tsx",
        '"subscribe-to-tier-intent"',
      ],
      ["src/components/social/TipSheet.tsx", '"create-tip-payment-intent"'],
      ["src/components/live/CoinRechargeSheet.tsx", '"create-coin-payment-intent"'],
      ["src/pages/account/WalletPage.tsx", '"create-user-wallet-topup"'],
    ] as const) {
      expectGuardBefore(
        relativePath,
        "isNativeDigitalPurchaseRestricted",
        purchaseCall,
      );
      expect(source(relativePath)).toContain("NativeDigitalPurchaseNotice");
    }
    expectGuardBefore(
      "src/components/zivo-travel/TravelWalletTopupDialog.tsx",
      "requireWebDigitalPurchase();",
      '"create-user-wallet-topup"',
    );
    expect(
      source("src/components/zivo-travel/TravelWalletTopupDialog.tsx"),
    ).toContain("NativeDigitalPurchaseNotice");
  });

  it("preserves physical-service checkout and labels the native candidate accurately", () => {
    for (const physicalSurface of [
      "src/pages/EatsLanding.tsx",
      "src/pages/app/BusBookingPage.tsx",
      "src/pages/FlightLanding.tsx",
    ]) {
      expect(source(physicalSurface)).not.toContain(
        "requireWebDigitalPurchase",
      );
    }

    const playListing = source("android/store-listing/PLAY_STORE.md");
    const appStoreListing = source("ios/store-listing/APP_STORE.md");
    expect(playListing).toContain("In-app purchases: No");
    expect(playListing).not.toContain(
      "Some premium features and creator subscriptions may have a price.",
    );
    expect(appStoreListing).not.toContain(
      "Some premium features and creator subscriptions may have a price.",
    );
  });
});
