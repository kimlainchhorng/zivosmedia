import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const INDEX_SRC = readFileSync(resolve(__dirname, "../pages/Index.tsx"), "utf8");
const APP_HOME_SRC = readFileSync(resolve(__dirname, "../pages/app/AppHome.tsx"), "utf8");

describe("mobile Home fallback", () => {
  it("keeps a branded loading shell with primary app shortcuts", () => {
    expect(INDEX_SRC).toContain("const MobileHomeFallback = () =>");
    expect(INDEX_SRC).toContain("Loading Home");
    expect(INDEX_SRC).toContain("One app for travel, reels, chat, shopping, and everyday plans.");
    for (const shortcut of ['["Feed", "/feed"]', '["Reels", "/reels"]', '["Chat", "/chat"]', '["Profile", "/profile"]']) {
      expect(INDEX_SRC).toContain(shortcut);
    }
    for (const href of ["/login", "/signup"]) {
      expect(INDEX_SRC).toContain(`href="${href}"`);
    }
    expect(INDEX_SRC).toContain("<Suspense fallback={<MobileHomeFallback />}>");
  });

  it("keeps guest Home entry points visible before personalized data loads", () => {
    expect(APP_HOME_SRC).toContain("const GuestHomeEntry = ({ onNavigate }");
    expect(APP_HOME_SRC).toContain('data-testid="home-guest-entry"');
    expect(APP_HOME_SRC).toContain("const GUEST_HOME_SHORTCUTS");
    for (const shortcut of ['label: "Feed"', 'label: "Reels"', 'label: "Chat"', 'label: "Profile"']) {
      expect(APP_HOME_SRC).toContain(shortcut);
    }
    expect(APP_HOME_SRC).toContain("{!user && <GuestHomeEntry onNavigate={navigate} />}");
    expect(APP_HOME_SRC).toContain('onClick={() => onNavigate("/signup")}');
    expect(APP_HOME_SRC).toContain('onClick={() => onNavigate("/login")}');
  });
});
