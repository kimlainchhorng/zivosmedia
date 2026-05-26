/**
 * Wrap `supabase.functions.invoke` with automatic step-up MFA on 403 responses
 * that carry `code: "mfa_required"`.
 *
 * Usage from a component:
 *
 *   const { ensureAal2, dialog } = useStepUpMfa();
 *   const result = await invokeSensitive("process-withdrawal", { body: { ... } }, ensureAal2);
 */
import { supabase } from "@/integrations/supabase/client";

type InvokeOpts = {
  body?: unknown;
  headers?: Record<string, string>;
};

type InvokeResult<T> = {
  data: T | null;
  error: Error | null;
};

export async function invokeSensitive<T = unknown>(
  fn: string,
  opts: InvokeOpts,
  ensureAal2: (label?: string) => Promise<boolean>,
  label?: string,
): Promise<InvokeResult<T>> {
  const first = await supabase.functions.invoke(fn, opts);

  // Detect mfa_required response. supabase-js shapes vary across versions, so
  // check both `error.context` and `error.message`.
  const requiresMfa = (() => {
    if (!first.error) return false;
    // Newer SDK exposes the response context
    const ctx = (first.error as unknown as { context?: { status?: number; body?: unknown } }).context;
    if (ctx?.status === 403) {
      const body = ctx.body;
      if (typeof body === "string") {
        try {
          const parsed = JSON.parse(body);
          if (parsed?.code === "mfa_required") return true;
        } catch { /* not JSON */ }
      } else if (body && typeof body === "object" && (body as { code?: string }).code === "mfa_required") {
        return true;
      }
    }
    if (/mfa_required|step.up.mfa/i.test(first.error.message ?? "")) return true;
    return false;
  })();

  if (!requiresMfa) {
    return first as InvokeResult<T>;
  }

  // Prompt the user for a TOTP code
  const ok = await ensureAal2(label ?? "Confirm with 2FA");
  if (!ok) {
    return {
      data: null,
      error: new Error("Two-factor verification required and was cancelled"),
    };
  }

  // Retry with the now-AAL2 session
  return await supabase.functions.invoke(fn, opts) as InvokeResult<T>;
}
