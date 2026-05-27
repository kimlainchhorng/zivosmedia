// Edge-side feature flag evaluator. Reads from the public.feature_flags table,
// caches results for 30 seconds per worker to keep cold-path overhead low.

import { createClient } from './deps.ts';

interface FlagRow {
  name: string;
  is_enabled: boolean;
  rollout_percentage: number;
  target_users: unknown;
  target_roles: string[] | null;
}

const cache = new Map<string, { row: FlagRow | null; ts: number }>();
const TTL_MS = 30_000;

async function load(key: string): Promise<FlagRow | null> {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < TTL_MS) return cached.row;
  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );
  const { data } = await sb
    .from('feature_flags')
    .select('name, is_enabled, rollout_percentage, target_users, target_roles')
    .eq('name', key)
    .maybeSingle();
  cache.set(key, { row: (data as FlagRow | null) ?? null, ts: Date.now() });
  return (data as FlagRow | null) ?? null;
}

function bucket(userId: string): number {
  // Stable 0–99 bucket from userId.
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return h % 100;
}

export async function isFlagEnabled(key: string, userId?: string | null): Promise<boolean> {
  const row = await load(key);
  if (!row) return false;
  if (!row.is_enabled) return false;
  if (row.rollout_percentage >= 100) return true;
  if (!userId) return false;
  if (Array.isArray(row.target_users) && (row.target_users as string[]).includes(userId)) return true;
  return bucket(userId) < (row.rollout_percentage ?? 0);
}
