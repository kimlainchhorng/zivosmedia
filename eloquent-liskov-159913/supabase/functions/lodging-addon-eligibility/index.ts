import { createClient } from "../_shared/deps.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Addon = {
  id?: string;
  name?: string;
  label?: string;
  disabled?: boolean;
  min_guests?: number;
  max_guests?: number;
  min_nights?: number;
  max_nights?: number;
  available_from?: string;
  available_until?: string;
  exclude_blocked_dates?: boolean;
  max_quantity?: number;
  requires_status?: string | string[];
};

const keyFor = (addon: Addon) => String(addon.id || addon.name || addon.label || "addon");
const dateOverlaps = (from: string, until: string, checkIn: string, checkOut: string) => from < checkOut && until > checkIn;

function evaluate(addon: Addon, ctx: { guests: number; nights: number; status: string; checkIn: string; checkOut: string; hasBlockedDates: boolean }) {
  const requiredStatuses = Array.isArray(addon.requires_status) ? addon.requires_status : addon.requires_status ? [addon.requires_status] : [];
  let reason: string | undefined;
  if (addon.disabled) reason = "This service is currently unavailable.";
  else if (addon.min_guests && ctx.guests < addon.min_guests) reason = `Only available for ${addon.min_guests}+ guests.`;
  else if (addon.max_guests && ctx.guests > addon.max_guests) reason = `Only available for up to ${addon.max_guests} guests.`;
  else if (addon.min_nights && ctx.nights < addon.min_nights) reason = `Only available for ${addon.min_nights}+ nights.`;
  else if (addon.max_nights && ctx.nights > addon.max_nights) reason = `Only available for stays up to ${addon.max_nights} nights.`;
  else if (addon.available_from && ctx.checkOut <= addon.available_from) reason = "Unavailable for these stay dates.";
  else if (addon.available_until && ctx.checkIn > addon.available_until) reason = "Unavailable for these stay dates.";
  else if (addon.exclude_blocked_dates && ctx.hasBlockedDates) reason = "Unavailable because this stay includes blocked service dates.";
  else if (requiredStatuses.length && !requiredStatuses.includes(ctx.status)) reason = "Unavailable for the current reservation status.";
  return { id: keyFor(addon), eligible: !reason, reason, max_quantity: Math.max(0, Math.min(20, Number(addon.max_quantity || 20))) };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", { global: { headers: { Authorization: authHeader } } });
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { reservation_id } = await req.json().catch(() => ({}));
    if (!reservation_id) return new Response(JSON.stringify({ error: "missing_reservation_id" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: r } = await admin
      .from("lodge_reservations")
      .select("id, room_id, guest_id, check_in, check_out, nights, adults, children, status")
      .eq("id", reservation_id)
      .maybeSingle();
    if (!r) return new Response(JSON.stringify({ error: "not_found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (r.guest_id !== user.id) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: room } = await admin.from("lodge_rooms").select("addons").eq("id", r.room_id).maybeSingle();
    const catalog = Array.isArray(room?.addons) ? room.addons as Addon[] : [];
    const { data: blocks } = await admin.from("lodge_room_blocks").select("block_date").eq("room_id", r.room_id).gte("block_date", r.check_in).lt("block_date", r.check_out).limit(1);
    const ctx = {
      guests: Math.max(1, Number(r.adults || 1) + Number(r.children || 0)),
      nights: Math.max(1, Number(r.nights || 1)),
      status: String(r.status || ""),
      checkIn: String(r.check_in),
      checkOut: String(r.check_out),
      hasBlockedDates: Boolean(blocks?.length),
    };

    return new Response(JSON.stringify({ eligibility: catalog.map((addon) => evaluate(addon, ctx)) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String((err as Error).message || err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
