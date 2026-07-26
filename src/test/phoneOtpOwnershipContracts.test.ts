import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();

const source = (relativePath: string) =>
  readFileSync(path.join(root, relativePath), "utf8").replace(/\r\n/g, "\n");

describe("phone OTP ownership and consent contracts", () => {
  it("binds sending a verification code to the authenticated account before Twilio is called", () => {
    const sendOtp = source("supabase/functions/send-otp-sms/index.ts");

    expect(sendOtp).toContain('import { requireUser } from "../_shared/auth.ts";');
    expect(sendOtp).toContain("const { userId } = await requireUser(req);");
    expect(sendOtp).toContain("if (userId !== requestedUserId)");
    expect(sendOtp).toContain("You can only request a phone verification code for your own account");
    expect(sendOtp).toContain("user_id: userId,");
    expect(sendOtp.indexOf("if (userId !== requestedUserId)")).toBeLessThan(
      sendOtp.indexOf("https://verify.twilio.com/v2/Services/"),
    );
  });

  it("binds verification completion to the authenticated account without creating ongoing SMS consent", () => {
    const verifyOtp = source("supabase/functions/verify-otp-sms/index.ts");

    expect(verifyOtp).toContain('import { requireUser } from "../_shared/auth.ts";');
    expect(verifyOtp).toContain("const { userId } = await requireUser(req);");
    expect(verifyOtp).toContain("if (userId !== requestedUserId)");
    expect(verifyOtp).toContain("You can only verify a phone number for your own account");
    expect(verifyOtp).toContain('.eq("user_id", userId)');
    expect(verifyOtp).toContain("user_id: userId,");
    expect(verifyOtp.indexOf("if (userId !== requestedUserId)")).toBeLessThan(
      verifyOtp.indexOf("https://verify.twilio.com/v2/Services/"),
    );
    expect(verifyOtp).toContain("sms_enabled: false");
    expect(verifyOtp).not.toContain("sms_enabled: true");
    expect(verifyOtp).not.toContain("sms_consent: true");
    expect(verifyOtp).toContain(".maybeSingle()");
    expect(verifyOtp).toContain('from("notification_preferences").insert');
    expect(verifyOtp).not.toContain('from("notification_preferences").upsert');
  });
});
