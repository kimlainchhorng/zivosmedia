import { describe, expect, it } from "vitest";

import {
  ZIVO_BUSINESS_HOME_PATH,
  ZIVO_BUSINESS_HOSTS,
  ZIVO_BUSINESS_ORIGIN,
  isZivoBusinessHost,
  isZivoBusinessPath,
} from "./zivoBusinessDomain";

describe("zivo business domain config", () => {
  it("recognizes apex and www zivobusiness hosts only", () => {
    expect(isZivoBusinessHost("zivobusiness.com")).toBe(true);
    expect(isZivoBusinessHost("www.zivobusiness.com")).toBe(true);
    expect(isZivoBusinessHost("ZIVOBUSINESS.COM")).toBe(true);
    expect(isZivoBusinessHost("zivosmedia.com")).toBe(false);
    expect(isZivoBusinessHost("zivoemployee.com")).toBe(false);
    expect(isZivoBusinessHost("zivosoftware.com")).toBe(false);
    expect(isZivoBusinessHost("preview.zivobusiness.com")).toBe(false);
    expect(isZivoBusinessHost("")).toBe(false);
    expect(isZivoBusinessHost(null)).toBe(false);
    expect(isZivoBusinessHost(undefined)).toBe(false);
  });

  it("uses zivobusiness.com as the business origin and home", () => {
    expect(ZIVO_BUSINESS_ORIGIN).toBe("https://zivobusiness.com");
    expect(ZIVO_BUSINESS_HOME_PATH).toBe("/");
    expect(ZIVO_BUSINESS_HOSTS.has("zivobusiness.com")).toBe(true);
    expect(ZIVO_BUSINESS_HOSTS.has("www.zivobusiness.com")).toBe(true);
  });

  it("allows the business landing, account, and shared identity surfaces", () => {
    expect(isZivoBusinessPath("/")).toBe(true);
    expect(isZivoBusinessPath("/business")).toBe(true);
    expect(isZivoBusinessPath("/business/new")).toBe(true);
    expect(isZivoBusinessPath("/business/dashboard")).toBe(true);
    expect(isZivoBusinessPath("/account")).toBe(true);
    expect(isZivoBusinessPath("/account/profile-edit")).toBe(true);
    expect(isZivoBusinessPath("/support")).toBe(true);
    expect(isZivoBusinessPath("/login")).toBe(true);
    expect(isZivoBusinessPath("/legal/privacy")).toBe(true);
    expect(isZivoBusinessPath("/assets/logo.png")).toBe(true);
    expect(isZivoBusinessPath("/favicon.ico")).toBe(true);
    expect(isZivoBusinessPath("/manifest.webmanifest")).toBe(true);
  });

  it("blocks the generic super-app feed and unrelated product routes", () => {
    expect(isZivoBusinessPath("/feed")).toBe(false);
    expect(isZivoBusinessPath("/flights")).toBe(false);
    expect(isZivoBusinessPath("/hotels")).toBe(false);
    expect(isZivoBusinessPath("/cars")).toBe(false);
    expect(isZivoBusinessPath("/bus")).toBe(false);
    expect(isZivoBusinessPath("/chat")).toBe(false);
    expect(isZivoBusinessPath("/driver")).toBe(false);
    expect(isZivoBusinessPath("/reels")).toBe(false);
    // boundary: a prefix match must respect path segment boundaries
    expect(isZivoBusinessPath("/businesses")).toBe(false);
  });
});
