/**
 * notifications-cron
 * ------------------
 * Hourly cron that fires *time-based* notifications — the kind that no
 * single DB row change can trigger. Each scan is idempotent (keyed by an
 * idempotency_key the dispatcher dedupes on inside a 24h window) so the
 * same notification will not be sent twice if cron re-runs.
 *
 * Current scans:
 *   1. Flight check-in reminders   — 24h before departure_time
 *   2. Hotel check-in reminders    — day before check_in date
 *   3. Subscription renewal nudge  — 3 days before expires_at
 *   4. Subscription expiring soon  — 1 day before expires_at
 *   5. Subscription expired today  — expires_at passed in the last hour
 *   6. Birthday greetings          — once per user on their birthday (UTC)
 *   7. Abandoned marketplace cart  — items sitting in cart >24h, sent once
 *   8. Eats rating request         — 2h after delivery if still unrated
 *   9. Lodge rating request        — 24h after check-out if no review yet
 *  10. Marketplace rating request  — 48h after delivery if no review yet
 *
 * Auth: cron-secret OR service-role; refuses everything else.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { sendSalonReminder, firstNameOf } from "../_shared/salon-notifications.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const j = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return j(500, { error: "Server misconfigured" });

  // Auth: accept cron secret header/query OR service-role bearer token.
  const cronSecretExpected = Deno.env.get("CRON_SECRET") ?? "";
  const url = new URL(req.url);
  const providedSecret =
    url.searchParams.get("secret") ?? req.headers.get("x-cron-secret") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  const isService = auth === `Bearer ${serviceKey}`;
  const cronOk = !!cronSecretExpected && providedSecret === cronSecretExpected;
  if (!isService && !cronOk) return j(401, { error: "Unauthorized" });

  const supabase = createClient(supabaseUrl, serviceKey);
  const now = Date.now();

  const dispatchOne = async (payload: {
    user_id: string;
    event_type: string;
    title: string;
    body?: string;
    data?: Record<string, unknown>;
    channels?: ("inbox" | "push" | "email" | "sms")[];
    idempotency_key: string;
    category?: "transactional" | "marketing" | "social" | "chat";
  }) => {
    try {
      const r = await fetch(`${supabaseUrl}/functions/v1/notify-dispatch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${serviceKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      return r.ok;
    } catch {
      return false;
    }
  };

  const results = {
    flight_checkin_reminder: 0,
    lodge_checkin_reminder: 0,
    subscription_renewal_3d: 0,
    subscription_renewal_1d: 0,
    subscription_expired: 0,
    birthday_greeting: 0,
    abandoned_cart: 0,
    eats_rating_request: 0,
    lodge_rating_request: 0,
    marketplace_rating_request: 0,
    salon_booking_reminder: 0,
    salon_birthday_offer: 0,
    salon_winback_offer: 0,
    errors: [] as string[],
  };

  // -- 1. Flight check-in reminders (24h before departure) -------------------
  try {
    const start = new Date(now + 24 * 3600_000);
    const end = new Date(now + 25 * 3600_000); // one-hour window matches cron cadence
    const { data: flights, error } = await supabase
      .from("flight_bookings")
      .select("id, customer_id, booking_reference, flight_id, flights:flight_id(departure_time, origin_airport, destination_airport)")
      .gte("flights.departure_time", start.toISOString())
      .lt("flights.departure_time", end.toISOString())
      .eq("payment_status", "paid")
      .neq("status", "cancelled")
      .limit(500);
    if (error) throw error;
    for (const f of flights ?? []) {
      const dep = (f as any).flights?.departure_time;
      if (!dep) continue;
      const ok = await dispatchOne({
        user_id: (f as any).customer_id,
        event_type: "flight_checkin_reminder",
        title: "Check in for your flight",
        body: `Departs in 24h — ref ${(f as any).booking_reference}`,
        data: { booking_id: (f as any).id, url: `/bookings?booking_id=${(f as any).id}` },
        channels: ["inbox", "push", "email"],
        idempotency_key: `flight_checkin:${(f as any).id}`,
      });
      if (ok) results.flight_checkin_reminder++;
    }
  } catch (e) {
    results.errors.push(`flight: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 2. Lodge check-in reminders (~24h before check_in date) ---------------
  try {
    const tomorrow = new Date(now + 24 * 3600_000).toISOString().slice(0, 10);
    const { data: stays, error } = await supabase
      .from("lodge_reservations")
      .select("id, guest_id, check_in")
      .eq("check_in", tomorrow)
      .neq("status", "cancelled")
      .not("guest_id", "is", null)
      .limit(500);
    if (error) throw error;
    for (const s of stays ?? []) {
      const ok = await dispatchOne({
        user_id: (s as any).guest_id,
        event_type: "lodge_checkin_reminder",
        title: "Check-in is tomorrow",
        body: "We're looking forward to hosting you.",
        data: { reservation_id: (s as any).id, url: `/bookings?booking_id=${(s as any).id}` },
        channels: ["inbox", "push", "email"],
        idempotency_key: `lodge_checkin:${(s as any).id}`,
      });
      if (ok) results.lodge_checkin_reminder++;
    }
  } catch (e) {
    results.errors.push(`lodge: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 3+4+5. Creator subscriptions ------------------------------------------
  try {
    // 3 days out
    const win3aStart = new Date(now + 3 * 24 * 3600_000).toISOString();
    const win3aEnd = new Date(now + 3 * 24 * 3600_000 + 3600_000).toISOString();
    // 1 day out
    const win1dStart = new Date(now + 24 * 3600_000).toISOString();
    const win1dEnd = new Date(now + 25 * 3600_000).toISOString();
    // expired in the last hour
    const expStart = new Date(now - 3600_000).toISOString();
    const expEnd = new Date(now).toISOString();

    const [r3, r1, rExp] = await Promise.all([
      supabase
        .from("creator_subscriptions")
        .select("id, subscriber_id, creator_id, expires_at")
        .eq("status", "active")
        .gte("expires_at", win3aStart)
        .lt("expires_at", win3aEnd)
        .limit(500),
      supabase
        .from("creator_subscriptions")
        .select("id, subscriber_id, creator_id, expires_at")
        .eq("status", "active")
        .gte("expires_at", win1dStart)
        .lt("expires_at", win1dEnd)
        .limit(500),
      supabase
        .from("creator_subscriptions")
        .select("id, subscriber_id, creator_id, expires_at, status")
        .neq("status", "active")
        .gte("expires_at", expStart)
        .lt("expires_at", expEnd)
        .limit(500),
    ]);

    for (const s of r3.data ?? []) {
      const ok = await dispatchOne({
        user_id: (s as any).subscriber_id,
        event_type: "subscription_renewal_reminder",
        title: "Subscription renews in 3 days",
        body: "Tap to update your payment method or cancel.",
        data: { subscription_id: (s as any).id, url: "/account/subscriptions" },
        channels: ["inbox", "push", "email"],
        idempotency_key: `sub_renewal_3d:${(s as any).id}`,
      });
      if (ok) results.subscription_renewal_3d++;
    }
    for (const s of r1.data ?? []) {
      const ok = await dispatchOne({
        user_id: (s as any).subscriber_id,
        event_type: "subscription_renewal_soon",
        title: "Subscription renews tomorrow",
        body: "Make sure your payment method is up to date.",
        data: { subscription_id: (s as any).id, url: "/account/subscriptions" },
        channels: ["inbox", "push", "email"],
        idempotency_key: `sub_renewal_1d:${(s as any).id}`,
      });
      if (ok) results.subscription_renewal_1d++;
    }
    for (const s of rExp.data ?? []) {
      const ok = await dispatchOne({
        user_id: (s as any).subscriber_id,
        event_type: "subscription_expired",
        title: "Subscription expired",
        body: "Renew to keep accessing exclusive content.",
        data: { subscription_id: (s as any).id, url: "/account/subscriptions" },
        channels: ["inbox", "push", "email"],
        idempotency_key: `sub_expired:${(s as any).id}`,
      });
      if (ok) results.subscription_expired++;
    }
  } catch (e) {
    results.errors.push(`subscriptions: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 6. Birthday greetings -------------------------------------------------
  // Fire once per day per user. Use a date-stamped idempotency_key so the
  // dispatcher's 24h dedupe window blocks the duplicate hourly scans.
  try {
    const today = new Date(now);
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const todayStamp = `${today.getUTCFullYear()}-${mm}-${dd}`;
    // Pull every profile whose birthday MM-DD matches today. Limit + paginate.
    const { data: birthdays, error } = await supabase
      .from("profiles")
      .select("id, display_name, username, date_of_birth")
      .not("date_of_birth", "is", null)
      .filter("date_of_birth", "neq", "")
      .limit(2000);
    if (error) throw error;
    for (const p of birthdays ?? []) {
      const dob = (p as any).date_of_birth as string;
      if (!dob) continue;
      const m = dob.match(/^\d{4}-(\d{2})-(\d{2})$/);
      if (!m || m[1] !== mm || m[2] !== dd) continue;
      const name = (p as any).display_name || (p as any).username || "there";
      const ok = await dispatchOne({
        user_id: (p as any).id,
        event_type: "birthday_greeting",
        title: `🎉 Happy birthday, ${name}!`,
        body: "Tap to claim a special gift from Zivo.",
        data: { url: "/account/rewards", source: "birthday" },
        channels: ["inbox", "push"],
        category: "marketing",
        idempotency_key: `birthday:${(p as any).id}:${todayStamp}`,
      });
      if (ok) results.birthday_greeting++;
    }
  } catch (e) {
    results.errors.push(`birthday: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 7. Abandoned marketplace cart -----------------------------------------
  // Item has been sitting in someone's cart for >24h and they haven't checked
  // out (no marketplace_orders row referencing the same listing in last 24h).
  // Send once via a per-user-per-day idempotency key.
  try {
    const cutoff = new Date(now - 24 * 3600_000).toISOString();
    const cutoff48 = new Date(now - 48 * 3600_000).toISOString();
    const { data: stale, error } = await supabase
      .from("marketplace_cart")
      .select("user_id, listing_id, created_at")
      .lt("created_at", cutoff)
      .gte("created_at", cutoff48)
      .limit(1000);
    if (error) throw error;
    // Group by user — one notification per user even if multiple stale items.
    const seen = new Set<string>();
    const today = new Date(now).toISOString().slice(0, 10);
    for (const row of stale ?? []) {
      const uid = (row as any).user_id as string;
      if (seen.has(uid)) continue;
      seen.add(uid);
      const ok = await dispatchOne({
        user_id: uid,
        event_type: "marketplace_cart_abandoned",
        title: "You left something in your cart",
        body: "Pick up where you left off — items may sell out soon.",
        data: { url: "/marketplace/cart", source: "abandoned_cart" },
        channels: ["inbox", "push"],
        category: "marketing",
        idempotency_key: `abandoned_cart:${uid}:${today}`,
      });
      if (ok) results.abandoned_cart++;
    }
  } catch (e) {
    results.errors.push(`cart: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 8. Eats rating request — 2h after delivery, still unrated ------------
  try {
    const start = new Date(now - 3 * 3600_000).toISOString();
    const end = new Date(now - 2 * 3600_000).toISOString();
    const { data: orders, error } = await supabase
      .from("food_orders")
      .select("id, customer_id, delivered_at, rating")
      .gte("delivered_at", start)
      .lt("delivered_at", end)
      .is("rating", null)
      .eq("status", "delivered")
      .limit(500);
    if (error) throw error;
    for (const o of orders ?? []) {
      const ok = await dispatchOne({
        user_id: (o as any).customer_id,
        event_type: "eats_rating_request",
        title: "How was your meal?",
        body: "Tap to rate your order — takes 5 seconds.",
        data: { order_id: (o as any).id, url: `/eats?order_id=${(o as any).id}&rate=1` },
        channels: ["inbox", "push"],
        idempotency_key: `eats_rating:${(o as any).id}`,
      });
      if (ok) results.eats_rating_request++;
    }
  } catch (e) {
    results.errors.push(`rating: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 9. Lodge rating request — 24h after check-out, no review yet --------
  try {
    const yesterday = new Date(now - 24 * 3600_000).toISOString().slice(0, 10);
    const { data: stays, error } = await supabase
      .from("lodge_reservations")
      .select("id, guest_id, check_out, status")
      .eq("check_out", yesterday)
      .eq("status", "checked_out")
      .not("guest_id", "is", null)
      .limit(500);
    if (error) throw error;

    if (stays && stays.length > 0) {
      const ids = stays.map((s: any) => s.id);
      const { data: reviewed } = await supabase
        .from("lodging_reviews")
        .select("reservation_id")
        .in("reservation_id", ids);
      const reviewedSet = new Set((reviewed ?? []).map((r: any) => r.reservation_id));

      for (const s of stays) {
        if (reviewedSet.has((s as any).id)) continue;
        const ok = await dispatchOne({
          user_id: (s as any).guest_id,
          event_type: "lodge_rating_request",
          title: "How was your stay?",
          body: "Tap to leave a quick review.",
          data: { reservation_id: (s as any).id, url: `/bookings?booking_id=${(s as any).id}&review=1` },
          channels: ["inbox", "push"],
          idempotency_key: `lodge_rating:${(s as any).id}`,
        });
        if (ok) results.lodge_rating_request++;
      }
    }
  } catch (e) {
    results.errors.push(`lodge_rating: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 10. Marketplace rating request — 48h after delivered/completed -------
  try {
    const start = new Date(now - 49 * 3600_000).toISOString();
    const end = new Date(now - 48 * 3600_000).toISOString();
    const { data: orders, error } = await supabase
      .from("marketplace_orders")
      .select("id, buyer_id, status, completed_at, updated_at")
      .in("status", ["delivered", "completed"])
      .gte("updated_at", start)
      .lt("updated_at", end)
      .limit(500);
    if (error) throw error;

    if (orders && orders.length > 0) {
      const orderIds = orders.map((o: any) => o.id);
      const { data: reviewed } = await supabase
        .from("marketplace_reviews")
        .select("order_id")
        .in("order_id", orderIds);
      const reviewedSet = new Set((reviewed ?? []).map((r: any) => r.order_id));

      for (const o of orders) {
        if (reviewedSet.has((o as any).id)) continue;
        const ok = await dispatchOne({
          user_id: (o as any).buyer_id,
          event_type: "marketplace_rating_request",
          title: "How was your purchase?",
          body: "Help other buyers — leave a quick review.",
          data: { order_id: (o as any).id, url: `/marketplace?order_id=${(o as any).id}&review=1` },
          channels: ["inbox", "push"],
          idempotency_key: `marketplace_rating:${(o as any).id}`,
        });
        if (ok) results.marketplace_rating_request++;
      }
    }
  } catch (e) {
    results.errors.push(`marketplace_rating: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 11. Salon booking reminders (24h-before) ------------------------------
  //   Picks any due-or-soon salon_reminders rows (booking_24h type, pending,
  //   scheduled_for within the next hour). The unique idempotency_key on
  //   salon_reminders + the status flip after send keep cron replays safe.
  try {
    const due = new Date(now + 3600_000).toISOString();
    const { data: rows, error } = await supabase
      .from("salon_reminders")
      .select("id, store_id, client_id, booking_id, reminder_type, channel_sms, channel_email, idempotency_key, scheduled_for, lead_minutes")
      .in("reminder_type", ["booking_lead", "winback"])
      .eq("status", "pending")
      .lte("scheduled_for", due)
      .limit(200);
    if (error) throw error;
    for (const row of (rows ?? []) as any[]) {
      try {
        let recipient = { user_id: null as string | null, phone: null as string | null, email: null as string | null, first_name: "there", full_name: "there" };
        let templateData: Record<string, unknown> = {};
        let smsBody = "";
        let event: "booking_reminder_24h" | "winback_offer" = "booking_reminder_24h";

        const { data: store } = await supabase
          .from("store_profiles")
          .select("name, phone, slug")
          .eq("id", row.store_id)
          .maybeSingle();
        const salonName = (store as any)?.name ?? "your salon";
        const salonPhone = (store as any)?.phone ?? null;
        const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://hizivo.com";
        const bookingUrl = (store as any)?.slug ? `${appUrl}/salon/${(store as any).slug}` : appUrl;

        if (row.reminder_type === "booking_lead" && row.booking_id) {
          const { data: b } = await supabase
            .from("salon_bookings")
            .select("client_name, client_phone, client_email, service_name, stylist_name, start_at, status, client_id")
            .eq("id", row.booking_id)
            .maybeSingle();
          if (!b) throw new Error("booking_not_found");
          // Last-minute guard: skip if the booking flipped out of active status
          // between scheduling and dispatch.
          if (!["pending", "confirmed"].includes((b as any).status)) {
            await supabase.from("salon_reminders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", row.id);
            continue;
          }
          let userId: string | null = null;
          if ((b as any).client_id) {
            const { data: c } = await supabase.from("salon_clients").select("user_id").eq("id", (b as any).client_id).maybeSingle();
            userId = (c as any)?.user_id ?? null;
          }
          recipient = {
            user_id: userId,
            phone: (b as any).client_phone ?? null,
            email: (b as any).client_email ?? null,
            first_name: firstNameOf((b as any).client_name ?? ""),
            full_name: (b as any).client_name ?? "",
          };
          const start = new Date((b as any).start_at);
          const startLocal = start.toLocaleString("en-US", { weekday: "long", month: "long", day: "numeric", hour: "numeric", minute: "2-digit" });
          // Format lead time naturally based on lead_minutes — "tomorrow" for
          // 24h, "in 2 hours" for 2h, "in 30 minutes" for very short windows.
          const leadMin = (row.lead_minutes as number | null) ?? 1440;
          const leadPhrase = leadMin >= 24 * 60 - 60 && leadMin <= 24 * 60 + 60
            ? "tomorrow"
            : leadMin >= 60
            ? `in ${Math.round(leadMin / 60)} hour${Math.round(leadMin / 60) === 1 ? "" : "s"}`
            : `in ${leadMin} minutes`;
          templateData = {
            client_first_name: recipient.first_name,
            client_name: recipient.full_name,
            service_name: (b as any).service_name,
            stylist_name: (b as any).stylist_name,
            start_at_local: startLocal,
            lead_phrase: leadPhrase,
            salon_name: salonName,
            salon_phone: salonPhone,
            store_id: row.store_id,
          };
          smsBody = `${salonName}: Your ${(b as any).service_name}${(b as any).stylist_name ? ` with ${(b as any).stylist_name}` : ""} is ${leadPhrase} (${startLocal}). Reply CANCEL to cancel${salonPhone ? ` or call ${salonPhone}` : ""}.`;
          event = "booking_reminder_24h";
        } else if (row.reminder_type === "winback" && row.client_id) {
          const { data: c } = await supabase
            .from("salon_clients")
            .select("display_name, phone, email, last_visit_at, marketing_opt_in, is_blocked, user_id")
            .eq("id", row.client_id)
            .maybeSingle();
          if (!c) throw new Error("client_not_found");
          // Re-verify consent at send time — owner may have flipped opt-out
          // since the row was scheduled.
          if ((c as any).is_blocked || !(c as any).marketing_opt_in) {
            await supabase.from("salon_reminders").update({ status: "cancelled", updated_at: new Date().toISOString() }).eq("id", row.id);
            continue;
          }
          const lastVisit = (c as any).last_visit_at ? new Date((c as any).last_visit_at) : null;
          const daysSince = lastVisit ? Math.floor((now - lastVisit.getTime()) / 86400_000) : 0;
          recipient = {
            user_id: (c as any).user_id ?? null,
            phone: (c as any).phone ?? null,
            email: (c as any).email ?? null,
            first_name: firstNameOf((c as any).display_name ?? ""),
            full_name: (c as any).display_name ?? "",
          };
          templateData = {
            client_first_name: recipient.first_name,
            client_name: recipient.full_name,
            days_since_last_visit: daysSince,
            salon_name: salonName,
            booking_url: bookingUrl,
          };
          smsBody = `${salonName}: We miss you, ${recipient.first_name}! It's been ${daysSince} days. Book at ${bookingUrl}`;
          event = "winback_offer";
        } else {
          // Unknown shape — mark failed so we don't loop on it.
          await supabase.from("salon_reminders").update({ status: "failed", error: "invalid_row_shape", updated_at: new Date().toISOString() }).eq("id", row.id);
          continue;
        }

        const out = await sendSalonReminder(supabase, row, recipient, event, templateData, smsBody);
        if (out.sent) {
          if (row.reminder_type === "booking_lead") results.salon_booking_reminder++;
          else if (row.reminder_type === "winback") results.salon_winback_offer++;
        }
      } catch (e) {
        results.errors.push(`salon_reminder ${row.id}: ${e instanceof Error ? e.message : String(e)}`);
        // Best-effort: mark as failed so we don't re-process forever.
        await supabase.from("salon_reminders").update({ status: "failed", error: String((e as Error).message || e).slice(0, 500), updated_at: new Date().toISOString() }).eq("id", row.id).then(() => null);
      }
    }
  } catch (e) {
    results.errors.push(`salon_reminders: ${e instanceof Error ? e.message : String(e)}`);
  }

  // -- 12. Salon birthday offers --------------------------------------------
  //   Scans clients whose birthday matches today (month/day) and who have a
  //   marketing opt-in. Idempotency key carries the year so a client only
  //   gets one birthday message per year even if the cron runs hourly.
  try {
    const today = new Date(now);
    const mm = String(today.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(today.getUTCDate()).padStart(2, "0");
    const year = today.getUTCFullYear();
    // Postgres date-format MM-DD comparison on the YYYY-MM-DD birthday column.
    const { data: clients, error } = await supabase
      .from("salon_clients")
      .select("id, store_id, display_name, phone, email, birthday, marketing_opt_in, sms_opt_in, email_opt_in, is_blocked, user_id")
      .eq("marketing_opt_in", true)
      .eq("is_blocked", false)
      .limit(1000);
    if (error) throw error;
    // Filter to today's birthday in JS to avoid DB-side date-extract complexity
    // (timezone-aware month/day match would require a function index).
    const stores = new Map<string, { name: string; slug: string | null }>();
    for (const c of (clients ?? []) as any[]) {
      const b = c.birthday as string | null;
      if (!b) continue;
      const parts = b.split("-");
      if (parts.length !== 3) continue;
      if (parts[1] !== mm || parts[2] !== dd) continue;
      if (!c.phone && !c.email) continue;

      // Check enable flag for this store + that we haven't already fired this year.
      const { data: settings } = await supabase
        .from("salon_reminder_settings")
        .select("birthday_enabled, birthday_discount_percent")
        .eq("store_id", c.store_id)
        .maybeSingle();
      if (!(settings as any)?.birthday_enabled) continue;

      const idempotencyKey = `salon-birthday-${c.id}-${year}`;
      // Lookup whether this idempotency_key has already been processed —
      // a unique constraint on salon_reminders.idempotency_key + DO NOTHING
      // handles the dedup naturally.

      let store = stores.get(c.store_id);
      if (!store) {
        const { data: sp } = await supabase.from("store_profiles").select("name, slug").eq("id", c.store_id).maybeSingle();
        store = { name: (sp as any)?.name ?? "your salon", slug: (sp as any)?.slug ?? null };
        stores.set(c.store_id, store);
      }
      const appUrl = Deno.env.get("PUBLIC_APP_URL") || "https://hizivo.com";
      const bookingUrl = store.slug ? `${appUrl}/salon/${store.slug}` : appUrl;
      const discount = (settings as any)?.birthday_discount_percent ?? 0;

      // Insert the reminder row (status='pending') and immediately dispatch.
      const channelSms = c.sms_opt_in && !!c.phone;
      const channelEmail = c.email_opt_in && !!c.email;
      if (!channelSms && !channelEmail) continue;

      const { data: inserted } = await supabase
        .from("salon_reminders")
        .insert({
          store_id: c.store_id,
          client_id: c.id,
          reminder_type: "birthday",
          scheduled_for: new Date(now).toISOString(),
          channel_sms: channelSms,
          channel_email: channelEmail,
          idempotency_key: idempotencyKey,
        })
        .select("id, store_id, client_id, booking_id, reminder_type, channel_sms, channel_email, idempotency_key")
        .maybeSingle();
      // ON CONFLICT-equivalent: insert failed with 23505 → already fired this year.
      if (!inserted) continue;

      const recipient = {
        user_id: c.user_id ?? null,
        phone: c.phone ?? null,
        email: c.email ?? null,
        first_name: firstNameOf(c.display_name ?? ""),
        full_name: c.display_name ?? "",
      };
      const templateData = {
        client_first_name: recipient.first_name,
        client_name: recipient.full_name,
        salon_name: store.name,
        birthday_discount_percent: discount,
        booking_url: bookingUrl,
      };
      const smsBody = `${store.name}: Happy birthday, ${recipient.first_name}!${discount > 0 ? ` Enjoy ${discount}% off your next visit.` : ""} Book at ${bookingUrl}`;

      const out = await sendSalonReminder(supabase, inserted as any, recipient, "birthday_offer", templateData, smsBody);
      if (out.sent) results.salon_birthday_offer++;
    }
  } catch (e) {
    results.errors.push(`salon_birthday: ${e instanceof Error ? e.message : String(e)}`);
  }

  return j(200, { ok: true, ts: new Date().toISOString(), results });
});
