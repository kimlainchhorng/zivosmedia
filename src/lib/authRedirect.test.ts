import { describe, expect, it } from "vitest";
import { getSafeRedirectTargetForHost, isExternalRedirectTarget } from "./authRedirect";

describe("auth redirect safety", () => {
  it("allows zivosmedia.com to return to zivosoftware.com", () => {
    expect(
      getSafeRedirectTargetForHost(
        "https://zivosoftware.com/login?connected=zivosmedia",
        "zivosmedia.com",
      ),
    ).toBe("https://zivosoftware.com/login?connected=zivosmedia");
  });

  it("allows zivosoftware.com to send users to zivosmedia.com", () => {
    expect(
      getSafeRedirectTargetForHost(
        "https://zivosmedia.com/login?redirect=https%3A%2F%2Fzivosoftware.com%2Flogin",
        "zivosoftware.com",
      ),
    ).toBe("https://zivosmedia.com/login?redirect=https%3A%2F%2Fzivosoftware.com%2Flogin");
  });

  it("keeps zivosoftware.com business redirects on the auto repair software dashboard", () => {
    expect(getSafeRedirectTargetForHost("/business", "zivosoftware.com")).toBe(
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
    expect(getSafeRedirectTargetForHost("/business/dashboard", "zivosoftware.com")).toBe(
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
  });

  it("rewrites the legacy ZIVO Media auto repair dashboard back to zivosoftware.com", () => {
    const dashboardUrl =
      "https://zivosmedia.com/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair";

    expect(getSafeRedirectTargetForHost(dashboardUrl, "zivosoftware.com")).toBe(
      "/admin/stores/a914b90d-c249-4794-ba5e-3fdac0deed44?tab=ar-dashboard&category=auto-repair",
    );
  });

  it("keeps zivoschat.com auth redirects on the chat surface", () => {
    expect(
      getSafeRedirectTargetForHost(
        null,
        "zivoschat.com",
      ),
    ).toBe("/chat");
    expect(
      getSafeRedirectTargetForHost(
        "/login?redirect=/account",
        "zivoschat.com",
      ),
    ).toBe("/chat");
    expect(
      getSafeRedirectTargetForHost(
        "https://zivosmedia.com/login?redirect=https%3A%2F%2Fzivoschat.com%2Fchat",
        "zivoschat.com",
      ),
    ).toBe("/chat");
    expect(
      getSafeRedirectTargetForHost(
        "https://zivoschat.com/chat",
        "zivosmedia.com",
      ),
    ).toBe("https://zivoschat.com/chat");
  });

  it("keeps zivodriver.com auth redirects on the driver surface", () => {
    expect(
      getSafeRedirectTargetForHost(
        null,
        "zivodriver.com",
      ),
    ).toBe("/");
    expect(
      getSafeRedirectTargetForHost(
        "/login?redirect=/driver",
        "zivodriver.com",
      ),
    ).toBe("/");
    expect(
      getSafeRedirectTargetForHost(
        "https://zivosmedia.com/login?redirect=https%3A%2F%2Fzivodriver.com%2Fdriver",
        "zivodriver.com",
      ),
    ).toBe("/");
    expect(
      getSafeRedirectTargetForHost(
        "https://zivodriver.com/driver",
        "zivosmedia.com",
      ),
    ).toBe("https://zivodriver.com/driver");
  });

  it("blocks non-ZIVO external redirects", () => {
    expect(
      getSafeRedirectTargetForHost("https://example.com/phish", "zivosmedia.com"),
    ).toBe("/");
  });

  it("normalizes same-host absolute URLs to internal paths", () => {
    expect(
      getSafeRedirectTargetForHost("https://zivosmedia.com/account?tab=security", "zivosmedia.com"),
    ).toBe("/account?tab=security");
  });

  it("blocks internal auth-route loops", () => {
    expect(getSafeRedirectTargetForHost("/login?redirect=/account", "zivosmedia.com")).toBe("/");
  });

  it("detects external redirect targets", () => {
    expect(isExternalRedirectTarget("https://zivosoftware.com/login")).toBe(true);
    expect(isExternalRedirectTarget("/account")).toBe(false);
  });
});
