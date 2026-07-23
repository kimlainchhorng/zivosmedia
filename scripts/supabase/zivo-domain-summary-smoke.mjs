#!/usr/bin/env node
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", override: false, quiet: true });
config({ path: ".env", override: false, quiet: true });
config({ path: ".env.deploy", override: false, quiet: true });

const args = new Set(process.argv.slice(2));
const jsonOutput = args.has("--json");

if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: npm run smoke:zivo-domain-summary -- [--json]

Default mode performs a safe anonymous reachability check and expects 401.

Authenticated check options:
  ZIVO_DOMAIN_SUMMARY_ACCESS_TOKEN or ZIVO_TEST_ACCESS_TOKEN
  or ZIVO_DOMAIN_SUMMARY_REFRESH_TOKEN
  or ZIVO_DOMAIN_SUMMARY_SESSION_JSON='{"access_token":"...","refresh_token":"..."}'
  or ZIVO_TEST_USER_EMAIL plus ZIVO_TEST_USER_PASSWORD

Optional:
  ZIVO_DOMAIN_SUMMARY_URL
  ZIVO_DOMAIN_SUMMARY_DOMAINS=driver,travel,software
  ZIVO_DOMAIN_SUMMARY_LIMIT=10`);
  process.exit(0);
}

const env = process.env;
const mainUrl = clean(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
const publishableKey =
  clean(env.SUPABASE_ANON_KEY) ||
  clean(env.SUPABASE_PUBLISHABLE_KEY) ||
  clean(env.VITE_SUPABASE_PUBLISHABLE_KEY);
const summaryUrl = clean(env.ZIVO_DOMAIN_SUMMARY_URL) || (mainUrl ? `${mainUrl}/functions/v1/zivo-domain-summary` : "");
const configuredAccessToken = clean(env.ZIVO_DOMAIN_SUMMARY_ACCESS_TOKEN || env.ZIVO_TEST_ACCESS_TOKEN);
const configuredRefreshToken = clean(env.ZIVO_DOMAIN_SUMMARY_REFRESH_TOKEN);
const configuredSessionJson = clean(env.ZIVO_DOMAIN_SUMMARY_SESSION_JSON);
const email = clean(env.ZIVO_TEST_USER_EMAIL || env.VITE_TEST_USER_EMAIL);
const password = clean(env.ZIVO_TEST_USER_PASSWORD || env.VITE_TEST_USER_PASSWORD);
const domains = clean(env.ZIVO_DOMAIN_SUMMARY_DOMAINS)
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean);
const limit = clamp(Number(env.ZIVO_DOMAIN_SUMMARY_LIMIT || 10) || 10, 1, 25);

if (!summaryUrl) {
  throw new Error("Set SUPABASE_URL/VITE_SUPABASE_URL or ZIVO_DOMAIN_SUMMARY_URL for the domain summary smoke check.");
}

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function redactUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}${url.pathname}`;
  } catch {
    return value;
  }
}

async function resolveAccessToken() {
  if (configuredAccessToken) return { token: configuredAccessToken, source: "access-token-env" };

  const sessionTokens = parseSessionJson(configuredSessionJson);
  if (sessionTokens?.access_token && sessionTokens.refresh_token) {
    if (!mainUrl) throw new Error("Set SUPABASE_URL/VITE_SUPABASE_URL to refresh ZIVO_DOMAIN_SUMMARY_SESSION_JSON.");
    const token = await refreshAccessToken(sessionTokens.refresh_token);
    return { token, source: "session-json-refresh-token" };
  }

  if (configuredRefreshToken) {
    if (!mainUrl) throw new Error("Set SUPABASE_URL/VITE_SUPABASE_URL to refresh ZIVO_DOMAIN_SUMMARY_REFRESH_TOKEN.");
    const token = await refreshAccessToken(configuredRefreshToken);
    return { token, source: "refresh-token-env" };
  }

  if (!email || !password) return { token: "", source: "anonymous" };
  if (!mainUrl) {
    throw new Error("Set SUPABASE_URL/VITE_SUPABASE_URL to sign in a domain summary test user.");
  }
  if (!publishableKey) {
    throw new Error("Set SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, or VITE_SUPABASE_PUBLISHABLE_KEY to sign in a test user.");
  }

  const client = createClient(mainUrl, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in test user: ${error.message}`);
  const token = data.session?.access_token;
  if (!token) throw new Error("Test sign-in succeeded without an access token.");
  return { token, source: "test-user-password" };
}

function parseSessionJson(value) {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    throw new Error("ZIVO_DOMAIN_SUMMARY_SESSION_JSON must be valid JSON.");
  }
}

async function refreshAccessToken(refreshToken) {
  if (!mainUrl) {
    throw new Error("Set SUPABASE_URL/VITE_SUPABASE_URL to refresh a Supabase session.");
  }
  if (!publishableKey) {
    throw new Error("Set SUPABASE_ANON_KEY, SUPABASE_PUBLISHABLE_KEY, or VITE_SUPABASE_PUBLISHABLE_KEY to refresh a session.");
  }

  const response = await fetch(`${mainUrl}/auth/v1/token?grant_type=refresh_token`, {
    method: "POST",
    headers: {
      "accept": "application/json",
      "apikey": publishableKey,
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 ZivoDomainSummarySmoke",
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.access_token) {
    throw new Error(`Could not refresh Supabase session: ${body.error_description || body.msg || body.error || response.status}`);
  }
  return body.access_token;
}

async function invokeSummary(token) {
  const headers = {
    "accept": "application/json",
    "content-type": "application/json",
    "user-agent": "Mozilla/5.0 ZivoDomainSummarySmoke",
  };
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(summaryUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({
      limit,
      ...(domains.length ? { domains } : {}),
    }),
  });

  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 500) };
  }

  return { status: response.status, ok: response.ok, body };
}

function summarizeDomainStatuses(body) {
  if (!body || !Array.isArray(body.domains)) return [];
  return body.domains.map((domain) => ({
    key: domain.key,
    status: domain.status,
    hasSummary: domain.summary != null,
  }));
}

try {
  const auth = await resolveAccessToken();
  const result = await invokeSummary(auth.token);
  const domainStatuses = summarizeDomainStatuses(result.body);
  const expectedAnonymous = auth.source === "anonymous";
  const passed = expectedAnonymous
    ? result.status === 401
    : result.status === 200 && domainStatuses.length > 0;

  const report = {
    generated: new Date().toISOString(),
    endpoint: redactUrl(summaryUrl),
    authSource: auth.source,
    status: result.status,
    passed,
    domainStatuses,
    note: expectedAnonymous
      ? "Anonymous smoke expects 401 Unauthorized."
      : "Authenticated smoke expects domain summary statuses. missing_publishable_key means Edge Function secrets still need configuration.",
  };

  if (jsonOutput) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`zivo-domain-summary smoke: ${passed ? "passed" : "failed"}`);
    console.log(`endpoint: ${report.endpoint}`);
    console.log(`auth: ${report.authSource}`);
    console.log(`status: ${report.status}`);
    if (domainStatuses.length) {
      for (const domain of domainStatuses) {
        console.log(`- ${domain.key}: ${domain.status}${domain.hasSummary ? " (summary)" : ""}`);
      }
    }
    console.log(report.note);
  }

  if (!passed) process.exit(1);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (jsonOutput) {
    console.log(JSON.stringify({ generated: new Date().toISOString(), passed: false, error: message }, null, 2));
  } else {
    console.error(`zivo-domain-summary smoke failed: ${message}`);
  }
  process.exit(1);
}
