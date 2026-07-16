export function softwareSubscriptionGone(ctx: { corsHeaders: Record<string, string> }): Response {
  return new Response(JSON.stringify({
    error: "gone",
    message: "This legacy subscription endpoint is retired. Use software-create-subscription.",
  }), {
    status: 410,
    headers: { ...ctx.corsHeaders, "Content-Type": "application/json" },
  });
}
