import { describe, expect, it } from "vitest";

import {
  ZIVO_DRIVER_APP_PATH,
  ZIVO_DRIVER_HOME_PATH,
  ZIVO_DRIVER_ORIGIN,
  ZIVO_DRIVER_SUPABASE_PROJECT_ID,
  ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY,
  ZIVO_DRIVER_SUPABASE_URL,
  getZivoDriverUrl,
  isZivoDriverHost,
  isZivoDriverPath,
} from "./zivoDriverDomain";

describe("zivo driver domain config", () => {
  it("recognizes apex and www zivodriver hosts only", () => {
    expect(isZivoDriverHost("zivodriver.com")).toBe(true);
    expect(isZivoDriverHost("www.zivodriver.com")).toBe(true);
    expect(isZivoDriverHost("ZIVODRIVER.COM")).toBe(true);
    expect(isZivoDriverHost("zivosmedia.com")).toBe(false);
    expect(isZivoDriverHost("zivostravel.com")).toBe(false);
    expect(isZivoDriverHost("zivosoftware.com")).toBe(false);
    expect(isZivoDriverHost("preview.zivodriver.com")).toBe(false);
  });

  it("uses zivodriver.com as the driver origin", () => {
    expect(ZIVO_DRIVER_ORIGIN).toBe("https://zivodriver.com");
    expect(ZIVO_DRIVER_HOME_PATH).toBe("/");
    expect(ZIVO_DRIVER_APP_PATH).toBe("/driver");
    expect(getZivoDriverUrl("/driver", "?mode=online", "#status")).toBe(
      "https://zivodriver.com/driver?mode=online#status",
    );
  });

  it("allows driver routes and blocks unrelated product routes", () => {
    expect(isZivoDriverPath("/")).toBe(true);
    expect(isZivoDriverPath("/driver")).toBe(true);
    expect(isZivoDriverPath("/drivers/onboarding")).toBe(true);
    expect(isZivoDriverPath("/rides/history")).toBe(true);
    expect(isZivoDriverPath("/earnings")).toBe(true);
    expect(isZivoDriverPath("/verify-otp")).toBe(true);
    expect(isZivoDriverPath("/business")).toBe(false);
    expect(isZivoDriverPath("/flights")).toBe(false);
    expect(isZivoDriverPath("/chat")).toBe(false);
  });

  it("keeps the driver backend key env-only until configured", () => {
    expect(ZIVO_DRIVER_SUPABASE_PROJECT_ID).toBe("yiedlgoxwjmansszdypf");
    expect(ZIVO_DRIVER_SUPABASE_URL).toBe("https://yiedlgoxwjmansszdypf.supabase.co");
    expect(ZIVO_DRIVER_SUPABASE_PUBLISHABLE_KEY).toBe("");
  });
});
