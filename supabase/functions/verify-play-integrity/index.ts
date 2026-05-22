import { withSecurity } from "../_shared/withSecurity.ts";

const PACKAGE_NAME = "com.myzivo.app";

Deno.serve(withSecurity("verify-play-integrity", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const { token, nonce } = await req.json();

    if (!token || !nonce || String(token).length > 8192 || String(nonce).length > 256) {
      return new Response(JSON.stringify({ error: "token and nonce are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("GOOGLE_PLAY_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch(
      `https://playintegrity.googleapis.com/v1/${PACKAGE_NAME}:decodeIntegrityToken?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ integrity_token: token }),
      }
    );

    const verdict = await verifyRes.json();
    const tokenPayload = verdict.tokenPayloadExternal;

    if (!tokenPayload) {
      return new Response(JSON.stringify({ passed: false, error: "Invalid token" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const appVerdict = tokenPayload.appIntegrity?.appRecognitionVerdict;
    const deviceVerdict = tokenPayload.deviceIntegrity?.deviceRecognitionVerdict ?? [];
    const returnedNonce = tokenPayload.requestDetails?.nonce;

    const passed =
      returnedNonce === nonce &&
      appVerdict === "PLAY_RECOGNIZED" &&
      (deviceVerdict.includes("MEETS_DEVICE_INTEGRITY") ||
        deviceVerdict.includes("MEETS_STRONG_INTEGRITY"));

    return new Response(JSON.stringify({ passed, appVerdict, deviceVerdict }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { rateLimit: "api_general", strictCors: true, trackNetwork: "suspicious" }));
