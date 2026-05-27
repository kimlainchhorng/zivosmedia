/**
 * bakong-verify — Verifies a KHQR payment via the Bakong Open API.
 *
 * The client sends the KHQR string it generated for the payment.
 * We compute MD5 of the string, then ask Bakong API
 * `check_transaction_by_md5`. Bakong returns `SUCCESS` once a customer
 * has paid that exact KHQR.
 *
 * Required Supabase secret: `BAKONG_TOKEN` (JWT from api-bakong.nbc.gov.kh).
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const BAKONG_API = "https://api-bakong.nbc.gov.kh/v1";
const DEFAULT_STATIC_KHQR =
  "00020101021130510016abaakhppxxx@abaa01151260319063643400208ABA Bank5204421553031165802KH5915CHHORNG KIMLAIN6010PHNOM PENH624168370010PAYWAY@ABA0106941478020903218711963040E41";
const STATIC_MERCHANT_KHQR =
  Deno.env.get("KHQR_STATIC_MERCHANT_QR")?.trim() ||
  Deno.env.get("VITE_KHQR_STATIC_MERCHANT_QR")?.trim() ||
  DEFAULT_STATIC_KHQR;
const MERCHANT_FIELD_TAGS = ["29", "30", "31", "52", "58", "59", "60"];
const MAX_KHQR_AGE_SECONDS = 10 * 60;
const MAX_KHQR_FUTURE_SKEW_SECONDS = 30;

type TlvEntry = [tag: string, value: string];

async function md5Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("MD5", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function stripCrc(qr: string): string {
  return qr.replace(/6304[0-9A-Fa-f]{4}$/, "");
}

function parseTlvEntries(s: string): TlvEntry[] {
  const out: TlvEntry[] = [];
  let i = 0;
  while (i <= s.length - 4) {
    const tag = s.slice(i, i + 2);
    const len = Number(s.slice(i + 2, i + 4));
    if (!Number.isFinite(len)) break;
    const value = s.slice(i + 4, i + 4 + len);
    if (value.length !== len) break;
    out.push([tag, value]);
    i += 4 + len;
  }
  return out;
}

function parseTlv(s: string): Record<string, string> {
  return Object.fromEntries(parseTlvEntries(s));
}

function readQrReference(fields: Record<string, string>): string | null {
  const additionalData = fields["62"];
  if (!additionalData) return null;
  return parseTlv(additionalData)["01"] ?? null;
}

function validateReference(reference: string): string | null {
  if (!/^[A-Za-z0-9_-]{8,25}$/.test(reference)) {
    return "Invalid payment reference";
  }
  return null;
}

function validateSinceSec(sinceSec: number): string | null {
  if (!Number.isFinite(sinceSec) || sinceSec <= 0) {
    return "Payment timestamp is required";
  }
  const now = Math.floor(Date.now() / 1000);
  if (sinceSec > now + MAX_KHQR_FUTURE_SKEW_SECONDS) {
    return "Payment timestamp is in the future";
  }
  if (now - sinceSec > MAX_KHQR_AGE_SECONDS) {
    return "Payment QR has expired";
  }
  return null;
}

function validateKhqrPayload(qr: string, reference: string, amountKhr: number): string | null {
  if (!qr || typeof qr !== "string") return "Missing qr";
  const fields = parseTlv(stripCrc(qr));
  const merchantFields = parseTlv(stripCrc(STATIC_MERCHANT_KHQR));

  for (const tag of MERCHANT_FIELD_TAGS) {
    if (merchantFields[tag] && fields[tag] !== merchantFields[tag]) {
      return "KHQR merchant account does not match ZIVO merchant";
    }
  }

  if (fields["53"] !== "116") return "KHQR must use KHR currency";

  const qrAmount = Number(fields["54"]);
  if (!Number.isFinite(qrAmount) || Math.round(qrAmount) !== amountKhr) {
    return "KHQR amount does not match the ride total";
  }

  const qrReference = readQrReference(fields);
  if (!qrReference || qrReference !== reference) {
    return "KHQR reference does not match the ride reference";
  }

  return null;
}

Deno.serve(withSecurity("bakong-verify", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const token = Deno.env.get("BAKONG_TOKEN");
    if (!token) throw new Error("BAKONG_TOKEN not configured");

    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const qrString = typeof body.qr === "string" ? body.qr.trim() : "";
    const reference = typeof body.reference === "string" ? body.reference.trim() : "";
    const amountKhr = Math.round(Number(body.amount ?? body.amount_khr ?? 0));
    const sinceSec = Number(body.sinceSec ?? body.since_sec ?? 0);

    if (!qrString || typeof qrString !== "string") {
      return new Response(JSON.stringify({ error: "Missing qr" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const referenceError = validateReference(reference);
    if (referenceError) {
      return new Response(JSON.stringify({ error: referenceError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const sinceError = validateSinceSec(sinceSec);
    if (sinceError) {
      return new Response(JSON.stringify({ error: sinceError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!Number.isFinite(amountKhr) || amountKhr <= 0) {
      return new Response(JSON.stringify({ error: "Invalid amount" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const qrError = validateKhqrPayload(qrString, reference, amountKhr);
    if (qrError) {
      return new Response(JSON.stringify({ error: qrError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const md5 = await md5Hex(qrString);

    const resp = await fetch(`${BAKONG_API}/check_transaction_by_md5`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ md5 }),
    });

    const data = await resp.json().catch(() => ({}));

    // Bakong returns { responseCode: 0, responseMessage: "Success", data: {...} } when paid.
    const paid = data?.responseCode === 0;

    return new Response(
      JSON.stringify({
        ok: true,
        paid,
        md5,
        bakong: data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
}, { rateLimit: "payment", strictCors: true, trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));
