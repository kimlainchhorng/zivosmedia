import { describe, expect, it } from "vitest";
import { pathFromNativeOpenUrl } from "./nativeDeepLinks";

describe("pathFromNativeOpenUrl", () => {
  it("maps app scheme host-plus-path URLs into React Router paths", () => {
    expect(pathFromNativeOpenUrl("com.myzivo.app://dev/chat-call-preview")).toBe("/dev/chat-call-preview");
  });

  it("maps app scheme pathname URLs into React Router paths", () => {
    expect(pathFromNativeOpenUrl("com.myzivo.app:///chat?thread=abc#latest")).toBe("/chat?thread=abc#latest");
  });

  it("accepts the legacy app scheme", () => {
    expect(pathFromNativeOpenUrl("com.hizovo.app://app/home")).toBe("/app/home");
  });

  it("accepts trusted web links received through native app open events", () => {
    expect(pathFromNativeOpenUrl("https://hizivo.com/chat?thread=abc")).toBe("/chat?thread=abc");
  });

  it("rejects untrusted schemes and hosts", () => {
    expect(pathFromNativeOpenUrl("https://example.com/chat")).toBeNull();
    expect(pathFromNativeOpenUrl("mailto:support@hizivo.com")).toBeNull();
    expect(pathFromNativeOpenUrl("not a url")).toBeNull();
  });
});
