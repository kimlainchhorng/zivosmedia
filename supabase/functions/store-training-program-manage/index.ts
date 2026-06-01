/**
 * store-training-program-manage
 * -----------------------------
 * Server-gated owner/admin mutations for store training programs and modules.
 */
import { createClient, serve } from "../_shared/deps.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i;
const ACTIONS = new Set(["save", "delete", "seed_defaults"]);
const PROGRAM_TYPES = new Set(["onboarding", "training", "certification"]);

type Body = {
  action?: unknown;
  store_id?: unknown;
  program_id?: unknown;
  program?: unknown;
  programs?: unknown;
};

serve(withSecurity("store-training-program-manage", async (req, ctx) => {
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
  if (!action) return json({ error: "Invalid training action" }, 400);

  if (action === "save") {
    const programId = cleanUuid(body.program_id);
    const storeId = programId ? await getProgramStoreId(admin, programId) : cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store or program id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const program = cleanProgram(body.program);
    if (!program.ok) return json({ error: program.error }, 400);

    const saved = programId
      ? await updateProgram(admin, programId, storeId, program.values)
      : await createProgram(admin, storeId, user.id, program.values);
    if (!saved.ok) return json({ error: saved.error }, saved.status);

    if (program.modules !== undefined) {
      const modules = await replaceModules(admin, saved.program.id, program.modules);
      if (!modules.ok) return json({ error: modules.error }, modules.status);
    }

    return json({ ok: true, program: saved.program });
  }

  if (action === "seed_defaults") {
    const storeId = cleanUuid(body.store_id);
    if (!storeId) return json({ error: "Invalid store id" }, 400);
    if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

    const programs = cleanProgramList(body.programs);
    if (!programs.ok) return json({ error: programs.error }, 400);

    const created: unknown[] = [];
    for (const program of programs.items) {
      const saved = await createProgram(admin, storeId, user.id, program.values);
      if (!saved.ok) return json({ error: saved.error }, saved.status);
      const modules = await replaceModules(admin, saved.program.id, program.modules ?? []);
      if (!modules.ok) return json({ error: modules.error }, modules.status);
      created.push(saved.program);
    }
    return json({ ok: true, programs: created });
  }

  const programId = cleanUuid(body.program_id);
  if (!programId) return json({ error: "Invalid program id" }, 400);
  const storeId = await getProgramStoreId(admin, programId);
  if (!storeId) return json({ error: "Program not found" }, 404);
  if (!await canManageStore(admin, user.id, storeId)) return json({ error: "Not authorized for this store" }, 403);

  const { error } = await admin
    .from("store_training_programs")
    .delete()
    .eq("id", programId)
    .eq("store_id", storeId);
  if (error) {
    console.error("[store-training-program-manage:delete]", error.message);
    return json({ error: "Could not delete training program" }, 500);
  }
  return json({ ok: true, program_id: programId });
}, { strictCors: true, allowedMethods: ["POST"], rateLimit: "api_general", trackNetwork: "suspicious", blockNetworkRiskAt: 80 }));

async function createProgram(admin: any, storeId: string, userId: string, values: Record<string, unknown>) {
  const { data, error } = await admin
    .from("store_training_programs")
    .insert({ ...values, store_id: storeId, created_by: userId })
    .select("*")
    .single();
  if (error) {
    console.error("[store-training-program-manage:create]", error.message);
    return { ok: false as const, error: "Could not create training program", status: 500 };
  }
  return { ok: true as const, program: data };
}

async function updateProgram(admin: any, programId: string, storeId: string, values: Record<string, unknown>) {
  const { data, error } = await admin
    .from("store_training_programs")
    .update(values)
    .eq("id", programId)
    .eq("store_id", storeId)
    .select("*")
    .single();
  if (error) {
    console.error("[store-training-program-manage:update]", error.message);
    return { ok: false as const, error: "Could not update training program", status: 500 };
  }
  return { ok: true as const, program: data };
}

async function replaceModules(admin: any, programId: string, modules: Array<Record<string, unknown>>) {
  const { error: deleteError } = await admin
    .from("store_training_modules")
    .delete()
    .eq("program_id", programId);
  if (deleteError) {
    console.error("[store-training-program-manage:modules-delete]", deleteError.message);
    return { ok: false as const, error: "Could not replace training modules", status: 500 };
  }

  if (!modules.length) return { ok: true as const };

  const rows = modules.map((module, index) => ({
    program_id: programId,
    title: module.title,
    duration_minutes: module.duration_minutes,
    sort_order: index,
  }));
  const { error } = await admin.from("store_training_modules").insert(rows);
  if (error) {
    console.error("[store-training-program-manage:modules-insert]", error.message);
    return { ok: false as const, error: "Could not create training modules", status: 500 };
  }
  return { ok: true as const };
}

async function canManageStore(admin: any, userId: string, storeId: string): Promise<boolean> {
  const { data: store, error: storeError } = await admin
    .from("store_profiles")
    .select("id")
    .eq("id", storeId)
    .eq("owner_id", userId)
    .maybeSingle();
  if (storeError) {
    console.error("[store-training-program-manage:store]", storeError.message);
    return false;
  }
  if (store?.id) return true;

  const { data: isAdmin, error: roleError } = await admin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (roleError) {
    console.error("[store-training-program-manage:role]", roleError.message);
    return false;
  }
  return Boolean(isAdmin);
}

async function getProgramStoreId(admin: any, programId: string | null): Promise<string | null> {
  if (!programId) return null;
  const { data, error } = await admin
    .from("store_training_programs")
    .select("store_id")
    .eq("id", programId)
    .maybeSingle();
  if (error) {
    console.error("[store-training-program-manage:program-store]", error.message);
    return null;
  }
  return data?.store_id ?? null;
}

function cleanProgramList(value: unknown):
  | { ok: true; items: Array<{ values: Record<string, unknown>; modules?: Array<Record<string, unknown>> }> }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length < 1 || value.length > 20) {
    return { ok: false, error: "Training programs are required" };
  }
  const items = [];
  for (const item of value) {
    const program = cleanProgram(item);
    if (!program.ok) return program;
    items.push(program);
  }
  return { ok: true, items };
}

function cleanProgram(value: unknown):
  | { ok: true; values: Record<string, unknown>; modules?: Array<Record<string, unknown>> }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "Training program payload is required" };
  }
  const input = value as Record<string, unknown>;
  const name = cleanText(input.name, 1, 180);
  if (!name) return { ok: false, error: "Program name is required" };

  const type = cleanProgramType(input.type);
  if (!type) return { ok: false, error: "Invalid program type" };

  const values: Record<string, unknown> = {
    name,
    type,
    description: cleanNullableText(input.description, 1000),
  };

  if (!("modules" in input)) return { ok: true, values };
  const modules = cleanModules(input.modules);
  if (!modules.ok) return modules;
  return { ok: true, values, modules: modules.items };
}

function cleanModules(value: unknown):
  | { ok: true; items: Array<Record<string, unknown>> }
  | { ok: false; error: string } {
  if (!Array.isArray(value) || value.length > 40) return { ok: false, error: "Invalid training modules" };
  const items = [];
  for (const module of value) {
    if (!module || typeof module !== "object" || Array.isArray(module)) {
      return { ok: false, error: "Invalid training module" };
    }
    const input = module as Record<string, unknown>;
    const title = cleanText(input.title, 1, 180);
    if (!title) return { ok: false, error: "Module title is required" };
    const duration = cleanInteger(input.duration_minutes, 1, 1440);
    if (duration === null) return { ok: false, error: "Invalid module duration" };
    items.push({ title, duration_minutes: duration });
  }
  return { ok: true, items };
}

function cleanUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const id = value.trim();
  return UUID_RE.test(id) ? id : null;
}

function cleanAction(value: unknown): string | null {
  if (typeof value !== "string") return null;
  return ACTIONS.has(value) ? value : null;
}

function cleanProgramType(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const type = value.trim();
  return PROGRAM_TYPES.has(type) ? type : null;
}

function cleanText(value: unknown, minLength: number, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (text.length < minLength || text.length > maxLength) return null;
  return text;
}

function cleanNullableText(value: unknown, maxLength: number): string | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > maxLength ? null : text || null;
}

function cleanInteger(value: unknown, min: number, max: number): number | null {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(number) || number < min || number > max) return null;
  return number;
}
