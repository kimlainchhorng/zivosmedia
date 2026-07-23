#!/usr/bin/env node

import { createHash } from "node:crypto";

const secret = (process.env.ZIVO_RIDE_AUTH_CLIENT_SECRET ?? "").trim();

function isPlaceholder(value) {
  return !value || /replace|change[_-]?me|example|your[_-]|placeholder|xxxx/i.test(value);
}

if (isPlaceholder(secret) || secret.length < 32) {
  console.error("Missing a non-placeholder ZIVO_RIDE_AUTH_CLIENT_SECRET with at least 32 characters.");
  process.exit(1);
}

const hash = createHash("sha256").update(secret).digest("hex");

console.log(`-- Hub project: slirphzzwcogdbkeicff
-- This SQL stores only the SHA-256 hash of ZIVO_RIDE_AUTH_CLIENT_SECRET.
-- It never prints or stores the raw secret.
begin;

update public.app_integrations
set
  client_secret_hash = '${hash}',
  status = 'enabled',
  enabled = true,
  updated_at = now()
where app_key = 'zivo_ride';

select app_key, status, enabled, length(client_secret_hash) as secret_hash_length
from public.app_integrations
where app_key = 'zivo_ride';

commit;`);
