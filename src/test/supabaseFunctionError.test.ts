import { describe, expect, it } from "vitest";
import { getSupabaseFunctionErrorDetails } from "@/lib/supabaseFunctionError";

describe("supabase function error details", () => {
  it("reads JSON response context from FunctionsHttpError", async () => {
    const error = new Error("Edge Function returned a non-2xx status code") as Error & {
      context: Response;
    };
    error.context = new Response(
      JSON.stringify({
        error: "A verification code was sent recently. Please wait before requesting another.",
        code: "OTP_RESEND_COOLDOWN",
        retryAfter: 17,
      }),
      { status: 429 },
    );

    await expect(getSupabaseFunctionErrorDetails(error)).resolves.toEqual({
      code: "OTP_RESEND_COOLDOWN",
      message: "A verification code was sent recently. Please wait before requesting another.",
      retryAfter: 17,
    });
  });

  it("falls back to the thrown error message when the context body is missing", async () => {
    await expect(getSupabaseFunctionErrorDetails(new Error("Network failed"))).resolves.toEqual({
      code: undefined,
      message: "Network failed",
      retryAfter: undefined,
    });
  });
});
