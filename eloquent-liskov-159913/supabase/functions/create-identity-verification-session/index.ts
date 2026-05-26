/**
 * create-identity-verification-session
 * -------------------------------------
 * Creates a Stripe Identity Verification Session for the caller. Stripe Identity
 * runs the actual ID + selfie + liveness check on their hosted page and posts
 * back the result via webhook (identity.verification_session.* — handled in
 * stripe-webhook).
 *
 * Idempotent: if the user already has an in-progress kyc_submissions row with
 * a session id, returns that session's URL instead of creating a new one.
 */
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";
import Stripe from "../_shared/stripe.ts";

Deno.serve(withSecurity("create-identity-verification-session", async (req, ctx) => {
  const cors = ctx.corsHeaders;
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json", "Allow": "POST, OPTIONS" },
    });
  }

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: req.headers.get("authorization") ?? "" } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const role = String(body.role || "creator").slice(0, 32);
    const returnUrl = String(body.return_url || `${req.headers.get("origin") ?? ""}/creator/dashboard?kyc=done`);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const stripe = new (Stripe as any)(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Idempotency: reuse an in-progress session if we already created one for
    // this user.
    const { data: existing } = await admin
      .from("kyc_submissions")
      .select("id, stripe_verification_session_id, status")
      .eq("user_id", user.id)
      .eq("role", role)
      .in("status", ["pending", "requires_input"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.stripe_verification_session_id) {
      try {
        const session = await stripe.identity.verificationSessions.retrieve((existing as any).stripe_verification_session_id);
        if (session.status !== "canceled" && session.url) {
          return new Response(JSON.stringify({
            url: session.url,
            session_id: session.id,
            status: session.status,
            existing: true,
          }), { headers: { ...cors, "Content-Type": "application/json" } });
        }
      } catch (e) {
        console.warn("[create-identity-verification-session] couldn't reuse existing session", e);
      }
    }

    // Create a fresh Stripe Identity session.
    const session = await stripe.identity.verificationSessions.create({
      type: "document", // document + selfie. Use "id_number" for SSN-only.
      metadata: {
        user_id: user.id,
        role,
      },
      options: {
        document: {
          require_id_number: false,
          require_live_capture: true,
          require_matching_selfie: true,
        },
      },
      return_url: returnUrl,
    });

    // Upsert kyc_submissions row to track it.
    if (existing?.id) {
      await admin
        .from("kyc_submissions")
        .update({
          stripe_verification_session_id: session.id,
          stripe_verification_status: session.status,
          status: "pending",
          submitted_at: new Date().toISOString(),
        })
        .eq("id", (existing as any).id);
    } else {
      await admin.from("kyc_submissions").insert({
        user_id: user.id,
        role,
        status: "pending",
        stripe_verification_session_id: session.id,
        stripe_verification_status: session.status,
        submitted_at: new Date().toISOString(),
      } as any);
    }

    return new Response(JSON.stringify({
      url: session.url,
      session_id: session.id,
      status: session.status,
      existing: false,
    }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[create-identity-verification-session]", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));
