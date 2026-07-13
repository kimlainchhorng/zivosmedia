// marketing-automations-tick — pg_cron-driven enrollment + step advancement engine.
// Guarded by CRON_SECRET (no JWT). Enrolls users matching trigger and advances enrollments.
import { createClient } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type Step = {
  type: "wait" | "send_push" | "send_email" | "send_sms" | "apply_promo" | "add_to_segment";
  config?: Record<string, any>;
};

Deno.serve(withSecurity("marketing-automations-tick", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const auth = req.headers.get("Authorization");
  const expected = `Bearer ${Deno.env.get("CRON_SECRET")}`;
  const headerSecret = req.headers.get("x-cron-secret");
  const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
  if (auth !== expected && (!cronSecret || headerSecret !== cronSecret)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const stats = {
    automations_processed: 0,
    enrollments_created: 0,
    steps_advanced: 0,
    completed: 0,
  };

  try {
    const { data: automations } = await admin
      .from("marketing_automations")
      .select("*")
      .eq("status", "active");

    for (const auto of (automations as any[]) || []) {
      stats.automations_processed++;
      const trigger = (auto.trigger_json as any) || {};
      const steps = (auto.steps_json as Step[]) || [];

      // ── Enroll new users matching trigger ──
      try {
        let candidateIds: string[] = [];
        if (trigger.type === "first_order") {
          const { data } = await admin
            .from("food_orders")
            .select("customer_id")
            .eq("restaurant_id", auto.store_id)
            .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .limit(500);
          candidateIds = ((data as any[]) || []).map((r) => r.customer_id).filter(Boolean);
        } else if (trigger.type === "cart_abandoned") {
          const minutes = Number(trigger.config?.minutes ?? 30);
          const { data } = await admin
            .from("abandoned_searches")
            .select("email")
            .lte("searched_at", new Date(Date.now() - minutes * 60 * 1000).toISOString())
            .eq("checkout_initiated", false)
            .limit(500);
          const emails = ((data as any[]) || [])
            .map((r) => String(r.email || "").trim().toLowerCase())
            .filter(Boolean);
          if (emails.length) {
            const { data: profiles } = await admin
              .from("profiles")
              .select("user_id")
              .in("email", emails)
              .limit(500);
            candidateIds = ((profiles as any[]) || []).map((r) => r.user_id).filter(Boolean);
          }
        }

        if (candidateIds.length) {
          const rows = candidateIds.map((uid) => ({
            automation_id: auto.id,
            user_id: uid,
            current_step: 0,
            next_run_at: new Date().toISOString(),
            status: "active",
          }));
          const { error, count } = await admin
            .from("marketing_automation_enrollments")
            .upsert(rows, { onConflict: "automation_id,user_id", ignoreDuplicates: true, count: "exact" });
          if (!error) stats.enrollments_created += count || 0;
        }
      } catch (e) {
        console.warn("[tick] enroll error:", (e as Error).message);
      }

      // ── Advance due enrollments ──
      const { data: due } = await admin
        .from("marketing_automation_enrollments")
        .select("*")
        .eq("automation_id", auto.id)
        .eq("status", "active")
        .lte("next_run_at", new Date().toISOString())
        .limit(200);

      for (const enroll of (due as any[]) || []) {
        const idx = enroll.current_step ?? 0;
        const step = steps[idx];

        if (!step) {
          // No more steps — complete
          await admin
            .from("marketing_automation_enrollments")
            .update({ status: "completed" })
            .eq("id", enroll.id);
          stats.completed++;
          continue;
        }

        let nextRun = new Date();
        try {
          if (step.type === "wait") {
            const hours = Number(step.config?.hours ?? 24);
            nextRun = new Date(Date.now() + hours * 60 * 60 * 1000);
          } else if (step.type === "send_push" || step.type === "send_email" || step.type === "send_sms") {
            const channel = step.type === "send_push"
              ? "push"
              : step.type === "send_email"
                ? "email"
                : "sms";
            await admin.functions.invoke("notify-dispatch", {
              body: {
                user_id: enroll.user_id,
                event_type: "marketing_automation",
                category: "marketing",
                title: step.config?.title || "Update",
                body: step.config?.body || "",
                channels: [channel],
                email: {
                  template: step.config?.template || "marketing-generic",
                  data: step.config || {},
                },
                sms: {
                  body: step.config?.sms_body || step.config?.body || "",
                },
                data: {
                  automation_id: auto.id,
                  category: "marketing",
                  notification_type: "marketing_automation",
                },
              },
            }).catch(() => {});
          } else if (step.type === "apply_promo") {
            const code = step.config?.code;
            if (code) {
              const { data: promo } = await admin
                .from("marketing_promo_codes")
                .select("id")
                .eq("store_id", auto.store_id)
                .eq("code", code)
                .maybeSingle();
              if (promo?.id) {
                await admin.from("marketing_promo_redemptions").upsert(
                  {
                    promo_code_id: promo.id,
                    user_id: enroll.user_id,
                    discount_cents: 0,
                    idempotency_key: `automation:${auto.id}:${enroll.user_id}:${promo.id}`,
                  },
                  { onConflict: "idempotency_key", ignoreDuplicates: true }
                );
              }
            }
          } else if (step.type === "add_to_segment") {
            const segId = step.config?.segment_id;
            if (segId) {
              await admin
                .from("marketing_segment_members" as any)
                .upsert(
                  { segment_id: segId, user_id: enroll.user_id, source: `automation:${auto.id}` },
                  { onConflict: "segment_id,user_id", ignoreDuplicates: true }
                );
              await admin.rpc("refresh_marketing_segment_count" as any, { p_segment_id: segId });
            }
          }
        } catch (e) {
          console.warn("[tick] step error:", (e as Error).message);
        }

        const newIdx = idx + 1;
        const isLast = newIdx >= steps.length;
        await admin
          .from("marketing_automation_enrollments")
          .update({
            current_step: newIdx,
            next_run_at: nextRun.toISOString(),
            status: isLast ? "completed" : "active",
          })
          .eq("id", enroll.id);
        stats.steps_advanced++;
        if (isLast) stats.completed++;
      }

      // Update automation counters
      const { count: enrolled } = await admin
        .from("marketing_automation_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("automation_id", auto.id);
      const { count: completed } = await admin
        .from("marketing_automation_enrollments")
        .select("id", { count: "exact", head: true })
        .eq("automation_id", auto.id)
        .eq("status", "completed");
      await admin
        .from("marketing_automations")
        .update({
          enrolled_count: enrolled || 0,
          completed_count: completed || 0,
          last_tick_at: new Date().toISOString(),
        })
        .eq("id", auto.id);
    }

    return new Response(JSON.stringify({ ok: true, ...stats }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[marketing-automations-tick] error:", e);
    return new Response(JSON.stringify({ error: (e as Error).message, ...stats }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80, skipBotDetection: true }));
