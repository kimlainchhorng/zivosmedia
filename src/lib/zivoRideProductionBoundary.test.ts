import { describe, expect, it } from "vitest";

import {
  getRideAuthorizeUrl,
  resolveRideAppBaseUrl,
  ZIVO_RIDE_PRODUCTION_ORIGIN,
} from "./zivoRideProductionBoundary";

describe("ZIVO Ride production boundary", () => {
  it("accepts only the canonical production Ride origin", () => {
    expect(resolveRideAppBaseUrl(ZIVO_RIDE_PRODUCTION_ORIGIN)?.origin)
      .toBe(ZIVO_RIDE_PRODUCTION_ORIGIN);
  });

  it("rejects arbitrary HTTPS hosts, sibling subdomains, and proxy paths", () => {
    expect(resolveRideAppBaseUrl("https://ride.example.com")).toBeNull();
    expect(resolveRideAppBaseUrl("https://preview.zivosmedia.com")).toBeNull();
    expect(resolveRideAppBaseUrl("https://zivosmedia.com")).toBeNull();
    expect(resolveRideAppBaseUrl("https://zivosmedia.com/ride")).toBeNull();
    expect(resolveRideAppBaseUrl("https://www.zivosmedia.com/ride")).toBeNull();
  });

  it("rejects remote HTTP, URL credentials, custom ports, queries, and fragments", () => {
    expect(resolveRideAppBaseUrl("http://ride.zivosmedia.com")).toBeNull();
    expect(resolveRideAppBaseUrl("https://user:pass@ride.zivosmedia.com")).toBeNull();
    expect(resolveRideAppBaseUrl("https://ride.zivosmedia.com:8443")).toBeNull();
    expect(resolveRideAppBaseUrl("https://ride.zivosmedia.com?redirect=evil")).toBeNull();
    expect(resolveRideAppBaseUrl("https://ride.zivosmedia.com/#evil")).toBeNull();
  });

  it("allows only the exact local Ride origin in development", () => {
    const dev = { allowLocalDevelopment: true };
    expect(resolveRideAppBaseUrl(undefined, dev)?.origin).toBe("http://localhost:5177");
    expect(resolveRideAppBaseUrl("http://127.0.0.1:5177", dev)?.origin)
      .toBe("http://127.0.0.1:5177");
    expect(resolveRideAppBaseUrl("http://localhost:5178", dev)).toBeNull();
    expect(resolveRideAppBaseUrl("http://localhost:5177")).toBeNull();
  });

  it("accepts only the central production authorize endpoint", () => {
    const challenge = "a".repeat(43);
    const message = {
      type: "zivo-ride:authorize",
      url: `https://zivosmedia.com/auth/zivosmedia/authorize?app_key=zivo_ride&redirect_uri=${encodeURIComponent("https://ride.zivosmedia.com/auth/callback?source=zivosmedia")}&state=csrf-state&code_challenge=${challenge}&code_challenge_method=S256`,
    };
    expect(getRideAuthorizeUrl(message)?.origin).toBe("https://zivosmedia.com");

    expect(getRideAuthorizeUrl({
      ...message,
      url: message.url.replace("zivosmedia.com/auth", "preview.zivosmedia.com/auth"),
    })).toBeNull();
    expect(getRideAuthorizeUrl({
      ...message,
      url: message.url.replace("zivosmedia.com/auth", "zivosmedia.com.evil.example/auth"),
    })).toBeNull();
    expect(getRideAuthorizeUrl({
      ...message,
      url: message.url.replace("/auth/zivosmedia/authorize", "/not-authorize"),
    })).toBeNull();
    expect(getRideAuthorizeUrl({
      ...message,
      url: message.url.replace(
        encodeURIComponent("https://ride.zivosmedia.com/auth/callback?source=zivosmedia"),
        encodeURIComponent("https://zivosmedia.com/auth/callback?source=zivosmedia"),
      ),
    })).toBeNull();
  });

  it("binds authorize requests to the Ride client, callback, state, and PKCE S256", () => {
    const challenge = "b".repeat(43);
    const valid = new URL("https://zivosmedia.com/auth/zivosmedia/authorize");
    valid.searchParams.set("app_key", "zivo_ride");
    valid.searchParams.set("redirect_uri", "https://ride.zivosmedia.com/auth/callback?source=zivosmedia");
    valid.searchParams.set("state", "csrf-state");
    valid.searchParams.set("code_challenge", challenge);
    valid.searchParams.set("code_challenge_method", "S256");

    const message = (url: URL) => ({ type: "zivo-ride:authorize", url: url.toString() });
    expect(getRideAuthorizeUrl(message(valid))).not.toBeNull();

    for (const [key, value] of [
      ["app_key", "zivo_driver"],
      ["redirect_uri", "https://evil.example/auth/callback?source=zivosmedia"],
      ["state", ""],
      ["code_challenge", "short"],
      ["code_challenge_method", "plain"],
    ]) {
      const tampered = new URL(valid);
      tampered.searchParams.set(key, value);
      expect(getRideAuthorizeUrl(message(tampered))).toBeNull();
    }
  });

  it("keeps the local authorize endpoint development-only", () => {
    const challenge = "c".repeat(43);
    const url = new URL("http://localhost:8081/auth/zivosmedia/authorize");
    url.searchParams.set("app_key", "zivo_ride");
    url.searchParams.set("redirect_uri", "http://localhost:5177/auth/callback?source=zivosmedia");
    url.searchParams.set("state", "csrf-state");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");
    const message = {
      type: "zivo-ride:authorize",
      url: url.toString(),
    };
    expect(getRideAuthorizeUrl(message)).toBeNull();
    expect(getRideAuthorizeUrl(message, { allowLocalDevelopment: true })?.origin)
      .toBe("http://localhost:8081");
  });

  it("rejects the retired local hub port so local Ride always targets the same zivosmedia app", () => {
    const challenge = "d".repeat(43);
    const url = new URL("http://localhost:5174/auth/zivosmedia/authorize");
    url.searchParams.set("app_key", "zivo_ride");
    url.searchParams.set("redirect_uri", "http://localhost:5177/auth/callback?source=zivosmedia");
    url.searchParams.set("state", "csrf-state");
    url.searchParams.set("code_challenge", challenge);
    url.searchParams.set("code_challenge_method", "S256");

    expect(getRideAuthorizeUrl({ type: "zivo-ride:authorize", url: url.toString() }, { allowLocalDevelopment: true }))
      .toBeNull();
  });
});
