/**
 * log-login - Records login events with device & geolocation info
 * Called from the client after successful authentication.
 * Uses ip-api.com (free, no key) for geolocation.
 */
import { serve, createClient } from "../_shared/deps.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify user from JWT
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const userAgent = req.headers.get("user-agent") ?? body.user_agent ?? "";

    // Detect device type from user agent
    const ua = userAgent.toLowerCase();
    let deviceType = "desktop";
    let deviceName = "Unknown Device";

    if (/iphone|android.*mobile|windows phone/i.test(ua)) {
      deviceType = "mobile";
    } else if (/ipad|android(?!.*mobile)|tablet/i.test(ua)) {
      deviceType = "tablet";
    }

    // Parse device name
    if (/chrome/i.test(ua) && !/edg/i.test(ua)) {
      deviceName = "Chrome";
    } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
      deviceName = "Safari";
    } else if (/firefox/i.test(ua)) {
      deviceName = "Firefox";
    } else if (/edg/i.test(ua)) {
      deviceName = "Edge";
    }

    if (/windows/i.test(ua)) deviceName += " on Windows";
    else if (/macintosh|mac os/i.test(ua)) deviceName += " on macOS";
    else if (/iphone/i.test(ua)) deviceName = "iPhone (Safari)";
    else if (/ipad/i.test(ua)) deviceName = "iPad (Safari)";
    else if (/android/i.test(ua)) deviceName += " on Android";
    else if (/linux/i.test(ua)) deviceName += " on Linux";

    // Get IP from forwarding headers
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("cf-connecting-ip")
      || req.headers.get("x-real-ip")
      || "0.0.0.0";

    // Geolocate via ip-api.com (free, 45 req/min)
    let city = null, country = null, lat = null, lon = null;
    try {
      const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=status,city,country,lat,lon`);
      const geo = await geoRes.json();
      if (geo.status === "success") {
        city = geo.city;
        country = geo.country;
        lat = geo.lat;
        lon = geo.lon;
      }
    } catch {
      // Geo lookup failed — continue without it
    }

    // Check for suspicious login (different country from last login)
    let isSuspicious = false;
    const { data: lastLogin } = await supabase
      .from("login_history")
      .select("country")
      .eq("user_id", user.id)
      .order("logged_in_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastLogin?.country && country && lastLogin.country !== country) {
      isSuspicious = true;
    }

    // Insert login record
    const { error: insertError } = await supabase.from("login_history").insert({
      user_id: user.id,
      device_name: deviceName,
      device_type: deviceType,
      ip_address: ip,
      city,
      country,
      latitude: lat,
      longitude: lon,
      user_agent: userAgent,
      is_suspicious: isSuspicious,
    });

    if (insertError) {
      console.error("Failed to log login:", insertError);
      return new Response(JSON.stringify({ error: "Failed to log" }), {
        status: 500, headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, suspicious: isSuspicious }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("log-login error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500, headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
