/**
 * Matches a call that routes a write through a server-gated edge function,
 * in either of the two shapes the app uses.
 *
 * These contracts exist to prove a page does NOT write a privileged table
 * directly — it goes through the edge function that re-checks authorisation.
 * They were written against the only shape that existed at the time:
 *
 *     supabase.functions.invoke("merchant-payout-request", { ... })
 *
 * Functions gated by `enforceAal2` answer 403 {"code":"mfa_required"} to any
 * session below AAL2, and the plain call surfaces that as supabase-js's
 * "Edge Function returned a non-2xx status code" — a dead button with no
 * explanation. Those call sites now go through
 *
 *     invokeSensitive("merchant-payout-request", { ... }, ensureAal2, label)
 *
 * which runs the step-up challenge and retries. It calls
 * supabase.functions.invoke internally, so the property these contracts
 * actually protect is unchanged; only the spelling moved.
 *
 * Matching on the shape rather than on the bare function name is deliberate:
 * a name alone would also match a comment or a string in unrelated code, which
 * would let a direct table write slip past the very check this is here for.
 */
export function serverGatedInvoke(fn: string): RegExp {
  const name = fn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // The generic argument can be an inline object type spanning several lines
  // and containing its own ">" (e.g. `Partial<CreatedAccount>[]`), so it cannot
  // be matched with `<[^>]*>`. Allow any short run of characters between the
  // callee and the opening paren instead; the `("fn"` that follows anchors it.
  const call = String.raw`[\s\S]{0,240}?\(\s*["'\`]${name}["'\`]`;
  return new RegExp(
    // supabase.functions.invoke("fn") / functions.invoke<T>("fn")
    `(?:supabase\\.)?functions\\.invoke${call}` +
      "|" +
      // invokeSensitive("fn", …, ensureAal2) and the invokeMaybeSensitive
      // wrapper that hooks use when ensureAal2 is optional.
      `invoke(?:Maybe)?Sensitive${call}`,
  );
}
