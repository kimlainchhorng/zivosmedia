/**
 * cafe-tip-payout-record
 * ----------------------
 * Records a cafe tip payout header and line items as one guarded server-side
 * operation. The client may compute the split UI, but the Edge Function
 * validates owner/admin access, barista/store ownership, and line totals before
 * writing immutable payout rows.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { enforceAal2 } from "../_shared/aalCheck.ts";
import { withIdempotency } from "../_shared/idempotency.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type TipSplitMode = "equal" | "by_hours" | "weighted";

interface TipPayoutLineInput {
  barista_id: string;
  display_name?: string;
  minutes_worked?: number;
  weight?: number;
  payout_cents?: number;
}

const allowedModes = new Set<TipSplitMode>(["equal", "by_hours", "weighted"]);

serve(withSecurity("cafe-tip-payout-record", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, ...extraHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "POST, OPTIONS" });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } },
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const mfaErr = enforceAal2(authHeader, corsHeaders);
    if (mfaErr) return mfaErr;

    const { data: userData, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !userData.user) throw new Error("Invalid auth");
    const userId = userData.user.id;

    // Read from a clone: the idempotency wrapper hashes the request with
    // `await req.clone().text()`, and cloning a Request whose body is already
    // consumed is a spec-mandated TypeError ("unusable"). Reading `req`
    // directly here threw before the payout was ever claimed, and the outer
    // catch reported it as a flat failure.
    const body = await req.clone().json().catch(() => ({}));
    const storeId = String(body.store_id || "").trim();
    const windowStart = String(body.window_start || "").trim();
    const windowEnd = String(body.window_end || "").trim();
    const mode = String(body.mode || "") as TipSplitMode;
    const totalCents = Math.round(Number(body.total_cents || 0));
    const notes = body.notes ? String(body.notes).trim().slice(0, 500) : null;
    const lines = Array.isArray(body.lines) ? body.lines as TipPayoutLineInput[] : [];

    if (!storeId || !windowStart || !windowEnd || !allowedModes.has(mode)) {
      return json({ error: "Missing required fields" }, 400);
    }
    if (totalCents <= 0 || totalCents > 1_000_000_00) {
      return json({ error: "Invalid total_cents" }, 400);
    }
    if (lines.length === 0 || lines.length > 100) {
      return json({ error: "Invalid payout lines" }, 400);
    }

    const result = await withIdempotency(req, "cafe-tip-payout-record", userId, async () => {
      await assertCanManageStore(supabase, userId, storeId);

      const baristaIds = Array.from(new Set(lines.map(line => String(line.barista_id || "").trim()).filter(Boolean)));
      if (baristaIds.length !== lines.length) {
        return { status: 400, body: { error: "Duplicate or missing barista lines" } };
      }

      const { data: baristas, error: baristasError } = await supabase
        .from("cafe_baristas")
        .select("id,display_name,store_id")
        .eq("store_id", storeId)
        .in("id", baristaIds);
      if (baristasError) throw baristasError;
      if ((baristas || []).length !== baristaIds.length) {
        return { status: 403, body: { error: "Payout line includes a barista outside this store" } };
      }

      const baristaNames = new Map<string, string>(
        (baristas || []).map((barista: any) => [barista.id, barista.display_name || "Barista"]),
      );
      const lineTotal = lines.reduce((sum, line) => sum + Math.round(Number(line.payout_cents || 0)), 0);
      if (lineTotal !== totalCents) {
        return {
          status: 400,
          body: { error: "Payout lines must add up to total_cents", line_total_cents: lineTotal },
        };
      }

      // Refuse a window that overlaps one already paid. The idempotency key is
      // not enough on its own: the caller derives it from
      // `new Date(Date.now() - windowDays * 86_400_000)`, which is a new value
      // on every press, so two clicks produce two different keys and nothing
      // dedupes them. cafe_tip_payouts has no uniqueness on
      // (store_id, window_start, window_end) either — verified against the
      // live schema, which carries only the pkey, the two FKs and two CHECKs.
      // So the same tips could be paid out twice, and the UI would still show
      // the full pool as payable afterwards.
      const { data: overlapping, error: overlapError } = await supabase
        .from("cafe_tip_payouts")
        .select("id, window_start, window_end, total_cents")
        .eq("store_id", storeId)
        .lt("window_start", windowEnd)
        .gt("window_end", windowStart)
        .limit(1);
      if (overlapError) {
        console.error("[cafe-tip-payout-record:overlap]", overlapError.message);
        return { status: 500, body: { error: "Could not verify existing payouts" } };
      }
      if (overlapping && overlapping.length > 0) {
        return {
          status: 409,
          body: {
            error: "Tips for this period have already been paid out.",
            code: "payout_window_overlaps",
            existing: overlapping[0],
          },
        };
      }

      const { data: payout, error: payoutError } = await supabase
        .from("cafe_tip_payouts")
        .insert({
          store_id: storeId,
          window_start: windowStart,
          window_end: windowEnd,
          mode,
          total_cents: totalCents,
          paid_by_user_id: userId,
          notes,
        })
        .select("id")
        .single();
      if (payoutError) throw payoutError;

      const payoutId = (payout as any).id;
      const lineRows = lines.map(line => ({
        payout_id: payoutId,
        barista_id: String(line.barista_id),
        display_name: String(line.display_name || baristaNames.get(String(line.barista_id)) || "Barista").slice(0, 120),
        minutes_worked: Math.max(0, Math.round(Number(line.minutes_worked || 0))),
        weight: Math.max(0, Number(line.weight || 0)),
        payout_cents: Math.max(0, Math.round(Number(line.payout_cents || 0))),
      }));

      const { error: linesError } = await supabase
        .from("cafe_tip_payout_lines")
        .insert(lineRows);
      if (linesError) {
        await supabase.from("cafe_tip_payouts").delete().eq("id", payoutId);
        throw linesError;
      }

      return { status: 200, body: { success: true, id: payoutId, line_count: lineRows.length } };
    });

    return json(result.body, result.status, {
      "X-Idempotency-Cache": result.cached ? "HIT" : "MISS",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Request failed";
    console.error("[cafe-tip-payout-record]", message);
    return json({ error: message }, 400);
  }
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "admin_action", trackNetwork: "suspicious", blockNetworkRiskAt: 85 }));

async function assertCanManageStore(supabase: any, userId: string, storeId: string) {
  const { data: isAdmin } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (isAdmin === true) return;

  const { data: store } = await supabase
    .from("store_profiles")
    .select("id,owner_id")
    .eq("id", storeId)
    .maybeSingle();
  if ((store as any)?.owner_id === userId) return;

  throw new Error("Not authorized for this store");
}
