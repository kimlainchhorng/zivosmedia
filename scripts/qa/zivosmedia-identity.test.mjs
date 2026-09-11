import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import * as auth from '../../supabase/functions/_shared/zivosmediaAuth.ts';

// Execute the production handler with isolated persistence. Crypto and profile
// projection are real; this does not claim to exercise the security middleware.
const source = readFileSync(new URL('../../supabase/functions/zivosmedia-auth-validate-code/index.ts', import.meta.url), 'utf8')
  .replace(/^import[\s\S]*?from\s+["'][^"']+["'];\r?\n/gm, '');
const executable = stripTypeScriptTypes(source);
async function harness(user, appKey = 'zivo_business') {
  const verifier = 'v'.repeat(48);
  const secret = 'fixture-server-secret';
  const code = 'fixture-authorization-code';
  const app = { id: 'app-id', app_key: appKey, enabled: true, status: 'enabled', client_secret_hash: await auth.hashClientSecret(secret) };
  const record = { id: 'code-id', app_integration_id: app.id, zivosmedia_user_id: 'user-id', scopes: ['openid', 'profile', 'email'], code_challenge: await auth.createCodeChallenge(verifier), code_challenge_method: 'S256', expires_at: new Date(Date.now() + 60_000).toISOString(), used_at: null, revoked_at: null };
  const audits = [];
  const service = {
    auth: { admin: { getUserById: async (id) => { assert.equal(id, 'user-id'); return { data: { user }, error: null }; } } },
    from(table) {
      assert.ok(['app_integrations', 'zivosmedia_auth_codes', 'zivosmedia_auth_audit_logs'].includes(table), `Unexpected table ${table}`);
      let mutation;
      const query = {
        select() { return query; }, eq() { return query; }, is() { return query; },
        update(value) { mutation = value; return query; },
        async insert(value) { audits.push(value); return { error: null }; },
        async maybeSingle() {
          if (table === 'app_integrations') return { data: app, error: null };
          if (mutation) {
            if (record.used_at) return { data: null, error: null };
            Object.assign(record, mutation);
            return { data: { id: record.id }, error: null };
          }
          return { data: { ...record }, error: null };
        },
      };
      return query;
    },
  };
  let handler;
  new Function('Deno', 'createClient', 'serve', 'withSecurity', ...Object.keys(auth), executable)(
    { env: { get: () => 'fixture' } }, () => service, (fn) => { handler = fn; }, (_, fn) => fn, ...Object.values(auth),
  );
  return {
    audits,
    async exchange(overrides = {}) {
      const response = await handler(new Request('https://identity.example/validate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ app_key: appKey, client_secret: secret, code, code_verifier: verifier, ...overrides }) }), { corsHeaders: {}, ip: null, userAgent: null, correlationId: 'test', log: { error() {} } });
      return { status: response.status, body: await response.json() };
    },
  };
}
const confirmed = { id: 'user-id', email: 'merchant@example.com', email_confirmed_at: '2026-01-01T00:00:00Z', user_metadata: { full_name: 'Merchant' } };

test('Business exchange returns Auth-owned verification and consumes the code once', async () => {
  const h = await harness(confirmed);
  const first = await h.exchange();
  assert.equal(first.status, 200);
  assert.equal(first.body.profile.email_verified, true);
  assert.equal(first.body.profile.display_name, 'Merchant');
  assert.equal((await h.exchange()).status, 400);
  assert.equal(h.audits.filter(row => row.success).length, 1);
});
test('editable metadata cannot claim email verification', async () => {
  const h = await harness({ ...confirmed, email_confirmed_at: null, user_metadata: { email_verified: true, email_confirmed_at: confirmed.email_confirmed_at } });
  assert.equal((await h.exchange()).body.profile.email_verified, false);
});
for (const disabled of [{ banned_until: '2999-01-01T00:00:00Z' }, { banned_until: 'malformed' }, { deleted_at: '2026-01-01T00:00:00Z' }]) {
  test(`disabled identity cannot exchange: ${JSON.stringify(disabled)}`, async () => {
    const h = await harness({ ...confirmed, ...disabled });
    const result = await h.exchange();
    assert.equal(result.status, 403);
    assert.equal(result.body.profile, undefined);
    assert.equal(h.audits.at(-1).error_code, 'user_disabled');
    assert.equal(h.audits.some(row => row.success), false);
  });
}
test('elapsed ban permits the existing Ride profile contract', async () => {
  const h = await harness({ ...confirmed, banned_until: '2020-01-01T00:00:00Z' }, 'zivo_ride');
  const result = await h.exchange();
  assert.equal(result.status, 200);
  assert.equal(result.body.profile.zivosmedia_user_id, confirmed.id);
});
test('incorrect client secret and PKCE verifier do not consume a valid code', async () => {
  const h = await harness(confirmed);
  assert.equal((await h.exchange({ client_secret: 'wrong' })).status, 401);
  assert.equal((await h.exchange({ code_verifier: 'x'.repeat(48) })).status, 400);
  assert.equal((await h.exchange()).status, 200);
});
