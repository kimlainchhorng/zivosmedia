import { describe, expect, it } from "vitest";

import { ZIVO_APPS, getCurrentZivoApp } from "./zivoApps";

describe("zivo apps registry", () => {
  it("lists the seven ZIVO network apps in order with https .com origins", () => {
    expect(ZIVO_APPS.map((a) => a.key)).toEqual([
      "media",
      "travel",
      "driver",
      "business",
      "employee",
      "software",
      "chat",
    ]);
    for (const app of ZIVO_APPS) {
      expect(app.origin).toMatch(/^https:\/\/[a-z]+\.com$/);
      expect(app.name.trim().length).toBeGreaterThan(0);
      expect(app.tagline.trim().length).toBeGreaterThan(0);
    }
  });

  it("maps each app key to its production origin", () => {
    const byKey = Object.fromEntries(ZIVO_APPS.map((a) => [a.key, a.origin]));
    expect(byKey.media).toBe("https://zivosmedia.com");
    expect(byKey.travel).toBe("https://zivostravel.com");
    expect(byKey.driver).toBe("https://zivodriver.com");
    expect(byKey.business).toBe("https://zivobusiness.com");
    expect(byKey.employee).toBe("https://zivoemployee.com");
    expect(byKey.software).toBe("https://zivosoftware.com");
    expect(byKey.chat).toBe("https://zivoschat.com");
  });

  it("detects the current app from the host (apex + www)", () => {
    expect(getCurrentZivoApp("zivosmedia.com")?.key).toBe("media");
    expect(getCurrentZivoApp("www.zivostravel.com")?.key).toBe("travel");
    expect(getCurrentZivoApp("zivodriver.com")?.key).toBe("driver");
    expect(getCurrentZivoApp("zivobusiness.com")?.key).toBe("business");
    expect(getCurrentZivoApp("www.zivoemployee.com")?.key).toBe("employee");
    expect(getCurrentZivoApp("zivosoftware.com")?.key).toBe("software");
    expect(getCurrentZivoApp("zivoschat.com")?.key).toBe("chat");
  });

  it("returns null for hosts outside the ZIVO network", () => {
    expect(getCurrentZivoApp("example.com")).toBeNull();
    expect(getCurrentZivoApp("localhost")).toBeNull();
    expect(getCurrentZivoApp("")).toBeNull();
  });
});
