/**
 * store-training-assignment-manage
 * --------------------------------
 * Server-gated owner/admin assignment mutations for store training programs.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ACTIONS = new Set(["assign", "unassign", "update_progress"]);
const STATUSES = new Set(["assigned", "in_progress", "completed"]);

type Body = {
  action?: unknown;
  program_id?: unknown;
  assignment_id?: unknown;
  employee_ids?: unknown;
  progress_pct?: unknown;
};

serve(withSecurity("store-training-assignment-manage", async (req, ctx) => {
  const corsHeaders = ctx.corsHeaders;
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const token = req.headers.get("Authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);

  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } }) as any;
  const { data: authData } = await admin.auth.getUser(token);
  const user = authData.user;
  if (!user) return json({ error: "Unauthorized" }, 401);

  const body = await req.json().catch(() => ({})) as Body;
  const action = cleanAction(body.action);
  if (!action) return json({ error: "Invalid assignment action" }, 400);

  if (action === "assign") {
    const programId = cleanUuid(body.program_id);
    if (!programId) return json({ error: "Invalid program id" }, 400);
    const storeId = await getProgramStoreId(admin, programId);
    if (!storeId) return json({ error: "Program not found" }, 404);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const employeeIds = cleanUuidList(body.employee_ids);
    if (!employeeIds.length) return json({ error: "Employee ids are required" }, 400);
    if (!await employeesBelongToStore(admin, employeeIds, storeId)) {
      return json({ error: "One or more employees do not belong to this store" }, 400);
    }

    const rows = employeeIds.map((employeeId) => ({
      program_id: programId,
      employee_id: employeeId,
      status: "assigned",
      progress_pct: 0,
    }));
    const { data, error } = await admin
      .from("store_training_assignments")
      .upsert(rows, { onConflict: "program_id,employee_id", ignoreDuplicates: true })
      .select("*");
    if (error) {
      console.error("[store-training-assignment-manage:assign]", error.message);
      return json({ error: "Could not assign training" }, 500);
    }
    return json({ ok: true, assignments: data ?? [] });
  }

  const assignmentId = cleanUuid(body.assignment_id);
  const programId = cleanUuid(body.program_id);
  if (!assignmentId || !programId) return json({ error: "Invalid assignment or program id" }, 400);

  const existing = await getAssignment(admin, assignmentId, programId);
  if (!existing.ok) return json({ error: existing.error }, existing.status);
  if (!await canManageStore(admin, user.id, existing.storeId)) return json({ error: "Not authorized for this store" }, 403);

  if (action === "unassign") {
    const { error } = await admin
      .from("store_training_assignments")
      .delete()
      .eq("id", assignmentId)
      .eq("program_id", programId);
    if (error) {
      console.error("[store-training-assignment-manage:unassign]", error.message);
      return json({ error: "Could not remove assignment" }, 500);
    }
    return json({ ok: true, assignment_id: assignmentId });
  }

  const progress = cleanInteger(body.progress_pct, 0, 100);
  if (progress === null) return json({ error: "Invalid progress" }, 400);
  const status = progress >= 100 ? "completed" : progress > 0 ? "in_progress" : "assigned";
  if (!STATUSES.has(status)) return json({ error: "Invalid status" }, 400);

  const { data, error } = await admin
    .from("store_training_assignments")
    .update({
      progress_pct: progress,
      status,
      completed_at: progress >= 100 ? new Date().toISOString() : null,
    })
    .eq("id", assignmentId)
    .eq("program_id", programId)
    .select("*")
    .single();
  if (error) {
    console.error("[store-training-assignment-manage:update-progress]", error.message);
    return json({ error: "Could not update progress" }, 500);
  }
  return json({ ok: true, assignment: data });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function getAssignment(admin: any, assignmentId: string, programId: string):
  Promise<{ ok: true; storeId: string } | { ok: false; error: string; status: number }> {
  const { data, error } = await admin
    .from("store_training_assignments")
    .select("id, program_id, store_training_programs!inner(store_id)")
    .eq("id", assignmentId)
    .eq("program_id", programId)
    .maybeSingle();
  if (error) {
    console.error("[store-training-assignment-manage:assignment]", error.message);
    return { ok: false, error: "Could not verify assignment", status: 500 };
  }
  const storeId = data?.store_training_programs?.store_id;
  if (!storeId) return { ok: false, error: "Assignment not found", status: 404 };
  return { ok: true, storeId };
}

async function getProgramStoreId(admin: any, programId: string): Promise<string | null> {
  const { data, error } = await admin
    .from("store_training_programs")
    .select("store_id")
    .eq("id", programId)
    .maybeSingle();
  if (error) {
    console.error("[store-training-assignment-manage:program]", error.message);
    return null;
  }
  return data?.store_id ?? null;
}

async function employeesBelongToStore(admin: any, employeeIds: string[], storeId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("store_employees")
    .select("id")
    .eq("store_id", storeId)
    .in("id", employeeIds);
  if (error) {
    console.error("[store-training-assignment-manage:employees]", error.message);
    return false;
  }
  return new Set((data ?? []).map((row: { id: string }) => row.id)).size === employeeIds.length;
}

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-training-assignment-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-training-assignment-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanUuidList(value: unknown): string[] {
  if (!Array.isArray(value) || value.length > 100) return [];
  const ids = new Set<string>();
  for (const item of value) {
    const id = cleanUuid(item);
    if (!id) return [];
    ids.add(id);
  }
  return [...ids];
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
