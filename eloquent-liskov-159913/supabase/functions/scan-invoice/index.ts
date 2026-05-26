// Scan invoice/receipt image with Anthropic Claude vision
// Returns structured invoice JSON: vendor, invoice_number, date, time, payment_method, items[], totals.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `You are an OCR + invoice parser. The user uploads a photo of a receipt/invoice from an auto-parts vendor (e.g. AutoZone, NAPA, O'Reilly, Advance Auto Parts) or a service vendor.
Extract a STRICT JSON object with these fields. Money values must be integers in cents. Quantity is a number. If a value is not present, use null (not empty string).
For AutoZone Commercial Invoice photos, prefer these mappings: vendor = AutoZone, invoice_number = the "Invoice Number" value under Order Information, date/time = "Order Date", payment_method = CASH/CARD shown near the bottom, subtotal/tax/total = bottom summary, item name = Description, part_number = Part #, quantity = QTY, unit_price_cents = Cost when shown, line_total_cents = Total.
Never return an empty item if a bottom total exists; create one line item from the invoice total/subtotal when the item table is partially unreadable.`;

const TOOL_SCHEMA = {
  name: "use_invoice_data",
  description: "Return the extracted invoice data as structured JSON.",
  input_schema: {
    type: "object",
    properties: {
      vendor: { type: ["string", "null"], description: "Company/store name e.g. AutoZone" },
      invoice_number: { type: ["string", "null"], description: "Invoice / receipt # / order #" },
      date: { type: ["string", "null"], description: "YYYY-MM-DD" },
      time: { type: ["string", "null"], description: "HH:MM in 24h" },
      payment_method: {
        anyOf: [
          { type: "string", enum: ["cash", "card", "check", "aba", "other"] },
          { type: "null" },
        ],
      },
      subtotal_cents: { type: ["integer", "null"] },
      tax_cents: { type: ["integer", "null"] },
      total_cents: { type: ["integer", "null"] },
      items: {
        type: "array",
        items: {
          type: "object",
          properties: {
            part_number: { type: ["string", "null"] },
            name: { type: "string" },
            quantity: { type: "number" },
            unit_price_cents: { type: "integer" },
            line_total_cents: { type: "integer" },
          },
          required: ["name", "quantity", "unit_price_cents", "line_total_cents"],
        },
      },
    },
    required: ["items"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY is not configured");

    const { image_url, image_base64, mime_type } = await req.json();
    if (!image_url && !image_base64) {
      return new Response(JSON.stringify({ error: "image_url or image_base64 required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMime = (
      typeof mime_type === "string" &&
      (mime_type.startsWith("image/") || mime_type === "application/pdf")
    )
      ? mime_type
      : "image/jpeg";

    // Build image content block for Anthropic API
    let imageContent: Record<string, unknown>;
    if (image_url) {
      imageContent = { type: "image", source: { type: "url", url: image_url } };
    } else {
      // Strip data URI prefix if present
      const raw = typeof image_base64 === "string" ? image_base64 : "";
      const b64 = raw.includes(",") ? raw.slice(raw.indexOf(",") + 1) : raw;
      imageContent = {
        type: "image",
        source: { type: "base64", media_type: safeMime, data: b64 },
      };
    }

    const aiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: [TOOL_SCHEMA],
        tool_choice: { type: "tool", name: "use_invoice_data" },
        messages: [
          {
            role: "user",
            content: [
              imageContent,
              { type: "text", text: "Extract the invoice data from this image." },
            ],
          },
        ],
      }),
    });

    if (aiResp.status === 429) {
      return new Response(
        JSON.stringify({ error: "Rate limit reached. Please try again in a moment." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (aiResp.status === 402 || aiResp.status === 529) {
      return new Response(
        JSON.stringify({ error: "AI service unavailable. Please try again later." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("Anthropic API error:", aiResp.status, t);
      return new Response(JSON.stringify({ error: "AI API error", details: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await aiResp.json();
    // Anthropic tool_use response: data.content is an array, find the tool_use block
    const toolBlock = (data?.content ?? []).find(
      (b: Record<string, unknown>) => b.type === "tool_use" && b.name === "use_invoice_data",
    );

    if (!toolBlock?.input) {
      console.error("No tool_use block in response:", JSON.stringify(data));
      return new Response(JSON.stringify({ error: "Could not parse invoice", raw: data }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, invoice: toolBlock.input }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("scan-invoice error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
