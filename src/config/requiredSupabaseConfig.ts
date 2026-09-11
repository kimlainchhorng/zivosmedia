/** Shared by Vite and the boot screen. Never include env values in diagnostics. */
export function requiredSupabaseConfigErrors(env: Record<string, unknown>): string[] {
  const errors: string[] = [];
  const url = typeof env.VITE_SUPABASE_URL === "string" ? env.VITE_SUPABASE_URL.trim() : "";
  const key = typeof env.VITE_SUPABASE_PUBLISHABLE_KEY === "string" ? env.VITE_SUPABASE_PUBLISHABLE_KEY.trim() : "";
  if (!url) errors.push("Missing VITE_SUPABASE_URL.");
  else {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== "https:" || parsed.hostname.endsWith(".invalid") ||
          parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/") {
        errors.push("VITE_SUPABASE_URL must be an HTTPS project origin.");
      }
    } catch {
      errors.push("VITE_SUPABASE_URL must be a valid HTTPS project origin.");
    }
  }
  if (!key) errors.push("Missing VITE_SUPABASE_PUBLISHABLE_KEY.");
  else if (!/^sb_publishable_[A-Za-z0-9_-]{16,}$/.test(key)) {
    try {
      const parts = key.split(".");
      const payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
      const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, "=")));
      if (parts.length !== 3 || claims.role !== "anon") throw new Error("invalid");
      if (claims.ref && url && new URL(url).hostname.endsWith(".supabase.co") &&
          new URL(url).hostname !== `${claims.ref}.supabase.co`) throw new Error("project mismatch");
    } catch {
      errors.push("VITE_SUPABASE_PUBLISHABLE_KEY must be a public publishable key or matching legacy anon JWT; never a secret, service-role or management key.");
    }
  }
  return errors;
}
