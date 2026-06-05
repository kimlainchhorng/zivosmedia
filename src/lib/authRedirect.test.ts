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
