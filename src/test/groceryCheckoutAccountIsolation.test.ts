import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("grocery checkout account isolation", () => {
  it("uses the account-scoped delivery address hook instead of legacy global keys", () => {
    const checkout = source("src/components/grocery/GroceryCheckoutDrawer.tsx");
    const addressHook = source("src/hooks/useDeliveryAddress.ts");

    expect(checkout).toContain("useDeliveryAddress()");
    expect(checkout).toContain("selectAddress(sa.id)");
    expect(checkout).toContain("void removeAddress(sa.id)");
    expect(checkout).toContain("void addAddress({");
    expect(checkout).not.toContain(
      'localStorage.getItem("zivo_delivery_addresses")',
    );
    expect(checkout).not.toContain(
      'localStorage.setItem("zivo_selected_address"',
    );

    expect(addressHook).toContain("scopedStorageKey(STORAGE_KEY, userId)");
    expect(addressHook).toContain("scopedStorageKey(SELECTED_KEY, userId)");
    expect(addressHook).not.toContain(
      "window.localStorage.getItem(STORAGE_KEY)",
    );
  });

  it("scopes checkout name, phone, and substitution preference by account", () => {
    const checkout = source("src/components/grocery/GroceryCheckoutDrawer.tsx");

    expect(checkout).toContain(
      "`${CHECKOUT_PROFILE_STORAGE_KEY}:${userId ?? GUEST_CHECKOUT_SCOPE}`",
    );
    expect(checkout).toContain("getSavedProfile(userId)");
    expect(checkout).toContain("checkoutProfileStorageKey(userId)");
    expect(checkout).not.toContain(
      'localStorage.getItem("zivo_checkout_profile")',
    );
    expect(checkout).not.toContain(
      'localStorage.setItem("zivo_checkout_profile"',
    );
  });
});
