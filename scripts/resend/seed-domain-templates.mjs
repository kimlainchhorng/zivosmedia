#!/usr/bin/env node

const RESEND_API_URL = "https://api.resend.com";

const domains = [
  {
    domain: "zivobusiness.com",
    alias: "zivo-business-core",
    name: "ZIVO Business - Core",
    product: "ZIVO Business",
    from: "ZIVO Business <noreply@zivobusiness.com>",
    subject: "Update from ZIVO Business",
    accent: "#00a86b",
    support: "support@zivobusiness.com",
    cta: "Open workspace",
    url: "https://zivobusiness.com",
  },
  {
    domain: "zivodriver.com",
    alias: "zivo-driver-core",
    name: "ZIVO Driver - Core",
    product: "ZIVO Driver",
    from: "ZIVO Driver <noreply@zivodriver.com>",
    subject: "Update from ZIVO Driver",
    accent: "#0ea5e9",
    support: "support@zivodriver.com",
    cta: "Open driver portal",
    url: "https://zivodriver.com",
  },
  {
    domain: "zivoemployee.com",
    alias: "zivo-employee-core",
    name: "ZIVO Employee - Core",
    product: "ZIVO Employee",
    from: "ZIVO Employee <noreply@zivoemployee.com>",
    subject: "Update from ZIVO Employee",
    accent: "#7c3aed",
    support: "support@zivoemployee.com",
    cta: "Open employee portal",
    url: "https://zivoemployee.com",
  },
  {
    domain: "zivoschat.com",
    alias: "zivo-chat-core",
    name: "ZIVO Chat - Core",
    product: "ZIVO Chat",
    from: "ZIVO Chat <noreply@zivoschat.com>",
    subject: "Update from ZIVO Chat",
    accent: "#ec4899",
    support: "support@zivoschat.com",
    cta: "Open chat",
    url: "https://zivoschat.com",
  },
  {
    domain: "zivosmedia.com",
    alias: "zivo-media-core",
    name: "ZIVO Media - Core",
    product: "ZIVO Media",
    from: "ZIVO Media <noreply@zivosmedia.com>",
    subject: "Update from ZIVO",
    accent: "#f97316",
    support: "support@zivosmedia.com",
    cta: "Open ZIVO",
    url: "https://zivosmedia.com",
  },
  {
    domain: "zivosoftware.com",
    alias: "zivo-software-core",
    name: "ZIVO Software - Core",
    product: "ZIVO Software",
    from: "ZIVO Software <noreply@zivosoftware.com>",
    subject: "Update from ZIVO Software",
    accent: "#00a86b",
    support: "support@zivosoftware.com",
    cta: "Open software",
    url: "https://zivosoftware.com",
  },
  {
    domain: "zivostravel.com",
    alias: "zivo-travel-core",
    name: "ZIVO Travel - Core",
    product: "ZIVO Travel",
    from: "ZIVO Travel <noreply@zivostravel.com>",
    subject: "Update from ZIVO Travel",
    accent: "#2563eb",
    support: "support@zivostravel.com",
    cta: "Open travel",
    url: "https://zivostravel.com",
  },
];

const variables = [
  { key: "PREHEADER", type: "string", fallbackValue: "A secure update from ZIVO." },
  { key: "TITLE", type: "string", fallbackValue: "Your ZIVO update" },
  { key: "BODY", type: "string", fallbackValue: "We have a new update for your account." },
  { key: "CTA_LABEL", type: "string", fallbackValue: "Open ZIVO" },
  { key: "CTA_URL", type: "string", fallbackValue: "https://zivosmedia.com" },
  { key: "FOOTER_NOTE", type: "string", fallbackValue: "You are receiving this because you use ZIVO services." },
];

function renderHtml(template) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(template.product)}</title>
  </head>
  <body style="margin:0;background:#f6f7fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#0f172a;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{{{PREHEADER}}}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6f7fb;padding:28px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 18px 45px rgba(15,23,42,.08);">
            <tr>
              <td style="padding:28px 30px 20px;background:linear-gradient(135deg,${template.accent},#ec4899);">
                <div style="width:54px;height:54px;border-radius:16px;background:#0b1115;color:#ffffff;font-size:30px;font-weight:900;line-height:54px;text-align:center;box-shadow:0 12px 28px rgba(15,23,42,.25);">Z</div>
                <p style="margin:18px 0 4px;color:#ffffff;font-size:12px;font-weight:800;letter-spacing:.14em;text-transform:uppercase;">${escapeHtml(template.product)}</p>
                <h1 style="margin:0;color:#ffffff;font-size:28px;line-height:1.15;font-weight:850;">{{{TITLE}}}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:30px;">
                <p style="margin:0 0 22px;color:#334155;font-size:16px;line-height:1.65;">{{{BODY}}}</p>
                <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                  <tr>
                    <td style="border-radius:999px;background:#0f172a;">
                      <a href="{{{CTA_URL}}}" style="display:inline-block;padding:13px 22px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;border-radius:999px;">{{{CTA_LABEL}}}</a>
                    </td>
                  </tr>
                </table>
                <div style="padding:16px;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;">
                  <p style="margin:0;color:#64748b;font-size:13px;line-height:1.55;">{{{FOOTER_NOTE}}}</p>
                </div>
                <p style="margin:22px 0 0;color:#94a3b8;font-size:12px;line-height:1.5;">
                  ${escapeHtml(template.product)} · ${escapeHtml(template.domain)}<br>
                  Need help? Contact ${escapeHtml(template.support)}.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

function renderText(template) {
  return `${template.product}

{{{TITLE}}}

{{{BODY}}}

{{{CTA_LABEL}}}: {{{CTA_URL}}}

{{{FOOTER_NOTE}}}

${template.product} - ${template.domain}
Support: ${template.support}`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function resend(path, options = {}) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is required");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${RESEND_API_URL}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    });

    const text = await response.text();
    const body = text ? JSON.parse(text) : null;
    if (response.ok) return body;

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("retry-after") ?? "1");
      await wait(Math.max(1000, retryAfter * 1000));
      continue;
    }

    throw new Error(`${options.method ?? "GET"} ${path} failed (${response.status}): ${JSON.stringify(body)}`);
  }
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const existing = await resend("/templates?limit=100");
  const byAlias = new Map((existing.data ?? []).filter((template) => template.alias).map((template) => [template.alias, template]));

  for (const template of domains) {
    const payload = {
      name: template.name,
      alias: template.alias,
      from: template.from,
      subject: template.subject,
      html: renderHtml(template),
      text: renderText(template),
      variables,
    };

    const existingTemplate = byAlias.get(template.alias);
    if (existingTemplate) {
      await resend(`/templates/${existingTemplate.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      await resend(`/templates/${existingTemplate.id}/publish`, { method: "POST" });
      console.log(`updated ${template.alias}`);
    } else {
      const created = await resend("/templates", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      await resend(`/templates/${created.id}/publish`, { method: "POST" });
      console.log(`created ${template.alias}`);
    }

    await wait(300);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
