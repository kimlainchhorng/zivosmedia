/**
 * eats-payout-admin
 * -----------------
 * MFA-gated finance processing for reserved manual Eats payout requests.
 * External transfers remain manual; this endpoint only records a row-locked,
 * audited processing, paid, or rejected decision with durable evidence.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(
  withSecurity(
    "eats-payout-admin",
    async (req, ctx) => {
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: {
            ...ctx.corsHeaders,
            "Content-Type": "application/json",
          },
        });

      if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }
      const authorization = req.headers.get("Authorization") ?? "";
      if (!authorization.startsWith("Bearer ")) {
        return json({ error: "Unauthorized" }, 401);
      }
      const mfaError = enforceAal2(authorization, ctx.corsHeaders);
      if (mfaError) return mfaError;

      try {
        const admin = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } },
        );
        const { data: authData, error: authError } = await admin.auth.getUser(
          authorization.replace(/^Bearer\s+/i, ""),
        );
        if (authError || !authData.user) {
          return json({ error: "Unauthorized" }, 401);
        }
        if (!(await isFinanceReviewer(admin, authData.user.id))) {
          return json({ error: "Finance reviewer role required" }, 403);
        }

        const body = await req
          .clone()
          .json()
          .catch(() => ({}));
        const requestId = String(body.request_id || "").trim();
        const decision = String(body.decision || "")
          .trim()
          .toLowerCase();
        const reference = String(body.reference || "").trim();
        const note = String(body.note || "").trim();
        if (
          !UUID_RE.test(requestId) ||
          !["processing", "paid", "rejected", "released"].includes(decision) ||
          note.length < 10 ||
          note.length > 1000 ||
          (decision === "paid" &&
            (reference.length < 4 || reference.length > 160))
        ) {
          return json({ error: "Invalid payout decision" }, 400);
        }

        const result = await withIdempotency(
          req,
          "eats-payout-admin",
          authData.user.id,
          async ({ key }) => {
            if (!key || !UUID_RE.test(key)) {
              return {
                status: 400,
                body: { error: "A UUID Idempotency-Key header is required" },
              };
            }
            const { data, error } = await admin.rpc(
              "resolve_eats_manual_payout",
              {
                p_request_id: requestId,
                p_reviewer_id: authData.user.id,
                p_decision: decision,
                p_reference: reference || null,
                p_note: note,
              },
            );
            if (error) {
              console.error("[eats-payout-admin:resolve]", error.message);
              return {
                status: 503,
                body: {
                  error: "Payout decision status is temporarily unavailable",
                  retryable: true,
                },
              };
            }
            if (!data?.ok) {
              return {
                status: data?.code === "payout_request_not_found" ? 404 : 409,
                body: { error: data?.code || "Payout decision rejected" },
              };
            }
            return { status: 200, body: data };
          },
          { required: true },
        );

        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: {
            ...ctx.corsHeaders,
            "Content-Type": "application/json",
            "X-Idempotency-Cache": result.cached ? "HIT" : "MISS",
          },
        });
      } catch (error) {
        console.error("[eats-payout-admin]", error);
        return json(
          {
            error: "Payout decision status is temporarily unavailable",
            retryable: true,
          },
          503,
        );
      }
    },
    {
      strictCors: true,
      allowedMethods: ["POST"],
      rateLimit: "admin_action",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);

async function isFinanceReviewer(admin: any, userId: string): Promise<boolean> {
  const checks = await Promise.all(
    ["admin", "super_admin", "finance"].map((role) =>
      admin.rpc("check_user_role", { _user_id: userId, _role: role }),
    ),
  );
  if (checks.some(({ error }) => error)) {
    throw new Error("Finance role verification failed");
  }
  return checks.some(({ data }) => data === true);
}
