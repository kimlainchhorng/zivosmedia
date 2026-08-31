/**
 * car-dealership-test-drive-submit
 * --------------------------------
 * Public, rate-limited dealership inquiry and test-drive intake. The browser
 * supplies contact intent only; the database derives every CRM relationship
 * and writes the lead/test drive atomically behind a service-only RPC.
 */
import { serve } from "../_shared/deps.ts";
import {
  cleanCarDealershipCapability,
  cleanCarDealershipUuid,
  createCarDealershipServiceClient,
  resolveCarDealershipUserId,
} from "../_shared/carDealershipCustomerAccess.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

type Body = {
  mode?: unknown;
  store_id?: unknown;
  vehicle_id?: unknown;
  scheduled_at?: unknown;
  customer_name?: unknown;
  customer_email?: unknown;
  customer_phone?: unknown;
  notes?: unknown;
  desired_make?: unknown;
  budget_max_cents?: unknown;
  trade_in_interested?: unknown;
  financing_needed?: unknown;
  request_id?: unknown;
};

serve(
  withSecurity(
    "car-dealership-test-drive-submit",
    async (req, ctx) => {
      const json = (body: unknown, status = 200) =>
        new Response(JSON.stringify(body), {
          status,
          headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
        });

      if (req.method !== "POST") {
        return json({ error: "Method not allowed" }, 405);
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (!supabaseUrl || !anonKey || !serviceKey) {
        return json(
          { error: "Dealership requests are temporarily unavailable" },
          503,
        );
      }

      const body = (await req.json().catch(() => ({}))) as Body;
      const mode =
        body.mode === "info" || body.mode === "test_drive" ? body.mode : null;
      const storeId = cleanCarDealershipUuid(body.store_id);
      const vehicleId = cleanCarDealershipUuid(body.vehicle_id);
      const requestId = cleanCarDealershipUuid(body.request_id);
      const customerName = cleanText(body.customer_name, 1, 160);
      const customerEmail = cleanEmail(body.customer_email);
      const customerPhone = cleanText(body.customer_phone, 0, 64);
      const notes = cleanText(body.notes, 0, 1000);
      const desiredMake = cleanText(body.desired_make, 0, 160);
      const budgetMaxCents = cleanMoneyCents(body.budget_max_cents);
      const tradeInInterested = body.trade_in_interested === true;
      const financingNeeded = body.financing_needed === true;

      const suppliedEmail =
        typeof body.customer_email === "string"
          ? body.customer_email.trim()
          : "";

      if (
        !mode ||
        !storeId ||
        !requestId ||
        !customerName ||
        (mode === "test_drive" && !vehicleId)
      ) {
        return json({ error: "Invalid dealership request" }, 400);
      }
      if (
        body.budget_max_cents !== null &&
        body.budget_max_cents !== undefined &&
        budgetMaxCents === null
      ) {
        return json({ error: "Maximum budget is invalid" }, 400);
      }
      if (suppliedEmail && !customerEmail) {
        return json({ error: "A valid email address is required" }, 400);
      }
      if (!customerEmail && !customerPhone) {
        return json({ error: "Email or phone is required" }, 400);
      }

      let scheduledAt: string | null = null;
      if (mode === "test_drive") {
        scheduledAt = cleanIsoDate(body.scheduled_at);
        if (!scheduledAt) {
          return json({ error: "A valid test-drive time is required" }, 400);
        }
      }

      const admin = createCarDealershipServiceClient(supabaseUrl, serviceKey);
      const userId = await resolveCarDealershipUserId(
        req,
        supabaseUrl,
        anonKey,
      );
      const { data, error } = await admin.rpc(
        "car_dealership_customer_submit_interest",
        {
          p_store_id: storeId,
          p_vehicle_id: vehicleId,
          p_mode: mode,
          p_scheduled_at: scheduledAt,
          p_customer_name: customerName,
          p_customer_email: customerEmail,
          p_customer_phone: customerPhone,
          p_notes: notes,
          p_desired_make: desiredMake,
          p_budget_max_cents: budgetMaxCents,
          p_trade_in_interested: tradeInInterested,
          p_financing_needed: financingNeeded,
          p_user_id: userId,
          p_request_id: requestId,
        },
      );

      if (error) {
        if (error.code === "22023" || error.code === "23514") {
          return json({ error: "Request details are invalid" }, 400);
        }
        if (error.code === "P0002") {
          return json({ error: "Vehicle is not available" }, 404);
        }
        if (error.code === "23P01" || error.code === "40001") {
          return json(
            { error: "That test-drive time is no longer available" },
            409,
          );
        }
        console.error("[car-dealership-test-drive-submit:rpc]", error.message);
        return json({ error: "Could not save dealership request" }, 500);
      }

      const row = firstRow(data);
      const leadId = cleanCarDealershipUuid(row?.lead_id);
      const testDriveId = cleanCarDealershipUuid(row?.test_drive_id);
      const accessToken = cleanCarDealershipCapability(row?.access_token);
      const testDriveScheduled = row?.test_drive_scheduled === true;
      const alreadyProcessed = row?.already_processed === true;
      const accountOwned = row?.account_owned === true;

      if (!leadId) {
        console.error(
          "[car-dealership-test-drive-submit:shape] missing lead id",
        );
        return json({ error: "Could not confirm dealership request" }, 500);
      }
      if (testDriveScheduled && !testDriveId) {
        console.error(
          "[car-dealership-test-drive-submit:shape] missing test drive id",
        );
        return json({ error: "Could not confirm test drive" }, 500);
      }
      if (
        testDriveScheduled &&
        !accountOwned &&
        !alreadyProcessed &&
        !accessToken
      ) {
        console.error(
          "[car-dealership-test-drive-submit:shape] missing guest capability",
        );
        return json(
          { error: "Could not create secure test-drive access" },
          500,
        );
      }

      return json({
        ok: true,
        data: {
          test_drive_id: testDriveId,
          test_drive_scheduled: testDriveScheduled,
          already_processed: alreadyProcessed,
          account_owned: accountOwned,
          access_token: accessToken,
          access_expires_at:
            typeof row?.access_expires_at === "string"
              ? row.access_expires_at
              : null,
        },
      });
    },
    {
      strictCors: true,
      allowedMethods: ["POST"],
      rateLimit: "api_general",
      trackNetwork: "suspicious",
      blockNetworkRiskAt: 80,
    },
  ),
);

function firstRow(data: unknown): Record<string, unknown> | null {
  const value = Array.isArray(data) ? data[0] : data;
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(
  value: unknown,
  minLength: number,
  maxLength: number,
): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return minLength === 0 ? null : null;
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanEmail(value: unknown): string | null {
  const email = cleanText(value, 0, 320)?.toLowerCase() ?? null;
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function cleanIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function cleanMoneyCents(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= 2147483647
    ? amount
    : null;
}
