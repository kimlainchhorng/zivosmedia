/**
 * payout-method-verification
 * --------------------------
 * MFA-gated finance review of one exact saved payout destination. The browser
 * cannot write verification fields directly; this function verifies the
 * authenticated reviewer role and calls the service-only, row-locking RPC.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

serve(
  withSecurity(
    "payout-method-verification",
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
        const methodId = String(body.method_id || "").trim();
        const decision = String(body.decision || "")
          .trim()
          .toLowerCase();
        const ownerStatusNote = String(body.owner_status_note || "").trim();
        const internalEvidence = String(body.internal_evidence || "").trim();
        if (
          !UUID_RE.test(methodId) ||
          !["verified", "rejected"].includes(decision) ||
          ownerStatusNote.length < 10 ||
          ownerStatusNote.length > 500 ||
          internalEvidence.length < 10 ||
          internalEvidence.length > 1000
        ) {
          return json({ error: "Invalid payout-method review" }, 400);
        }

        const result = await withIdempotency(
          req,
          "payout-method-verification",
          authData.user.id,
          async ({ key }) => {
            if (!key || !UUID_RE.test(key)) {
              return {
                status: 400,
                body: { error: "A UUID Idempotency-Key header is required" },
              };
            }
            const { data, error } = await admin.rpc(
              "review_customer_payout_method",
              {
                p_method_id: methodId,
                p_reviewer_id: authData.user.id,
                p_decision: decision,
                p_owner_status_note: ownerStatusNote,
                p_internal_evidence: internalEvidence,
              },
            );
            if (error) {
              console.error(
                "[payout-method-verification:review]",
                error.message,
              );
              return {
                status: 503,
                body: {
                  error: "Payout method review is temporarily unavailable",
                  retryable: true,
                },
              };
            }
            if (!data?.ok) {
              return {
                status: data?.code === "payout_method_not_found" ? 404 : 409,
                body: { error: data?.code || "Payout method review rejected" },
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
        console.error("[payout-method-verification]", error);
        return json(
          {
            error: "Payout method review is temporarily unavailable",
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
