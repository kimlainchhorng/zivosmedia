/**
 * supplier-proxy retirement tombstone
 *
 * Supplier pages are intentionally opened in the supplier's own HTTPS tab. The
 * previous forwarding implementation was unused by the product and exposed an
 * unnecessary authenticated egress relay. Keep this stable, authenticated 410
 * endpoint temporarily so any unknown legacy caller gets an explicit signal and
 * can be identified in function logs before the slug is removed completely.
 */
import { requireUser, requireUserNotBlocked } from "../_shared/auth.ts";
import { withErrorHandling } from "../_shared/errors.ts";
import { withSecurity } from "../_shared/withSecurity.ts";

const retiredHandler = withErrorHandling(async (req, ctx) => {
  const auth = await requireUser(req);
  await requireUserNotBlocked(auth.userId);

  return new Response(JSON.stringify({ error: "SUPPLIER_PROXY_RETIRED" }), {
    status: 410,
    headers: {
      ...(ctx?.corsHeaders ?? {}),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}, "supplier-proxy");

Deno.serve(
  withSecurity("supplier-proxy", retiredHandler, {
    strictCors: true,
    allowedMethods: ["GET", "POST"],
    rateLimit: "api_general",
  }),
);
