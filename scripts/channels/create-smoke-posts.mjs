import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

config({ path: ".env.local", override: false, quiet: true });
config({ path: ".env", override: false, quiet: true });

const KNOWN_PRODUCTION_REFS = new Set(["slirphzzwcogdbkeicff"]);
const SAFE_ENV_NAMES = new Set(["local", "staging", "test"]);

const args = new Set(process.argv.slice(2));
if (args.has("--help") || args.has("-h")) {
  console.log(`Usage: npm run smoke:channels:test-posts -- [--json] [--create]

Default mode checks safety only and never mutates data.

Required for --create:
  VITE_SUPABASE_URL or SUPABASE_URL
  VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY
  ZIVO_ALLOW_CHANNEL_SMOKE_POSTS=1
  ZIVO_CHANNEL_SMOKE_ENV=local|staging|test
  ZIVO_TEST_USER_EMAIL and ZIVO_TEST_USER_PASSWORD

Optional:
  ZIVO_TEST_ACCESS_TOKEN
  ZIVO_TEST_CHANNEL_ID or ZIVO_TEST_CHANNEL_HANDLE
  ZIVO_CHANNEL_SMOKE_TEXT
  ZIVO_CHANNEL_SMOKE_COMMENTS_ENABLED=0|1`);
  process.exit(0);
}

const shouldCreate = args.has("--create");
const jsonOutput = args.has("--json");
const env = process.env;

const supabaseUrl = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
const publishableKey =
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  env.SUPABASE_PUBLISHABLE_KEY ||
  env.SUPABASE_ANON_KEY;
const testEnvironment = String(env.ZIVO_CHANNEL_SMOKE_ENV || "").trim().toLowerCase();
const allowMutation = env.ZIVO_ALLOW_CHANNEL_SMOKE_POSTS === "1";
const email = env.ZIVO_TEST_USER_EMAIL || env.VITE_TEST_USER_EMAIL;
const password = env.ZIVO_TEST_USER_PASSWORD || env.VITE_TEST_USER_PASSWORD;
const accessToken = env.ZIVO_TEST_ACCESS_TOKEN;
const commentsEnabled = env.ZIVO_CHANNEL_SMOKE_COMMENTS_ENABLED !== "0";

function projectRefFromUrl(url) {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1") return "local";
    return parsed.hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

function safetyStatus() {
  const projectRef = projectRefFromUrl(supabaseUrl || "");
  const isLocalUrl = /^(http:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/.test(supabaseUrl || "");
  const safeEnv = SAFE_ENV_NAMES.has(testEnvironment);
  const knownProduction = KNOWN_PRODUCTION_REFS.has(projectRef);
  const safe = Boolean(supabaseUrl && publishableKey && allowMutation && (isLocalUrl || safeEnv) && !knownProduction);
  const reasons = [];

  if (!supabaseUrl) reasons.push("Missing VITE_SUPABASE_URL or SUPABASE_URL.");
  if (!publishableKey) reasons.push("Missing VITE_SUPABASE_PUBLISHABLE_KEY or SUPABASE_ANON_KEY.");
  if (!allowMutation) reasons.push("Set ZIVO_ALLOW_CHANNEL_SMOKE_POSTS=1 to allow test mutation.");
  if (!isLocalUrl && !safeEnv) reasons.push("Set ZIVO_CHANNEL_SMOKE_ENV to local, staging, or test for non-local URLs.");
  if (knownProduction) reasons.push(`Refusing known production Supabase project ${projectRef}.`);

  return { safe, reasons, projectRef, isLocalUrl, testEnvironment, shouldCreate };
}

async function authenticate(client) {
  if (accessToken) {
    const { data, error } = await client.auth.getUser(accessToken);
    if (error) throw new Error(`Test access token rejected: ${error.message}`);
    return { id: data.user.id, email: data.user.email };
  }

  if (!email || !password) {
    throw new Error("Set ZIVO_TEST_USER_EMAIL/ZIVO_TEST_USER_PASSWORD or ZIVO_TEST_ACCESS_TOKEN.");
  }

  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Could not sign in test user: ${error.message}`);
  return { id: data.user.id, email: data.user.email };
}

async function findChannel(client, user) {
  const configuredId = env.ZIVO_TEST_CHANNEL_ID;
  const configuredHandle = env.ZIVO_TEST_CHANNEL_HANDLE || "zivo";

  let channelQuery = client.from("channels").select("id, handle, name, owner_id").limit(1);
  if (configuredId) channelQuery = channelQuery.eq("id", configuredId);
  else channelQuery = channelQuery.eq("handle", configuredHandle);

  const { data, error } = await channelQuery.maybeSingle();
  if (error) throw new Error(`Could not load channel: ${error.message}`);
  if (!data?.id) throw new Error(`No visible channel found for ${configuredId || `@${configuredHandle}`}.`);

  if (data.owner_id === user.id) return { ...data, role: "owner" };

  const { data: subscriber, error: subscriberError } = await client
    .from("channel_subscribers")
    .select("role")
    .eq("channel_id", data.id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (subscriberError) throw new Error(`Could not verify channel role: ${subscriberError.message}`);
  const role = subscriber?.role || null;
  if (role !== "admin" && role !== "editor") {
    throw new Error(`Signed-in test user cannot post to @${data.handle}. Expected owner, admin, or editor role.`);
  }

  return { ...data, role };
}

function smokeMedia() {
  const textPayload = "Channel smoke file from scripts/channels/create-smoke-posts.mjs";
  return [
    {
      type: "image",
      url: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lvLwNwAAAABJRU5ErkJggg==",
      name: "smoke-photo.png",
      size: 68,
      mime_type: "image/png",
    },
    {
      type: "video",
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
      name: "smoke-video.mp4",
      mime_type: "video/mp4",
    },
    {
      type: "gif",
      url: "data:image/gif;base64,R0lGODlhAQABAPAAAP8AAAAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==",
      name: "smoke-animation.gif",
      size: 43,
      mime_type: "image/gif",
    },
    {
      type: "file",
      url: `data:text/plain;base64,${Buffer.from(textPayload).toString("base64")}`,
      name: "channel-smoke-file.txt",
      size: Buffer.byteLength(textPayload),
      mime_type: "text/plain",
    },
    {
      type: "music",
      url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
      name: "smoke-music.wav",
      size: 44,
      mime_type: "audio/wav",
    },
    {
      type: "voice",
      url: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=",
      name: "smoke-voice.wav",
      size: 44,
      mime_type: "audio/wav",
      duration_ms: 1000,
      waveform: [0.12, 0.35, 0.65, 0.45, 0.24, 0.5, 0.7, 0.3],
    },
  ];
}

async function createSmokePost(client, channel) {
  const stamp = new Date().toISOString();
  const body =
    env.ZIVO_CHANNEL_SMOKE_TEXT ||
    `Channel smoke test ${stamp}\nhttps://example.com/zivo-channel-smoke\nSafe local/staging test post.`;
  const { data, error } = await client.functions.invoke("channel-broadcast", {
    body: {
      channel_id: channel.id,
      body,
      media: smokeMedia(),
      scheduled_for: null,
      comments_enabled: commentsEnabled,
    },
  });

  if (error || data?.error) {
    throw new Error(data?.error || error?.message || "channel-broadcast failed.");
  }
  if (!data?.post_id) throw new Error("channel-broadcast did not return post_id.");
  return { ...data, body };
}

function print(result) {
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (result.status === "unsafe") {
    console.log("Channel smoke harness refused to mutate data.");
    for (const reason of result.safety.reasons) console.log(`- ${reason}`);
    return;
  }

  if (result.status === "safe-check") {
    console.log("Channel smoke harness check passed.");
    console.log("Run again with --create to create one sample channel post.");
    return;
  }

  console.log("Created channel smoke test post:");
  console.log(`- Channel: @${result.channel.handle}`);
  console.log(`- Post: ${result.post.post_id}`);
  console.log(`- URL: ${result.urls.channelPost}`);
}

const safety = safetyStatus();
if (!safety.safe) {
  print({ status: "unsafe", safety });
  process.exit(shouldCreate ? 2 : 0);
}

if (!shouldCreate) {
  print({ status: "safe-check", safety });
  process.exit(0);
}

const client = createClient(supabaseUrl, publishableKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
});

const user = await authenticate(client);
const channel = await findChannel(client, user);
const post = await createSmokePost(client, channel);

print({
  status: "created",
  safety,
  user,
  channel,
  post,
  urls: {
    channel: `/c/${channel.handle}`,
    channelPost: `/c/${channel.handle}?post=${post.post_id}`,
  },
});
