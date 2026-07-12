// @ts-check
/**
 * ZIVO Ecosystem — offline invariant + cross-app journey tests (v1).
 * Dependency-free node:test (matches the Run 7 harness pattern). Run with:
 *   node --test zivo-ecosystem/*.test.mjs
 * No network, no live services — proves the CONTRACT invariants only.
 * Live-runtime cross-app journeys remain PENDING (see INTEGRATION_V1.md).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  beginLink, verifyLink, revokeLink, resolveCanonicalSubject, canonicalFromEmail,
  mapProductRole, PRODUCT_PROJECT_REF,
} from './identity.mjs';
import { makeEvent, validateEvent, isFinancialEvent, redactMetadata } from './events.mjs';
import { parseDeepLink, authorizeDeepLink } from './deeplink.mjs';
import { visibleProducts, canSwitchTo } from './app-switcher.mjs';
import { buildPush, assertNoFinancialPayload, shouldDeliver, validateNotification } from './notifications.mjs';
import { FINANCIAL_TERMS, UX_STATE_COPY, areDistinct, term } from './ux-terms.mjs';

const NOW = 1_700_000_000_000;
const evBase = {
  event_id: 'evt_1', occurred_at: '2026-07-12T00:00:00Z', producer: 'wallet',
  subject_type: 'wallet_transaction', subject_id: 'tx_1', actor_id: 'zivo_u1',
  tenant_id: null, causation_id: null, safe_metadata: { status: 'completed', currency: 'USD' },
};

// ---------------------------------------------------------------- identity
test('identity: email alone is never sufficient', () => {
  assert.throws(() => canonicalFromEmail(), /not an identity/);
});

test('identity: no silent merge — verification requires a non-email proof', () => {
  const link = beginLink('zivo_u1', 'driver', 'driver_uid_9', NOW);
  assert.equal(link.state, 'pending');
  assert.throws(() => verifyLink(link, { method: 'email', matchesEmailOnly: true }, NOW), /not sufficient/);
  const verified = verifyLink(link, { method: 'sso_pkce' }, NOW);
  assert.equal(verified.state, 'verified');
});

test('identity: cross-app subject resolves ONLY via a verified, non-revoked link', () => {
  let link = beginLink('zivo_u1', 'driver', 'driver_uid_9', NOW);
  assert.equal(resolveCanonicalSubject([link], 'driver', 'driver_uid_9'), null, 'pending must not resolve');
  link = verifyLink(link, { method: 'otp' }, NOW);
  assert.equal(resolveCanonicalSubject([link], 'driver', 'driver_uid_9'), 'zivo_u1');
  link = revokeLink(link, NOW);
  assert.equal(resolveCanonicalSubject([link], 'driver', 'driver_uid_9'), null, 'revoked must not resolve');
});

test('identity: product projects are distinct (fragmented identity is modeled, not hidden)', () => {
  const refs = Object.values(PRODUCT_PROJECT_REF);
  assert.ok(new Set(refs).size >= 5, 'expect >= 5 distinct Supabase projects');
  assert.equal(mapProductRole('driver', 'driver'), 'driver');
  assert.equal(mapProductRole('software', 'owner'), 'merchant');
});

// ------------------------------------------------------------------ events
test('events: financial event requires correlation_id + event_id', () => {
  assert.ok(isFinancialEvent('payout.released'));
  const bad = { ...evBase, event_type: 'payout.released', correlation_id: '' };
  assert.ok(validateEvent(/** @type any */(bad)).some((e) => /correlation_id/.test(e)));
  const good = makeEvent({ ...evBase, event_type: 'payout.released', correlation_id: 'corr_1' });
  assert.equal(good.event_version, 1);
});

test('events: secrets/card/session are rejected and redactable in metadata', () => {
  const dirty = {
    ...evBase, event_type: 'order.updated', correlation_id: 'c1',
    safe_metadata: { note: 'ok', authorization: 'Bearer eyJabc.def', card: '4242 4242 4242 4242' },
  };
  assert.ok(validateEvent(/** @type any */(dirty)).some((e) => /unsafe metadata/.test(e)));
  const clean = redactMetadata(dirty.safe_metadata);
  assert.deepEqual(clean, { note: 'ok' });
});

// --------------------------------------------------------------- deep links
test('deeplink: financial/mutating intents are always rejected', () => {
  for (const bad of [
    ['wallet', '/app/wallet/transactions/tx_1?intent=pay'],
    ['software', '/pay/tok_1?transfer=1'],
    ['admin', '/incidents/i1?role=admin'],
  ]) {
    assert.throws(() => parseDeepLink(/** @type any */(bad[0]), bad[1]), /forbidden intent/);
  }
});

test('deeplink: read-entity requires auth AND server-side ownership', () => {
  const link = parseDeepLink('driver', '/trips/trip_1?ref=push');
  assert.equal(link.class, 'read-entity');
  assert.equal(authorizeDeepLink(link, { authenticated: false, ownsEntity: true }), false);
  assert.equal(authorizeDeepLink(link, { authenticated: true, ownsEntity: false }), false);
  assert.equal(authorizeDeepLink(link, { authenticated: true, ownsEntity: true }), true);
});

test('deeplink: non-allowlisted route is rejected; capability-token needs server verify', () => {
  assert.throws(() => parseDeepLink('wallet', '/app/wallet/admin/settings'), /not on allowlist/);
  const pay = parseDeepLink('software', '/invoices/inv_1'); // read-entity
  assert.equal(authorizeDeepLink(pay, { authenticated: true, ownsEntity: true }), true);
  const cap = parseDeepLink('software', '/pay/tok_abc');
  assert.equal(cap.class, 'capability-token');
  assert.equal(authorizeDeepLink(cap, { authenticated: true, tokenVerified: false }), false);
  assert.equal(authorizeDeepLink(cap, { authenticated: true, tokenVerified: true }), true);
});

// -------------------------------------------------------------- app switcher
test('app-switcher: shows only accessible products; admin hidden unless authorized', () => {
  const grants = {
    wallet: { accessible: true },
    driver: { accessible: true },
    media: { accessible: false },
    admin: { accessible: true, roles: ['user'] },
  };
  const vis = visibleProducts(grants).map((v) => v.product);
  assert.deepEqual(vis.sort(), ['driver', 'wallet']);
  assert.equal(canSwitchTo(grants, 'media'), false);
  assert.equal(canSwitchTo(grants, 'admin'), false, 'admin without staff/admin role is hidden');
  const staff = { ...grants, admin: { accessible: true, roles: ['staff'] } };
  assert.equal(canSwitchTo(staff, 'admin'), true);
});

// -------------------------------------------------------------- notifications
test('notifications: push carries NO financial payload', () => {
  const n = {
    notification_id: 'n1', type: 'payout-status', recipient: 'zivo_u1',
    title_key: 'notif.payout.title', deep_link: 'wallet:/app/wallet/transactions/tx_1',
    priority: /** @type const */('high'), correlation_id: 'corr_1', occurred_at: '2026-07-12T00:00:00Z',
    data: { amount_cents: 1500, balance: 9000 },
  };
  const push = buildPush(n);
  assert.equal(assertNoFinancialPayload(push), null);
  assert.ok(!('amount_cents' in push) && !('balance' in push));
  assert.equal(validateNotification(n).length, 0);
});

test('notifications: quiet hours suppress normal, security-alert overrides', () => {
  const prefs = { quietHours: { start: 22, end: 7 }, locale: /** @type const */('en') };
  const order = { notification_id: 'n', type: 'order', recipient: 'u', title_key: 'notif.order.title', priority: /** @type const */('normal'), correlation_id: 'c', occurred_at: 'x' };
  assert.equal(shouldDeliver(order, prefs, 2).deliver, false, 'quiet hours suppress order');
  const sec = { ...order, type: 'security-alert' };
  assert.equal(shouldDeliver(sec, prefs, 2).deliver, true, 'security-alert always delivers');
});

// ----------------------------------------------------------------- ux terms
test('ux-terms: transfer and payout are kept distinct; EN/KM parity holds', () => {
  assert.equal(areDistinct('transfer', 'payout'), true);
  assert.equal(areDistinct('payout', 'transfer'), true);
  assert.notEqual(term('en', 'transfer'), term('en', 'payout'));
  for (const [k, v] of Object.entries(FINANCIAL_TERMS)) {
    assert.ok(v.en && v.km, `term ${k} must have EN and KM`);
  }
  for (const [k, v] of Object.entries(UX_STATE_COPY)) {
    assert.ok(v.en && v.km, `ux state ${k} must have EN and KM`);
  }
});

// -------------------------------------------- offline cross-app journeys (v1)
test('journey: Travel -> Wallet booking handoff (contract-level)', () => {
  // 1. user is linked Travel + Wallet (verified)
  const links = [
    verifyLink(beginLink('zivo_u1', 'travel', 'trv_1', NOW), { method: 'sso_pkce' }, NOW),
    verifyLink(beginLink('zivo_u1', 'wallet', 'wal_1', NOW), { method: 'sso_pkce' }, NOW),
  ];
  // 2. switcher offers Wallet only because access is granted
  assert.equal(canSwitchTo({ travel: { accessible: true }, wallet: { accessible: true } }, 'wallet'), true);
  // 3. handoff resolves the SAME canonical subject in both products
  assert.equal(resolveCanonicalSubject(links, 'travel', 'trv_1'), 'zivo_u1');
  assert.equal(resolveCanonicalSubject(links, 'wallet', 'wal_1'), 'zivo_u1');
  // 4. the deep link into the booking is a read-entity, not an auto-pay
  const link = parseDeepLink('travel', '/bookings/bk_1');
  assert.equal(link.class, 'read-entity');
  // 5. Wallet finalizes payment (provider-verified) and emits a SAFE correlated event
  const ev = makeEvent({ ...evBase, event_type: 'payment.captured', subject_id: 'bk_1', correlation_id: 'flow_travel_1' });
  assert.equal(validateEvent(ev).length, 0);
  // 6. downstream notification has no financial payload
  const push = buildPush({ notification_id: 'n', type: 'payment', recipient: 'zivo_u1', title_key: 'notif.payment.title', priority: 'high', correlation_id: 'flow_travel_1', occurred_at: 'x' });
  assert.equal(assertNoFinancialPayload(push), null);
});

test('journey: Driver earnings — transfer (internal) vs payout (external) stay distinct', () => {
  const transfer = makeEvent({ ...evBase, producer: 'wallet', event_type: 'transfer.completed', subject_type: 'wallet_transfer', correlation_id: 'flow_driver_1' });
  const payout = makeEvent({ ...evBase, producer: 'wallet', event_type: 'payout.released', subject_type: 'wallet_payout', correlation_id: 'flow_driver_1' });
  assert.ok(isFinancialEvent(transfer.event_type) && isFinancialEvent(payout.event_type));
  assert.equal(areDistinct('transfer', 'payout'), true);
});

test('journey: unauthorized Admin handoff is blocked at every gate', () => {
  const grants = { admin: { accessible: true, roles: ['user'] } };
  assert.equal(canSwitchTo(grants, 'admin'), false);
  const link = parseDeepLink('admin', '/incidents/inc_1');
  assert.equal(authorizeDeepLink(link, { authenticated: true, ownsEntity: false }), false);
});

test('journey: revoked link blocks a previously-valid cross-app handoff', () => {
  let link = verifyLink(beginLink('zivo_u1', 'chat', 'chat_1', NOW), { method: 'sso_pkce' }, NOW);
  assert.equal(resolveCanonicalSubject([link], 'chat', 'chat_1'), 'zivo_u1');
  link = revokeLink(link, NOW);
  assert.equal(resolveCanonicalSubject([link], 'chat', 'chat_1'), null);
});
