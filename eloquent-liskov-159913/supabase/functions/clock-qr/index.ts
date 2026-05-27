import { createClient } from "../_shared/deps.ts";
import { corsHeaders } from "../_shared/cors.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

function generateToken(): string {
  const arr = new Uint8Array(16);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      console.error("Auth failed:", authError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized", detail: authError?.message }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const { action, ...params } = await req.json();
    const clockOutReason = params.clock_out_reason || null;

    // ─── GENERATE: create a new rotating QR token ───
    if (action === "generate") {
      const { store_id, employee_id, token_type } = params;
      if (!store_id || !token_type) {
        return new Response(JSON.stringify({ error: "Missing store_id or token_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify authorization
      if (token_type === "store") {
        const { data: store } = await supabaseAdmin
          .from("store_profiles")
          .select("id")
          .eq("id", store_id)
          .eq("owner_id", userId)
          .maybeSingle();
        if (!store) {
          return new Response(JSON.stringify({ error: "Not store owner" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } else if (token_type === "employee") {
        const { data: emp } = await supabaseAdmin
          .from("store_employees")
          .select("id")
          .eq("id", employee_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!emp) {
          return new Response(JSON.stringify({ error: "Not your employee record" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      // Invalidate old unused tokens of same type
      await supabaseAdmin
        .from("clock_qr_tokens")
        .delete()
        .eq("store_id", store_id)
        .eq("token_type", token_type)
        .is("used_at", null)
        .lt("expires_at", new Date().toISOString());

      const token = generateToken();
      const expiresAt = new Date(Date.now() + 3 * 60 * 1000).toISOString(); // 3 min

      const { data, error } = await supabaseAdmin
        .from("clock_qr_tokens")
        .insert({
          store_id,
          employee_id: token_type === "employee" ? employee_id : null,
          token,
          token_type,
          expires_at: expiresAt,
        })
        .select("id, token, expires_at")
        .single();

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(JSON.stringify({ success: true, data }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── VALIDATE: scan a QR token and clock in/out ───
    if (action === "validate") {
      const { token, scanner_type } = params;
      if (!token || !scanner_type) {
        return new Response(JSON.stringify({ error: "Missing token or scanner_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find the token
      const { data: qrToken } = await supabaseAdmin
        .from("clock_qr_tokens")
        .select("*")
        .eq("token", token)
        .is("used_at", null)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (!qrToken) {
        return new Response(JSON.stringify({ error: "Invalid or expired QR code", code: "INVALID_TOKEN" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      let employeeId: string;
      const storeId = qrToken.store_id;

      if (scanner_type === "employee_scans_store") {
        // Employee scanning store QR → find their employee record
        const { data: emp } = await supabaseAdmin
          .from("store_employees")
          .select("id, name, store_id")
          .eq("store_id", storeId)
          .eq("user_id", userId)
          .eq("status", "active")
          .maybeSingle();
        if (!emp) {
          return new Response(JSON.stringify({ error: "You are not an employee of this store", code: "NOT_EMPLOYEE" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        employeeId = emp.id;
      } else if (scanner_type === "admin_scans_employee") {
        // Admin scanning employee QR → verify admin is store owner
        const { data: store } = await supabaseAdmin
          .from("store_profiles")
          .select("id")
          .eq("id", storeId)
          .eq("owner_id", userId)
          .maybeSingle();
        if (!store) {
          return new Response(JSON.stringify({ error: "You are not the store owner", code: "NOT_OWNER" }), {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        employeeId = qrToken.employee_id!;
      } else {
        return new Response(JSON.stringify({ error: "Invalid scanner_type" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Mark token as used
      await supabaseAdmin
        .from("clock_qr_tokens")
        .update({ used_at: new Date().toISOString(), used_by: userId })
        .eq("id", qrToken.id);

      const { data: openEntry } = await supabaseAdmin
        .from("store_time_entries")
        .select("id, clock_in")
        .eq("employee_id", employeeId)
        .is("clock_out", null)
        .order("clock_in", { ascending: false })
        .maybeSingle();

      // Get employee name
      const { data: empInfo } = await supabaseAdmin
        .from("store_employees")
        .select("name")
        .eq("id", employeeId)
        .single();

      if (openEntry) {
        // Clock OUT
        await supabaseAdmin
          .from("store_time_entries")
          .update({ clock_out: new Date().toISOString(), clock_out_reason: clockOutReason || "QR Clock Out" })
          .eq("id", openEntry.id);

        return new Response(JSON.stringify({
          success: true,
          action_performed: "clock_out",
          employee_name: empInfo?.name,
          clock_in: openEntry.clock_in,
          clock_out: new Date().toISOString(),
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } else {
        // Clock IN
        const { data: newEntry, error: insertErr } = await supabaseAdmin
          .from("store_time_entries")
          .insert({
            employee_id: employeeId,
            store_id: storeId,
            clock_in: new Date().toISOString(),
          })
          .select("id, clock_in")
          .single();

        if (insertErr) {
          return new Response(JSON.stringify({ error: insertErr.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({
          success: true,
          action_performed: "clock_in",
          employee_name: empInfo?.name,
          clock_in: newEntry.clock_in,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
